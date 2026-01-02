<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useZohoStore } from '@/stores/zohoStore'
import { useHelpers } from '@/composables/useHelpers.js'
import ShiftDetailModal from "@/components/ShiftDetailModal.vue";
import CreateShiftModal from "@/components/CreateShiftModal.vue";
import { useZoho } from "@/composables/useZoho.js";
import { endOfMonth, endOfWeek, startOfMonth, startOfWeek, subMonths, subWeeks } from "date-fns";

const zoho = useZohoStore()
const helpers = useHelpers()
const { createRecord } = useZoho()

const loading = ref(true)

const startDate = ref('')
const endDate = ref('')
const rawStart = ref(new Date())
const rawEnd = ref(new Date())

const menuStart = ref(false)
const menuEnd = ref(false)
const selectedRange = ref(null)

const search = ref('')
const selectedCar = ref('all')

const days = ref([])
const carMap = ref([{ id: 'all', name: 'All Cars' }])

const selectedShift = ref(null)
const showShiftModal = ref(false)

const newShiftData = ref(null)
const disabled = ref(false)
const showCreateShiftModal = ref(false)

// ============================
//  МОДАЛКИ
// ============================
const openShiftModal = async (shift) => {
  loading.value = true
  zoho.schedule = null
  await zoho.getDriverScheduleById(shift.id)
  selectedShift.value = shift
  showShiftModal.value = true
  loading.value = false
}

const openEmptyShift = () => {
  newShiftData.value = {
    driver: null,
    StartOfWorkShift: null,
    EndOfWorkShift: null,
  }
  disabled.value = false
  showCreateShiftModal.value = true
}

// ============================
//  ЗАВАНТАЖЕННЯ ДАНИХ
// ============================
async function loadData() {
  loading.value = true
  try {
    days.value = helpers.getDateRange(startDate.value, endDate.value)

    await zoho.fetchDriversScheduleCoql(
      helpers.formatDateForZoho2(startDate.value, "start"),
      helpers.formatDateForZoho2(endDate.value),
      "end"
    )

    await zoho.fetchVehicelsCoql()

    carMap.value = [
      { id: 'all', name: 'All Cars' },
      ...(zoho.vechicles || []).map(v => ({ id: v.id, name: v.Name }))
    ]
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  const now = new Date()
  rawStart.value = new Date(now.getFullYear(), now.getMonth(), 1)
  rawEnd.value = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  startDate.value = helpers.formatDateForZoho(rawStart.value)
  endDate.value = helpers.formatDateForZoho(rawEnd.value)

  loading.value = true
  try {
    await zoho.initApp()
    await zoho.fetchDriversCoql()
    await loadData()
  } finally {
    loading.value = false
  }
})

watch(rawStart, async val => {
  if (!val) return
  startDate.value = helpers.formatDateForZoho(val)
  await loadData()
})

watch(rawEnd, async val => {
  if (!val) return
  endDate.value = helpers.formatDateForZoho(val)
  await loadData()
})

watch(selectedRange, async val => {
  if (!val) return

  const now = new Date()
  let start, end

  switch (val) {
    case "This week":
      start = startOfWeek(now, { weekStartsOn: 1 })
      end = endOfWeek(now, { weekStartsOn: 1 })
      break
    case "Last week":
      start = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 })
      end = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 })
      break
    case "This month":
      start = startOfMonth(now)
      end = endOfMonth(now)
      break
    case "Last month":
      start = startOfMonth(subMonths(now, 1))
      end = endOfMonth(subMonths(now, 1))
      break
  }

  rawStart.value = start
  rawEnd.value = end
  startDate.value = helpers.formatDateForZoho(start)
  endDate.value = helpers.formatDateForZoho(end)

  await loadData()
})

