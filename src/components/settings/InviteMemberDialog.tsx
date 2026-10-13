"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import { useDataStore } from "@/stores/data-store"
import { inviteMember } from "@/lib/api/workspaces"
import { createClient } from "@/lib/supabase/client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CheckCircle2, Copy, Check, Link as LinkIcon, UserPlus, Info } from "lucide-react"

const formSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  role: z.enum(["admin", "member"]),
})

type FormValues = z.infer<typeof formSchema>

interface InviteMemberDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

interface CreatedInviteInfo {
  email: string
  role: string
  inviteLink: string
}

export function InviteMemberDialog({ open, onOpenChange, onSuccess }: InviteMemberDialogProps) {
  const workspaces = useDataStore(s => s.workspaces)
  const activeWorkspaceId = useDataStore(s => s.activeWorkspaceId)
  const currentWorkspace = workspaces.find((w: any) => w.id === activeWorkspaceId)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [createdInvite, setCreatedInvite] = React.useState<CreatedInviteInfo | null>(null)
  const [hasCopied, setHasCopied] = React.useState(false)
  const supabase = createClient()

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      role: "member",
    },
  })

  // Reset state whenever the dialog open state changes
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setCreatedInvite(null)
      setHasCopied(false)
      form.reset()
    }
    onOpenChange(isOpen)
  }

  const handleCopyLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link)
      setHasCopied(true)
      toast.success("Invite link copied to clipboard!")
      setTimeout(() => setHasCopied(false), 3000)
    } catch (err) {
      toast.error("Failed to copy link. Please manually select and copy.")
    }
  }

  async function onSubmit(values: FormValues) {
    if (!currentWorkspace) return

    setIsSubmitting(true)
    try {
      const result = await inviteMember(supabase, currentWorkspace.id, values.email, values.role)
      
      const appUrl = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
      const inviteLink = result?.inviteLink || `${appUrl}/join?token=${result?.token}&type=workspace`

      setCreatedInvite({
        email: values.email,
        role: values.role,
        inviteLink
      })

      // Attempt immediate copy to clipboard
      try {
        await navigator.clipboard.writeText(inviteLink)
        setHasCopied(true)
        toast.success("Invitation created and link copied to clipboard!")
        setTimeout(() => setHasCopied(false), 3000)
      } catch {
        toast.success("Invitation created successfully!")
      }

      form.reset()
      onSuccess?.()
    } catch (error: any) {
      if (error.code === '23505') {
        toast.error("This user has already been invited to this workspace.")
      } else {
        console.error('Failed to invite member:', error)
        toast.error(error.message || "Failed to send invitation")
      }
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
                <p className="text-xs text-muted-foreground">Joining {currentWorkspace?.name}</p>
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
                  Copy and share this link directly with your member. They can open it in their browser (or you can test in an <strong className="text-foreground">Incognito window</strong>) to sign in and join the workspace immediately.
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
                  form.reset()
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
          <>
            <DialogHeader>
              <DialogTitle>Invite Member</DialogTitle>
              <DialogDescription>
                Invite a new member to join {currentWorkspace?.name}. You will receive a direct invitation link to share.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input placeholder="name@example.com" type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter className="pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleOpenChange(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Generating..." : "Generate Invite Link"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
