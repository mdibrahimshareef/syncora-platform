"use client"

import * as React from "react"
import { Task } from "@/types"
import { useUIStore } from "@/stores/ui-store"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  format,
  addMonths,
  subMonths,
  isToday
} from "date-fns"

interface TaskCalendarViewProps {
  tasks: Task[]
}

export function TaskCalendarView({ tasks }: TaskCalendarViewProps) {
  const { setSelectedTaskId } = useUIStore()
  const [currentDate, setCurrentDate] = React.useState(new Date())

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }) // Monday start
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 })

  const days = eachDayOfInterval({
    start: startDate,
    end: endDate
  })

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1))
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1))
  const today = () => setCurrentDate(new Date())

  return (
    <div className="flex flex-col h-full bg-card border rounded-md overflow-hidden">
      <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-b gap-4">
        <h3 className="font-semibold text-lg">{format(currentDate, "MMMM yyyy")}</h3>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={today}>Today</Button>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="size-8" onClick={prevMonth}>
              <ChevronLeft className="size-4" />
            </Button>
            <Button variant="outline" size="icon" className="size-8" onClick={nextMonth}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto">
        <div className="min-w-[700px] h-full flex flex-col">

      <div className="grid grid-cols-7 border-b">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
          <div key={day} className="p-2 text-center text-xs font-semibold text-muted-foreground border-r last:border-r-0">
            {day}
          </div>
        ))}
      </div>

      <div className="flex-1 grid grid-cols-7 auto-rows-fr">
        {days.map((day, i) => {
          const dayTasks = tasks.filter(t => t.dueDate && isSameDay(new Date(t.dueDate), day))
          const isCurrentMonth = isSameMonth(day, currentDate)
          const isDayToday = isToday(day)

          return (
            <div 
              key={day.toISOString()} 
              className={`min-h-[100px] p-2 border-r border-b border-border last-in-row:border-r-0 ${
                !isCurrentMonth ? 'bg-muted/30 text-muted-foreground' : ''
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className={`text-xs font-medium size-6 flex items-center justify-center rounded-full ${
                  isDayToday ? 'bg-primary text-primary-foreground' : ''
                }`}>
                  {format(day, "d")}
                </span>
              </div>
              <div className="space-y-1.5 overflow-y-auto max-h-[80px] scrollbar-thin">
                {dayTasks.map(task => (
                  <div 
                    key={task.id}
                    onClick={() => setSelectedTaskId(task.id)}
                    className={`text-[10px] p-1.5 rounded truncate cursor-pointer hover:opacity-80 transition-opacity ${
                      task.status === 'Done' ? 'bg-muted text-muted-foreground line-through' : 'bg-primary/10 text-primary font-medium'
                    }`}
                  >
                    {task.title}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
        </div>
      </div>
    </div>
  </div>
  )
}
