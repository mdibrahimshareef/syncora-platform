"use client"

import * as React from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Project, User } from "@/types"
import { useDataStore } from "@/stores/data-store"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Calendar } from "@/components/ui/calendar"
import { toast } from "sonner"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import {
  Box,
  Folder,
  Rocket,
  Target,
  Sparkles,
  Shield,
  Flame,
  Tag,
  Layers,
  Code,
  CircleDot,
  Clock,
  Loader2,
  CheckCircle2,
  XCircle,
  Minus,
  AlertCircle,
  SignalHigh,
  SignalMedium,
  SignalLow,
  User as UserIcon,
  Users as UsersIcon,
  Calendar as CalendarIcon,
  Link2,
  Plus,
  Trash2,
  Check,
} from "lucide-react"

const projectSchema = z.object({
  name: z.string().min(1, "Project name is required").max(100, "Name is too long"),
  summary: z.string().max(300, "Summary is too long").optional(),
  description: z.string().optional(),
  status: z.string(),
  priority: z.string(),
  color: z.string(),
  icon: z.string(),
  leadId: z.string().optional().nullable(),
  memberIds: z.array(z.string()),
  startDate: z.date().optional().nullable(),
  targetDate: z.date().optional().nullable(),
  labels: z.array(z.string()),
})

type ProjectFormValues = z.infer<typeof projectSchema>

interface ProjectFormProps {
  defaultValues?: Partial<Project>
  onSuccess?: () => void
  onDirtyChange?: (isDirty: boolean) => void
}

interface MilestoneDraft {
  name: string
  dueDate?: Date | null
}

const PROJECT_COLORS = [
  { label: "Amber", value: "bg-amber-500", text: "text-amber-500" },
  { label: "Indigo", value: "bg-indigo-500", text: "text-indigo-500" },
  { label: "Emerald", value: "bg-emerald-500", text: "text-emerald-500" },
  { label: "Violet", value: "bg-violet-500", text: "text-violet-500" },
  { label: "Blue", value: "bg-blue-500", text: "text-blue-500" },
  { label: "Rose", value: "bg-rose-500", text: "text-rose-500" },
]

const ICON_OPTIONS = [
  { name: "Box", Icon: Box },
  { name: "Folder", Icon: Folder },
  { name: "Rocket", Icon: Rocket },
  { name: "Target", Icon: Target },
  { name: "Sparkles", Icon: Sparkles },
  { name: "Shield", Icon: Shield },
  { name: "Flame", Icon: Flame },
  { name: "Tag", Icon: Tag },
  { name: "Layers", Icon: Layers },
  { name: "Code", Icon: Code },
]

const STATUS_OPTIONS = [
  { label: "Backlog", Icon: CircleDot, color: "text-zinc-400", dbStatus: "Active" as const },
  { label: "Planned", Icon: Clock, color: "text-blue-400", dbStatus: "Active" as const },
  { label: "In Progress", Icon: CircleDot, color: "text-amber-500", dbStatus: "Active" as const },
  { label: "Completed", Icon: CheckCircle2, color: "text-emerald-500", dbStatus: "Completed" as const },
  { label: "Cancelled", Icon: XCircle, color: "text-rose-500", dbStatus: "On Hold" as const },
]

const PRIORITY_OPTIONS = [
  { label: "No priority", Icon: Minus, color: "text-muted-foreground" },
  { label: "Urgent", Icon: AlertCircle, color: "text-rose-500" },
  { label: "High", Icon: SignalHigh, color: "text-amber-500" },
  { label: "Medium", Icon: SignalMedium, color: "text-blue-400" },
  { label: "Low", Icon: SignalLow, color: "text-zinc-400" },
]

