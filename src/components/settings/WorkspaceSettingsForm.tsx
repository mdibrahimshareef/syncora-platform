"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { useDataStore } from "@/stores/data-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

const settingsSchema = z.object({
  name: z.string().min(2, "Workspace name must be at least 2 characters."),
})

export function WorkspaceSettingsForm() {
  const [isLoading, setIsLoading] = React.useState(false)
  const activeWorkspaceId = useDataStore(s => s.activeWorkspaceId);
  const workspaces = useDataStore(s => s.workspaces);
  const updateWorkspace = useDataStore(s => s.updateWorkspace);
  
  const currentWorkspace = React.useMemo(() => {
    return workspaces.find(w => w.id === activeWorkspaceId)
  }, [activeWorkspaceId, workspaces])

  const form = useForm<z.infer<typeof settingsSchema>>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      name: currentWorkspace?.name || "",
    },
  })

  React.useEffect(() => {
    if (currentWorkspace?.name) {
      form.reset({ name: currentWorkspace.name })
    }
  }, [currentWorkspace, form])

  async function onSubmit(values: z.infer<typeof settingsSchema>) {
    if (!activeWorkspaceId) return
    
    // Check if the name actually changed
    if (values.name === currentWorkspace?.name) {
      toast("No changes to save.")
      return
    }

    setIsLoading(true)
    try {
      await updateWorkspace(activeWorkspaceId, { name: values.name })
      toast.success("Workspace name updated successfully!")
    } catch (err: any) {
      toast.error(err.message || "Failed to update workspace name.")
      console.error('Update workspace error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  if (!currentWorkspace) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Workspace Profile</CardTitle>
        <CardDescription>
          Update your workspace details. You can change your workspace name here.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-w-md">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Workspace Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Acme Corp" disabled={isLoading} {...field} />
                  </FormControl>
                  <FormDescription>
                    This is the display name of your workspace.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