// ============================
//  ФІЛЬТРИ
// ============================
const filteredDrivers = computed(() => {
  let list = zoho.drivers || []

  if (search.value) {
    const q = search.value.toLowerCase()
    list = list.filter(d => d.Full_Name?.toLowerCase().includes(q))
  }

  if (selectedCar.value !== 'all') {
    list = list.filter(driver =>
      zoho.schedules.some(
        s => s.Driver.id === driver.id && s.Auto?.id === selectedCar.value
      )
    )
  }

  return list
})

const drivers_filter = (item, queryText, itemText) =>
  (itemText ?? '').toLowerCase().includes((queryText ?? '').toLowerCase())

const carOptions = computed(() => carMap.value)

const resetFilters = () => {
  search.value = ''
  selectedCar.value = 'all'
  selectedRange.value = null

  const now = new Date()
  rawStart.value = new Date(now.getFullYear(), now.getMonth(), 1)
  rawEnd.value = new Date(now.getFullYear(), now.getMonth() + 1, 0)

  startDate.value = helpers.formatDateForZoho(rawStart.value)
  endDate.value = helpers.formatDateForZoho(rawEnd.value)
}

// =============================
//   ⭐ ГОЛОВНА ЛОГІКА ДЛЯ ТАБЛИЦІ
// =============================
// Варіант A:
// Зміна належить дню, якщо:
// Start_of_work_shift == day  АБО  End_of_work_shift == day

const getSchedule = (driverId, day) => {
  const dayStr = typeof day === 'string' ? day : helpers.formatDateForZoho(day)

  return zoho.schedules.filter(s => {
    if (s.Driver.id !== driverId) return false

    const start = helpers.formatDateForZoho(s.Start_of_work_shift)
    const end = helpers.formatDateForZoho(s.End_of_work_shift)

    return start === dayStr || end === dayStr
  })
}

const getShiftColorForTypeOrStatus = (value) => {
  if (!value) return '#374151'
  if (value.includes('Planned')) return '#f9c74f'
  if (value.includes('At work')) return '#4895ef'
  if (value.includes('Completed')) return '#06d6a0'
  if (value.includes('Cancel')) return '#ef476f'
  return '#374151'
}

// =============================
//   КЛІК ПО КЛІТИНЦІ
// =============================
const handleCellClick = (driver, day) => {
  const shifts = getSchedule(driver.id, day)

  if (shifts.length === 1) {
    openShiftModal(shifts[0])
    return
  }

  if (shifts.length > 1) {
    openShiftModal(shifts[0])
    return
  }

  newShiftData.value = {
    driver,
    StartOfWorkShift: helpers.formatDateForZoho(day),
    EndOfWorkShift: helpers.formatDateForZoho(day)
  }
  disabled.value = true
  showCreateShiftModal.value = true
}

// =============================
//   СТВОРЕННЯ НОВОЇ ЗМІНИ
// =============================
const handleNewShift = async (newShift) => {
  loading.value = true

  try {
    if (newShift.TypeOfWorkShift === "Day shift") {
      const crmData = {
        Name: newShift.Name,
        Auto: newShift.Auto,
        Driver: newShift.Driver,
        End_of_work_shift: newShift.EndOfWorkShift,
        Start_of_work_shift: newShift.StartOfWorkShift,
        Status: newShift.Status,
        Type_of_work_shift: newShift.TypeOfWorkShift,
      }
      await createRecord("Taxi_Schedules", crmData)

    } else {
      const crmDataFirst = {
        Name: newShift.Name,
        Auto: newShift.Auto,
        Driver: newShift.Driver,
        Start_of_work_shift: newShift.StartOfWorkShift,
        End_of_work_shift: helpers.formatDateForZoho4(newShift.StartOfWorkShift, "end"),
        Status: newShift.Status,
        Type_of_work_shift: newShift.TypeOfWorkShift,
      }

      await createRecord("Taxi_Schedules", crmDataFirst)

      const crmDataSecond = {
        Name: newShift.Name,
        Auto: newShift.Auto,
        Driver: newShift.Driver,
        Start_of_work_shift: helpers.formatDateForZoho4(newShift.EndOfWorkShift, "start"),
        End_of_work_shift: newShift.EndOfWorkShift,
        Status: newShift.Status,
        Type_of_work_shift: newShift.TypeOfWorkShift,
      }

      await createRecord("Taxi_Schedules", crmDataSecond)
    }

    await zoho.fetchDriversCoql()
    await loadData()

  } finally {
    loading.value = false
  }
}
</script>

