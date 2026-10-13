"use client"

import * as React from "react"
import { createClient } from "@/lib/supabase/client"
import { useDataStore } from "@/stores/data-store"
import { createOrganizationInvitation } from "@/lib/api/organizations"
import { toast } from "sonner"
import { Mail, Shield, CheckCircle2, Copy, Check, Link as LinkIcon, UserPlus, Info } from "lucide-react"

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
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface InviteOrgMemberDialogProps {
  orgId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

interface CreatedOrgInviteInfo {
  email: string
  role: string
  inviteLink: string
}

export function InviteOrgMemberDialog({ orgId, open, onOpenChange, onSuccess }: InviteOrgMemberDialogProps) {
  const supabase = createClient()
  const currentUser = useDataStore(s => s.currentUser)
  const [email, setEmail] = React.useState("")
  const [role, setRole] = React.useState("member")
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [createdInvite, setCreatedInvite] = React.useState<CreatedOrgInviteInfo | null>(null)
  const [hasCopied, setHasCopied] = React.useState(false)

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setCreatedInvite(null)
      setHasCopied(false)
      setEmail("")
      setRole("member")
    }
    onOpenChange(isOpen)
  }

  const handleCopyLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link)
      setHasCopied(true)
      toast.success("Invite link copied to clipboard!")
      setTimeout(() => setHasCopied(false), 3000)
    } catch {
      toast.error("Failed to copy link to clipboard")
    }
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !currentUser) return

    setIsSubmitting(true)
    try {
      const result = await createOrganizationInvitation(supabase, orgId, email, role, currentUser.id)
      
      const appUrl = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
      const inviteLink = result?.inviteLink || `${appUrl}/join?token=${result?.token}&type=org`

      setCreatedInvite({
        email,
        role,
        inviteLink
      })

      try {
        await navigator.clipboard.writeText(inviteLink)
        setHasCopied(true)
        toast.success(`Invitation created and link copied!`)
        setTimeout(() => setHasCopied(false), 3000)
      } catch {
        toast.success(`Invitation created for ${email}`)
      }

      setEmail("")
      onSuccess()
    } catch (error: any) {
      toast.error(error.message || "Failed to send invitation")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        {createdInvite ? (
          <div className="space-y-4">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="size-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg">Invitation Ready</DialogTitle>
                  <DialogDescription>
                    Invitation link created for <span className="font-medium text-foreground">{createdInvite.email}</span>
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border text-sm">
              <div className="space-y-0.5">
                <p className="font-medium">{createdInvite.email}</p>
                <p className="text-xs text-muted-foreground">Joining organization</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="capitalize">
                  {createdInvite.role}
                </Badge>
                <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                  Pending
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Direct Invitation Link
              </Label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <LinkIcon className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                  <Input
                    readOnly
                    value={createdInvite.inviteLink}
                    className="pl-9 pr-3 font-mono text-xs select-all bg-muted/30"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                </div>
                <Button
                  type="button"
                  variant={hasCopied ? "default" : "secondary"}
                  className="shrink-0 gap-1.5"
                  onClick={() => handleCopyLink(createdInvite.inviteLink)}
                >
                  {hasCopied ? (
                    <>
                      <Check className="size-4 text-emerald-300" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="size-4" />
                      Copy Link
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="p-3 bg-muted/40 rounded-lg border text-xs text-muted-foreground flex gap-2.5">
              <Info className="size-4 text-indigo-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium text-foreground">How to onboard:</p>
                <p>
                  Share this link directly with the user. When they open it, they can sign in or register to join the organization immediately.
                </p>
              </div>
            </div>

            <DialogFooter className="pt-2 flex sm:justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setCreatedInvite(null)
                  setHasCopied(false)
                  setEmail("")
                }}
              >
                <UserPlus className="size-4 mr-1.5" />
                Invite Another
              </Button>
              <Button
                type="button"
                onClick={() => handleOpenChange(false)}
              >
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleInvite}>
            <DialogHeader>
              <DialogTitle>Invite to Organization</DialogTitle>
              <DialogDescription>
                Invite someone to join this organization. You will receive an invitation link to share directly.
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
                      <SelectItem value="admin">Admin - Full access to settings</SelectItem>
                      <SelectItem value="member">Member - Can join teams</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !email}>
                {isSubmitting ? "Generating..." : "Generate Invite Link"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
