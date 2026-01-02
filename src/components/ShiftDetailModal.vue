<script setup>
import { ref, watch, defineEmits, computed } from 'vue'
import { useZohoStore } from '@/stores/zohoStore'
import { useHelpers } from '@/composables/useHelpers.js'
import Chart from "@/components/Chart.vue";


const zoho = useZohoStore()
const helpers = useHelpers()

const props = defineProps({
  show: Boolean,
  shift: Object,
  shift_crm:Object
})

const loading = ref(false)

const emit = defineEmits(['update:show'])
const internalShow = ref(props.show)


watch(() => props.show, val => internalShow.value = val)
watch(internalShow, val => emit('update:show', val))


const close = () => {
  internalShow.value = false
}

const mappedDriver = computed(() => {
  if (!props.shift?.Driver?.id) return null
  return zoho.drivers.find(d => d.id === props.shift.Driver.id) || { Full_Name: 'N/A' }
})

const mappedAuto = computed(() => {
  if (!props.shift?.Auto?.id) return null
  return zoho.vechicles.find(v => v.id === props.shift.Auto.id) || { Name: 'N/A' }
})


</script>

<template>
  <div v-if="loading" class="loader-wrapper">
    <v-progress-circular indeterminate size="64" width="6" color="primary"/>
  </div>
  <v-dialog v-else v-model="internalShow" max-width="600px">
    <v-card class="sneat-modal-card">
      <v-card-title class="headline sneat-modal-header">
        Shift Details
      </v-card-title>

      <v-card-text class="sneat-modal-content">
        <div class="field">
          <span class="label">Taxi Schedule:</span>
          <span class="value">
            <a
              :href="`https://crm.zoho.com/crm/org783325445/tab/CustomModule59/${props.shift.id}`"
              target="_blank"
              class="link"
            >{{ props.shift.Name }}</a>
          </span>
        </div>

        <div class="field">
          <span class="label">Driver:</span>
          <span class="value">
            <a
              v-if="mappedDriver?.id"
              :href="`https://crm.zoho.com/crm/org783325445/tab/Contacts/${mappedDriver.id}`"
              target="_blank"
              class="link"
            >{{ mappedDriver.Full_Name }}</a>
            <span v-else>N/A</span>
          </span>
        </div>

        <div class="field">
          <span class="label">Car:</span>
          <span class="value">
            <a
              v-if="mappedAuto?.id"
              :href="`https://crm.zoho.com/crm/org783325445/tab/CustomModule1/${mappedAuto.id}`"
              target="_blank"
              class="link"
            >{{ mappedAuto.Name }}</a>
            <span v-else>N/A</span>
          </span>
        </div>
        <div>
          <div class="field">
            <span class="label">Shift Type:</span>
            <span class="value">{{ props.shift.Type_of_work_shift }}</span>
          </div>
          <div class="field">
            <span class="label">Start:</span>
            <span class="value">{{helpers.formatDateTimeRange(props.shift.Start_of_work_shift) }}</span>
          </div>
          <div class="field">
            <span class="label">End:</span>
            <span class="value">{{helpers.formatDateTimeRange(props.shift.End_of_work_shift)}}</span>
          </div>
          <div class="field">
            <span class="label">Status:</span>
            <span class="value">{{ props.shift.Status || 'N/A' }}</span>
          </div>
          <div class="field" v-if="props.shift_crm?.Shift_Timeline?.length">
            <Chart :shift_crm="props.shift_crm" :selected-date="props.shift.Start_of_work_shift" :shift="props.shift"/>
          </div>
        </div>
      </v-card-text>

      <v-card-actions class="sneat-modal-actions">
        <v-spacer></v-spacer>
        <v-btn color="primary" text @click="close">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>



<style scoped>
.timeline {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 6px;
}
.timeline-item {
  padding: 4px 8px;
  border-radius: 6px;
  background-color: rgba(255,255,255,0.05);
  color: #fff;
  font-size: 0.9rem;
}
.sneat-modal-card {
  background-color: #1b263b;
  color: #e0e6ed;
  border-radius: 12px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.5);
  overflow: hidden;
}

.sneat-modal-header {
  background: linear-gradient(90deg, #3a5579, #1f4e79);
  color: #ffffff;
  font-weight: 600;
  text-align: center;
  justify-content: center;
}

.sneat-modal-content {
  padding: 20px;
}

.field {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
  padding: 8px 12px;
  border-radius: 8px;
  background-color: rgba(255, 255, 255, 0.05);
  transition: background-color 0.2s ease;
}

.field:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.label {
  font-weight: 500;
  color: #cfd7e5;
}

.value {
  font-weight: 600;
  color: #ffffff;
}

.sneat-modal-actions {
  padding: 16px;
  background-color: rgba(0, 0, 0, 0.05);
  justify-content: flex-end;
}
.value .link {
  color: #4fc3f7; /* голубой, чтобы было заметно */
  text-decoration: none;
  font-weight: 600;
}
.value .link:hover {
  text-decoration: underline;
}
</style>
