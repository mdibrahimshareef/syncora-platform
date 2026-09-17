"use client"

import * as React from "react"
import { Task, WorkflowStatus } from "@/types"
import { useUIStore } from "@/stores/ui-store"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
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

interface TaskListViewProps {
  tasks: Task[]
  projectStatuses?: WorkflowStatus[]
}

export function TaskListView({ tasks, projectStatuses }: TaskListViewProps) {
  const { setSelectedTaskId } = useUIStore()
  const bulkUpdateTasks = useDataStore(s => s.bulkUpdateTasks);
  const bulkDeleteTasks = useDataStore(s => s.bulkDeleteTasks);
  const [selectedTaskIds, setSelectedTaskIds] = React.useState<string[]>([])

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTaskIds(tasks.map(t => t.id))
    } else {
      setSelectedTaskIds([])
    }
  }

  const toggleTaskSelection = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedTaskIds(prev => [...prev, id])
    } else {
      setSelectedTaskIds(prev => prev.filter(t => t !== id))
    }
  }

  const handleBulkStatusUpdate = async (status: Task['status']) => {
    try {
      await bulkUpdateTasks(selectedTaskIds, { status })
      setSelectedTaskIds([])
      toast.success(`Updated ${selectedTaskIds.length} tasks`)
    } catch(err) { toast.error("Update failed") }
  }

  const handleBulkPriorityUpdate = async (priority: Task['priority']) => {
    try {
      await bulkUpdateTasks(selectedTaskIds, { priority })
      setSelectedTaskIds([])
      toast.success(`Updated ${selectedTaskIds.length} tasks`)
    } catch(err) { toast.error("Update failed") }
  }

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedTaskIds.length} tasks?`)) return
    try {
      await bulkDeleteTasks(selectedTaskIds)
      setSelectedTaskIds([])
      toast.success("Tasks deleted")
    } catch(err) { toast.error("Delete failed") }
  }

  const getPriorityColor = (priority: string) => {
    return {
      'Low': 'text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-400',
      'Medium': 'text-blue-600 bg-blue-100 dark:bg-blue-900/50 dark:text-blue-400',
      'High': 'text-amber-600 bg-amber-100 dark:bg-amber-900/50 dark:text-amber-400',
      'Urgent': 'text-destructive bg-destructive/10 dark:bg-destructive/20 dark:text-red-400',
    }[priority]
  }

  const getStatusColor = (status: string) => {
    const defaultColorMap: Record<string, string> = {
      'Todo': 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300',
      'In Progress': 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300',
      'In Review': 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300',
      'Done': 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300',
    }
    
    // First try the hardcoded Tailwind colors if it's a default status
    if (defaultColorMap[status]) return defaultColorMap[status]
    
    // Otherwise look up the custom status color and generate a simple class (or just use inline styles later)
    // For now, if we don't have a specific map, just return a fallback
    if (projectStatuses) {
      const s = projectStatuses.find(s => s.name === status)
      if (s) {
        // e.g., 'blue' -> 'bg-blue-50 text-blue-700 ...'
        // For simplicity we just map basic tailwind colors
        const color = s.color || 'slate'
        return `bg-${color}-50 text-${color}-700 border-${color}-200 dark:bg-${color}-900/30 dark:text-${color}-300`
      }
    }
    
    return 'bg-slate-100 text-slate-700'
  }

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground pt-12">
        <p>No tasks match the current filters.</p>
      </div>
    )
  }

  return (
    <div className="rounded-md border bg-card">
      <div className="overflow-x-auto w-full">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40px]">
              <Checkbox 
                checked={tasks.length > 0 && selectedTaskIds.length === tasks.length}
                onCheckedChange={(checked) => toggleSelectAll(checked as boolean)}
                aria-label="Select all"
              />
            </TableHead>
            <TableHead className="w-[300px]">Task</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Assignee</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead>Labels</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task) => (
            <TableRow 
              key={task.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => setSelectedTaskId(task.id)}
            >
              <TableCell onClick={(e) => e.stopPropagation()}>
                <Checkbox 
                  checked={selectedTaskIds.includes(task.id)}
                  onCheckedChange={(checked) => toggleTaskSelection(task.id, checked as boolean)}
                  aria-label="Select task"
                />
              </TableCell>
              <TableCell className="font-medium">
                {task.title}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={`font-normal ${getStatusColor(task.status)}`}>
                  {task.status}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant="secondary" className={`text-[9px] px-1 h-4 font-medium uppercase tracking-wider ${getPriorityColor(task.priority)}`}>
                  {task.priority}
                </Badge>
              </TableCell>
              <TableCell>
                {task.assignee ? (
                  <div className="flex items-center gap-2">
                    <Avatar className="size-6">
                      <AvatarFallback className="text-[10px] bg-secondary text-secondary-foreground">
                        {task.assignee.initials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-muted-foreground">{task.assignee.name}</span>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground italic">Unassigned</span>
                )}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {task.dueDate ? format(new Date(task.dueDate), "MMM d, yyyy") : '-'}
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {task.labels?.map(label => (
                    <Badge key={label.id} variant="secondary" className={`text-[9px] px-1 h-4 font-medium uppercase tracking-wider ${label.color}`}>
                      {label.name}
                    </Badge>
                  ))}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      </div>

      {selectedTaskIds.length > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] sm:w-auto max-w-2xl bg-background/70 backdrop-blur-xl border border-border/50 shadow-2xl rounded-full px-5 py-3 flex flex-wrap justify-center items-center gap-3 sm:gap-5 z-50 animate-in slide-in-from-bottom-8 fade-in ring-1 ring-black/5 dark:ring-white/10">
          <div className="flex items-center gap-3 border-r border-border/50 pr-3 sm:pr-5">
            <Badge variant="default" className="px-2.5 py-0.5 rounded-full bg-primary text-primary-foreground shadow-sm">{selectedTaskIds.length}</Badge>
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
