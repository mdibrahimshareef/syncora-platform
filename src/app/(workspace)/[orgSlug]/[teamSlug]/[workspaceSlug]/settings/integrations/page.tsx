"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Blocks, GitMerge, MessageSquare, Kanban, Key, CheckCircle2, Link2, Loader2, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { useDataStore } from "@/stores/data-store"

type IntegrationStatus = 'disconnected' | 'connecting' | 'connected'

export default function IntegrationsPage() {
  const [slackStatus, setSlackStatus] = React.useState<IntegrationStatus>('disconnected')
  const [githubStatus, setGithubStatus] = React.useState<IntegrationStatus>('disconnected')
  const [jiraStatus, setJiraStatus] = React.useState<IntegrationStatus>('disconnected')

  const handleConnect = (service: 'slack' | 'github' | 'jira') => {
    const setStatus = service === 'slack' ? setSlackStatus : service === 'github' ? setGithubStatus : setJiraStatus
    
    setStatus('connecting')
    
    // Simulate OAuth connection delay
    setTimeout(() => {
      setStatus('connected')
      toast.success(`Successfully connected to ${service.charAt(0).toUpperCase() + service.slice(1)}`)
    }, 1500)
  }

  const handleDisconnect = (service: 'slack' | 'github' | 'jira') => {
    const setStatus = service === 'slack' ? setSlackStatus : service === 'github' ? setGithubStatus : setJiraStatus
    setStatus('disconnected')
    toast.info(`Disconnected from ${service.charAt(0).toUpperCase() + service.slice(1)}`)
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Integrations</h3>
        <p className="text-sm text-muted-foreground">
          Connect SYNCORA with your favorite tools to keep your data synchronized across platforms.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* SLACK */}
        <Card className={slackStatus === 'connected' ? 'border-primary/50 bg-primary/5' : ''}>
          <CardHeader className="flex flex-row items-start gap-4">
            <div className="h-10 w-10 bg-muted rounded-md flex items-center justify-center shrink-0">
              <MessageSquare className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-base flex items-center gap-2">
                Slack
                {slackStatus === 'connected' && <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20">Connected</Badge>}
              </CardTitle>
              <CardDescription className="mt-1">Send notifications to Slack channels when tasks are updated or requests are submitted.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex justify-end pt-0">
            {slackStatus === 'disconnected' && (
              <Button variant="outline" size="sm" onClick={() => handleConnect('slack')}>
                <Link2 className="h-4 w-4 mr-2" /> Connect
              </Button>
            )}
            {slackStatus === 'connecting' && (
              <Button variant="outline" size="sm" disabled>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Connecting...
              </Button>
            )}
            {slackStatus === 'connected' && (
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDisconnect('slack')}>
                Disconnect
              </Button>
            )}
          </CardContent>
        </Card>

        {/* GITHUB */}
        <Card className={githubStatus === 'connected' ? 'border-primary/50 bg-primary/5' : ''}>
          <CardHeader className="flex flex-row items-start gap-4">
            <div className="h-10 w-10 bg-muted rounded-md flex items-center justify-center shrink-0">
              <GitMerge className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-base flex items-center gap-2">
                GitHub
                {githubStatus === 'connected' && <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20">Connected</Badge>}
              </CardTitle>
              <CardDescription className="mt-1">Link pull requests to tasks and automatically update task statuses when PRs are merged.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex justify-end pt-0">
            {githubStatus === 'disconnected' && (
              <Button variant="outline" size="sm" onClick={() => handleConnect('github')}>
                <Link2 className="h-4 w-4 mr-2" /> Connect
              </Button>
            )}
            {githubStatus === 'connecting' && (
              <Button variant="outline" size="sm" disabled>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Connecting...
              </Button>
            )}
            {githubStatus === 'connected' && (
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDisconnect('github')}>
                Disconnect
              </Button>
            )}
          </CardContent>
        </Card>

        {/* JIRA */}
        <Card className={jiraStatus === 'connected' ? 'border-primary/50 bg-primary/5' : ''}>
          <CardHeader className="flex flex-row items-start gap-4">
            <div className="h-10 w-10 bg-muted rounded-md flex items-center justify-center shrink-0">
              <Kanban className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-base flex items-center gap-2">
                Jira Cloud
                {jiraStatus === 'connected' && <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20">Connected</Badge>}
              </CardTitle>
              <CardDescription className="mt-1">Maintain a two-way synchronization between Syncora projects and Jira boards.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex justify-end pt-0">
            {jiraStatus === 'disconnected' && (
              <Button variant="outline" size="sm" onClick={() => handleConnect('jira')}>
                <Link2 className="h-4 w-4 mr-2" /> Connect
              </Button>
            )}
            {jiraStatus === 'connecting' && (
              <Button variant="outline" size="sm" disabled>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Connecting...
              </Button>
            )}
            {jiraStatus === 'connected' && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => toast.success("Sync triggered successfully")}>
                  <RefreshCw className="h-4 w-4 mr-2" /> Force Sync
                </Button>
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDisconnect('jira')}>
                  Disconnect
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ZAPIER */}
        <Card>
          <CardHeader className="flex flex-row items-start gap-4">
            <div className="h-10 w-10 bg-muted rounded-md flex items-center justify-center shrink-0">
              <Blocks className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-base">Zapier</CardTitle>
              <CardDescription className="mt-1">Connect Syncora to 5,000+ apps. Use Zapier to build custom workflows without coding.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex justify-end pt-0">
            <Button variant="outline" size="sm" onClick={() => window.open('https://zapier.com', '_blank')}>
              Explore Zapier
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 pt-8 border-t">
        <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
          <Key className="h-5 w-5" />
          API Access
        </h3>
        <Card>
          <CardContent className="pt-6 flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-4 max-w-2xl">
                SYNCORA provides a comprehensive REST API to allow enterprise developers to read and write operational data directly to the core engine.
              </p>
              <div className="flex items-center gap-4">
                <Button onClick={() => toast.success("API Key copied to clipboard: sk_test_4f923...")}>Generate API Key</Button>
                <Button variant="outline" onClick={() => toast.info("Opening Developer Portal...")}>View Documentation</Button>
              </div>
            </div>
            <Badge variant="secondary" className="bg-primary/10 text-primary">v2 API Active</Badge>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
