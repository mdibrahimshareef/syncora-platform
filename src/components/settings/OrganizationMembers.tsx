"use client"

import * as React from "react"
import { useOrganizationStore } from "@/stores/organizationStore"
import { useDataStore } from "@/stores/data-store"
import { createClient } from "@/lib/supabase/client"
import { 
  getOrganizationMembers, 
  getOrganizationInvitations, 
  removeOrganizationMember, 
  updateOrganizationMemberRole,
  cancelOrganizationInvitation
} from "@/lib/api/organizations"
import { toast } from "sonner"
import { User, MoreHorizontal, Shield, Mail, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatDistanceToNow } from "date-fns"
import { InviteOrgMemberDialog } from "./InviteOrgMemberDialog"

export function OrganizationMembers({ orgId }: { orgId: string }) {
  const currentUser = useDataStore(s => s.currentUser);
  const supabase = createClient()
  const [members, setMembers] = React.useState<any[]>([])
  const [invitations, setInvitations] = React.useState<any[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isInviteDialogOpen, setIsInviteDialogOpen] = React.useState(false)

  const loadData = React.useCallback(async () => {
    if (!orgId) return
    setIsLoading(true)
    try {
      const [membersData, invitationsData] = await Promise.all([
        getOrganizationMembers(supabase, orgId),
        getOrganizationInvitations(supabase, orgId)
      ])
      setMembers(membersData || [])
      setInvitations(invitationsData || [])
    } catch (error) {
      console.error("Failed to load org members:", error)
      toast.error("Failed to load members")
    } finally {
      setIsLoading(false)
    }
  }, [orgId, supabase])

  React.useEffect(() => {
    loadData()
  }, [loadData])

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      await updateOrganizationMemberRole(supabase, orgId, userId, newRole)
      toast.success("Role updated successfully")
      loadData()
    } catch (error: any) {
      toast.error(error.message || "Failed to update role")
    }
  }

  const handleRemoveMember = async (userId: string) => {
    if (!confirm("Are you sure you want to remove this member from the organization?")) return
    
    try {
      await removeOrganizationMember(supabase, orgId, userId)
      toast.success("Member removed successfully")
      loadData()
    } catch (error: any) {
      toast.error(error.message || "Failed to remove member")
    }
  }

  const handleCancelInvite = async (inviteId: string) => {
    try {
      await cancelOrganizationInvitation(supabase, inviteId)
      toast.success("Invitation canceled")
      loadData()
    } catch (error: any) {
      toast.error(error.message || "Failed to cancel invitation")
    }
  }

  // Find current user's role to determine permissions
  const currentUserMember = members.find(m => m.user_id === currentUser?.id)
  const isAdminOrOwner = currentUserMember?.role === 'admin' || currentUserMember?.role === 'owner'
  const isOwner = currentUserMember?.role === 'owner'

  if (isLoading) {
    return <div className="py-8 text-center text-muted-foreground">Loading members...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Members</h3>
          <p className="text-sm text-muted-foreground">
            Manage who has access to this organization.
          </p>
        </div>
        {isAdminOrOwner && (
          <Button onClick={() => setIsInviteDialogOpen(true)}>
            Invite Member
          </Button>
        )}
      </div>

      <div className="rounded-md border border-border">
        {/* Active Members */}
        <div className="divide-y divide-border">
          {members.map((member) => (
            <div key={member.id} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={member.profiles?.avatar_url} />
                  <AvatarFallback>{member.profiles?.full_name?.substring(0, 2).toUpperCase() || 'U'}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{member.profiles?.full_name || 'Unknown User'}</p>
                    {member.user_id === currentUser?.id && (
                      <Badge variant="secondary" className="text-[10px]">You</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {member.profiles?.metadata?.contact || member.profiles?.email || member.profiles?.username || "No email provided"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-[120px]">
                  {isAdminOrOwner && member.user_id !== currentUser?.id && (isOwner || member.role !== 'owner') ? (
                    <Select
                      defaultValue={member.role}
                      onValueChange={(val) => handleUpdateRole(member.user_id, val)}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {isOwner && <SelectItem value="owner">Owner</SelectItem>}
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="member">Member</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground px-3 py-1">
                      {member.role === 'owner' && <Shield className="size-3.5 text-primary" />}
                      <span className="capitalize">{member.role}</span>
                    </div>
                  )}
                </div>

                {isAdminOrOwner && member.user_id !== currentUser?.id && (isOwner || member.role !== 'owner') && (
                  <DropdownMenu>
                    <DropdownMenuTrigger render={<Button variant="ghost" className="h-8 w-8 p-0" />}>
                      <MoreHorizontal className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem 
                        className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                        onClick={() => handleRemoveMember(member.user_id)}
                      >
                        <Trash2 className="mr-2 size-4" />
                        Remove from org
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          ))}

          {/* Pending Invitations */}
          {invitations.map((invite) => (
            <div key={invite.id} className="flex items-center justify-between p-4 bg-muted/20">
              <div className="flex items-center gap-3 opacity-70">
                <Avatar>
                  <AvatarFallback><Mail className="size-4" /></AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{invite.email}</p>
                    <Badge variant="outline" className="text-[10px] bg-background">Pending</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Invited {formatDistanceToNow(new Date(invite.created_at))} ago
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-[120px] px-3">
                  <span className="text-sm capitalize text-muted-foreground">{invite.role}</span>
                </div>
                
                {isAdminOrOwner && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="size-8 text-muted-foreground hover:text-destructive"
                    onClick={() => handleCancelInvite(invite.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <InviteOrgMemberDialog 
        orgId={orgId} 
        open={isInviteDialogOpen} 
        onOpenChange={setIsInviteDialogOpen}
        onSuccess={loadData}
      />
    </div>
  )
}
