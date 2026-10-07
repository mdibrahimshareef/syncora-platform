"use client"

import * as React from "react"
import { useDataStore } from "@/stores/data-store"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Clock, CheckCircle2, XCircle, AlertTriangle, AlertCircle } from "lucide-react"

type WorkflowHistoryItem = {
  id: string
  title: string
  status: string
  risk_level: string
  created_at: string
  completed_at: string | null
}

const statusIconMap: Record<string, React.ReactNode> = {
  COMPLETED: <CheckCircle2 className="size-4 text-emerald-500" />,
  FAILED: <XCircle className="size-4 text-red-500" />,
  VERIFICATION_FAILED: <AlertCircle className="size-4 text-red-500" />,
  PARTIALLY_COMPLETED: <AlertTriangle className="size-4 text-amber-500" />,
  CANCELLED: <XCircle className="size-4 text-slate-500" />,
  EXECUTING: <Loader2 className="size-4 text-indigo-500 animate-spin" />,
  PENDING: <Clock className="size-4 text-slate-400" />,
}

export function AIWorkflowHistory() {
  const [history, setHistory] = React.useState<WorkflowHistoryItem[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const activeWorkspaceId = useDataStore(s => s.activeWorkspaceId)

  React.useEffect(() => {
    async function loadHistory() {
      if (!activeWorkspaceId) return
      setIsLoading(true)
      try {
        const res = await fetch(`/api/ai/workflows/history?workspaceId=${activeWorkspaceId}`)
        if (res.ok) {
          const { data } = await res.json()
          setHistory(data)
        }
      } catch (err) {
        console.error("Failed to load workflow history", err)
      } finally {
        setIsLoading(false)
      }
    }
    loadHistory()
  }, [activeWorkspaceId])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 text-muted-foreground">
        <Loader2 className="size-5 animate-spin mr-2" />
        <span>Loading workflow history...</span>
      </div>
    )
  }

  if (history.length === 0) {
    return (
      <div className="text-center p-8 text-muted-foreground border rounded-lg border-dashed">
        No workflow history found in this workspace.
      </div>
    )
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>AI Workflow History</CardTitle>
        <CardDescription>Recent autonomous operations and plans executed in this workspace.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {history.map(item => (
            <div key={item.id} className="flex items-center justify-between p-3 border rounded-md">
              <div className="flex items-center gap-3">
                <div className="shrink-0 bg-muted p-1.5 rounded-md">
                  {statusIconMap[item.status] || <Clock className="size-4 text-slate-400" />}
                </div>
                <div>
                  <h4 className="text-sm font-medium">{item.title}</h4>
                  <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                    <span>{new Date(item.created_at).toLocaleString()}</span>
                    <span>&bull;</span>
                    <span className="capitalize">{item.status.replace(/_/g, ' ').toLowerCase()}</span>
                    <span>&bull;</span>
                    <span>Risk: {item.risk_level}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
