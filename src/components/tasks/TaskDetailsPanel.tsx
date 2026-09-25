"use client"

import * as React from "react"
import { useUIStore } from "@/stores/ui-store"
import { useDataStore } from "@/stores/data-store"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Calendar, User, Clock, CheckCircle2, AlignLeft, Edit2, Trash2, Plus, Link as LinkIcon, X, Paperclip, Download, Loader2, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CreateTaskDialog } from "@/components/tasks/CreateTaskDialog"
import { TaskComments } from "@/components/tasks/TaskComments"
import dynamic from 'next/dynamic'
const RichTextEditor = dynamic(() => import("@/components/ui/rich-text-editor").then(mod => mod.RichTextEditor), { ssr: false })
import { toast } from "sonner"
import { Task } from "@/types"
import { TaskDependencies } from "@/components/tasks/TaskDependencies"
import { ManualTimeEntryModal } from "@/components/time-tracking/ManualTimeEntryModal"

export function TaskDetailsPanel() {
  const { selectedTaskId, setSelectedTaskId } = useUIStore()
  const workspaceTasks = useDataStore(s => s.workspaceTasks);
  const tasks = useDataStore(s => s.tasks);
  const projects = useDataStore(s => s.projects);
  const deleteTask = useDataStore(s => s.deleteTask);
  const addDependency = useDataStore(s => s.addDependency);
  const removeDependency = useDataStore(s => s.removeDependency);
  const updateTask = useDataStore(s => s.updateTask);
  const currentUser = useDataStore(s => s.currentUser);
  const toggleWatcher = useDataStore(s => s.toggleWatcher);
  const milestones = useDataStore(s => s.milestones);
  const documents = useDataStore(s => s.documents);
  const projectStatuses = useDataStore(s => s.projectStatuses);
  const customers = useDataStore(s => s.customers);
  const requests = useDataStore(s => s.requests);
  const approvals = useDataStore(s => s.approvals);
  const addAttachment = useDataStore(s => s.addAttachment);
  const removeAttachment = useDataStore(s => s.removeAttachment);
  
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false)
  const [isCreateSubtaskDialogOpen, setIsCreateSubtaskDialogOpen] = React.useState(false)
  const [addingDependency, setAddingDependency] = React.useState(false)
  const [selectedDependencyTask, setSelectedDependencyTask] = React.useState<string>("")
  const [isEditingDescription, setIsEditingDescription] = React.useState(false)
  const [tempDescription, setTempDescription] = React.useState("")
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = React.useState(false)


  const task = React.useMemo(() => {
    return workspaceTasks.find(t => t.id === selectedTaskId) || tasks.find(t => t.id === selectedTaskId)
  }, [selectedTaskId, workspaceTasks, tasks])

  const subtasks = React.useMemo(() => {
    if (!task) return []
    const sourceList = task.projectId ? workspaceTasks.filter(t => t.projectId === task.projectId) : workspaceTasks
    return sourceList.filter(t => t.parentId === task.id).sort((a, b) => a.position - b.position)
  }, [task, workspaceTasks])

  const otherProjectTasks = React.useMemo(() => {
    if (!task) return []
    const sourceList = task.projectId ? workspaceTasks.filter(t => t.projectId === task.projectId) : workspaceTasks
    return sourceList.filter(t => t.id !== task.id)
  }, [task, workspaceTasks])

  const handleDelete = () => {
    if (task) {
      deleteTask(task.id)
      setSelectedTaskId(null)
      toast.success("Task deleted")
    }
  }

  const handleAddDependency = async () => {
    if (!task || !selectedDependencyTask) return
    try {
      await addDependency(task.id, selectedDependencyTask, 'blocking')
      setAddingDependency(false)
      setSelectedDependencyTask("")
      toast.success("Dependency added")
    } catch (err) {
      toast.error("Failed to add dependency")
    }
  }

  const toggleSubtaskStatus = async (subtask: Task) => {
    const newStatus = subtask.status === 'Done' ? 'Todo' : 'Done'
    try {
      await updateTask(subtask.id, { status: newStatus })
    } catch (err) {
      toast.error("Failed to update subtask")
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !task) return
    
    setIsUploading(true)
    try {
      await addAttachment(file, task.id)
      toast.success("File uploaded successfully")
    } catch(err) {
      toast.error("Failed to upload file")
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDownload = async (path: string, name: string) => {
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data, error } = await supabase.storage.from('attachments').download(path)
      if (error) throw error
      
      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = name
      a.click()
    } catch (err) {
      toast.error("Download failed")
    }
  }

  if (!task) return null

  return (
    <>
      <Dialog open={!!selectedTaskId && !isEditDialogOpen && !isCreateSubtaskDialogOpen} onOpenChange={(open) => !open && setSelectedTaskId(null)}>
        <DialogContent className="sm:max-w-xl md:max-w-2xl lg:max-w-4xl overflow-y-auto max-h-[90vh]">
          <DialogHeader className="text-left space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs font-normal text-muted-foreground uppercase tracking-wider">
                  {projects.find(p => p.id === task.projectId)?.name || task.projectId} - {task.id.substring(0, 8)}
                </Badge>
                {task.parentId && (
                  <Badge variant="secondary" className="text-xs font-normal cursor-pointer" onClick={() => setSelectedTaskId(task.parentId!)}>
                    Subtask of {task.parentId.substring(0, 8)}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className={`size-8 ${task.watchers?.some(w => w.userId === currentUser?.id) ? 'text-primary' : 'text-muted-foreground'}`}
                  onClick={() => toggleWatcher(task.id, task.watchers?.some(w => w.userId === currentUser?.id) || false)}
                  title={task.watchers?.some(w => w.userId === currentUser?.id) ? "Unwatch task" : "Watch task"}
                >
                  {task.watchers?.some(w => w.userId === currentUser?.id) ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                </Button>
                <ManualTimeEntryModal taskId={task.id} projectId={task.projectId || undefined} />
                <Button variant="ghost" size="icon" className="size-8" onClick={() => setIsEditDialogOpen(true)}>
                  <Edit2 className="size-4" />
                </Button>
                
                <AlertDialog>
                  <AlertDialogTrigger render={<Button variant="ghost" size="icon" className="size-8 text-destructive hover:text-destructive hover:bg-destructive/10" />}>
                    <Trash2 className="size-4" />
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this task?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the task &quot;{task.title}&quot;.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
            <DialogTitle className="text-2xl font-semibold leading-tight">{task.title}</DialogTitle>
            <DialogDescription className="sr-only">Task details for {task.title}</DialogDescription>
          </DialogHeader>

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlignLeft className="size-4 text-muted-foreground" /> Description
                  </div>
                  {!isEditingDescription && (
                    <Button variant="ghost" size="sm" onClick={() => {
                      setTempDescription(task.description || "")
                      setIsEditingDescription(true)
                    }}>
                      <Edit2 className="size-3 mr-1" /> Edit
                    </Button>
                  )}
                </h4>
                {isEditingDescription ? (
                  <div className="space-y-2">
                    <RichTextEditor 
                      value={tempDescription} 
                      onChange={setTempDescription} 
                      placeholder="Add a more detailed description..."
                    />
                    <div className="flex items-center gap-2 justify-end">
                      <Button variant="ghost" size="sm" onClick={() => setIsEditingDescription(false)}>Cancel</Button>
                      <Button size="sm" onClick={async () => {
                        try {
                          await updateTask(task.id, { description: tempDescription })
                          setIsEditingDescription(false)
                          toast.success("Description updated")
                        } catch(e) {
                          toast.error("Failed to update description")
                        }
                      }}>Save</Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-foreground bg-muted/30 p-4 rounded-lg min-h-[100px] border border-border/50 prose prose-sm dark:prose-invert max-w-none">
                    {task.description ? (
                      <div dangerouslySetInnerHTML={{ __html: task.description }} />
                    ) : (
                      <span className="text-muted-foreground italic">No description provided.</span>
                    )}
                  </div>
                )}
              </div>

              {/* Subtasks Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-muted-foreground" /> Subtasks
                  </h4>
                  <Button variant="ghost" size="sm" onClick={() => setIsCreateSubtaskDialogOpen(true)}>
                    <Plus className="size-4 mr-1" /> Add Subtask
                  </Button>
                </div>
                {subtasks.length > 0 && (
                  <div className="flex items-center gap-3 mb-4 p-3 bg-muted/40 rounded-lg border border-border/50">
                    <div className="flex-1 h-2 bg-muted/80 rounded-full overflow-hidden shadow-inner">
                      <div 
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500 ease-out" 
                        style={{ width: `${Math.round((subtasks.filter(s => s.status === 'Done').length / subtasks.length) * 100)}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                      {subtasks.filter(s => s.status === 'Done').length} / {subtasks.length}
                    </span>
                  </div>
                )}
                
                <div className="space-y-2">
                  {subtasks.length === 0 ? (
                    <div className="text-sm text-muted-foreground italic bg-muted/20 p-3 rounded-lg border border-border/50">
                      No subtasks. Break down this task by adding one.
                    </div>
                  ) : (
                    subtasks.map(subtask => (
                      <div key={subtask.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-card hover:bg-muted/30 transition-colors">
                        <button 
                          onClick={() => toggleSubtaskStatus(subtask)}
                          className={`size-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${subtask.status === 'Done' ? 'bg-primary border-primary text-primary-foreground' : 'border-input hover:border-primary'}`}
                        >
                          {subtask.status === 'Done' && <CheckCircle2 className="size-3" />}
                        </button>
                        <span 
                          className={`text-sm flex-1 cursor-pointer hover:underline ${subtask.status === 'Done' ? 'line-through text-muted-foreground' : ''}`}
                          onClick={() => setSelectedTaskId(subtask.id)}
                        >
                          {subtask.title}
                        </span>
                        {subtask.assignee && (
                          <Avatar className="size-5 shrink-0">
                            <AvatarFallback className="text-[10px] bg-secondary">{subtask.assignee.initials}</AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <TaskComments task={task} />
            </div>

            <div className="space-y-6">
              {/* Metadata Sidebar */}
              <div className="bg-muted/30 p-4 rounded-lg border border-border/50 space-y-4">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Status</span>
                  <Select 
                    value={task.status} 
                    onValueChange={(val) => updateTask(task.id, { status: val as any })}
                  >
                    <SelectTrigger className="h-8 text-xs mt-1 bg-transparent border-border/50">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      {projectStatuses && projectStatuses.length > 0 ? (
                        projectStatuses.map(s => (
                          <SelectItem key={s.id || s.name} value={s.name} className="text-xs">{s.name}</SelectItem>
                        ))
                      ) : (
                        <>
                          <SelectItem value="Todo" className="text-xs">Todo</SelectItem>
                          <SelectItem value="In Progress" className="text-xs">In Progress</SelectItem>
                          <SelectItem value="Done" className="text-xs">Done</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Priority</span>
                  <div className="font-medium text-sm">{task.priority}</div>
                </div>

                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Time Tracked</span>
                  <div className="font-medium text-sm flex items-center gap-1 text-muted-foreground">
                    <Clock className="size-3.5" />
                    {/* In a real implementation this would sum up time entries. For now, showing placeholder if none. */}
                    <span>--:--</span>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Assignee</span>
                  <div className="flex items-center gap-2 mt-1">
                    {task?.assignee ? (
                      <>
                        <Avatar className="size-6">
                          <AvatarFallback className="text-xs bg-secondary">{task.assignee?.initials}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-sm">{task.assignee?.name}</span>
                      </>
                    ) : (
                      <span className="text-sm text-muted-foreground italic">Unassigned</span>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Start Date</span>
                  <div className="font-medium text-sm">
                    {task.startDate ? new Date(task.startDate).toLocaleDateString() : <span className="text-muted-foreground italic">None</span>}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Due Date</span>
                  <div className="flex items-center gap-2 font-medium text-sm">
                    {task.dueDate ? (
                      <>
                        <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                        {task.status !== 'Done' && new Date(task.dueDate) < new Date() && (
                          <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Overdue</Badge>
                        )}
                        {task.status !== 'Done' && new Date(task.dueDate) >= new Date() && new Date(task.dueDate).getTime() - new Date().getTime() <= 24 * 60 * 60 * 1000 && (
                          <Badge variant="secondary" className="bg-orange-500/10 text-orange-500 text-[10px] px-1.5 py-0 border-orange-500/20">Due soon</Badge>
                        )}
                      </>
                    ) : (
                      <span className="text-muted-foreground italic">None</span>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Effort (Hours)</span>
                  <Input 
                    type="number"
                    min="0"
                    step="0.5"
                    className="h-8 text-sm"
                    placeholder="e.g. 4"
                    value={task.estimatedTime ? task.estimatedTime / 60 : ''}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value)
                      if (!isNaN(val)) {
                        updateTask(task.id, { estimatedTime: val * 60 })
                      } else if (e.target.value === '') {
                        updateTask(task.id, { estimatedTime: null })
                      }
                    }}
                  />
                </div>

                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Milestone</span>
                  <Select 
                    value={task.milestoneId || "none"} 
                    onValueChange={(val) => updateTask(task.id, { milestoneId: val === "none" ? null : val })}
                  >
                    <SelectTrigger className="h-8 text-xs mt-1 bg-transparent border-border/50">
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" className="text-xs">None</SelectItem>
                      {milestones.filter(m => m.projectId === task.projectId).map(m => (
                        <SelectItem key={m.id} value={m.id} className="text-xs">{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Linked Document</span>
                  <Select 
                    value={task.documentId || "none"} 
                    onValueChange={(val) => updateTask(task.id, { documentId: val === "none" ? undefined : (val as string) })}
                  >
                    <SelectTrigger className="h-8 text-xs mt-1 bg-transparent border-border/50">
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" className="text-xs">None</SelectItem>
                      {documents.map(d => (
                        <SelectItem key={d.id} value={d.id} className="text-xs">{d.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Customer</span>
                  <Select 
                    value={task.customerId || "none"} 
                    onValueChange={(val) => updateTask(task.id, { customerId: val === "none" ? undefined : val })}
                  >
                    <SelectTrigger className="h-8 text-xs mt-1 bg-transparent border-border/50">
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" className="text-xs">None</SelectItem>
                      {customers.map(c => (
                        <SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Linked Request</span>
                  <Select 
                    value={task.requestId || "none"} 
                    onValueChange={(val) => updateTask(task.id, { requestId: val === "none" ? undefined : val })}
                  >
                    <SelectTrigger className="h-8 text-xs mt-1 bg-transparent border-border/50">
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" className="text-xs">None</SelectItem>
                      {requests.map(r => (
                        <SelectItem key={r.id} value={r.id} className="text-xs">{r.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Linked Approval</span>
                  <Select 
                    value={task.approvalId || "none"} 
                    onValueChange={(val) => updateTask(task.id, { approvalId: val === "none" ? undefined : (val as string) })}
                  >
                    <SelectTrigger className="h-8 text-xs mt-1 bg-transparent border-border/50">
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" className="text-xs">None</SelectItem>
                      {approvals.map(a => (
                        <SelectItem key={a.id} value={a.id} className="text-xs">{a.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Recurrence</span>
                  <Select 
                    value={task.recurrenceRule || "none"} 
                    onValueChange={(val) => updateTask(task.id, { recurrenceRule: val === "none" ? null : val })}
                  >
                    <SelectTrigger className="h-8 text-xs mt-1 bg-transparent border-border/50">
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" className="text-xs">None</SelectItem>
                      <SelectItem value="daily" className="text-xs">Daily</SelectItem>
                      <SelectItem value="weekly" className="text-xs">Weekly</SelectItem>
                      <SelectItem value="monthly" className="text-xs">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                  {task.isRecurring && (
                    <div className="text-[10px] text-muted-foreground mt-1 px-1 flex items-center gap-1">
                      <Clock className="size-3" /> Auto-spawns next task on Done
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Labels</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {task.labels?.map(label => (
                      <Badge key={label.id} variant="secondary" className={`${label.color} text-xs`}>
                        {label.name}
                      </Badge>
                    ))}
                    {(!task.labels || task.labels.length === 0) && (
                      <span className="text-sm text-muted-foreground italic">No labels</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Dependencies Section */}
              <TaskDependencies task={task} onTaskClick={setSelectedTaskId} />

              {/* Attachments Section */}
              <div className="space-y-3 pt-4 border-t border-border">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Paperclip className="size-4 text-muted-foreground" /> Attachments
                  </h4>
                  <Button variant="ghost" size="sm" className="h-8" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                    {isUploading ? <Loader2 className="size-3 mr-1 animate-spin" /> : <Plus className="size-3 mr-1" />} 
                    Add
                  </Button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    onChange={handleFileUpload} 
                  />
                </div>
                
                <div className="space-y-2">
                  {!task.attachments || task.attachments.length === 0 ? (
                    <div className="text-sm text-muted-foreground italic bg-muted/20 p-3 rounded-lg border border-border/50">
                      No attachments yet.
                    </div>
                  ) : (
                    task.attachments.map(attachment => (
                      <div key={attachment.id} className="flex items-center justify-between p-2 rounded-lg border border-border/50 bg-card hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-2 overflow-hidden flex-1">
                          <div className="size-6 rounded bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <Paperclip className="size-3" />
                          </div>
                          <div className="flex flex-col overflow-hidden">
                            <span className="text-xs font-medium truncate">{attachment.fileName}</span>
                            <span className="text-[10px] text-muted-foreground">{(attachment.fileSize / 1024).toFixed(1)} KB</span>
                          </div>
                        </div>
                        <div className="flex items-center shrink-0">
                          <Button variant="ghost" size="icon" className="size-6" onClick={() => handleDownload(attachment.storagePath, attachment.fileName)}>
                            <Download className="size-3" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="size-6 text-muted-foreground hover:text-destructive"
                            onClick={async () => {
                              if(confirm('Delete this attachment?')) {
                                try {
                                  await removeAttachment(attachment.id, attachment.storagePath)
                                  toast.success("Attachment deleted")
                                } catch(e) { toast.error("Failed to delete") }
                              }
                            }}
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <CreateTaskDialog 
        open={isEditDialogOpen} 
        onOpenChange={setIsEditDialogOpen} 
        defaultValues={task} 
      />

      {/* Subtask Creation Dialog */}
      <CreateTaskDialog 
        open={isCreateSubtaskDialogOpen} 
        onOpenChange={setIsCreateSubtaskDialogOpen} 
        defaultValues={{ projectId: task.projectId, parentId: task.id }} 
      />
    </>
  )
}
