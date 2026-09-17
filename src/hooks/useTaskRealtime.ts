import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { setupRealtimeChannel } from '@/lib/realtime/client'
import { Comment, Activity } from '@/types'
import { getComments } from '@/lib/api/comments'
import { getTaskActivity } from '@/lib/api/activity'

export function useTaskRealtime(taskId: string) {
  const [comments, setComments] = useState<Comment[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!taskId) return

    const supabase = createClient()
    const channelName = `task:${taskId}`
    
    // Fetch initial comments and activities
    Promise.all([
      getComments(supabase, taskId),
      getTaskActivity(supabase, taskId)
    ]).then(([commentsData, activitiesData]) => {
      setComments(commentsData)
      setActivities(activitiesData)
      setIsLoading(false)
    }).catch(err => {
      console.error('Failed to fetch task timeline', err)
      setIsLoading(false)
    })

    const channel = setupRealtimeChannel(supabase, channelName)

    // Listen to Comments changes for this task
    channel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'comments',
          filter: `task_id=eq.${taskId}`,
        },
        async (payload) => {
          // We need the profile joined, which isn't in the realtime payload.
          // In a production app, we might fetch the single comment, or keep profiles cached.
          // For now, let's just refetch comments if we don't have the user cached, or we can fetch the specific comment.
          // To be safe and simple, refetch all comments (since comments are usually small in number)
          const data = await getComments(supabase, taskId)
          setComments(data)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'comments',
          filter: `task_id=eq.${taskId}`,
        },
        async (payload) => {
          const data = await getComments(supabase, taskId)
          setComments(data)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'comments',
          filter: `task_id=eq.${taskId}`,
        },
        (payload) => {
          setComments(prev => prev.filter(c => c.id !== payload.old.id))
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activities',
          filter: `entity_id=eq.${taskId}`,
        },
        async () => {
          const data = await getTaskActivity(supabase, taskId)
          setActivities(data)
        }
      )

    channel.subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [taskId])

  // Merge and sort comments and activities chronologically
  const timeline = [...comments.map(c => ({...c, type: 'comment' as const})), ...activities.map(a => ({...a, type: 'activity' as const}))]
    .sort((a, b) => {
      const aTime = a.type === 'comment' ? new Date(a.createdAt).getTime() : new Date(a.timestamp).getTime()
      const bTime = b.type === 'comment' ? new Date(b.createdAt).getTime() : new Date(b.timestamp).getTime()
      return aTime - bTime // oldest first
    })

  return { timeline, isLoading, setComments }
}
