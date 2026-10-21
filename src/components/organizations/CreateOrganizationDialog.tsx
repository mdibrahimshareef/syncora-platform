"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useWatch } from "react-hook-form"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { useDataStore } from "@/stores/data-store"
import type { Tables } from "@/types/supabase"

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
import { Loader2, Building2 } from "lucide-react"

const orgSchema = z.object({
  name: z.string().min(2, "Organization name must be at least 2 characters."),
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters.")
    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens."),
  type: z.string().min(1, "Please select an organization type."),
  plan: z.string().min(1, "Please select a plan."),
})

interface CreateOrganizationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function setOrganizationCookies(orgId: string, workspaceId: string) {
  document.cookie = `SYNCORA_org_id=${orgId}; path=/; max-age=31536000`
  document.cookie = `SYNCORA_workspace_id=${workspaceId}; path=/; max-age=31536000`
}

export function CreateOrganizationDialog({ open, onOpenChange }: CreateOrganizationDialogProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = React.useState(false)
  const currentUser = useDataStore((s) => s.currentUser)
  const supabase = createClient()

  const form = useForm<z.infer<typeof orgSchema>>({
    resolver: zodResolver(orgSchema),
    defaultValues: {
      name: "",
      slug: "",
      type: "Personal",
      plan: "Free - $0/month",
    },
  })

  const watchName = useWatch({ control: form.control, name: "name" })

  React.useEffect(() => {
    if (!open) {
      form.reset()
      return
    }

    if (watchName) {
      const generatedSlug = watchName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "")
      form.setValue("slug", generatedSlug, { shouldValidate: true })
    }
  }, [watchName, open, form])

  async function onSubmit(values: z.infer<typeof orgSchema>) {
    setIsLoading(true)

    if (!currentUser) {
      toast.error("You must be logged in to create an organization.")
      setIsLoading(false)
      return
    }

    try {
      // 1. Create Organization
      let orgData: Tables<"organizations"> | null = null
      const { data: org, error: orgError } = await supabase
        .from("organizations")
        .insert({
          name: values.name,
          slug: values.slug,
          owner_id: currentUser.id,
          type: values.type.toLowerCase(),
          plan: values.plan.toLowerCase().includes("pro") ? "pro" : "free",
        })
        .select()
        .single()

      if (orgError) {
        if (orgError.code === "42703" || orgError.message?.includes("column")) {
          const { data: fallbackOrg, error: fallbackError } = await supabase
            .from("organizations")
            .insert({
              name: values.name,
              slug: values.slug,
              owner_id: currentUser.id,
            })
            .select()
            .single()

          if (fallbackError) throw fallbackError
          orgData = fallbackOrg
        } else if (orgError.code === "23505") {
          toast.error("This organization URL is already taken. Please choose another one.")
          setIsLoading(false)
          return
        } else {
          throw orgError
        }
      } else {
        orgData = org
      }

      if (!orgData) {
        throw new Error("Failed to create organization: No data returned")
      }

      // 2. Add owner to organization_members
      const { error: orgMemberError } = await supabase
        .from("organization_members")
        .insert({
          org_id: orgData.id,
          user_id: currentUser.id,
          role: "owner",
        })

      if (orgMemberError) throw orgMemberError

      // 3. Create default workspace inside this organization
      const { data: workspace, error: wsError } = await supabase
        .from("workspaces")
        .insert({
          name: "General",
          slug: "general",
          created_by: currentUser.id,
          organization_id: orgData.id,
        })
        .select()
        .single()

      if (wsError) throw wsError

      // 4. Add owner to workspace_members
      const { error: wsMemberError } = await supabase
        .from("workspace_members")
        .insert({
          workspace_id: workspace.id,
          user_id: currentUser.id,
          role: "owner",
        })

      if (wsMemberError) throw wsMemberError

      toast.success("Organization created successfully!")

      // Set cookies for both org and workspace
      setOrganizationCookies(orgData.id, workspace.id)

      onOpenChange(false)
      router.push(`/${orgData.slug}/team/${workspace.slug}`)
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string }
      console.error("Failed to create organization:", err)
      toast.error(error?.message || "Failed to create organization.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
              <Building2 className="h-4 w-4" />
            </div>
            <DialogTitle className="text-xl">Create a new organization</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            Organizations are the top-level home for your workspaces, team members, and billing settings.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold">Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Acme Corp" disabled={isLoading} {...field} className="h-9 text-sm" />
                  </FormControl>
                  <FormDescription className="text-[11px] text-muted-foreground">
                    What&apos;s the name of your company or team? You can change this later.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold">Organization URL</FormLabel>
                  <FormControl>
                    <div className="flex items-center">
                      <span className="flex items-center justify-center bg-muted text-muted-foreground border border-r-0 border-input rounded-l-md px-2.5 h-9 text-xs font-medium">
                        SYNCORA.app/
                      </span>
                      <Input className="rounded-l-none h-9 text-sm" placeholder="acme-corp" disabled={isLoading} {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold">Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Personal">Personal</SelectItem>
                      <SelectItem value="Educational">Educational</SelectItem>
                      <SelectItem value="Startup">Startup</SelectItem>
                      <SelectItem value="Agency">Agency</SelectItem>
                      <SelectItem value="Company">Company</SelectItem>
                      <SelectItem value="N/A">N/A</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription className="text-[11px] text-muted-foreground">
                    What best describes your organization?
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="plan"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold">Plan</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="Select plan" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Free - $0/month">Free - $0/month</SelectItem>
                      <SelectItem value="Pro - $19/month">Pro - $19/month</SelectItem>
                      <SelectItem value="Team - $49/month">Team - $49/month</SelectItem>
                      <SelectItem value="Enterprise - Custom">Enterprise - Custom</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription className="text-[11px] text-muted-foreground">
                    Which plan fits your organization&apos;s needs best? Learn more.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading} className="font-semibold">
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create organization
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