<template>
  <v-container fluid class="pa-4" style="background-color: #0d1b2a; min-height: 100vh;">

    <div v-if="loading" class="loader-wrapper">
      <v-progress-circular indeterminate size="64" width="6" color="primary" />
    </div>

    <div v-else>

      <!-- ФИЛЬТРЫ -->
      <div class="filters mb-4 d-flex align-center flex-wrap">

        <v-select
          v-model="selectedRange"
          :items="['This week','Last week','This month','Last month']"
          label="Range"
          variant="outlined"
          density="compact"
          hide-details
          class="mr-2"
        />

        <v-menu v-model="menuStart" :close-on-content-click="false" transition="scale-transition" offset-y>
          <template #activator="{ props }">
            <v-text-field v-model="startDate" label="Start date" readonly v-bind="props"
                          variant="outlined" density="compact" hide-details class="mr-2"/>
          </template>
          <v-date-picker v-model="rawStart" color="primary" @update:model-value="menuStart = false"/>
        </v-menu>

        <v-menu v-model="menuEnd" :close-on-content-click="false" transition="scale-transition" offset-y>
          <template #activator="{ props }">
            <v-text-field v-model="endDate" label="End date" readonly v-bind="props"
                          variant="outlined" density="compact" hide-details class="mr-2"/>
          </template>
          <v-date-picker v-model="rawEnd" color="primary" @update:model-value="menuEnd = false"/>
        </v-menu>

        <v-autocomplete
          v-model="search"
          :items="zoho.drivers"
          item-title="Full_Name"
          item-value="Full_Name"
          label="Search driver"
          variant="outlined"
          density="compact"
          hide-details
          clearable
          autocomplete="off"
          :filter="drivers_filter"
          style="width: 180px;"
        />

        <v-autocomplete
          v-model="selectedCar"
          :items="carOptions"
          item-title="name"
          item-value="id"
          label="Select Car"
          variant="outlined"
          density="compact"
          hide-details
          class="mr-2"
        />

        <v-btn color="red darken-2" @click="resetFilters" class="mr-2">Reset</v-btn>
        <v-btn color="primary" @click="openEmptyShift">Create Shift</v-btn>

        <CreateShiftModal
          v-if="showCreateShiftModal"
          v-model:show="showCreateShiftModal"
          :shiftData="newShiftData"
          :disabled="disabled"
          @save="handleNewShift"
        />

      </div>

      <!-- ЛЕГЕНДА -->
      <div class="filters mb-4 d-flex align-center flex-wrap">
        <span class="d-flex align-center mr-4"><span class="dot mr-2" style="background:#f9c74f"></span>Planned</span>
        <span class="d-flex align-center mr-4"><span class="dot mr-2" style="background:#4895ef"></span>At work</span>
        <span class="d-flex align-center mr-4"><span class="dot mr-2" style="background:#06d6a0"></span>Completed</span>
        <span class="d-flex align-center mr-4"><span class="dot mr-2" style="background:#ef476f"></span>Cancel</span>
      </div>

      <!-- ТАБЛИЦА -->
      <v-card class="pa-4" elevation="2">
        <v-table class="my-bordered-table">

          <thead>
          <tr>
            <th class="text-left"><b>Driver</b></th>
            <th v-for="day in days" :key="day"><b>{{ helpers.formatDayMonth(day) }}</b></th>
          </tr>
          </thead>

          <tbody>
          <tr v-for="driver in filteredDrivers" :key="driver.id">

            <td>{{ driver.Full_Name }}</td>

            <td
              v-for="day in days"
              :key="day"
              class="text-center cursor-pointer"
              @click="handleCellClick(driver, day)"
            >
              <!-- КІЛЬКА ЗМІН В ОДНІЙ КЛІТИНЦІ -->
              <template v-if="getSchedule(driver.id, day).length">
                <div class="d-flex flex-column" style="gap:4px;">

                  <div
                    v-for="shift in getSchedule(driver.id, day)"
                    :key="shift.id"
                  >
                    <v-tooltip location="bottom">

                      <template #activator="{ props }">
                        <v-chip
                          v-bind="props"
                          :color="getShiftColorForTypeOrStatus(shift.Status ?? shift.Type_of_work_shift)"
                          dark
                          size="small"
                          class="cursor-pointer justify-center text-center chip-small-font"
                        >
                          {{ shift.Type_of_work_shift === 'Day shift' ? 'Day' : 'Night' }}
                        </v-chip>
                      </template>

                      <span>
                         {{ zoho.vechicles.find(v => v.id === shift.Auto?.id)?.Name || 'No car assigned' }}
                       </span>

                    </v-tooltip>
                  </div>

                </div>
              </template>

            </td>

          </tr>
          </tbody>

        </v-table>
      </v-card>

    </div>

    <ShiftDetailModal
      v-model:show="showShiftModal"
      :shift="selectedShift"
      :shift_crm="zoho.schedule"
    />

  </v-container>
