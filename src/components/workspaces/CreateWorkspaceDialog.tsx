"use client"

import * as React from "react"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { useDataStore } from "@/stores/data-store"
import { useOrganizationStore } from "@/stores/organizationStore"
import { createWorkspace } from "@/lib/api/workspaces"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2 } from "lucide-react"

const workspaceSchema = z.object({
  name: z.string().min(2, "Workspace name must be at least 2 characters."),
  slug: z.string().min(2, "Slug must be at least 2 characters.").regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens."),
  organizationId: z.string().min(1, "Please select an organization."),
})

interface CreateWorkspaceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateWorkspaceDialog({ open, onOpenChange }: CreateWorkspaceDialogProps) {
  const [isLoading, setIsLoading] = React.useState(false)
  const currentUser = useDataStore(s => s.currentUser);
  const { organizations, activeOrganizationId } = useOrganizationStore()

  const form = useForm<z.infer<typeof workspaceSchema>>({
    resolver: zodResolver(workspaceSchema),
    defaultValues: {
      name: "",
      slug: "",
      organizationId: "",
    },
  })

  // Avoid watch in dependency array
  const watchName = form.watch("name")

  // Auto-generate slug from name and set default organization
  React.useEffect(() => {
    if (!open) {
      form.reset()
      return
    }
    
    if (!form.getValues('organizationId') && organizations.length > 0) {
      form.setValue('organizationId', activeOrganizationId || organizations[0].id, { shouldValidate: true })
    }
    
    if (watchName) {
      const generatedSlug = watchName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '')
      form.setValue('slug', generatedSlug, { shouldValidate: true })
    }
  }, [watchName, open, form, organizations, activeOrganizationId])

  async function onSubmit(values: z.infer<typeof workspaceSchema>) {
    setIsLoading(true)

    if (!currentUser) {
      toast.error("You must be logged in to create a workspace.")
      setIsLoading(false)
      return
    }

    if (!values.organizationId) {
      toast.error("You must select an organization before creating a workspace.")
      setIsLoading(false)
      return
    }

    try {
      const supabase = createClient()
      const workspace = await createWorkspace(supabase, {
        name: values.name,
        slug: values.slug,
        userId: currentUser.id,
        organizationId: values.organizationId
      })

      toast.success("Workspace created successfully!")
      
      // Set a cookie so the server knows which workspace to load next
      document.cookie = `SYNCORA_workspace_id=${workspace.id}; path=/; max-age=31536000`
      
      // Close modal and force reload to clear all states and re-initialize
      onOpenChange(false)
      window.location.assign("/app")
    } catch (err: unknown) {
      const error = err as { code?: string, message?: string }
      if (error?.code === '23505') { // Unique violation
        toast.error("This workspace URL is already taken. Please choose another one.")
      } else {
        console.error("Failed to create workspace:", err)
        toast.error(error?.message || "Failed to create workspace.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Workspace</DialogTitle>
          <DialogDescription>
            Create a new workspace to organize your projects and tasks.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {organizations.length === 0 ? (
              <div className="p-4 bg-muted/50 rounded-md border text-sm text-muted-foreground text-center">
                You are not part of any organization yet. Please create an organization first in your account settings.
              </div>
            ) : organizations.length === 1 ? null : (
              <FormField
                control={form.control}
                name="organizationId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organization</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an organization" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {organizations.map(org => (
                          <SelectItem key={org.id} value={org.id}>
                            {org.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Workspace Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Acme Corp" disabled={isLoading || organizations.length === 0} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Workspace URL</FormLabel>
                  <FormControl>
                    <div className="flex items-center">
                      <span className="flex items-center justify-center bg-muted text-muted-foreground border border-r-0 border-input rounded-l-md px-3 h-9 text-sm whitespace-nowrap">
                        SYNCORA.app/
                      </span>
                      <Input className="rounded-l-none" placeholder="acme-corp" disabled={isLoading || organizations.length === 0} {...field} />
                    </div>
                  </FormControl>
                  <FormDescription>This will be your workspace&apos;s unique identifier.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading || organizations.length === 0}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Workspace
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
