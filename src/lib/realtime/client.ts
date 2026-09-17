import { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js'

export const getWorkspaceChannelName = (workspaceId: string) => `workspace:${workspaceId}`
export const getProjectChannelName = (projectId: string) => `project:${projectId}`

export function setupRealtimeChannel(
  supabase: SupabaseClient,
  channelName: string,
  onSubscribe?: (status: 'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED' | 'CHANNEL_ERROR') => void
): RealtimeChannel {
  const channel = supabase.channel(channelName, {
    config: {
      presence: {
        key: '',
      },
    },
  })

  return channel
}
