"use client"

import * as React from "react"
import { createClient } from "@/lib/supabase/client"
import { useDataStore } from "@/stores/data-store"
import { createTeamInvitation } from "@/lib/api/teams"
import { toast } from "sonner"
import { Mail, Shield } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface InviteTeamMemberDialogProps {
  teamId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function InviteTeamMemberDialog({ teamId, open, onOpenChange, onSuccess }: InviteTeamMemberDialogProps) {
  const supabase = createClient()
  const currentUser = useDataStore(s => s.currentUser);
  const [email, setEmail] = React.useState("")
  const [role, setRole] = React.useState("member")
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !currentUser) return

    setIsSubmitting(true)
    try {
      await createTeamInvitation(supabase, teamId, email, role, currentUser.id)
      toast.success(`Invitation sent to ${email}`)
      setEmail("")
      setRole("member")
      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      toast.error(error.message || "Failed to send invitation")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleInvite}>
          <DialogHeader>
            <DialogTitle>Invite to Team</DialogTitle>
            <DialogDescription>
              Invite someone to join this team. They will receive an email with an invitation link.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="colleague@example.com"
                  className="pl-9"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <div className="relative">
                <Shield className="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10" />
                <Select value={role} onValueChange={(val) => val && setRole(val)}>
                  <SelectTrigger id="role" className="pl-9">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lead">Lead - Full access to team settings</SelectItem>
                    <SelectItem value="member">Member - Can access team workspaces</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !email}>
              {isSubmitting ? "Sending..." : "Send Invitation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
