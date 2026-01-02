export function useHelpers() {
  const formatDateForZoho = (date) => {
    const d = new Date(date)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  const formatDateForZoho2 = (date,time) => {
    const d = new Date(date)
    const tzOffset = -d.getTimezoneOffset()
    const diff = tzOffset >= 0 ? '+' : '-'
    const pad = (n) => String(Math.floor(Math.abs(n))).padStart(2, '0')
    const offset = `${diff}${pad(tzOffset / 60)}:${pad(tzOffset % 60)}`

    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    let current_hours = "";
    let current_minutes = "";
    let current_seconds = "";
    if(time === "start")
    {
      current_hours = '0';
      current_minutes = '0';
      current_seconds = '0';
    }else {
      current_hours = '23';
      current_minutes = '59';
      current_seconds = '59';
    }
    const hours = String(d.getHours()).padStart(2, current_hours)
    const minutes = String(d.getMinutes()).padStart(2, current_minutes)
    const seconds = String(d.getSeconds()).padStart(2, current_seconds)

    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${offset}`
  }

  const formatDateForZoho3 = (date,time) =>{
    const d = new Date(date)

    if (time) {
      const [hours, minutes] = time.split(':').map(Number)
      d.setHours(hours+1)
      d.setMinutes(minutes)
      d.setSeconds(0)
    }

    // Часовой пояс
    const tzOffset = -d.getTimezoneOffset()
    const diff = tzOffset >= 0 ? '+' : '-'
    const pad = (n) => String(Math.floor(Math.abs(n))).padStart(2, '0')
    const offset = `${diff}${pad(tzOffset / 60)}:${pad(tzOffset % 60)}`

    // Дата
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const hoursStr = String(d.getHours()).padStart(2, '0')
    const minutesStr = String(d.getMinutes()).padStart(2, '0')
    const secondsStr = String(d.getSeconds()).padStart(2, '0')

    return `${year}-${month}-${day}T${hoursStr}:${minutesStr}:${secondsStr}${offset}`
  }

  const formatDateForZoho4 = (date,time) => {
    const [datePart, timePart] = date.split('T')
    let current_hours = "";
    let current_minutes = "";
    let current_seconds = "";
    if(time === "start")
    {
      current_hours = '01';
      current_minutes = '01';
      current_seconds = '01';
    }else {
      current_hours = '23';
      current_minutes = '59';
      current_seconds = '59';
    }
    return `${datePart}T${current_hours}:${current_minutes}:${current_seconds}+02:00`
  }

  const getDateRange = (startDate, endDate) => {
    const dates = []
    let current = new Date(startDate)
    const end = new Date(endDate)

    while (current <= end) {
      dates.push(current.toISOString().slice(0, 10)) // формат YYYY-MM-DD
      current.setDate(current.getDate() + 1)
    }

    return dates
  }

  const formatDayMonth = (dateStr) => {
    const d = new Date(dateStr)
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    return `${day}.${month}`
  }

  const formatDateTimeRange = (isoString) => {
    if (!isoString) return ''
    const d = new Date(isoString)
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    const hours = String(d.getHours()).padStart(2, '0')-1
    const minutes = String(d.getMinutes()).padStart(2, '0')

    return `${year}-${month}-${day} ${hours}:${minutes}`
  }
  const getSchedulersCarsByDate = (date, schedulers, cars, currentDriverId = null) => {
    if (!date) return cars

    const busySchedulers = schedulers.filter(s => {
      return (
        s.Start_of_work_shift === date &&
        s.Status !== 'Cancelled'
      )
    })

    const busyCarIds = busySchedulers
      .filter(s => !currentDriverId || s.Driver?.id !== currentDriverId)
      .map(s => s.Auto?.id)

    return cars.filter(c => !busyCarIds.includes(c.id))
  }

  return {formatDateForZoho,formatDateForZoho2,formatDateForZoho3,formatDateForZoho4, getDateRange,formatDayMonth,getSchedulersCarsByDate,formatDateTimeRange}
}
