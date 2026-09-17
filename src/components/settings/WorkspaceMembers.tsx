"use client"

import * as React from "react"
import { useDataStore } from "@/stores/data-store"
import { createClient } from "@/lib/supabase/client"
import {
  getWorkspaceMembers,
  getWorkspaceInvitations,
  removeMember,
  updateMemberRole,
  cancelWorkspaceInvitation
} from "@/lib/api/workspaces"
import { InviteMemberDialog } from "./InviteMemberDialog"
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

export function WorkspaceMembers() {
  const currentUser = useDataStore(s => s.currentUser);
  const activeWorkspaceId = useDataStore(s => s.activeWorkspaceId);
  const workspaces = useDataStore(s => s.workspaces);
  const currentWorkspace = workspaces.find(w => w.id === activeWorkspaceId)
  const supabase = createClient()
  const [members, setMembers] = React.useState<any[]>([])
  const [invitations, setInvitations] = React.useState<any[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isInviteDialogOpen, setIsInviteDialogOpen] = React.useState(false)

  const loadData = React.useCallback(async () => {
    if (!currentWorkspace) return
    setIsLoading(true)
    try {
      const [membersData, invitationsData] = await Promise.all([
        getWorkspaceMembers(supabase, currentWorkspace.id),
        getWorkspaceInvitations(supabase, currentWorkspace.id)
      ])
      setMembers(membersData || [])
      setInvitations(invitationsData || [])
    } catch (error) {
      console.error("Failed to load members:", error)
      toast.error("Failed to load members")
    } finally {
      setIsLoading(false)
    }
  }, [currentWorkspace, supabase])

  React.useEffect(() => {
    loadData()
  }, [loadData])

  const getInitials = (name?: string) => {
    if (!name) return "U"
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }

  const currentUserMember = members.find(m => m.user_id === currentUser?.id)
  const isCurrentUserAdminOrOwner = currentUserMember?.role === 'admin' || currentUserMember?.role === 'owner'

  const handleUpdateRole = async (userId: string, newRole: 'admin' | 'member') => {
    if (!currentWorkspace) return
    try {
      await updateMemberRole(supabase, currentWorkspace.id, userId, newRole)
      toast.success("Role updated successfully")
      loadData()
    } catch (error) {
      console.error(error)
      toast.error("Failed to update role")
    }
  }

  const handleRemoveMember = async (userId: string) => {
    if (!currentWorkspace) return
    if (!window.confirm("Are you sure you want to remove this member?")) return
    try {
      await removeMember(supabase, currentWorkspace.id, userId)
      toast.success("Member removed successfully")
      loadData()
    } catch (error) {
      console.error(error)
      toast.error("Failed to remove member")
    }
  }

  const handleCancelInvitation = async (invitationId: string) => {
    if (!window.confirm("Are you sure you want to cancel this invitation?")) return
    try {
      await cancelWorkspaceInvitation(supabase, invitationId)
      toast.success("Invitation cancelled successfully")
      loadData()
    } catch (error) {
      console.error(error)
      toast.error("Failed to cancel invitation")
    }
  }

  if (isLoading) {
    return <div className="flex justify-center p-8 text-muted-foreground">Loading members...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Workspace Members</h3>
          <p className="text-sm text-muted-foreground">
            Manage who has access to this workspace.
          </p>
        </div>
        {isCurrentUserAdminOrOwner && (
          <Button onClick={() => setIsInviteDialogOpen(true)}>
            Invite Member
          </Button>
        )}
      </div>

      <div className="rounded-md border">
        <div className="divide-y">
          {members.map((member) => (
            <div key={member.id} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <Avatar>
                  <AvatarImage src={member.profiles?.avatar_url} />
                  <AvatarFallback>{getInitials(member.profiles?.full_name)}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium leading-none">
                      {member.profiles?.full_name || "Unknown User"}
                    </p>
                    {member.user_id === currentUser?.id && (
                      <Badge variant="secondary" className="text-[10px]">You</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {member.profiles?.metadata?.contact || member.profiles?.email || member.profiles?.username || "No email provided"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isCurrentUserAdminOrOwner && member.role !== 'owner' && member.user_id !== currentUser?.id ? (
                  <Select
                    defaultValue={member.role}
                    onValueChange={(val) => handleUpdateRole(member.user_id, val as 'admin' | 'member')}
                  >
                    <SelectTrigger className="w-[110px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant={member.role === 'owner' ? "default" : "outline"} className="capitalize">
                    {member.role}
                  </Badge>
                )}

                {isCurrentUserAdminOrOwner && member.role !== 'owner' && member.user_id !== currentUser?.id && (
                  <DropdownMenu>
                    <DropdownMenuTrigger render={<Button variant="ghost" className="h-8 w-8 p-0" />}>
                      <MoreHorizontal className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => handleRemoveMember(member.user_id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remove from workspace
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {invitations.length > 0 && (
        <div className="mt-8">
          <h4 className="text-sm font-medium mb-3">Pending Invitations</h4>
          <div className="rounded-md border">
            <div className="divide-y">
              {invitations.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    <div className="size-10 rounded-full bg-muted flex items-center justify-center">
                      <Mail className="size-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium leading-none">{inv.email}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Invited {formatDistanceToNow(new Date(inv.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize">
                      {inv.role}
                    </Badge>
                    <Badge variant="secondary">Pending</Badge>
                    {isCurrentUserAdminOrOwner && (
                      <DropdownMenu>
                        <DropdownMenuTrigger render={<Button variant="ghost" className="h-8 w-8 p-0 ml-2" />}>
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => handleCancelInvitation(inv.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Revoke invitation
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <InviteMemberDialog
        open={isInviteDialogOpen}
        onOpenChange={setIsInviteDialogOpen}
        onSuccess={loadData}
      />
    </div>
  )
}
