"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { useDataStore } from "@/stores/data-store"

import { Button } from "@/components/ui/button"
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

const onboardingSchema = z.object({
  name: z.string().min(2, "Workspace name must be at least 2 characters."),
  slug: z.string().min(2, "Slug must be at least 2 characters.").regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens."),
})

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()
  const [isLoading, setIsLoading] = React.useState(false)
  const setActiveWorkspaceId = useDataStore(s => s.setActiveWorkspaceId);

  const form = useForm<z.infer<typeof onboardingSchema>>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      name: "",
      slug: "",
    },
  })

  // Auto-generate slug from name
  React.useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'name' && value.name) {
        const generatedSlug = value.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)+/g, '')
        form.setValue('slug', generatedSlug, { shouldValidate: true })
      }
    })
    return () => subscription.unsubscribe()
  }, [form.watch, form.setValue])

  async function onSubmit(values: z.infer<typeof onboardingSchema>) {
    setIsLoading(true)

    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      toast.error("You must be logged in to create a workspace.")
      router.push("/login")
      return
    }

    // Create organization first (Required in Release 8 architecture)
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: values.name,
        slug: values.slug,
        owner_id: userData.user.id,
      })
      .select()
      .single()

    if (orgError) {
      setIsLoading(false)
      if (orgError.code === '23505') { // Unique violation
        toast.error("This workspace/org URL is already taken. Please choose another one.")
      } else {
        toast.error("Failed to create organization: " + orgError.message)
      }
      return
    }

    // Insert organization member (owner)
    const { error: orgMemberError } = await supabase
      .from('organization_members')
      .insert({
        org_id: org.id,
        user_id: userData.user.id,
        role: 'owner'
      })

    if (orgMemberError) {
      setIsLoading(false)
      toast.error("Failed to set organization permissions: " + orgMemberError.message)
      return
    }

    // Insert workspace
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .insert({
        name: values.name,
        slug: values.slug,
        created_by: userData.user.id,
        organization_id: org.id
      })
      .select()
      .single()

    if (workspaceError) {
      setIsLoading(false)
      toast.error("Failed to create workspace: " + workspaceError.message)
      return
    }

    // Insert workspace member (owner)
    const { error: memberError } = await supabase
      .from('workspace_members')
      .insert({
        workspace_id: workspace.id,
        user_id: userData.user.id,
        role: 'owner'
      })

    if (memberError) {
      setIsLoading(false)
      toast.error("Failed to set workspace permissions: " + memberError.message)
      return
    }

    toast.success("Workspace created successfully!")
    setActiveWorkspaceId(workspace.id)
    document.cookie = `SYNCORA_workspace_id=${workspace.id}; path=/; max-age=31536000`
    window.location.href = "/app"
  }

  return (
    <div className="w-full max-w-md">
      <Card className="border-border shadow-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">Welcome to SYNCORA</CardTitle>
          <CardDescription>
            Choose something your team will recognize like the name of your company or team. You can always update it later.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Workspace Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Acme Corp" disabled={isLoading} {...field} />
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
                        <span className="flex items-center justify-center bg-muted text-muted-foreground border border-r-0 border-input rounded-l-md px-3 h-9 text-sm">
                          SYNCORA.app/
                        </span>
                        <Input className="rounded-l-none" placeholder="acme-corp" disabled={isLoading} {...field} />
                      </div>
                    </FormControl>
                    <FormDescription>This will be your workspace's unique identifier.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button className="w-full mt-6" type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Workspace
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
