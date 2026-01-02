<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useZohoStore } from "@/stores/zohoStore.js"
import { useHelpers } from '@/composables/useHelpers.js'

const zoho = useZohoStore()
const helpers = useHelpers()

const props = defineProps({
  show: Boolean,
  shiftData: Object,
  driver: { type: String, default: null },
  vehicle: { type: String, default: null },
  disabled: { type: Boolean, default: false }
})
const emit = defineEmits(['update:show', 'save', 'resetShiftData'])

const internalShow = ref(props.show)
watch(() => props.show, val => internalShow.value = val)
watch(internalShow, val => emit('update:show', val))

const carMap = ref([])
const driverMap = ref([])
const carOptions = computed(() => carMap.value)
const driverOptions = computed(() => driverMap.value)

const menuStart = ref(false)
const menuEnd = ref(false)
const menuStartTime = ref("10:00")
const menuEndTime = ref("18:00")
const rawStartDate = ref(null)
const rawEndDate = ref(null)
const rawStartTime = ref(null)
const listsLoading = ref(false)
const isFormReady = ref(false)

const defaultForm = () => ({
  Name: "",
  Driver: null,
  Auto: null,
  StartOfWorkShift: null,
  EndOfWorkShift: null,
  TypeOfWorkShift: 'Day shift',
  Status: 'Planned'
})
const form = ref(defaultForm())

// Helper для объединения даты и времени
const combineDateTime = (date, time) => {
  if (!date) return null
  if (!time) return helpers.formatDateForZoho(date)
  const [h, m] = time.split(':')
  const d = new Date(date)
  d.setHours(Number(h))
  d.setMinutes(Number(m))
  return helpers.formatDateForZoho(d)
}

// Загрузка списков
async function loadLists(force = false) {
  if (listsLoading.value) return
  listsLoading.value = true
  try {
    if (force || !zoho.vechicles?.length) await zoho.fetchVehicelsCoql?.()
    if (force || !zoho.drivers?.length) await zoho.fetchDriversCoql?.()

    carMap.value = helpers.getSchedulersCarsByDate(
      props.shiftData?.StartOfWorkShift,
      zoho.schedules ?? [],
      (zoho.vechicles ?? []).map(v => ({ id: v.id, name: v.Name || v.VIN_Code || '' })),
      props.shiftData?.driver
    )

    driverMap.value = (zoho.drivers ?? []).map(d => ({ id: d.id, name: d.Full_Name ?? d.Name ?? '' }))
  } finally {
    listsLoading.value = false
  }
}

onMounted(() => {
  isFormReady.value = true
})

// Инициализация формы при открытии
watch(internalShow, async val => {
  if (val) {
    await loadLists(false)

    if (props.shiftData) {
      form.value = {
        Name: props.shiftData.Name ?? '',
        Driver: props.shiftData.Driver?.id ?? props.shiftData.driver?.id ?? props.driver ?? null,
        Auto: props.shiftData.Auto?.id ?? props.shiftData.auto?.id ?? props.vehicle ?? null,
        StartOfWorkShift: props.shiftData.StartOfWorkShift ?? null,
        EndOfWorkShift: props.shiftData.EndOfWorkShift ?? null,
        TypeOfWorkShift: props.shiftData.TypeOfWorkShift ?? props.shiftData.Type_of_work_shift ?? 'Day shift',
        Status: props.shiftData.Status ?? 'Planned'
      }
      rawStartDate.value = form.value.StartOfWorkShift
      rawEndDate.value = form.value.EndOfWorkShift
    } else {
      form.value = defaultForm()
      if (props.driver) form.value.Driver = props.driver
      if (props.vehicle) form.value.Auto = props.vehicle
      rawStartDate.value = null
      rawEndDate.value = null
    }

    updateEndDate()
  } else {
    resetForm()
  }
})

// Обновление EndDate в зависимости от StartDate и TypeOfWorkShift
const updateEndDate = () => {
  if (!rawStartDate.value) return
  const d = new Date(rawStartDate.value)
  if (form.value.TypeOfWorkShift === 'Night shift') {
    d.setDate(d.getDate() + 1)
  }
  rawEndDate.value = d
  form.value.EndOfWorkShift = combineDateTime(rawEndDate.value, menuEndTime.value)
}

watch([() => form.value.TypeOfWorkShift, rawStartDate], () => {
  updateEndDate()
})

watch([() => form.value.Driver, () => form.value.Auto, rawStartDate], () => {
  const driverObj = driverOptions.value.find(d => d.id === form.value.Driver)
  const carObj = carOptions.value.find(c => c.id === form.value.Auto)

  const driverName = driverObj?.name ?? ''
  const carName = carObj?.name ?? ''
  const date = rawStartDate.value ? helpers.formatDateForZoho(rawStartDate.value) : ''

  form.value.Name = [driverName, carName, date].filter(Boolean).join(" / ")
})

const startDate = computed({
  get: () => rawStartDate.value ? helpers.formatDateForZoho(rawStartDate.value) : '',
  set: val => {
    rawStartDate.value = val
    form.value.StartOfWorkShift = combineDateTime(rawStartDate.value, rawStartTime.value)
    updateEndDate()
  }
})

