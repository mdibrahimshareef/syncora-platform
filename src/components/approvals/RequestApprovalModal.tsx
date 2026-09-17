"use client"

import * as React from "react"
import { useState } from "react"
import { useDataStore } from "@/stores/data-store"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"

export function RequestApprovalModal({ 
  resourceType, 
  resourceId, 
  children,
  onRequested
}: { 
  resourceType: 'task' | 'document' | 'request', 
  resourceId: string, 
  children: React.ReactNode,
  onRequested?: () => void
}) {
  const [open, setOpen] = useState(false)
  const workspaceMembers = useDataStore(s => s.workspaceMembers);
  const currentUser = useDataStore(s => s.currentUser);
  const activeWorkspaceId = useDataStore(s => s.activeWorkspaceId);
  const requestApproval = useDataStore(s => s.requestApproval);
  
  const [approverId, setApproverId] = useState<string>("")
  const [comment, setComment] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // For testing purposes, we allow selecting anyone EXCEPT the current user
  const potentialApprovers = workspaceMembers.filter(m => m.id !== currentUser?.id)

  const handleSubmit = async () => {
    if (!approverId || !currentUser || !activeWorkspaceId) return
    
    setIsSubmitting(true)
    try {
      await requestApproval({
        workspace_id: activeWorkspaceId,
        resource_type: resourceType,
        resource_id: resourceId,
        requester_id: currentUser.id,
        approver_id: approverId,
        comment: comment || null
      })
      setOpen(false)
      if (onRequested) onRequested()
    } catch (err) {
      console.error(err)
      alert("Failed to request approval")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Request Approval</DialogTitle>
          <DialogDescription>
            Send this {resourceType} to a team member for their review and approval.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="approver">Approver</Label>
            <Select value={approverId} onValueChange={(val) => setApproverId(val || "")}>
              <SelectTrigger>
                <SelectValue placeholder="Select team member" />
              </SelectTrigger>
              <SelectContent>
                {potentialApprovers.map(member => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="comment">Message (Optional)</Label>
            <Textarea 
              id="comment"
              placeholder="What do you need them to look at?"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="resize-none"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!approverId || isSubmitting}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Send Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
