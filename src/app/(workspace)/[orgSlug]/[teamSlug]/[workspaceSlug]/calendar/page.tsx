import { CalendarGrid } from "@/components/calendar/CalendarGrid"

export default function CalendarPage() {
  return (
    <div className="flex-1 p-6 md:p-8 pt-6 h-full flex flex-col">
      <div className="flex flex-col space-y-2 mb-6">
        <h2 className="text-3xl font-bold tracking-tight">Calendar</h2>
        <p className="text-muted-foreground">
          Your workspace schedule and upcoming deadlines.
        </p>
      </div>
      
      <div className="flex-1 min-h-0">
        <CalendarGrid />
      </div>
    </div>
  )
}
