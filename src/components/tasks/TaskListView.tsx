"use client"

import * as React from "react"
import { Task, WorkflowStatus } from "@/types"
import { useUIStore } from "@/stores/ui-store"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Trash2, CheckCircle2, MoreHorizontal } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { format } from "date-fns"
import { useDataStore } from "@/stores/data-store"
import { toast } from "sonner"
import { useVirtualizer } from "@tanstack/react-virtual"

interface TaskListViewProps {
  tasks: Task[]
  projectStatuses?: WorkflowStatus[]
}

const PRIORITY_COLOR_MAP: Record<string, string> = {
  'Low': 'text-slate-600 bg-slate-100 dark:bg-slate-800/80 dark:text-slate-300',
  'Medium': 'text-blue-700 bg-blue-100 dark:bg-blue-900/60 dark:text-blue-300',
  'High': 'text-amber-700 bg-amber-100 dark:bg-amber-900/60 dark:text-amber-300',
  'Urgent': 'text-destructive bg-destructive/10 dark:bg-destructive/20 dark:text-red-300',
}

const DEFAULT_STATUS_COLOR_MAP: Record<string, string> = {
  'Todo': 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300',
  'In Progress': 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300',
  'In Review': 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300',
  'Done': 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300',
}

function getStatusColor(status: string, projectStatuses?: WorkflowStatus[]) {
  if (DEFAULT_STATUS_COLOR_MAP[status]) return DEFAULT_STATUS_COLOR_MAP[status]
  if (projectStatuses) {
    const s = projectStatuses.find(item => item.name === status)
    if (s) {
      const color = s.color || 'slate'
      return `bg-${color}-50 text-${color}-700 border-${color}-200 dark:bg-${color}-900/30 dark:text-${color}-300`
    }
  }
  return 'bg-slate-100 text-slate-700'
}

// Memoized individual task row to prevent cascading re-renders across the virtual window
interface TaskRowItemProps {
  task: Task
  isSelected: boolean
  isFocused: boolean
  rowIndex: number
  virtualTop: number
  virtualHeight: number
  projectStatuses?: WorkflowStatus[]
  onSelectTask: (id: string, checked: boolean) => void
  onOpenTask: (id: string) => void
}

const TaskRowItem = React.memo(function TaskRowItem({
  task,
  isSelected,
  isFocused,
  rowIndex,
  virtualTop,
  virtualHeight,
  projectStatuses,
  onSelectTask,
  onOpenTask,
}: TaskRowItemProps) {
  const statusColor = React.useMemo(
    () => getStatusColor(task.status, projectStatuses),
    [task.status, projectStatuses]
  )

  const priorityColor = PRIORITY_COLOR_MAP[task.priority] || PRIORITY_COLOR_MAP['Medium']

  return (
    <tr
      role="row"
      aria-rowindex={rowIndex + 1}
      aria-selected={isSelected}
      tabIndex={isFocused ? 0 : -1}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: `${virtualHeight}px`,
        transform: `translateY(${virtualTop}px)`,
        display: 'table',
        tableLayout: 'fixed',
      }}
      className={`cursor-pointer transition-colors border-b hover:bg-muted/50 ${
        isSelected ? 'bg-muted/70' : ''
      } ${
        isFocused ? 'ring-2 ring-primary ring-inset z-10' : ''
      }`}
      onClick={() => onOpenTask(task.id)}
    >
      <td className="w-[48px] px-4 py-2 align-middle" onClick={(e) => e.stopPropagation()}>
        <Checkbox 
          checked={isSelected}
          onCheckedChange={(checked) => onSelectTask(task.id, Boolean(checked))}
          aria-label={`Select task: ${task.title}`}
        />
      </td>
      <td className="w-[320px] px-4 py-2 align-middle font-medium truncate">
        <span className="truncate block" title={task.title}>{task.title}</span>
      </td>
      <td className="w-[140px] px-4 py-2 align-middle">
        <Badge variant="outline" className={`font-normal text-xs ${statusColor}`}>
          {task.status}
        </Badge>
      </td>
      <td className="w-[110px] px-4 py-2 align-middle">
        <Badge variant="secondary" className={`text-[9px] px-1.5 h-4 font-medium uppercase tracking-wider ${priorityColor}`}>
          {task.priority}
        </Badge>
      </td>
      <td className="w-[160px] px-4 py-2 align-middle">
        {task.assignee ? (
          <div className="flex items-center gap-2 truncate">
            <Avatar className="size-6 shrink-0">
              <AvatarFallback className="text-[10px] bg-secondary text-secondary-foreground">
                {task.assignee.initials}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground truncate">{task.assignee.name}</span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground italic">Unassigned</span>
        )}
      </td>
      <td className="w-[130px] px-4 py-2 align-middle text-xs text-muted-foreground">
        {task.dueDate ? format(new Date(task.dueDate), "MMM d, yyyy") : '-'}
      </td>
      <td className="px-4 py-2 align-middle">
        <div className="flex flex-wrap gap-1 max-w-[200px] overflow-hidden">
          {task.labels?.map(label => (
            <Badge key={label.id} variant="secondary" className={`text-[9px] px-1 h-4 font-medium uppercase tracking-wider ${label.color}`}>
              {label.name}
            </Badge>
          ))}
        </div>
      </td>
    </tr>
  )
})

