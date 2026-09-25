"use client"

import * as React from "react"
import { useDataStore } from "@/stores/data-store"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { toast } from "sonner"
import { CheckCircle, XCircle, Clock } from "lucide-react"

export default function AdminTimesheetsPage() {
  const { activeWorkspaceId, workspaceMembers } = useDataStore()
  const [timesheets, setTimesheets] = React.useState<any[]>([])
  const [isLoading, setIsLoading] = React.useState(true)

  const fetchTimesheets = React.useCallback(async () => {
    if (!activeWorkspaceId) return
    setIsLoading(true)
    try {
      const res = await fetch(`/api/timesheets?workspaceId=${activeWorkspaceId}`)
      if (res.ok) {
        const data = await res.json()
        setTimesheets(data)
      }
    } catch (err) {
      console.error('Failed to fetch timesheets', err)
    } finally {
      setIsLoading(false)
    }
  }, [activeWorkspaceId])

  React.useEffect(() => {
    fetchTimesheets()
  }, [fetchTimesheets])

  const handleAction = async (id: string, action: 'APPROVE' | 'REJECT') => {
    try {
      const res = await fetch(`/api/timesheets/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED' })
      })

      if (res.ok) {
        toast.success(`Timesheet ${action.toLowerCase()}d`)
        fetchTimesheets()
      } else {
        toast.error(`Failed to ${action.toLowerCase()} timesheet`)
      }
    } catch (err) {
      toast.error('Network error')
    }
  }

  const getMember = (id: string) => workspaceMembers.find(m => m.id === id)

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading timesheets...</div>

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      <div className="flex-1 overflow-y-auto p-8 max-w-7xl mx-auto w-full space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Timesheet Review</h1>
          <p className="text-muted-foreground">Review and approve team timesheets.</p>
        </div>

        <div className="rounded-md border bg-card overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Total Hours</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {timesheets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    No timesheets to review.
                  </TableCell>
                </TableRow>
              ) : (
                timesheets.map((ts) => {
                  const member = getMember(ts.user_id)
                  return (
                    <TableRow key={ts.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="size-8">
                            <AvatarImage src={member?.avatarUrl} />
                            <AvatarFallback>{member?.initials || '?'}</AvatarFallback>
                          </Avatar>
                          <div className="font-medium">{member?.name || 'Unknown'}</div>
                        </div>
                      </TableCell>
                      <TableCell>{new Date(ts.start_date).toLocaleDateString()} - {new Date(ts.end_date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Clock className="size-3.5 text-muted-foreground" />
                          <span>{(ts.total_minutes / 60).toFixed(1)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={ts.status === 'APPROVED' ? 'default' : ts.status === 'REJECTED' ? 'destructive' : 'secondary'}>
                          {ts.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {ts.status === 'SUBMITTED' && (
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline" className="text-destructive hover:bg-destructive/10" onClick={() => handleAction(ts.id, 'REJECT')}>
                              <XCircle className="size-4 mr-1" /> Reject
                            </Button>
                            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleAction(ts.id, 'APPROVE')}>
                              <CheckCircle className="size-4 mr-1" /> Approve
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