const AVAILABLE_LABELS = [
  { id: "frontend", name: "Frontend", color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  { id: "backend", name: "Backend", color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
  { id: "design", name: "Design", color: "bg-purple-500/10 text-purple-500 border-purple-500/20" },
  { id: "marketing", name: "Marketing", color: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  { id: "infra", name: "Infrastructure", color: "bg-rose-500/10 text-rose-500 border-rose-500/20" },
]

export function ProjectForm({ defaultValues, onSuccess, onDirtyChange }: ProjectFormProps) {
  const createProject = useDataStore((s) => s.createProject)
  const updateProject = useDataStore((s) => s.updateProject)
  const createMilestone = useDataStore((s) => s.createMilestone)
  const workspaceMembers = useDataStore((s) => s.workspaceMembers)
  const currentUser = useDataStore((s) => s.currentUser)

  const [openIconPicker, setOpenIconPicker] = React.useState(false)
  const [openLead, setOpenLead] = React.useState(false)
  const [openMembers, setOpenMembers] = React.useState(false)
  const [openLabels, setOpenLabels] = React.useState(false)
  const [openStartDate, setOpenStartDate] = React.useState(false)
  const [openTargetDate, setOpenTargetDate] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [milestones, setMilestones] = React.useState<MilestoneDraft[]>([])

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: defaultValues?.name || "",
      summary: "",
      description: defaultValues?.description || "",
      status: defaultValues?.status || "Backlog",
      priority: "No priority",
      color: defaultValues?.color || PROJECT_COLORS[0].value,
      icon: defaultValues?.icon || "Box",
      leadId: currentUser?.id || null,
      memberIds: defaultValues?.members ? defaultValues.members.map((m: User) => m.id) : [],
      startDate: null,
      targetDate: null,
      labels: [],
    },
  })

  const { isDirty } = form.formState
  React.useEffect(() => {
    onDirtyChange?.(isDirty || milestones.length > 0)
  }, [isDirty, milestones.length, onDirtyChange])

  const watchedStatus = useWatch({ control: form.control, name: "status" })
  const watchedPriority = useWatch({ control: form.control, name: "priority" })
  const watchedColor = useWatch({ control: form.control, name: "color" })
  const watchedIcon = useWatch({ control: form.control, name: "icon" })
  const watchedLeadId = useWatch({ control: form.control, name: "leadId" })
  const watchedMemberIds = useWatch({ control: form.control, name: "memberIds" }) || []
  const watchedStartDate = useWatch({ control: form.control, name: "startDate" })
  const watchedTargetDate = useWatch({ control: form.control, name: "targetDate" })
  const watchedLabels = useWatch({ control: form.control, name: "labels" }) || []

  // Helpers for selected elements
  const currentStatusObj = STATUS_OPTIONS.find((s) => s.label === watchedStatus) || STATUS_OPTIONS[0]
  const currentPriorityObj = PRIORITY_OPTIONS.find((p) => p.label === watchedPriority) || PRIORITY_OPTIONS[0]
  const currentColorObj = PROJECT_COLORS.find((c) => c.value === watchedColor) || PROJECT_COLORS[0]
  const currentIconObj = ICON_OPTIONS.find((i) => i.name === watchedIcon) || ICON_OPTIONS[0]
  const CurrentIconComponent = currentIconObj.Icon
  const selectedLead = workspaceMembers.find((m) => m.id === watchedLeadId)

  // Toggle member
  const toggleMember = (memberId: string) => {
    const current = [...watchedMemberIds]
    const idx = current.indexOf(memberId)
    if (idx >= 0) {
      current.splice(idx, 1)
    } else {
      current.push(memberId)
    }
    form.setValue("memberIds", current, { shouldDirty: true })
  }

  // Toggle label
  const toggleLabel = (labelName: string) => {
    const current = [...watchedLabels]
    const idx = current.indexOf(labelName)
    if (idx >= 0) {
      current.splice(idx, 1)
    } else {
      current.push(labelName)
    }
    form.setValue("labels", current, { shouldDirty: true })
  }

  // Milestone handlers
  const handleAddMilestone = () => {
    setMilestones((prev) => [...prev, { name: "", dueDate: null }])
  }

  const updateMilestoneName = (index: number, name: string) => {
    setMilestones((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], name }
      return next
    })
  }

  const updateMilestoneDate = (index: number, date: Date | null) => {
    setMilestones((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], dueDate: date }
      return next
    })
  }

  const removeMilestone = (index: number) => {
    setMilestones((prev) => prev.filter((_, i) => i !== index))
  }

  async function onSubmit(data: ProjectFormValues) {
    setIsSubmitting(true)

    // Combine summary and description cleanly
    const finalDescription = data.summary
      ? data.description
        ? `${data.summary}\n\n${data.description}`
        : data.summary
      : data.description || ""

    // Map Linear-style status to DB ProjectStatus
    const statusEntry = STATUS_OPTIONS.find((s) => s.label === data.status)
    const dbStatus = statusEntry ? statusEntry.dbStatus : "Active"

    // Prepare members
    const assignedMembers = workspaceMembers.filter((m) =>
      data.memberIds.includes(m.id) || (data.leadId && m.id === data.leadId)
    )

    const projectPayload = {
      name: data.name,
      description: finalDescription,
      status: dbStatus,
      color: data.color,
      icon: data.icon,
      progress: defaultValues?.progress || 0,
      members: assignedMembers,
    }

    try {
      let projectId = defaultValues?.id

      if (projectId) {
        await updateProject(projectId, projectPayload)
        toast.success("Project updated successfully")
      } else {
        projectId = await createProject(projectPayload)
        toast.success("Project created successfully")
      }

      // Create any initial draft milestones if provided
      if (projectId && milestones.length > 0) {
        for (const m of milestones) {
          if (m.name.trim()) {
            try {
              await createMilestone(projectId, {
                name: m.name.trim(),
                dueDate: m.dueDate ? m.dueDate.toISOString() : undefined,
                status: "Open",
              })
            } catch (mErr) {
              console.warn("Failed to create initial milestone:", mErr)
            }
          }
        }
      }

      onSuccess?.()
    } catch {
      toast.error("An error occurred while saving the project")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault()
      form.handleSubmit(onSubmit)()
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} onKeyDown={handleKeyDown} className="space-y-4">
        {/* Top: Project Icon + Title */}
        <div className="flex items-start gap-3 pt-1">
          {/* Icon Selector Button */}
          <Popover open={openIconPicker} onOpenChange={setOpenIconPicker}>
            <PopoverTrigger
              render={
                <button
                  type="button"
                  className="size-9 rounded-lg flex items-center justify-center shrink-0 transition-all hover:ring-2 hover:ring-primary/20 bg-muted/60 hover:bg-muted text-foreground border border-border/50 mt-1"
                />
              }
            >
              <CurrentIconComponent className={cn("size-5", currentColorObj.text)} />
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3 gap-3" align="start">
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Color</span>
                <div className="flex items-center gap-2 flex-wrap">
                  {PROJECT_COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => form.setValue("color", c.value, { shouldDirty: true })}
                      className={cn(
                        "size-5 rounded-full flex items-center justify-center transition-transform hover:scale-110",
                        c.value,
                        watchedColor === c.value && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                      )}
                    />
                  ))}
                </div>
              </div>
              <div className="space-y-1.5 pt-2 border-t border-border/50">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Icon</span>
                <div className="grid grid-cols-5 gap-1">
                  {ICON_OPTIONS.map(({ name, Icon }) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => {
                        form.setValue("icon", name, { shouldDirty: true })
                        setOpenIconPicker(false)
                      }}
                      className={cn(
                        "size-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors",
                        watchedIcon === name && "bg-muted text-foreground ring-1 ring-border"
                      )}
                    >
                      <Icon className="size-4" />
                    </button>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Project Name and Summary */}
          <div className="flex-1 space-y-1">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="space-y-0">
                  <FormControl>
                    <input
                      placeholder="Project name"
                      className="w-full text-2xl font-bold tracking-tight bg-transparent border-none outline-none focus:outline-none focus:ring-0 focus-visible:ring-0 text-foreground placeholder:text-muted-foreground/40 p-0 shadow-none"
                      autoFocus
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-xs pt-1" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="summary"
              render={({ field }) => (
                <FormItem className="space-y-0">
                  <FormControl>
                    <input
                      placeholder="Add a short summary..."
                      className="w-full text-sm text-muted-foreground bg-transparent border-none outline-none focus:outline-none focus:ring-0 focus-visible:ring-0 placeholder:text-muted-foreground/40 p-0 shadow-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Action List / Property Pills Bar */}
        <div className="flex items-center gap-1.5 flex-wrap pt-2 pb-1">
          {/* Status Pill */}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  className="rounded-md border border-border/60 bg-muted/30 hover:bg-muted/70 px-2.5 py-1 text-xs font-medium text-foreground flex items-center gap-1.5 transition-colors"
                />
              }
            >
              <currentStatusObj.Icon className={cn("size-3.5", currentStatusObj.color)} />
              <span>{currentStatusObj.label}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-36">
              {STATUS_OPTIONS.map((opt) => (
                <DropdownMenuItem
                  key={opt.label}
                  onClick={() => form.setValue("status", opt.label, { shouldDirty: true })}
                  className="gap-2 text-xs cursor-pointer"
                >
                  <opt.Icon className={cn("size-3.5", opt.color)} />
                  <span>{opt.label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Priority Pill */}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  className="rounded-md border border-border/60 bg-muted/30 hover:bg-muted/70 px-2.5 py-1 text-xs font-medium text-foreground flex items-center gap-1.5 transition-colors"
                />
              }
            >
              <currentPriorityObj.Icon className={cn("size-3.5", currentPriorityObj.color)} />
              <span>{currentPriorityObj.label}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-36">
              {PRIORITY_OPTIONS.map((opt) => (
                <DropdownMenuItem
                  key={opt.label}
                  onClick={() => form.setValue("priority", opt.label, { shouldDirty: true })}
                  className="gap-2 text-xs cursor-pointer"
                >
                  <opt.Icon className={cn("size-3.5", opt.color)} />
                  <span>{opt.label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Lead Pill */}
          <Popover open={openLead} onOpenChange={setOpenLead}>
            <PopoverTrigger
              render={
                <button
                  type="button"
                  className="rounded-md border border-border/60 bg-muted/30 hover:bg-muted/70 px-2.5 py-1 text-xs font-medium text-foreground flex items-center gap-1.5 transition-colors"
                />
              }
            >
              {selectedLead ? (
                <>
                  <Avatar className="size-4 text-[9px]">
                    <AvatarFallback>{selectedLead.initials || selectedLead.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="truncate max-w-[110px]">{selectedLead.name}</span>
                </>
              ) : (
                <>
                  <UserIcon className="size-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">Lead</span>
                </>
              )}
            </PopoverTrigger>
            <PopoverContent align="start" className="w-56 p-0">
              <Command>
                <CommandInput placeholder="Assign lead..." />
                <CommandList>
                  <CommandEmpty>No members found</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      onSelect={() => {
                        form.setValue("leadId", null, { shouldDirty: true })
                        setOpenLead(false)
                      }}
                      className="text-xs"
                    >
                      <Check className={cn("mr-2 size-3.5", !watchedLeadId ? "opacity-100" : "opacity-0")} />
                      No lead
                    </CommandItem>
                    {workspaceMembers.map((member) => (
                      <CommandItem
                        key={member.id}
                        value={member.name}
                        onSelect={() => {
                          form.setValue("leadId", member.id, { shouldDirty: true })
                          setOpenLead(false)
                        }}
                        className="text-xs"
                      >
                        <Check className={cn("mr-2 size-3.5", watchedLeadId === member.id ? "opacity-100" : "opacity-0")} />
                        <Avatar className="size-4 mr-2 text-[8px]">
                          <AvatarFallback>{member.initials || member.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span className="truncate">{member.name}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {/* Members Pill */}
          <Popover open={openMembers} onOpenChange={setOpenMembers}>
            <PopoverTrigger
              render={
                <button
                  type="button"
                  className="rounded-md border border-border/60 bg-muted/30 hover:bg-muted/70 px-2.5 py-1 text-xs font-medium text-foreground flex items-center gap-1.5 transition-colors"
                />
              }
            >
              <UsersIcon className="size-3.5 text-muted-foreground" />
              <span className={watchedMemberIds.length > 0 ? "text-foreground" : "text-muted-foreground"}>
                {watchedMemberIds.length > 0 ? `${watchedMemberIds.length} members` : "Members"}
              </span>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-60 p-2">
              <div className="text-xs font-medium text-muted-foreground mb-1.5 px-1">Workspace members</div>
              <div className="space-y-0.5 max-h-48 overflow-y-auto">
                {workspaceMembers.map((m) => {
                  const isSelected = watchedMemberIds.includes(m.id)
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => toggleMember(m.id)}
                      className="w-full flex items-center justify-between p-1.5 rounded-md hover:bg-muted text-xs text-left transition-colors"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Avatar className="size-4 text-[8px]">
                          <AvatarFallback>{m.initials || m.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span className="truncate">{m.name}</span>
                      </div>
                      {isSelected && <Check className="size-3.5 text-primary" />}
                    </button>
                  )
                })}
              </div>
            </PopoverContent>
          </Popover>

          {/* Start Date Pill */}
          <Popover open={openStartDate} onOpenChange={setOpenStartDate}>
            <PopoverTrigger
              render={
                <button
                  type="button"
                  className="rounded-md border border-border/60 bg-muted/30 hover:bg-muted/70 px-2.5 py-1 text-xs font-medium text-foreground flex items-center gap-1.5 transition-colors"
                />
              }
            >
              <CalendarIcon className="size-3.5 text-muted-foreground" />
              <span className={watchedStartDate ? "text-foreground" : "text-muted-foreground"}>
                {watchedStartDate ? format(watchedStartDate, "MMM d") : "Start"}
              </span>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={watchedStartDate || undefined}
                onSelect={(d) => {
                  form.setValue("startDate", d || null, { shouldDirty: true })
                  setOpenStartDate(false)
                }}
                autoFocus
              />
              {watchedStartDate && (
                <div className="p-2 border-t border-border flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      form.setValue("startDate", null, { shouldDirty: true })
                      setOpenStartDate(false)
                    }}
                    className="text-xs h-7 text-muted-foreground"
                  >
                    Clear
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>

          {/* Target Date Pill */}
          <Popover open={openTargetDate} onOpenChange={setOpenTargetDate}>
            <PopoverTrigger
              render={
                <button
                  type="button"
                  className="rounded-md border border-border/60 bg-muted/30 hover:bg-muted/70 px-2.5 py-1 text-xs font-medium text-foreground flex items-center gap-1.5 transition-colors"
                />
              }
            >
              <Target className="size-3.5 text-muted-foreground" />
              <span className={watchedTargetDate ? "text-foreground" : "text-muted-foreground"}>
                {watchedTargetDate ? format(watchedTargetDate, "MMM d") : "Target"}
              </span>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={watchedTargetDate || undefined}
                onSelect={(d) => {
                  form.setValue("targetDate", d || null, { shouldDirty: true })
                  setOpenTargetDate(false)
                }}
                autoFocus
              />
              {watchedTargetDate && (
                <div className="p-2 border-t border-border flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      form.setValue("targetDate", null, { shouldDirty: true })
                      setOpenTargetDate(false)
                    }}
                    className="text-xs h-7 text-muted-foreground"
                  >
                    Clear
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>

          {/* Labels Pill */}
          <Popover open={openLabels} onOpenChange={setOpenLabels}>
            <PopoverTrigger
              render={
                <button
                  type="button"
                  className="rounded-md border border-border/60 bg-muted/30 hover:bg-muted/70 px-2.5 py-1 text-xs font-medium text-foreground flex items-center gap-1.5 transition-colors"
                />
              }
            >
              <Tag className="size-3.5 text-muted-foreground" />
              <span className={watchedLabels.length > 0 ? "text-foreground" : "text-muted-foreground"}>
                {watchedLabels.length > 0 ? `${watchedLabels.length} labels` : "Labels"}
              </span>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-52 p-2">
              <div className="text-xs font-medium text-muted-foreground mb-1.5 px-1">Project Labels</div>
              <div className="space-y-1">
                {AVAILABLE_LABELS.map((lbl) => {
                  const isSelected = watchedLabels.includes(lbl.name)
                  return (
                    <button
                      key={lbl.id}
                      type="button"
                      onClick={() => toggleLabel(lbl.name)}
                      className="w-full flex items-center justify-between p-1.5 rounded-md hover:bg-muted text-xs text-left transition-colors"
                    >
                      <span className={cn("px-2 py-0.5 rounded text-[11px] font-medium border", lbl.color)}>
                        {lbl.name}
                      </span>
                      {isSelected && <Check className="size-3.5 text-primary" />}
                    </button>
                  )
                })}
              </div>
            </PopoverContent>
          </Popover>

          {/* Dependencies Pill */}
          <Popover>
            <PopoverTrigger
              render={
                <button
                  type="button"
                  className="rounded-md border border-border/60 bg-muted/30 hover:bg-muted/70 px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors"
                />
              }
            >
              <Link2 className="size-3.5 text-muted-foreground" />
              <span>Dependencies</span>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-64 p-3 text-xs text-muted-foreground">
              <div className="font-medium text-foreground mb-1">Project Dependencies</div>
              <p>Link projects or tasks that block or depend on this project after creation.</p>
            </PopoverContent>
          </Popover>
        </div>

        {/* Selected Labels Display */}
        {watchedLabels.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
            {watchedLabels.map((name) => {
              const item = AVAILABLE_LABELS.find((l) => l.name === name)
              return (
                <span
                  key={name}
                  className={cn("px-2 py-0.5 rounded text-[11px] font-medium border flex items-center gap-1", item?.color)}
                >
                  {name}
                  <button
                    type="button"
                    onClick={() => toggleLabel(name)}
                    className="hover:opacity-75"
                  >
                    ×
                  </button>
                </span>
              )
            })}
          </div>
        )}

        {/* Large Open Writing Description Area */}
        <div className="pt-2">
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem className="space-y-0">
                <FormControl>
                  <Textarea
                    placeholder="Write a description, a project brief, or collect ideas..."
                    className="w-full min-h-[140px] text-sm text-foreground bg-transparent border-none outline-none focus:outline-none focus:ring-0 focus-visible:ring-0 p-0 placeholder:text-muted-foreground/40 resize-none shadow-none leading-relaxed"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Lightweight Milestones Section */}
        <div className="pt-3 border-t border-border/50">
          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Milestones</span>
              {milestones.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-muted text-muted-foreground">
                  {milestones.length}
                </span>
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleAddMilestone}
              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
              title="Add milestone"
            >
              <Plus className="size-3.5" />
            </Button>
          </div>

          {milestones.length > 0 && (
            <div className="mt-2 space-y-2">
              {milestones.map((m, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 bg-muted/20 px-2.5 py-1.5 rounded-md border border-border/40 group"
                >
                  <CircleDot className="size-3 text-muted-foreground shrink-0" />
                  <input
                    type="text"
                    placeholder="Milestone name..."
                    value={m.name}
                    onChange={(e) => updateMilestoneName(idx, e.target.value)}
                    className="flex-1 bg-transparent border-none outline-none text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-0 p-0"
                  />
                  <Popover>
                    <PopoverTrigger
                      render={
                        <button
                          type="button"
                          className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-muted"
                        />
                      }
                    >
                      <CalendarIcon className="size-3" />
                      <span>{m.dueDate ? format(m.dueDate, "MMM d") : "Target date"}</span>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <Calendar
                        mode="single"
                        selected={m.dueDate || undefined}
                        onSelect={(d) => updateMilestoneDate(idx, d || null)}
                        autoFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <button
                    type="button"
                    onClick={() => removeMilestone(idx)}
                    className="text-muted-foreground hover:text-destructive size-5 flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity"
                    title="Remove milestone"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Clean Footer Bar */}
        <div className="pt-4 border-t border-border/50 flex items-center justify-between">
          <div className="text-xs text-muted-foreground hidden sm:block">
            <span className="font-mono text-[10px] bg-muted/60 px-1.5 py-0.5 rounded">Ctrl + Enter</span> to save
          </div>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium px-4 h-9 rounded-lg shadow-sm ml-auto"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-3.5 animate-spin mr-1.5" />
                {defaultValues?.id ? "Saving..." : "Creating..."}
              </>
            ) : defaultValues?.id ? (
              "Save changes"
            ) : (
              "Create project"
            )}
          </Button>
        </div>
      </form>
    </Form>
  )
}