</template>



<style>
/* ====== Общий фон и карточки ====== */
.v-container {
  background-color: #0d1b2a !important; /* тёмно-синий фон */
  color: #e0e6ed; /* светлый текст */
}

.v-card {
  background-color: #1b263b !important; /* более светлый тёмно-синий */
  color: #e0e6ed;
  border-radius: 12px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.5);
}

/* ====== Таблица ====== */
.my-bordered-table .v-table__wrapper table {
  border-collapse: collapse;
  table-layout: fixed;
  width: 100%;
  background-color: #1b263b; /* фон таблицы */
  color: #e0e6ed;
}

/* Заголовки */
.my-bordered-table thead tr th {
  background-color: #24344d; /* хэдер темнее */
  border: 1px solid #2f3e56;
  padding: 10px;
  text-align: center;
  font-weight: 600;
  color: #f0f4f9;
}

/* Ячейки */
.my-bordered-table tbody tr td {
  border: 1px solid #2f3e56;
  padding: 8px;
  text-align: center;
  color: #d9e2ec;
  background-color: #1b263b;
  transition: background-color 0.2s ease;
}

/* Чередование строк */
.my-bordered-table tbody tr:nth-child(even) td {
  background-color: #16233a;
}

/* Hover */
/* Базовый стиль ячеек */
.my-bordered-table tbody tr td {
  transition: background-color 0.2s ease, box-shadow 0.2s ease;
}

/* Hover и кликабельность для всех, кроме первой колонки */
.my-bordered-table tbody tr td:not(:first-child):hover {
  background-color: #223451;
  cursor: pointer;
  box-shadow: inset 0 0 0 1px #3a5579;
}
/* Первая колонка (водитель) */
.my-bordered-table thead tr th:first-child,
.my-bordered-table tbody tr td:first-child {
  width: 180px;
  text-align: left;
  font-weight: 500;
  color: #f5f7fa;
  background-color: #24344d;
}

/* Остальные одинаковой ширины */
.my-bordered-table thead tr th:not(:first-child),
.my-bordered-table tbody tr td:not(:first-child) {
  width: 100px;
}

/* ====== Чипы смен ====== */
.v-chip {
  width: 100%;
  text-align: center;
  font-size: 0.55rem;
  font-weight: 500;
  border-radius: 6px;
}

