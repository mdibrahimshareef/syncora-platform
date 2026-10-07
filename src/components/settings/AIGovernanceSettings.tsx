"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { useDataStore } from "@/stores/data-store"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
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
import { Loader2, ShieldAlert } from "lucide-react"

const policySchema = z.object({
  ai_enabled: z.boolean(),
  require_action_approval: z.boolean(),
  allow_ai_task_creation: z.boolean(),
  allow_ai_task_assignment: z.boolean(),
  allow_ai_task_updates: z.boolean(),
})

export function AIGovernanceSettings() {
  const [isLoading, setIsLoading] = React.useState(false)
  const [isFetching, setIsFetching] = React.useState(true)
  const activeWorkspaceId = useDataStore(s => s.activeWorkspaceId)

  const form = useForm<z.infer<typeof policySchema>>({
    resolver: zodResolver(policySchema),
    defaultValues: {
      ai_enabled: true,
      require_action_approval: true,
      allow_ai_task_creation: true,
      allow_ai_task_assignment: true,
      allow_ai_task_updates: true,
    },
  })

  React.useEffect(() => {
    async function loadPolicy() {
      if (!activeWorkspaceId) return
      setIsFetching(true)
      try {
        const res = await fetch(`/api/ai/governance?workspaceId=${activeWorkspaceId}`)
        if (res.ok) {
          const { data } = await res.json()
          form.reset({
            ai_enabled: data.ai_enabled,
            require_action_approval: data.require_action_approval,
            allow_ai_task_creation: data.allow_ai_task_creation,
            allow_ai_task_assignment: data.allow_ai_task_assignment,
            allow_ai_task_updates: data.allow_ai_task_updates,
          })
        }
      } catch (err) {
        console.error("Failed to load AI policies", err)
      } finally {
        setIsFetching(false)
      }
    }
    loadPolicy()
  }, [activeWorkspaceId, form])

  async function onSubmit(values: z.infer<typeof policySchema>) {
    if (!activeWorkspaceId) return
    setIsLoading(true)
    try {
      const res = await fetch('/api/ai/governance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId: activeWorkspaceId, ...values }),
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Failed to save AI policies")
      }
      toast.success("AI Governance policies updated successfully!")
    } catch (err: any) {
      toast.error(err.message || "Failed to update AI policies.")
    } finally {
      setIsLoading(false)
    }
  }

  if (isFetching) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>AI Governance</CardTitle>
          <CardDescription>Loading policies...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className="border-indigo-200 shadow-sm dark:border-indigo-900/50">
      <CardHeader className="bg-indigo-50/50 dark:bg-indigo-950/20 border-b pb-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="size-5 text-indigo-500" />
          <CardTitle>AI Governance & Controls</CardTitle>
        </div>
        <CardDescription>
          Configure how AI agents can interact with your workspace data.
          Only Workspace Admins can modify these settings.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-xl">
            <FormField
              control={form.control}
              name="ai_enabled"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Enable Workspace AI</FormLabel>
                    <FormDescription>
                      Allow AI features (chat, workflows, insights) in this workspace.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            
            <div className="space-y-4">
              <h4 className="text-sm font-medium leading-none">Action Permissions</h4>
              <p className="text-sm text-muted-foreground">Control what AI agents are allowed to do autonomously.</p>
              
              <div className="grid gap-4 pl-4 border-l-2">
                <FormField
                  control={form.control}
                  name="allow_ai_task_creation"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between">
                      <div className="space-y-0.5">
                        <FormLabel>Task Creation</FormLabel>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} disabled={!form.watch('ai_enabled')} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="allow_ai_task_updates"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between">
                      <div className="space-y-0.5">
                        <FormLabel>Task Modification (Status/Details)</FormLabel>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} disabled={!form.watch('ai_enabled')} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="allow_ai_task_assignment"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between">
                      <div className="space-y-0.5">
                        <FormLabel>Task Assignment</FormLabel>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} disabled={!form.watch('ai_enabled')} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Button type="submit" disabled={isLoading || isFetching}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Policies
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
