"use client"

import * as React from "react"
import { useDataStore } from "@/stores/data-store"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { CheckCircle, Clock, CheckCircle2, XCircle, AlertCircle, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"

const StatusIcon = ({ status }: { status: string }) => {
  switch (status) {
    case 'Approved': return <CheckCircle2 className="h-4 w-4 text-emerald-500" />
    case 'Rejected': return <XCircle className="h-4 w-4 text-destructive" />
    case 'Changes Requested': return <AlertCircle className="h-4 w-4 text-yellow-500" />
    default: return <Clock className="h-4 w-4 text-muted-foreground" />
  }
}

export default function ApprovalsPage() {
  const approvals = useDataStore(s => s.approvals);
  const currentUser = useDataStore(s => s.currentUser);
  const resolveApproval = useDataStore(s => s.resolveApproval);
  
  const [activeDialog, setActiveDialog] = React.useState<string | null>(null)
  const [resolutionComment, setResolutionComment] = React.useState("")
  
  if (!currentUser) return null

  const assignedToMe = approvals.filter(a => a.approver_id === currentUser.id)
  const requestedByMe = approvals.filter(a => a.requester_id === currentUser.id)

  const handleResolve = async (id: string, status: 'Approved' | 'Rejected' | 'Changes Requested') => {
    try {
      await resolveApproval(id, status, resolutionComment)
      toast.success(`Approval marked as ${status}`)
      setActiveDialog(null)
      setResolutionComment("")
    } catch (err: any) {
      toast.error(err.message || "Failed to resolve approval")
    }
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex-1 space-y-6 p-8 pt-6 max-w-7xl mx-auto w-full">
        <div className="flex items-center justify-between space-y-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Approvals</h2>
            <p className="text-muted-foreground">
              Review requests assigned to you and track the status of your requests.
            </p>
          </div>
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
                  <div key={approval.id} className="flex flex-col gap-3 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="font-medium flex items-center gap-2">
                        <StatusIcon status={approval.status} />
                        {approval.resource_type.toUpperCase()} Approval
                      </div>
                      <Badge variant={approval.status === 'Pending' ? 'default' : 'secondary'}>
                        {approval.status}
                      </Badge>
                    </div>
                    
                    <div className="text-sm">
                      {approval.details ? (
                        <div className="text-muted-foreground">
                          {typeof approval.details === 'object' 
                            ? Object.entries(approval.details).map(([k, v]) => `${k}: ${v}`).join(', ')
                            : String(approval.details)}
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic">No additional details provided.</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-3 border-t border-border/50">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        Requested by: 
                        <span className="font-medium text-foreground">
                          {(approval as any).requester?.full_name || 'Unknown User'}
                        </span>
                      </div>
                      
                      {approval.status === 'Pending' && (
                        <Dialog open={activeDialog === approval.id} onOpenChange={(open) => {
                          setActiveDialog(open ? approval.id : null)
                          if (!open) setResolutionComment("")
                        }}>
                          <DialogTrigger render={<Button size="sm" variant="outline">Review</Button>} />
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Review Approval Request</DialogTitle>
                              <DialogDescription>
                                Provide your decision for this {approval.resource_type} request.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="py-4">
                              <Label>Add a comment (Optional)</Label>
                              <Textarea 
                                className="mt-2" 
                                placeholder="E.g., Looks great, approved!" 
                                value={resolutionComment}
                                onChange={(e) => setResolutionComment(e.target.value)}
                              />
                            </div>
                            <DialogFooter className="flex items-center gap-2">
                              <Button 
                                variant="destructive" 
                                onClick={() => handleResolve(approval.id, 'Rejected')}
                              >
                                Reject
                              </Button>
                              <Button 
                                variant="outline"
                                onClick={() => handleResolve(approval.id, 'Changes Requested')}
                              >
                                Request Changes
                              </Button>
                              <Button 
                                variant="default"
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                onClick={() => handleResolve(approval.id, 'Approved')}
                              >
                                Approve
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>

                    {approval.comment && approval.status !== 'Pending' && (
                      <div className="text-sm bg-muted p-2 rounded mt-2 border-l-2 border-primary italic">
                        "{approval.comment}"
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
                <FileText className="h-5 w-5 text-muted-foreground" />
                Your Requests
              </CardTitle>
              <CardDescription>Track the status of approvals you've requested.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {requestedByMe.map(approval => (
                  <div key={approval.id} className="flex flex-col gap-2 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="font-medium flex items-center gap-2">
                        <StatusIcon status={approval.status} />
                        {approval.resource_type.toUpperCase()} Approval
                      </div>
                      <Badge variant={approval.status === 'Pending' ? 'default' : 'secondary'}>
                        {approval.status}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                      Reviewer: 
                      <span className="font-medium text-foreground">
                        {(approval as any).approver?.full_name || 'Unknown Approver'}
                      </span>
                    </div>

                    {approval.comment && (
                      <div className="text-sm bg-muted p-2 rounded mt-2 border-l-2 border-primary italic">
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
