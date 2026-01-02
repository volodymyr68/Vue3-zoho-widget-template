<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  shift_crm: Object,
  selectedDate:String,
  shift:Object,
})

//props.shift.Start_of_work_shift
//props.shift.End_of_work_shift

// Цвета активностей
const activityColors = {
  // 'Car Pickup': '#2196F3',
  'Order': '#4CAF50',
  'inactive': '#FFC107',
  'waiting_orders': '#580970',
  'has_order': '#39b027',
  'busy': '#d8590f'
}

// Ссылка на wrapper для тултипа
const timelineWrapper = ref(null)

// Таймлайн: чистый JS, без dayjs
const timelineData = computed(() => {
  console.log("shift_crm",props.selectedDate)
  if (!props.shift_crm?.Shift_Timeline?.length) return []

  const selectedDate = props.selectedDate.split('T')[0] || new Date().toISOString().split('T')[0]
  return props.shift_crm.Shift_Timeline
    .filter(item => item.Start_Time.startsWith(selectedDate))
    .map(item => {
      const start = new Date(item.Start_Time)
      const end = new Date(item.End_Time)
      start.setHours(start.getHours() - 1)
      end.setHours(end.getHours() -1)

      // сдвигаем в GMT+3 (если исходно в UTC)

      const startHour = start.getHours() + start.getMinutes() / 60
      const endHour = end.getHours() + end.getMinutes() / 60

      return {
        label: item.Activity_Type,
        startHour,
        endHour,
        date: selectedDate
      }
    })

})

const humanizeString = (s) => {
  if (!s && s !== 0) return ''
  return String(s)
    .replace(/_/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

// Тултип
const tooltip = ref({visible: false, x: 0, text: ''})

const showTooltip = (event, seg) => {
  const rect = timelineWrapper.value.getBoundingClientRect()
  const x = event.clientX - rect.left
  tooltip.value = {
    visible: true,
    x,
    text: `${humanizeString(seg.label)}: ${formatHour(seg.startHour)} - ${formatHour(seg.endHour)}`
  }
}

const hideTooltip = () => {
  tooltip.value.visible = false
}

const formatHour = (hour) => {
  const h = Math.floor(hour)
  const m = Math.round((hour - h) * 60)
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`
}
const shiftRange = computed(() => {
  if (!props.shift?.Start_of_work_shift || !props.shift?.End_of_work_shift) return null

  const start = new Date(props.shift.Start_of_work_shift)
  const end = new Date(props.shift.End_of_work_shift)

  const startHour = start.getHours() + start.getMinutes() / 60 -1
  const endHour = end.getHours() + end.getMinutes() / 60 -1
  console.log("startHour",startHour)
  console.log("endHour",endHour)
  return { startHour, endHour }
})
</script>

<template>
  <div class="timeline-wrapper" ref="timelineWrapper">
    <div class="timeline-scale">
      <div v-for="h in 13" :key="h" class="scale-mark" :style="{ left: `${(h-1)*100/12}%` }">
        {{ String((h-1)*2).padStart(2,'0') }}
      </div>
    </div>

    <div class="timeline-line">
      <div
        v-if="shiftRange"
        class="shift-background"
        :style="{
      left: `${(shiftRange.startHour / 24) * 100}%`,
      width: `${((shiftRange.endHour - shiftRange.startHour) / 24) * 100}%`
    }"
      ></div>

      <div
        v-for="(seg,i) in timelineData"
        :key="i"
        class="timeline-segment"
        :style="{
      left: `${(seg.startHour/24)*100}%`,
      width: `${((seg.endHour - seg.startHour)/24)*100}%`,
      backgroundColor: activityColors[seg.label] || '#90A4AE'
    }"
        @mousemove="e => showTooltip(e, seg)"
        @mouseleave="hideTooltip"
      ></div>
    </div>

    <div v-if="tooltip.visible" class="tooltip" :style="{ left: tooltip.x+'px' }">
      {{ tooltip.text }}
    </div>

    <div class="timeline-legend">
      <div v-for="(color,key) in activityColors" :key="key" class="legend-item">
        <span class="legend-color" :style="{ backgroundColor: color }"></span> {{ humanizeString(key) }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.timeline-wrapper {
  position: relative;
  width: 100%;
  height: 120px;
  margin-top: 16px;
  font-family: sans-serif;
}

.timeline-scale {
  position: relative;
  height: 20px;
  border-bottom: 1px solid #ccc;
}

.scale-mark {
  position: absolute;
  top: 0;
  transform: translateX(-50%);
  font-size: 12px;
  color: #ffffff;
}

.timeline-line {
  position: relative;
  height: 30px;
  margin-top: 10px;
  background: #fff; /* Белый фон для пустой линии */
  border-radius: 2px;
  border: 1px solid #ccc;
}

.timeline-segment {
  position: absolute;
  top: 0;
  height: 100%;
  cursor: pointer;
  transition: opacity 0.2s;
  border-right: 2px solid #ffffff;
}

.timeline-segment:hover {
  opacity: 0.8;
}

.tooltip {
  position: absolute;
  top: 65px;
  background: #fff;
  color: #333;
  padding: 4px 8px;
  font-size: 12px;
  border-radius: 4px;
  white-space: nowrap;
  transform: translateX(-50%);
  pointer-events: none;
}

/* Легенда */
.timeline-legend {
  display: flex;
  flex-wrap: wrap;
  margin-top: 8px;
  font-size: 12px;

}

.legend-item {
  display: flex;
  align-items: center;
  margin-right: 12px;
}

.legend-color {
  width: 12px;
  height: 12px;
  display: inline-block;
  margin-right: 4px;
  border-radius: 2px;
}
.shift-background {
  position: absolute;
  top: 0;
  height: 100%;
  background: rgba(255, 0, 0, 0.25); /* мягкий красноватый фон */
  border-radius: 2px;
  z-index: 0; /* ниже сегментов */
}
.timeline-segment {
  z-index: 1;
  position: absolute;
}
</style>
