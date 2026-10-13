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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

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

export function InviteMemberDialog({ open, onOpenChange, onSuccess }: InviteMemberDialogProps) {
  const workspaces = useDataStore(s => s.workspaces)
  const activeWorkspaceId = useDataStore(s => s.activeWorkspaceId)
  const currentWorkspace = workspaces.find((w: any) => w.id === activeWorkspaceId)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const supabase = createClient()

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      role: "member",
    },
  })

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      form.reset()
    }
    onOpenChange(isOpen)
  }

  async function onSubmit(values: FormValues) {
    if (!currentWorkspace) return

    setIsSubmitting(true)
    try {
      const result = await inviteMember(supabase, currentWorkspace.id, values.email, values.role)
      
      const appUrl = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
      const inviteLink = result?.inviteLink || `${appUrl}/join?token=${result?.token}&type=workspace`

      try {
        await navigator.clipboard.writeText(inviteLink)
        toast.success("Invitation created and link copied to clipboard!")
      } catch {
        toast.success("Invitation created successfully!")
      }

      form.reset()
      handleOpenChange(false)
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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Invite Member</DialogTitle>
          <DialogDescription>
            Invite a new member to join {currentWorkspace?.name}. The invitation link will be copied to your clipboard.
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
                {isSubmitting ? "Inviting..." : "Invite Member"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
