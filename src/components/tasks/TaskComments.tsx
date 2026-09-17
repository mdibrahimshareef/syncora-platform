"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { formatDistanceToNow } from "date-fns"
import { createClient } from "@/lib/supabase/client"
import { createComment } from "@/lib/api/comments"
import { useTaskRealtime } from "@/hooks/useTaskRealtime"
import { useDataStore } from "@/stores/data-store"
import { Task } from "@/types"

import { Button } from "@/components/ui/button"
import dynamic from 'next/dynamic'
const RichTextEditor = dynamic(() => import("@/components/ui/rich-text-editor").then(mod => mod.RichTextEditor), { ssr: false })
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { toast } from "sonner"

const commentSchema = z.object({
  body: z.string().min(1, "Comment cannot be empty").max(1000, "Comment is too long"),
})

interface TaskCommentsProps {
  task: Task
}

export function TaskComments({ task }: TaskCommentsProps) {
  const currentUser = useDataStore(s => s.currentUser);
  const activeWorkspaceId = useDataStore(s => s.activeWorkspaceId);
  const projects = useDataStore(s => s.projects);
  const { timeline, isLoading, setComments } = useTaskRealtime(task.id)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const form = useForm<z.infer<typeof commentSchema>>({
    resolver: zodResolver(commentSchema),
    defaultValues: { body: "" },
  })
  
  const watchedBody = form.watch("body") || ""

  const project = projects.find(p => p.id === task.projectId)

  async function onSubmit(data: z.infer<typeof commentSchema>) {
    if (!currentUser || !activeWorkspaceId) return
    setIsSubmitting(true)

    try {
      const supabase = createClient()
      const newComment = await createComment(supabase, {
        taskId: task.id,
        workspaceId: activeWorkspaceId,
        authorId: currentUser.id,
        body: data.body,
      })

      // Optimistic insert
      setComments(prev => [...prev, newComment])
      form.reset()

      // Database triggers handle comment notifications automatically now.
      
      // Handle @mentions
      const mentionRegex = /@([a-zA-Z0-9_-]+)/g
      const mentions = [...data.body.matchAll(mentionRegex)].map(m => m[1])
      
      if (mentions.length > 0) {
        // Find users matching the mentioned names (basic case-insensitive match on full_name or part of it)
        const { data: users } = await supabase
          .from('profiles')
          .select('id, full_name')
        
        if (users) {
          const mentionedUsers = users.filter(u => {
            const nameMatch = u.full_name?.toLowerCase().replace(/\s+/g, '')
            return mentions.some(m => {
              const mLower = m.toLowerCase().replace(/\s+/g, '')
              return nameMatch?.includes(mLower) || mLower.includes(nameMatch || '')
            })
          })
          
          // Create a notification for each mentioned user
          const { createNotification } = await import('@/lib/api/notifications')
          for (const user of mentionedUsers) {
            if (user.id !== currentUser.id) {
              await createNotification(supabase, {
                recipientId: user.id,
                actorId: currentUser.id,
                workspaceId: activeWorkspaceId,
                type: 'mention',
                title: `${currentUser.name} mentioned you in a comment`,
                content: `Task: ${task.title}`,
                link: `/app/projects/${task.projectId}?task=${task.id}`,
                entityType: 'task',
                entityId: task.id
              })
            }
          }
        }
      }

    } catch (error) {
      toast.error("Failed to post comment")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 pt-4 border-t border-border mt-6">
      <h3 className="font-semibold text-sm">Comments & Activity</h3>

      <div className="space-y-4">
        {isLoading ? (
          <div className="text-sm text-muted-foreground animate-pulse">Loading timeline...</div>
        ) : timeline.length === 0 ? (
          <div className="text-sm text-muted-foreground">No comments or activity yet.</div>
        ) : (
          timeline.map((item) => {
            if (item.type === 'comment') {
              const comment = item as any
              
              // Parse @mentions
              const parseMentions = (html: string) => {
                if (!html) return ""
                // Match @ followed by word characters or hyphens
                return html.replace(/@([a-zA-Z0-9_-]+)/g, '<span class="bg-primary/10 text-primary font-semibold px-1.5 py-0.5 rounded-md border border-primary/20 cursor-pointer hover:bg-primary/20 transition-colors">@$1</span>')
              }
              
              return (
                <div key={`comment-${comment.id}`} className="flex gap-3">
                  <Avatar className="size-8 mt-1">
                    <AvatarImage src={comment.author.avatarUrl} alt={comment.author.name} />
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">{comment.author.initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">{comment.author.name}</p>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    <div 
                      className="text-sm text-foreground bg-muted/30 p-3 rounded-lg border border-border/50 prose prose-sm dark:prose-invert max-w-none"
                      dangerouslySetInnerHTML={{ __html: parseMentions(comment.body) }} 
                    />
                  </div>
                </div>
              )
            } else {
              const activity = item as any
              return (
                <div key={`activity-${activity.id}`} className="flex gap-3 items-center opacity-80">
                  <Avatar className="size-6 shrink-0">
                    <AvatarFallback className="text-[10px] bg-secondary">{activity.user.initials}</AvatarFallback>
                  </Avatar>
                  <div className="text-sm">
                    <span className="font-medium">{activity.user.name}</span>{' '}
                    <span className="text-muted-foreground">
                      {activity.action === 'created' && 'created this task'}
                      {activity.action === 'updated' && 'updated the task details'}
                      {activity.action === 'commented' && 'added a comment'}
                    </span>{' '}
                    <span className="text-xs text-muted-foreground ml-2">
                      {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              )
            }
          })
        )}
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
        <RichTextEditor
          value={watchedBody}
          onChange={(html) => form.setValue("body", html)}
          placeholder="Write a comment..."
          minHeight="min-h-[80px]"
        />
        <div className="flex justify-end mt-2">
          <Button type="submit" size="sm" disabled={isSubmitting || !watchedBody.trim()}>
            {isSubmitting ? "Posting..." : "Post Comment"}
          </Button>
        </div>
      </form>
    </div>
  )
}
