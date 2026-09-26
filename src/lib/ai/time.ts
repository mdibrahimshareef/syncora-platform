export function getTemporalContext() {
  const now = new Date()
  
  // Calculate Start of Today
  const startOfToday = new Date(now)
  startOfToday.setHours(0, 0, 0, 0)
  
  // Calculate End of Today
  const endOfToday = new Date(now)
  endOfToday.setHours(23, 59, 59, 999)
  
  // Calculate Start of Week (assuming Monday as start)
  const startOfWeek = new Date(startOfToday)
  const day = startOfWeek.getDay()
  const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1) // adjust when day is sunday
  startOfWeek.setDate(diff)
  
  // Calculate End of Week
  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 6)
  endOfWeek.setHours(23, 59, 59, 999)
  
  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const currentWeekday = weekdays[now.getDay()]
  
  return {
    serverNow: now.toISOString(),
    utcNow: now.toISOString(),
    currentDate: startOfToday.toISOString().split('T')[0],
    currentWeekday,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    startOfToday: startOfToday.toISOString(),
    endOfToday: endOfToday.toISOString(),
    startOfWeek: startOfWeek.toISOString(),
    endOfWeek: endOfWeek.toISOString(),
  }
}
