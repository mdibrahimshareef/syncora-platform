"use client"

import * as React from "react"
import { useEffect, useState } from "react"
import { useDataStore } from "@/stores/data-store"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircle, Clock, CheckCircle2, XCircle, AlertCircle, Loader2 } from "lucide-react"
import { RequestApprovalModal } from "@/components/approvals/RequestApprovalModal"

export function ApprovalsClientWrapper({ orgSlug, teamSlug, workspaceSlug }: { orgSlug: string, teamSlug: string, workspaceSlug: string }) {
  const approvals = useDataStore(s => s.approvals);
  const fetchApprovals = useDataStore(s => s.fetchApprovals);
  const activeWorkspaceId = useDataStore(s => s.activeWorkspaceId);
  const currentUser = useDataStore(s => s.currentUser);
  const resolveApproval = useDataStore(s => s.resolveApproval);

  const [resolvingId, setResolvingId] = useState<string | null>(null)

  useEffect(() => {
    if (activeWorkspaceId) {
      fetchApprovals()
    }
  }, [activeWorkspaceId, fetchApprovals])

  if (!currentUser) return null

  const assignedToMe = approvals.filter(a => a.approver_id === currentUser.id)
  const requestedByMe = approvals.filter(a => a.requester_id === currentUser.id)

  const handleResolve = async (id: string, status: 'Approved' | 'Rejected' | 'Changes Requested') => {
    setResolvingId(id)
    try {
      await resolveApproval(id, status)
    } catch (err) {
      console.error(err)
      alert("Failed to resolve approval.")
    } finally {
      setResolvingId(null)
    }
  }

  const StatusIcon = ({ status }: { status: string }) => {
    switch (status) {
      case 'Approved': return <CheckCircle2 className="h-4 w-4 text-emerald-500" />
      case 'Rejected': return <XCircle className="h-4 w-4 text-destructive" />
      case 'Changes Requested': return <AlertCircle className="h-4 w-4 text-yellow-500" />
      default: return <Clock className="h-4 w-4 text-muted-foreground" />
    }
  }

  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto">
      <div className="flex-1 space-y-6 p-8 pt-6 max-w-7xl mx-auto w-full">
        <div className="flex items-center justify-between space-y-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Approvals</h2>
            <p className="text-muted-foreground">
              Review requests assigned to you and track the status of your requests.
            </p>
          </div>
          
          <RequestApprovalModal resourceType="task" resourceId="test-id-123">
            <Button>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              New Approval Request
            </Button>
          </RequestApprovalModal>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Assigned To Me */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-muted-foreground" />
                Waiting on You
              </CardTitle>
              <CardDescription>Approvals that require your decision.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {assignedToMe.map(approval => (
                  <div key={approval.id} className="flex flex-col gap-2 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="font-medium flex items-center gap-2 capitalize">
                        <StatusIcon status={approval.status} />
                        {approval.resource_type} Approval
                      </div>
                      <Badge variant={approval.status === 'Pending' ? 'default' : 'secondary'}>
                        {approval.status}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                      Requested by: 
                      <span className="font-medium text-foreground">{approval.requester?.name || approval.requester?.full_name || 'Unknown'}</span>
                    </div>

                    {approval.comment && (
                      <div className="text-sm bg-muted p-2 rounded mt-2 italic">
                        "{approval.comment}"
                      </div>
                    )}

                    {approval.status === 'Pending' && (
                      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border/50">
                        <Button 
                          size="sm" 
                          variant="default"
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                          disabled={resolvingId === approval.id}
                          onClick={() => handleResolve(approval.id, 'Approved')}
                        >
                          {resolvingId === approval.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                          Approve
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          className="flex-1"
                          disabled={resolvingId === approval.id}
                          onClick={() => handleResolve(approval.id, 'Rejected')}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
                {assignedToMe.length === 0 && (
                  <div className="text-sm text-muted-foreground text-center py-8 border border-dashed rounded-md">
                    You're all caught up! No pending approvals.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Requested By Me */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-muted-foreground" />
                Your Requests
              </CardTitle>
              <CardDescription>Track approvals you have requested.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {requestedByMe.map(approval => (
                  <div key={approval.id} className="flex flex-col gap-2 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="font-medium flex items-center gap-2 capitalize">
                        <StatusIcon status={approval.status} />
                        {approval.resource_type} Approval
                      </div>
                      <Badge variant={
                        approval.status === 'Approved' ? 'default' : 
                        approval.status === 'Rejected' ? 'destructive' : 'secondary'
                      }>
                        {approval.status}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                      Assigned to: 
                      <span className="font-medium text-foreground">{approval.approver?.name || approval.approver?.full_name || 'Unknown'}</span>
                    </div>

                    {approval.comment && (
                      <div className="text-sm bg-muted p-2 rounded mt-2 italic">
                        "{approval.comment}"
                      </div>
                    )}
                  </div>
                ))}
                {requestedByMe.length === 0 && (
                  <div className="text-sm text-muted-foreground text-center py-8 border border-dashed rounded-md">
                    You haven't requested any approvals yet.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
