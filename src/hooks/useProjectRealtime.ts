import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getProjectChannelName, setupRealtimeChannel } from '@/lib/realtime/client'
import { useDataStore } from '@/stores/data-store'

export type PresenceUser = {
  id: string
  name: string
  initials: string
  avatarUrl?: string
}

export function useProjectRealtime(projectId: string) {
  const applyRealtimeTaskUpdate = useDataStore(s => s.applyRealtimeTaskUpdate);
  const applyRealtimeTaskInsert = useDataStore(s => s.applyRealtimeTaskInsert);
  const applyRealtimeTaskDelete = useDataStore(s => s.applyRealtimeTaskDelete);
  const currentUser = useDataStore(s => s.currentUser);
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([])

  useEffect(() => {
    if (!projectId || !currentUser) return

    const supabase = createClient()
    const channelName = getProjectChannelName(projectId)
    
    const channel = setupRealtimeChannel(supabase, channelName)

    // Listen to Task changes for this project
    channel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tasks',
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          applyRealtimeTaskInsert(payload.new)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tasks',
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          applyRealtimeTaskUpdate(payload.new)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'tasks',
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          applyRealtimeTaskDelete(payload.old)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'milestones',
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          useDataStore.getState().applyRealtimeMilestoneInsert(payload.new)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'milestones',
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          useDataStore.getState().applyRealtimeMilestoneUpdate(payload.new)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'milestones',
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          useDataStore.getState().applyRealtimeMilestoneDelete(payload.old)
        }
      )

    // Setup Presence
    channel
      .on('presence', { event: 'sync' }, () => {
        const newState = channel.presenceState()
        const users = new Map<string, PresenceUser>()
        
        for (const id in newState) {
          // @ts-ignore
          const presences = newState[id] as { user: PresenceUser }[]
          if (presences.length > 0) {
            users.set(presences[0].user.id, presences[0].user)
          }
        }
        setOnlineUsers(Array.from(users.values()))
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        // Handled by sync
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        // Handled by sync
      })

    // Track user presence once subscribed
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        const user = useDataStore.getState().currentUser
        if (user) {
          const presenceUser: PresenceUser = {
            id: user.id,
            name: user.name,
            initials: user.initials,
            avatarUrl: user.avatarUrl
          }
          await channel.track({ user: presenceUser })
        }
      }
    })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [projectId, applyRealtimeTaskUpdate, applyRealtimeTaskInsert, applyRealtimeTaskDelete])

  return { onlineUsers }
}

