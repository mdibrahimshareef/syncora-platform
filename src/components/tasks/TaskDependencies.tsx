"use client"

import * as React from "react"
import { Task } from "@/types"
import { useDataStore } from "@/stores/data-store"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Plus, Link2, X, Lock } from "lucide-react"

interface TaskDependenciesProps {
  task: Task
  onTaskClick: (taskId: string) => void
}

export function TaskDependencies({ task, onTaskClick }: TaskDependenciesProps) {
  const workspaceTasks = useDataStore(s => s.workspaceTasks);
  const addDependency = useDataStore(s => s.addDependency);
  const removeDependency = useDataStore(s => s.removeDependency);
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")

  const dependencies = task.dependencies || []
  const blockedBy = task.blockedBy || []

  const handleAddDependency = async (dependsOnTaskId: string) => {
    try {
      await addDependency(task.id, dependsOnTaskId, 'blocking')
      setOpen(false)
    } catch (err) {
      console.error(err)
    }
  }

  // Filter tasks that can be added as dependencies
  // Exclude current task, already dependent tasks, and tasks that block this one (prevent circular)
  const availableTasks = workspaceTasks.filter(t => 
    t.id !== task.id &&
    !dependencies.some(d => d.dependsOnTaskId === t.id) &&
    !blockedBy.some(b => b.taskId === t.id) &&
    t.title.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 10) // Limit for performance/UI

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-1">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <Link2 className="size-4 text-muted-foreground" /> Dependencies
        </h4>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger render={<Button variant="ghost" size="sm" />}>
            <Plus className="size-4 mr-1" /> Add
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0" align="end">
            <Command>
              <CommandInput 
                placeholder="Search tasks..." 
                value={search}
                onValueChange={setSearch}
              />
              <CommandList>
                <CommandEmpty>No tasks found.</CommandEmpty>
                <CommandGroup heading="Available Tasks">
                  {availableTasks.map(t => (
                    <CommandItem 
                      key={t.id} 
                      value={t.id}
                      onSelect={() => handleAddDependency(t.id)}
                    >
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium truncate">{t.title}</span>
                        <span className="text-xs text-muted-foreground">{t.status}</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-3">
        {dependencies.length === 0 && blockedBy.length === 0 && (
          <div className="text-sm text-muted-foreground italic bg-muted/20 p-3 rounded-lg border border-border/50">
            No dependencies. Add tasks that block or are blocked by this task.
          </div>
        )}

        {/* Tasks that this task blocks (Depends on this task) */}
        {dependencies.length > 0 && (
          <div className="space-y-2">
            <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Blocks</h5>
            <div className="space-y-2">
              {dependencies.map(dep => {
                const blockedTask = workspaceTasks.find(t => t.id === dep.dependsOnTaskId)
                if (!blockedTask) return null
                return (
                  <div key={dep.id} className="flex items-center justify-between gap-3 p-2 rounded-lg border border-border/50 bg-card hover:bg-muted/30 transition-colors">
                    <div 
                      className="flex-1 flex items-center gap-2 cursor-pointer hover:underline text-sm truncate"
                      onClick={() => onTaskClick(blockedTask.id)}
                    >
                      <Lock className="size-3 text-muted-foreground shrink-0" />
                      <span className={`truncate ${blockedTask.status === 'Done' ? 'line-through text-muted-foreground' : ''}`}>
                        {blockedTask.title}
                      </span>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="size-6 shrink-0 opacity-50 hover:opacity-100" 
                      onClick={() => removeDependency(dep.id)}
                    >
                      <X className="size-3" />
                    </Button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Tasks that block this task (This task depends on) */}
        {blockedBy.length > 0 && (
          <div className="space-y-2">
            <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Blocked By</h5>
            <div className="space-y-2">
              {blockedBy.map(dep => {
                const blockingTask = workspaceTasks.find(t => t.id === dep.taskId)
                if (!blockingTask) return null
                return (
                  <div key={dep.id} className="flex items-center justify-between gap-3 p-2 rounded-lg border border-border/50 bg-card hover:bg-muted/30 transition-colors">
                    <div 
                      className="flex-1 flex items-center gap-2 cursor-pointer hover:underline text-sm truncate"
                      onClick={() => onTaskClick(blockingTask.id)}
                    >
                      <Lock className="size-3 text-destructive shrink-0" />
                      <span className={`truncate ${blockingTask.status === 'Done' ? 'line-through text-muted-foreground' : ''}`}>
                        {blockingTask.title}
                      </span>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="size-6 shrink-0 opacity-50 hover:opacity-100" 
                      onClick={() => removeDependency(dep.id)}
                    >
                      <X className="size-3" />
                    </Button>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