/* Слегка подогнанные цвета под Sneat */
.v-chip.light-blue {
  background-color: #00b4d8 !important;
  color: white !important;
}
.v-chip.deep-purple {
  background-color: #7209b7 !important;
  color: white !important;
}
.v-chip.grey {
  background-color: #495057 !important;
  color: #dee2e6 !important;
}
.v-chip.blue {
  background-color: #0077b6 !important;
  color: white !important;
}
.v-chip.green {
  background-color: #2d6a4f !important;
  color: white !important;
}
.v-chip.red {
  background-color: #d00000 !important;
  color: white !important;
}

/* ====== Скроллы ====== */
.my-bordered-table .v-table__wrapper {
  overflow-x: auto;
  overflow-y: auto;
  scrollbar-color: #1f4e79 #0d1b2a;
  scrollbar-width: thin;
}
.my-bordered-table .v-table__wrapper::-webkit-scrollbar {
  height: 8px;
  width: 8px;
}
.my-bordered-table .v-table__wrapper::-webkit-scrollbar-thumb {
  background: #1f4e79;
  border-radius: 6px;
}
.my-bordered-table .v-table__wrapper::-webkit-scrollbar-track {
  background: #0d1b2a;
}
.loader-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 60vh;
}
.filter-panel {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}
.dot {
  height: 10px;
  width: 10px;
  border-radius: 50%;
  display: inline-block;
}

/* ====== Таблица ====== */
.my-bordered-table .v-table__wrapper {
  overflow-x: auto;
  overflow-y: auto;
  max-height: calc(100vh - 150px);
  position: relative;         /* для sticky всередині контейнера */
  scrollbar-color: #1f4e79 #0d1b2a;
  scrollbar-width: thin;
}

.my-bordered-table .v-table__wrapper::-webkit-scrollbar {
  height: 8px;
  width: 8px;
}
.my-bordered-table .v-table__wrapper::-webkit-scrollbar-thumb {
  background: #1f4e79;
  border-radius: 6px;
}
.my-bordered-table .v-table__wrapper::-webkit-scrollbar-track {
  background: #0d1b2a;
}

/* Саме TABLE */
.my-bordered-table .v-table__wrapper table {
  border-collapse: collapse;
  table-layout: fixed;
  width: 100%;
  background-color: #1b263b;
  color: #e0e6ed;
}

/* 🔒 Липкий хедер (рядок з датами) */
.my-bordered-table .v-table__wrapper thead tr th {
  position: sticky;
  top: 0;
  z-index: 5;
  background-color: #24344d;  /* обов'язково! щоб не просвічувались рядки */
}

/* Заголовки */
.my-bordered-table thead tr th {
  border: 1px solid #2f3e56;
  padding: 10px;
  text-align: center;
  font-weight: 600;
  color: #f0f4f9;
}

/* Ячейки */
.my-bordered-table tbody tr td {
  border: 1px solid #2f3e56;
  padding: 8px;
  text-align: center;
  color: #d9e2ec;
  background-color: #1b263b;
  transition: background-color 0.2s ease, box-shadow 0.2s ease;
}

/* Чередование строк */
.my-bordered-table tbody tr:nth-child(even) td {
  background-color: #16233a;
}

/* Hover для ячеек, крім першої колонки */
.my-bordered-table tbody tr td:not(:first-child):hover {
  background-color: #223451;
  cursor: pointer;
  box-shadow: inset 0 0 0 1px #3a5579;
}

/* Первая колонка (Driver) – можна теж зафіксувати по горизонталі */
.my-bordered-table thead tr th:first-child,
.my-bordered-table tbody tr td:first-child {
  width: 180px;
  text-align: left;
  font-weight: 500;
  color: #f5f7fa;
  background-color: #24344d;
  position: sticky;
  left: 0;
  z-index: 6;
}

/* Остальные колонки */
.my-bordered-table thead tr th:not(:first-child),
.my-bordered-table tbody tr td:not(:first-child) {
  width: 100px;
}


</style>
