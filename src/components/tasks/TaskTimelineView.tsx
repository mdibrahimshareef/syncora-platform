"use client"

import * as React from "react"
import { Task } from "@/types"
import { useDataStore } from "@/stores/data-store"
import { useUIStore } from "@/stores/ui-store"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Target } from "lucide-react"
import { 
  startOfMonth, 
  endOfMonth,
  eachDayOfInterval,
  format,
  addMonths,
  subMonths,
  isToday,
  differenceInDays,
  startOfDay,
  addDays
} from "date-fns"

interface TaskTimelineViewProps {
  tasks: Task[]
}

const CELL_WIDTH = 48 // w-12 = 48px

export function TaskTimelineView({ tasks }: TaskTimelineViewProps) {
  const { setSelectedTaskId } = useUIStore()
  const milestones = useDataStore(s => s.milestones);
  const updateTask = useDataStore(s => s.updateTask);
  const [currentDate, setCurrentDate] = React.useState(new Date())
  const [draggingTask, setDraggingTask] = React.useState<{id: string, startX: number, originalStart: Date, originalEnd: Date, mode: 'move'|'resize-end'} | null>(null)

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  
  const days = eachDayOfInterval({
    start: monthStart,
    end: monthEnd
  })

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1))
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1))
  const today = () => setCurrentDate(new Date())

  // Tasks with dates
  const timelineTasks = tasks.filter(t => t.startDate || t.createdAt).sort((a, b) => {
    const aDate = new Date(a.startDate || a.createdAt).getTime()
    const bDate = new Date(b.startDate || b.createdAt).getTime()
    return aDate - bDate
  })
  
  const projectMilestones = milestones.filter(m => m.projectId === tasks[0]?.projectId)

  // Drag and drop handlers
  const handleMouseDown = (e: React.MouseEvent, taskId: string, taskStart: Date, taskEnd: Date, mode: 'move'|'resize-end') => {
    e.stopPropagation()
    setDraggingTask({
      id: taskId,
      startX: e.clientX,
      originalStart: taskStart,
      originalEnd: taskEnd,
      mode
    })
  }

  React.useEffect(() => {
    if (!draggingTask) return

    const handleMouseMove = (e: MouseEvent) => {
      // Just for visual effect in a full implementation, we'd update state here.
      // But to keep it performant, we'll wait for mouse up to snap to grid.
    }

    const handleMouseUp = async (e: MouseEvent) => {
      const deltaX = e.clientX - draggingTask.startX
      const deltaDays = Math.round(deltaX / CELL_WIDTH)
      
      if (deltaDays !== 0) {
        if (draggingTask.mode === 'move') {
          const newStart = addDays(draggingTask.originalStart, deltaDays)
          const newEnd = addDays(draggingTask.originalEnd, deltaDays)
          await updateTask(draggingTask.id, { 
            startDate: newStart.toISOString(), 
            dueDate: newEnd.toISOString() 
          })
        } else if (draggingTask.mode === 'resize-end') {
          const newEnd = addDays(draggingTask.originalEnd, deltaDays)
          if (newEnd >= draggingTask.originalStart) {
            await updateTask(draggingTask.id, { 
              dueDate: newEnd.toISOString() 
            })
          }
        }
      }
      setDraggingTask(null)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [draggingTask, updateTask])

  return (
    <div className="flex flex-col h-full bg-card border rounded-md overflow-hidden select-none">
      <div className="flex items-center justify-between p-4 border-b shrink-0">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-muted-foreground" />
          {format(currentDate, "MMMM yyyy")}
        </h3>
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

      <div className="flex flex-1 overflow-hidden relative">
        {/* Left pane: Task Names */}
        <div className="shrink-0 w-48 sm:w-64 border-r border-border flex flex-col overflow-y-hidden bg-muted/10 z-10">
          <div className="h-10 border-b border-border flex items-center px-4 text-xs font-semibold text-muted-foreground shrink-0">
            Task / Milestone
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-hide py-2 space-y-1">
            {projectMilestones.map(m => (
              <div key={m.id} className="h-10 px-4 flex items-center text-sm font-semibold text-primary truncate">
                <Target className="w-4 h-4 mr-2" /> {m.name}
              </div>
            ))}
            {projectMilestones.length > 0 && timelineTasks.length > 0 && <div className="h-px bg-border my-2 mx-4" />}
            {timelineTasks.map(task => (
              <div 
                key={task.id} 
                className="h-10 px-4 flex items-center text-sm truncate hover:bg-muted/50 cursor-pointer transition-colors border-l-2 border-transparent hover:border-primary"
                onClick={() => setSelectedTaskId(task.id)}
              >
                <div className="w-2 h-2 rounded-full mr-2 bg-primary" />
                {task.title}
              </div>
            ))}
          </div>
        </div>

        {/* Right pane: Timeline Grid */}
        <div className="flex-1 flex flex-col overflow-auto relative">
          <div className="flex h-10 border-b border-border shrink-0 min-w-max sticky top-0 bg-card z-10">
            {days.map(day => (
              <div 
                key={day.toISOString()} 
                className="w-12 flex flex-col items-center justify-center text-xs border-r border-border last:border-r-0"
              >
                <span className="text-[10px] uppercase opacity-70">{format(day, 'eee')}</span>
                <span>{format(day, "d")}</span>
              </div>
            ))}
          </div>
          
          <div className="flex-1 min-w-max relative py-2 bg-[url('/grid-pattern.svg')] bg-[length:48px_48px]">
            
            {/* Render Milestones */}
            {projectMilestones.map((m, i) => {
              const mDate = m.dueDate ? startOfDay(new Date(m.dueDate)) : null
              if (!mDate) return <div key={m.id} className="h-10" />
              
              const startOffsetDays = differenceInDays(mDate, monthStart)
              const isVisible = startOffsetDays >= 0 && startOffsetDays < days.length
              
              if (!isVisible) return <div key={m.id} className="h-10" />
              
              const leftPos = startOffsetDays * CELL_WIDTH
              
              return (
                <div key={m.id} className="h-10 relative group">
                  <div 
                    className={`absolute top-1 w-8 h-8 -ml-4 flex items-center justify-center text-white bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full cursor-help shadow-lg shadow-indigo-500/30 border-2 border-background ring-2 ring-indigo-500/20 z-10 transition-transform hover:scale-110`}
                    style={{ left: `${leftPos}px` }}
                    title={m.name}
                  >
                    <Target className="w-4 h-4 drop-shadow-md" />
                  </div>
                  {/* Vertical line indicator */}
                  <div className="absolute top-9 bottom-[-100vh] w-px bg-gradient-to-b from-indigo-500/50 to-transparent -ml-px z-0 pointer-events-none" style={{ left: `${leftPos}px` }} />
                </div>
              )
            })}

            {projectMilestones.length > 0 && timelineTasks.length > 0 && <div className="h-px my-2" />}

            {/* Render Tasks */}
            {timelineTasks.map((task, i) => {
              const taskStart = startOfDay(new Date(task.startDate || task.createdAt))
              const taskEnd = task.dueDate ? startOfDay(new Date(task.dueDate)) : taskStart
              
              const startOffsetDays = differenceInDays(taskStart, monthStart)
              const durationDays = Math.max(1, differenceInDays(taskEnd, taskStart) + 1)
              
              const isVisible = startOffsetDays + durationDays > 0 && startOffsetDays < days.length
              
              if (!isVisible) {
                return <div key={task.id} className="h-10" />
              }

              // Visually crop to month view
              const visualStart = Math.max(0, startOffsetDays)
              const visualEnd = Math.min(days.length, startOffsetDays + durationDays)
              const visualDuration = visualEnd - visualStart
              
              const leftPos = visualStart * CELL_WIDTH
              const width = visualDuration * CELL_WIDTH

              const isDragging = draggingTask?.id === task.id
              const opacity = isDragging ? 'opacity-50' : 'opacity-100'

              return (
                <div key={task.id} className="h-10 relative group">
                  <div 
                    className={`absolute top-2 h-6 rounded-full shadow-md shadow-primary/20 border border-primary/20 flex items-center cursor-move transition-all bg-gradient-to-r from-primary/90 to-primary text-primary-foreground hover:shadow-lg hover:brightness-110 ${opacity}`}
                    style={{ left: `${leftPos}px`, width: `${width}px` }}
                    title={task.title}
                    onMouseDown={(e) => handleMouseDown(e, task.id, taskStart, taskEnd, 'move')}
                  >
                    <span className="text-[10px] font-medium truncate px-3 pointer-events-none drop-shadow-sm">
                      {task.title}
                    </span>
                    
                    {/* Resize handle */}
                    <div 
                      className="absolute right-0 top-0 bottom-0 w-3 cursor-col-resize hover:bg-white/30 rounded-r-full transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100"
                      onMouseDown={(e) => handleMouseDown(e, task.id, taskStart, taskEnd, 'resize-end')}
                    >
                      <div className="w-[2px] h-3 bg-primary-foreground/50 rounded-full" />
                    </div>
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
