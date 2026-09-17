"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Task, TaskPriority, TaskStatus } from "@/types"
import { useDataStore } from "@/stores/data-store"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import dynamic from 'next/dynamic'
const RichTextEditor = dynamic(() => import("@/components/ui/rich-text-editor").then(mod => mod.RichTextEditor), { ssr: false })
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { CalendarIcon, ChevronsUpDown, Check } from "lucide-react"
import { toast } from "sonner"

const taskSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title is too long"),
  description: z.string().optional(),
  status: z.string(),
  priority: z.enum(['Low', 'Medium', 'High', 'Urgent']),
  projectId: z.string().min(1, "Project is required"),
  assigneeId: z.string().optional(),
  startDate: z.date().optional(),
  dueDate: z.date().optional(),
  estimatedTime: z.number().optional().nullable(),
  milestoneId: z.string().optional().nullable(),
  documentId: z.string().optional().nullable(),
  taskType: z.string().optional(),
})

type TaskFormValues = z.infer<typeof taskSchema>

interface TaskFormProps {
  defaultValues?: Partial<Task>
  onSuccess?: () => void
}

export function TaskForm({ defaultValues, onSuccess }: TaskFormProps) {
  const createTask = useDataStore(s => s.createTask);
  const updateTask = useDataStore(s => s.updateTask);
  const projects = useDataStore(s => s.projects);
  const projectStatuses = useDataStore(s => s.projectStatuses);
  const currentUser = useDataStore(s => s.currentUser);
  const workspaceMembers = useDataStore(s => s.workspaceMembers);
  const milestones = useDataStore(s => s.milestones);
  const documents = useDataStore(s => s.documents);
  const activeWorkspaceId = useDataStore(s => s.activeWorkspaceId);
  const [openAssignee, setOpenAssignee] = React.useState(false)
  
  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: defaultValues?.title || "",
      description: defaultValues?.description || "",
      status: defaultValues?.status || "Todo",
      priority: defaultValues?.priority || "Medium",
      projectId: defaultValues?.projectId || (projects.length > 0 ? projects[0].id : ""),
      assigneeId: defaultValues?.assignee?.id || "",
      startDate: defaultValues?.startDate ? new Date(defaultValues.startDate) : undefined,
      dueDate: defaultValues?.dueDate ? new Date(defaultValues.dueDate) : undefined,
      estimatedTime: defaultValues?.estimatedTime ? defaultValues.estimatedTime / 60 : undefined,
      milestoneId: defaultValues?.milestoneId || undefined,
      documentId: defaultValues?.documentId || undefined,
      taskType: defaultValues?.taskType || undefined,
    },
  })

  async function onSubmit(data: TaskFormValues) {
    const selectedAssignee = workspaceMembers.find(m => m.id === data.assigneeId)
    
    const taskPayload = {
      title: data.title,
      description: data.description,
      status: data.status as TaskStatus,
      priority: data.priority as TaskPriority,
      projectId: data.projectId,
      workspaceId: activeWorkspaceId || defaultValues?.workspaceId || "",
      assignee: selectedAssignee || undefined,
      startDate: data.startDate ? data.startDate.toISOString() : undefined,
      dueDate: data.dueDate ? data.dueDate.toISOString() : undefined,
      labels: defaultValues?.labels || [],
      position: defaultValues?.position || 0,
      parentId: defaultValues?.parentId || null,
      estimatedTime: data.estimatedTime ? data.estimatedTime * 60 : null,
      milestoneId: data.milestoneId === 'none' ? null : data.milestoneId || null,
      documentId: data.documentId === 'none' ? undefined : data.documentId || undefined,
      taskType: data.taskType || 'Task',
    }

    try {
      if (defaultValues?.id) {
        await updateTask(defaultValues.id, taskPayload)
        toast.success("Task updated successfully")
      } else {
        await createTask(taskPayload)
        toast.success("Task created successfully")
      }
      if (onSuccess) onSuccess()
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to save task")
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="Task title..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <RichTextEditor 
                  value={field.value || ""} 
                  onChange={field.onChange} 
                  placeholder="Add more details..." 
                  minHeight="min-h-[120px]"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {projectStatuses && projectStatuses.length > 0 ? (
                      projectStatuses.map(s => (
                        <SelectItem key={s.id || s.name} value={s.name}>{s.name}</SelectItem>
                      ))
                    ) : (
                      <>
                        <SelectItem value="Backlog">Backlog</SelectItem>
                        <SelectItem value="Todo">Todo</SelectItem>
                        <SelectItem value="In Progress">In Progress</SelectItem>
                        <SelectItem value="Review">Review</SelectItem>
                        <SelectItem value="Done">Done</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Priority</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="projectId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Project</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                  <SelectTrigger>
                    <span className="flex-1 text-left truncate">
                      {projects.find(p => p.id === field.value)?.name || "Select project"}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="taskType"
            render={({ field }) => {
              const projectId = form.watch("projectId")
              const selectedProject = projects.find(p => p.id === projectId)
              const availableTaskTypes = selectedProject?.taskTypes || ['Task']

              return (
              <FormItem>
                <FormLabel>Type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || availableTaskTypes[0]}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTaskTypes.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}}
          />

          <FormField
            control={form.control}
            name="assigneeId"
            render={({ field }) => {
              const selectedAssignee = workspaceMembers.find(m => m.id === field.value);
              const assigneeName = selectedAssignee ? selectedAssignee.name : (field.value === "unassigned" ? "Unassigned" : "Select assignee...");

              return (
              <FormItem className="flex flex-col">
                <FormLabel>Assignee</FormLabel>
                <Popover open={openAssignee} onOpenChange={setOpenAssignee}>
                  <PopoverTrigger render={
                    <Button
                      variant="outline"
                      role="combobox"
                      className={cn(
                        "w-full justify-between font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    />
                  }>
                    <div className="flex items-center w-full h-full text-left">
                      {assigneeName}
                      <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
                    </div>
                  </PopoverTrigger>
                  <PopoverContent className="w-[200px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search assignee..." />
                      <CommandList>
                        <CommandEmpty>No assignee found.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value="unassigned"
                            onSelect={() => {
                              field.onChange("unassigned")
                              setOpenAssignee(false)
                            }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", field.value === "unassigned" ? "opacity-100" : "opacity-0")} />
                            Unassigned
                          </CommandItem>
                          {workspaceMembers.map(member => (
                            <CommandItem
                              key={member.id}
                              value={member.name}
                              onSelect={() => {
                                field.onChange(member.id)
                                setOpenAssignee(false)
                              }}
                            >
                              <Check className={cn("mr-2 h-4 w-4", field.value === member.id ? "opacity-100" : "opacity-0")} />
                              {member.name} {member.id === currentUser?.id && "(You)"}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Start Date</FormLabel>
                <Popover>
                  <PopoverTrigger render={
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    />
                  }>
                    <div className="flex items-center w-full h-full">
                      {field.value ? (
                        format(field.value, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </div>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      autoFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="dueDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Due Date</FormLabel>
                <Popover>
                  <PopoverTrigger render={
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    />
                  }>
                    <div className="flex items-center w-full h-full">
                      {field.value ? (
                        format(field.value, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </div>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      autoFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="estimatedTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Effort (Hours)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    min="0"
                    step="0.5"
                    placeholder="e.g. 4" 
                    value={field.value || ""} 
                    onChange={e => {
                      const val = parseFloat(e.target.value)
                      field.onChange(isNaN(val) ? undefined : val)
                    }} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="milestoneId"
            render={({ field }) => {
              const projectId = form.watch("projectId")
              const projectMilestones = milestones.filter(m => m.projectId === projectId)

              return (
              <FormItem>
                <FormLabel>Milestone</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || "none"}>
                  <SelectTrigger>
                    <span className="flex-1 text-left truncate">
                      {field.value && field.value !== "none" ? (projectMilestones.find(m => m.id === field.value)?.name || "Select milestone") : "None"}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {projectMilestones.map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}}
          />

          <FormField
            control={form.control}
            name="documentId"
            render={({ field }) => {
              return (
              <FormItem>
                <FormLabel>Linked Document</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || "none"}>
                  <SelectTrigger>
                    <span className="flex-1 text-left truncate">
                      {field.value && field.value !== "none" ? (documents.find(d => d.id === field.value)?.title || "Select document") : "None"}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {documents.map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}}
          />
        </div>

        <div className="pt-4 flex justify-end">
          <Button type="submit">
            {defaultValues?.id ? 'Save Changes' : 'Create Task'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
