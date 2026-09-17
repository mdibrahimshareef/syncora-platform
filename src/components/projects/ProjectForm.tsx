"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Project } from "@/types"
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
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select"
import { toast } from "sonner"

const projectSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  description: z.string().min(1, "Description is required"),
  status: z.enum(['Active', 'On Hold', 'Completed']),
  color: z.string(),
  templateId: z.string().optional(),
  includeSampleData: z.boolean().optional(),
})

type ProjectFormValues = z.infer<typeof projectSchema>

interface ProjectFormProps {
  defaultValues?: Partial<Project>
  onSuccess?: () => void
}

const PROJECT_COLORS = [
  { label: 'Indigo', value: 'bg-indigo-500' },
  { label: 'Emerald', value: 'bg-emerald-500' },
  { label: 'Amber', value: 'bg-amber-500' },
  { label: 'Violet', value: 'bg-violet-500' },
  { label: 'Blue', value: 'bg-blue-500' },
  { label: 'Rose', value: 'bg-rose-500' },
]

import { createClient } from "@/lib/supabase/client"

export function ProjectForm({ defaultValues, onSuccess }: ProjectFormProps) {
  const createProject = useDataStore(s => s.createProject);
  const updateProject = useDataStore(s => s.updateProject);
  const templates = useDataStore(s => s.templates);
  const fetchTemplates = useDataStore(s => s.fetchTemplates);
  
  React.useEffect(() => {
    if (!defaultValues?.id && templates.length === 0) {
      fetchTemplates()
    }
  }, [defaultValues?.id, templates.length, fetchTemplates])
  
  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: defaultValues?.name || "",
      description: defaultValues?.description || "",
      status: defaultValues?.status || "Active",
      color: defaultValues?.color || PROJECT_COLORS[0].value,
      templateId: "none",
      includeSampleData: true,
    },
  })

  async function onSubmit(data: ProjectFormValues) {
    const projectPayload = {
      name: data.name,
      description: data.description,
      status: data.status as 'Active' | 'On Hold' | 'Completed',
      color: data.color,
      progress: defaultValues?.progress || 0,
      members: defaultValues?.members || [],
      includeSampleData: data.includeSampleData,
    }

    try {
      if (defaultValues?.id) {
        await updateProject(defaultValues.id, projectPayload)
        toast.success("Project updated successfully")
      } else {
        if (data.templateId && data.templateId !== "none") {
          const { createProjectFromTemplate } = useDataStore.getState()
          await createProjectFromTemplate(data.templateId, projectPayload)
          toast.success("Project created from template")
        } else {
          await createProject(projectPayload)
          toast.success("Project created successfully")
        }
      }
      
      if (onSuccess) onSuccess()
    } catch (err) {
      toast.error("An error occurred while saving the project")
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Project Name</FormLabel>
              <FormControl>
                <Input placeholder="E.g. Website Redesign" {...field} />
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
                <Textarea 
                  placeholder="What is this project about?" 
                  className="resize-none h-20" 
                  {...field} 
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
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="On Hold">On Hold</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="color"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Project Color</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <div className="flex items-center gap-2">
                        <div className={`size-3 rounded-full ${field.value}`} />
                        <SelectValue placeholder="Select color" />
                      </div>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {PROJECT_COLORS.map(color => (
                      <SelectItem key={color.value} value={color.value}>
                        <div className="flex items-center gap-2">
                          <div className={`size-3 rounded-full ${color.value}`} />
                          {color.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {!defaultValues?.id && (
          <FormField
            control={form.control}
            name="templateId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Project Template (Optional)</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || "none"} defaultValue={field.value || "none"}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a template" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">Blank Project</SelectItem>
                    {Object.entries(
                      templates.reduce((acc, t) => {
                        const domain = t.domain || 'Other'
                        if (!acc[domain]) acc[domain] = []
                        acc[domain].push(t)
                        return acc
                      }, {} as Record<string, typeof templates>)
                    ).map(([domain, domainTemplates]) => (
                      <SelectGroup key={domain}>
                        <SelectLabel className="font-semibold text-foreground/90">{domain}</SelectLabel>
                        {domainTemplates.map(t => (
                          <SelectItem key={t.id} value={t.id} className="pl-6">
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {form.watch("templateId") && form.watch("templateId") !== "none" && (
          <FormField
            control={form.control}
            name="includeSampleData"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
                <FormControl>
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    checked={field.value}
                    onChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>
                    Include example tasks & milestones
                  </FormLabel>
                  <p className="text-sm text-muted-foreground">
                    Populate your project with sample data to see how it works. Uncheck to start with a blank board.
                  </p>
                </div>
              </FormItem>
            )}
          />
        )}

        <div className="pt-4 flex justify-end">
          <Button type="submit">
            {defaultValues?.id ? 'Save Changes' : 'Create Project'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