const computedEndDate = computed({
  get() {
    if (!rawEndDate.value) return ''
    return helpers.formatDateForZoho(rawEndDate.value)
  },
  set(val) {
    rawEndDate.value = val
    form.value.EndOfWorkShift = combineDateTime(rawEndDate.value, menuEndTime.value)
  }
})

const availableStatuses = computed(() => {
  if (!rawStartDate.value) return ['Planned']
  const today = new Date()
  const start = new Date(rawStartDate.value)
  if (start > today) return ['Planned']
  return ['Planned', 'At work', 'Completed', 'Cancelled']
})

const resetForm = () => {
  form.value = defaultForm()
  rawStartDate.value = null
  rawEndDate.value = null
  emit('resetShiftData', defaultForm())
}

const emitClose = () => {
  resetForm()
  internalShow.value = false
}

const formErrors = ref({})
const formValidation = () => {
  const errors = {}
  if (!form.value.Name) errors.Name = 'Scheduler name is required'
  if (!form.value.Auto) errors.Auto = 'Car is required'
  if (!form.value.Driver) errors.Driver = 'Driver is required'
  if (!rawStartDate.value) errors.StartOfWorkShift = 'Start date is required'
  if (!rawEndDate.value) errors.EndOfWorkShift = 'End date is required'
  if (!form.value.TypeOfWorkShift) errors.TypeOfWorkShift = 'Shift type is required'
  if (!form.value.Status) errors.Status = 'Status is required'
  if (form.value.Status && !availableStatuses.value.includes(form.value.Status)) {
    errors.Status = 'Invalid status for selected date'
  }
  formErrors.value = errors
  return Object.keys(errors).length === 0
}

const saveShift = () => {
  if (!formValidation()) return
  form.value.StartOfWorkShift = helpers.formatDateForZoho3(rawStartDate.value, menuStartTime.value)
  form.value.EndOfWorkShift = helpers.formatDateForZoho3(rawEndDate.value, menuEndTime.value)
  emit('save', {...props.shiftData, ...form.value})
  emitClose()
}

const title = computed(() => props.shiftData ? 'Edit Shift' : 'Create Shift')
</script>

<template>
  <v-dialog v-if="internalShow" v-model="internalShow" max-width="500px">
    <v-card>
      <v-card-title>{{ title }}</v-card-title>
      <v-card-text>
        <v-text-field
          v-model="form.Name"
          label="Scheduler Name"
          variant="outlined"
          density="compact"
          class="mb-2"
          :disabled="true"
          :error-messages="formErrors.Name"
        />

        <v-autocomplete
          v-model="form.Auto"
          :items="carOptions"
          item-title="name"
          item-value="id"
          label="Select Car"
          variant="outlined"
          density="compact"
          hide-details="auto"
          :error-messages="formErrors.Auto"
          class="mb-2"
        />
        <br/>
        <v-autocomplete
          v-model="form.Driver"
          :items="driverOptions"
          item-title="name"
          item-value="id"
          label="Select Driver"
          variant="outlined"
          density="compact"
          hide-details="auto"
          :disabled="props.disabled"
          :error-messages="formErrors.Driver"
          class="mb-2"
        />
        <br/>
        <!-- Даты -->
        <div class="d-flex v-row px-3">
          <v-menu v-model="menuStart" :close-on-content-click="false" transition="scale-transition" offset-y>
            <template #activator="{ props: menuProps }">
              <v-text-field
                v-model="startDate"
                label="Start Date"
                readonly
                v-bind="menuProps"
                variant="outlined"
                density="compact"
                :disabled="props.disabled"
                :error-messages="formErrors.StartOfWorkShift"
                class="mb-2"
              />
            </template>
            <v-date-picker v-model="rawStartDate" @update:model-value="menuStart = false"/>
          </v-menu>
          <br/>
          <v-text-field
            label="Start time"
            v-model="menuStartTime"
            variant="outlined"
            density="compact"
            type="time"
            class="mb-2"
            max-width="100px"
          />
        </div>
        <br/>
        <div class="d-flex v-row px-3">
          <v-menu v-model="menuEnd" :close-on-content-click="false" transition="scale-transition" offset-y>
            <template #activator="{ props: menuProps }">
              <v-text-field
                v-model="computedEndDate"
                label="End Date"
                readonly
                v-bind="menuProps"
                :disabled="props.disabled"
                variant="outlined"
                density="compact"
                :error-messages="formErrors.EndOfWorkShift"
                class="mb-2"
              />
            </template>
            <v-date-picker v-model="computedEndDate" @update:model-value="menuEnd = false"/>
          </v-menu>
          <v-text-field
            label="End time"
            v-model="menuEndTime"
            variant="outlined"
            density="compact"
            type="time"
            class="mb-2"
            max-width="100px"
          />
        </div>
        <v-select
          v-model="form.TypeOfWorkShift"
          :items="['Day shift', 'Night shift']"
          label="Shift Type"
          variant="outlined"
          density="compact"
          :error-messages="formErrors.TypeOfWorkShift"
          class="mb-2"
          @change="updateEndDate"
        />
        <v-select
          v-model="form.Status"
          :items="availableStatuses"
          label="Status"
          variant="outlined"
          density="compact"
          :error-messages="formErrors.Status"
          class="mb-2"
        />
      </v-card-text>

      <v-card-actions>
        <v-spacer/>
        <v-btn text @click="emitClose">Cancel</v-btn>
        <v-btn color="primary" @click="saveShift">Save</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