export function TaskListView({ tasks, projectStatuses }: TaskListViewProps) {
  const setSelectedTaskId = useUIStore(s => s.setSelectedTaskId)
  const bulkUpdateTasks = useDataStore(s => s.bulkUpdateTasks)
  const bulkDeleteTasks = useDataStore(s => s.bulkDeleteTasks)

  const [selectedTaskIds, setSelectedTaskIds] = React.useState<string[]>([])
  const [focusedIndex, setFocusedIndex] = React.useState<number>(0)

  const parentRef = React.useRef<HTMLDivElement>(null)

  // Virtualizer setup with TanStack Virtual
  const rowVirtualizer = useVirtualizer({
    count: tasks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 52,
    overscan: 10,
  })

  // Keyboard navigation across tasks (J / K / Enter / X)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Suppress if typing in inputs, textareas, contenteditable, or modals
      const target = e.target as HTMLElement | null
      if (
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.hasAttribute('contenteditable') ||
        target?.closest('[role="dialog"]')
      ) {
        return
      }

      if (e.key === 'j' || e.key === 'ArrowDown') {
        if (tasks.length === 0) return
        e.preventDefault()
        setFocusedIndex((prev) => {
          const next = Math.min(prev + 1, tasks.length - 1)
          rowVirtualizer.scrollToIndex(next, { align: 'auto' })
          return next
        })
      } else if (e.key === 'k' || e.key === 'ArrowUp') {
        if (tasks.length === 0) return
        e.preventDefault()
        setFocusedIndex((prev) => {
          const next = Math.max(prev - 1, 0)
          rowVirtualizer.scrollToIndex(next, { align: 'auto' })
          return next
        })
      } else if (e.key === 'Enter') {
        if (tasks.length > 0 && tasks[focusedIndex]) {
          e.preventDefault()
          setSelectedTaskId(tasks[focusedIndex].id)
        }
      } else if (e.key === 'x') {
        if (tasks.length > 0 && tasks[focusedIndex]) {
          e.preventDefault()
          const focusedId = tasks[focusedIndex].id
          setSelectedTaskIds(prev => 
            prev.includes(focusedId) ? prev.filter(id => id !== focusedId) : [...prev, focusedId]
          )
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [tasks, focusedIndex, rowVirtualizer, setSelectedTaskId])

  const toggleSelectAll = React.useCallback((checked: boolean) => {
    if (checked) {
      setSelectedTaskIds(tasks.map(t => t.id))
    } else {
      setSelectedTaskIds([])
    }
  }, [tasks])

  const toggleTaskSelection = React.useCallback((id: string, checked: boolean) => {
    if (checked) {
      setSelectedTaskIds(prev => [...prev, id])
    } else {
      setSelectedTaskIds(prev => prev.filter(t => t !== id))
    }
  }, [])

  const handleBulkStatusUpdate = async (status: Task['status']) => {
    try {
      await bulkUpdateTasks(selectedTaskIds, { status })
      setSelectedTaskIds([])
      toast.success(`Updated ${selectedTaskIds.length} tasks`)
    } catch { toast.error("Update failed") }
  }

  const handleBulkPriorityUpdate = async (priority: Task['priority']) => {
    try {
      await bulkUpdateTasks(selectedTaskIds, { priority })
      setSelectedTaskIds([])
      toast.success(`Updated ${selectedTaskIds.length} tasks`)
    } catch { toast.error("Update failed") }
  }

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedTaskIds.length} tasks?`)) return
    try {
      await bulkDeleteTasks(selectedTaskIds)
      setSelectedTaskIds([])
      toast.success("Tasks deleted")
    } catch { toast.error("Delete failed") }
  }

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground pt-12">
        <p>No tasks match the current filters.</p>
      </div>
    )
  }

  return (
    <div className="rounded-md border bg-card flex flex-col relative">
      {/* Scrollable Container with Virtualizer */}
      <div 
        ref={parentRef}
        role="region"
        aria-label="Tasks list"
        tabIndex={0}
        className="overflow-auto w-full max-h-[calc(100vh-230px)] min-h-[420px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        style={{
          contain: 'layout style',
        }}
      >
        <table className="w-full caption-bottom text-sm border-collapse" role="grid" aria-rowcount={tasks.length}>
          <thead className="sticky top-0 bg-card z-20 border-b shadow-xs">
            <tr role="row" style={{ display: 'table', width: '100%', tableLayout: 'fixed' }}>
              <th className="w-[48px] px-4 py-3 text-left align-middle font-medium text-muted-foreground">
                <Checkbox 
                  checked={tasks.length > 0 && selectedTaskIds.length === tasks.length}
                  onCheckedChange={(checked) => toggleSelectAll(Boolean(checked))}
                  aria-label="Select all tasks"
                />
              </th>
              <th className="w-[320px] px-4 py-3 text-left align-middle font-medium text-muted-foreground">Task</th>
              <th className="w-[140px] px-4 py-3 text-left align-middle font-medium text-muted-foreground">Status</th>
              <th className="w-[110px] px-4 py-3 text-left align-middle font-medium text-muted-foreground">Priority</th>
              <th className="w-[160px] px-4 py-3 text-left align-middle font-medium text-muted-foreground">Assignee</th>
              <th className="w-[130px] px-4 py-3 text-left align-middle font-medium text-muted-foreground">Due Date</th>
              <th className="px-4 py-3 text-left align-middle font-medium text-muted-foreground">Labels</th>
            </tr>
          </thead>
          <tbody 
            style={{ 
              height: `${rowVirtualizer.getTotalSize()}px`, 
              position: 'relative',
              display: 'block',
              width: '100%' 
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const task = tasks[virtualRow.index]
              if (!task) return null

              return (
                <TaskRowItem
                  key={task.id}
                  task={task}
                  isSelected={selectedTaskIds.includes(task.id)}
                  isFocused={focusedIndex === virtualRow.index}
                  rowIndex={virtualRow.index}
                  virtualTop={virtualRow.start}
                  virtualHeight={virtualRow.size}
                  projectStatuses={projectStatuses}
                  onSelectTask={toggleTaskSelection}
                  onOpenTask={setSelectedTaskId}
                />
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Bulk Action Floating Island */}
      {selectedTaskIds.length > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] sm:w-auto max-w-2xl bg-background/80 backdrop-blur-xl border border-border/50 shadow-2xl rounded-full px-5 py-3 flex flex-wrap justify-center items-center gap-3 sm:gap-5 z-50 animate-in slide-in-from-bottom-8 fade-in ring-1 ring-black/5 dark:ring-white/10">
          <div className="flex items-center gap-3 border-r border-border/50 pr-3 sm:pr-5">
            <Badge variant="default" className="px-2.5 py-0.5 rounded-full bg-primary text-primary-foreground shadow-sm">
              {selectedTaskIds.length}
            </Badge>
            <span className="text-sm font-semibold tracking-wide">Tasks Selected</span>
          </div>
          
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="secondary" size="sm" className="rounded-full text-xs h-9 px-4 shadow-sm hover:bg-secondary/80 transition-colors" />}>
                <CheckCircle2 className="mr-2 size-3.5" />
                Status
              </DropdownMenuTrigger>
              <DropdownMenuContent className="rounded-xl shadow-lg border-border/50">
                {projectStatuses && projectStatuses.length > 0 ? (
                  projectStatuses.map(s => (
                    <DropdownMenuItem key={s.name} onClick={() => handleBulkStatusUpdate(s.name as Task['status'])} className="rounded-md">
                      Set {s.name}
                    </DropdownMenuItem>
                  ))
                ) : (
                  <>
                    <DropdownMenuItem onClick={() => handleBulkStatusUpdate('Todo')} className="rounded-md">Set Todo</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkStatusUpdate('In Progress')} className="rounded-md">Set In Progress</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkStatusUpdate('Done')} className="rounded-md">Set Done</DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="secondary" size="sm" className="rounded-full text-xs h-9 px-4 shadow-sm hover:bg-secondary/80 transition-colors" />}>
                <MoreHorizontal className="mr-2 size-3.5" />
                Priority
              </DropdownMenuTrigger>
              <DropdownMenuContent className="rounded-xl shadow-lg border-border/50">
                <DropdownMenuItem onClick={() => handleBulkPriorityUpdate('Low')} className="rounded-md">Set Low</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulkPriorityUpdate('Medium')} className="rounded-md">Set Medium</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulkPriorityUpdate('High')} className="rounded-md">Set High</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulkPriorityUpdate('Urgent')} className="rounded-md text-destructive focus:bg-destructive/10">Set Urgent</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="destructive" size="sm" className="rounded-full text-xs h-9 px-4 ml-2 shadow-sm shadow-destructive/20" onClick={handleBulkDelete}>
              <Trash2 className="mr-2 size-3.5" />
              Delete
            </Button>
            
            <Button variant="ghost" size="icon" className="rounded-full size-9 shrink-0 ml-1 hover:bg-muted transition-colors" onClick={() => setSelectedTaskIds([])}>
              <span className="sr-only">Clear selection</span>
              &times;
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
