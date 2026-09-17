import { createClient } from "@/lib/supabase/server"
import { getAuditLogs } from "@/lib/api/audit"
import { notFound } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ShieldAlert, Clock, History } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export default async function AuditPage({ params }: { params: { orgSlug: string, teamSlug: string, workspaceSlug: string } }) {
  const supabase = await createClient()
  // NEXT.JS 15 COMPATIBILITY: Await params
  const resolvedParams = await params
  
  // Find workspace ID to ensure we're valid
  const { data: workspaces } = await supabase.from('workspaces').select('id, name, slug')
  const workspace = workspaces?.find(w => w.slug === resolvedParams.workspaceSlug)

  if (!workspace) {
    notFound()
  }

  const logs = await getAuditLogs(supabase, workspace.id, 100)

  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto">
      <div className="flex-1 space-y-6 p-8 pt-6 max-w-7xl mx-auto w-full">
        <div className="flex items-center justify-between space-y-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <ShieldAlert className="h-8 w-8 text-primary" />
              Enterprise Audit Log
            </h2>
            <p className="text-muted-foreground">
              Immutable, read-only record of all critical actions performed in this workspace.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-muted-foreground" />
              Recent Activity
            </CardTitle>
            <CardDescription>
              Showing the latest 100 audit events. Automated via PostgreSQL triggers.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {logs.map((log) => (
                <div key={log.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors gap-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-8 w-8">
                      {log.actor?.avatar_url && <AvatarImage src={log.actor.avatar_url} />}
                      <AvatarFallback>{log.actor?.full_name?.charAt(0) || 'S'}</AvatarFallback>
                    </Avatar>
                    
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          {log.actor?.full_name || 'System User'}
                        </span>
                        <span className="text-muted-foreground text-sm">performed</span>
                        <Badge variant="outline" className="font-mono bg-muted text-xs">
                          {log.action}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 font-mono">
                        Resource: {log.resource_type} ({log.resource_id})
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}

              {logs.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-12 border border-dashed rounded-md">
                  No audit logs found. Try creating or editing a task.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
