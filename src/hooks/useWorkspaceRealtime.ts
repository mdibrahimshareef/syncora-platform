import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getWorkspaceChannelName, setupRealtimeChannel } from '@/lib/realtime/client'
import { useDataStore } from '@/stores/data-store'
import { toast } from 'sonner'

export function useWorkspaceRealtime(workspaceId: string) {
  const fetchActivity = useDataStore(s => s.fetchActivity);
  const setOnlineWorkspaceUsers = useDataStore(s => s.setOnlineWorkspaceUsers);

  useEffect(() => {
    if (!workspaceId) return

    const supabase = createClient()
    const channelName = getWorkspaceChannelName(workspaceId)
    
    const channel = setupRealtimeChannel(supabase, channelName)

    // Listen to Activity changes
    channel.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'activities', filter: `workspace_id=eq.${workspaceId}` },
      () => fetchActivity()
    )

    // Listen to Projects
    channel.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'projects', filter: `workspace_id=eq.${workspaceId}` },
      (payload) => useDataStore.getState().applyRealtimeProjectInsert(payload.new)
    ).on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'projects', filter: `workspace_id=eq.${workspaceId}` },
      (payload) => useDataStore.getState().applyRealtimeProjectUpdate(payload.new)
    ).on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'projects', filter: `workspace_id=eq.${workspaceId}` },
      (payload) => useDataStore.getState().applyRealtimeProjectDelete(payload.old)
    )

    // Listen to Tasks
    channel.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'tasks', filter: `workspace_id=eq.${workspaceId}` },
      (payload) => useDataStore.getState().applyRealtimeTaskInsert(payload.new)
    ).on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'tasks', filter: `workspace_id=eq.${workspaceId}` },
      (payload) => useDataStore.getState().applyRealtimeTaskUpdate(payload.new)
    ).on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'tasks', filter: `workspace_id=eq.${workspaceId}` },
      (payload) => useDataStore.getState().applyRealtimeTaskDelete(payload.old)
    )

    // Listen to Milestones
    channel.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'milestones', filter: `workspace_id=eq.${workspaceId}` },
      (payload) => useDataStore.getState().applyRealtimeMilestoneInsert(payload.new)
    ).on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'milestones', filter: `workspace_id=eq.${workspaceId}` },
      (payload) => useDataStore.getState().applyRealtimeMilestoneUpdate(payload.new)
    ).on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'milestones', filter: `workspace_id=eq.${workspaceId}` },
      (payload) => useDataStore.getState().applyRealtimeMilestoneDelete(payload.old)
    )

    // Setup Presence
    channel.on('presence', { event: 'sync' }, () => {
      const newState = channel.presenceState()
      const users = new Map<string, any>()
      for (const id in newState) {
        // @ts-ignore
        const presences = newState[id] as { user: any }[]
        if (presences.length > 0) {
          users.set(presences[0].user.id, presences[0].user)
        }
      }
      setOnlineWorkspaceUsers(Array.from(users.values()))
    })

    // Track user presence once subscribed
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        const user = useDataStore.getState().currentUser
        if (user) {
          const presenceUser = {
            id: user.id,
            name: user.name,
            initials: user.initials,
            avatarUrl: user.avatarUrl
          }
          await channel.track({ user: presenceUser })
        }
      }
    })

    // Listen to current user's notifications globally
    const currentUser = useDataStore.getState().currentUser
    let notificationChannel: any = null
    if (currentUser) {
      notificationChannel = supabase.channel(`global-notifications-${currentUser.id}`)
      notificationChannel
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${currentUser.id}` },
          (payload: any) => {
            useDataStore.getState().applyRealtimeNotification(payload)
            // Trigger a UI Toast based on type
            const type = payload.new.type
            const meta = payload.new.metadata
            if (type === 'TASK_ASSIGNED') {
              toast.info(`You were assigned a task: ${meta.task_title}`)
            } else if (type === 'TASK_STATUS_CHANGED') {
              toast.info(`Task status changed to ${meta.new_status}: ${meta.task_title}`)
            } else if (type === 'COMMENT_ADDED') {
              toast.info(`New comment on task: ${meta.task_title}`)
            } else {
              toast.info('You have a new notification')
            }
          }
        )
        .subscribe()
    }

    return () => {
      supabase.removeChannel(channel)
      if (notificationChannel) supabase.removeChannel(notificationChannel)
    }
  }, [workspaceId, fetchActivity, setOnlineWorkspaceUsers])
}
