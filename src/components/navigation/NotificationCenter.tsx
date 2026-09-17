"use client"

import * as React from "react"
import { Bell, Check, CircleAlert, Mail } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { createClient } from "@/lib/supabase/client"
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead } from "@/lib/api/notifications"
import { useDataStore } from "@/stores/data-store"
import { Notification } from "@/types"

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

import { useRouter, usePathname } from "next/navigation"

export function NotificationCenter() {
  const router = useRouter()
  const pathname = usePathname()
  const currentUser = useDataStore(s => s.currentUser);
  const activeWorkspaceId = useDataStore(s => s.activeWorkspaceId);
  const [notifications, setNotifications] = React.useState<any[]>([])
  const [isOpen, setIsOpen] = React.useState(false)

  React.useEffect(() => {
    if (!currentUser || !activeWorkspaceId) return

    const supabase = createClient()
    
    // Initial fetch
    getNotifications(supabase, currentUser.id)
      .then(data => setNotifications(data))
      .catch(console.error)

    // Listen to realtime notifications
    const channel = supabase.channel(`notifications:${currentUser.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${currentUser.id}`,
        },
        async () => {
          // Re-fetch to get actor relations easily
          const data = await getNotifications(supabase, currentUser.id)
          setNotifications(data)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentUser, activeWorkspaceId])

  const unreadCount = notifications.filter(n => !n.read_at).length

  const handleMarkAsRead = async (id: string) => {
    try {
      const supabase = createClient()
      await markNotificationAsRead(supabase, id)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
    } catch (error) {
      console.error(error)
    }
  }

  const handleMarkAllAsRead = async () => {
    if (!currentUser || !activeWorkspaceId) return
    try {
      const supabase = createClient()
      await markAllNotificationsAsRead(supabase, currentUser.id)
      setNotifications(prev => prev.map(n => ({ ...n, read_at: new Date().toISOString() })))
    } catch (error) {
      console.error(error)
    }
  }

  const handleNotificationClick = async (notification: any) => {
    if (!notification.read_at) {
      await handleMarkAsRead(notification.id)
    }

    if (notification.entity_type === 'task' && notification.metadata?.project_id) {
      setIsOpen(false)
      const parts = pathname.split('/')
      if (parts.length >= 4) {
        // e.g. ["", "org", "team", "workspace"]
        const orgSlug = parts[1]
        const teamSlug = parts[2]
        const workspaceSlug = parts[3]
        router.push(`/${orgSlug}/${teamSlug}/${workspaceSlug}/projects/${notification.metadata.project_id}?taskId=${notification.entity_id}`)
      }
    }
  }

  // Derive dynamic title and description
  const getNotificationText = (n: any) => {
    const actorName = n.actor?.full_name || "Someone"
    const taskTitle = n.metadata?.task_title || "a task"

    if (n.type === 'TASK_ASSIGNED') {
      return { title: `${actorName} assigned you a task`, desc: taskTitle }
    }
    if (n.type === 'TASK_STATUS_CHANGED') {
      return { title: `${actorName} changed task status to ${n.metadata?.new_status}`, desc: taskTitle }
    }
    if (n.type === 'COMMENT_ADDED') {
      return { title: `${actorName} commented on a task`, desc: taskTitle }
    }
    return { title: n.title || "New notification", desc: n.description }
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger render={
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="size-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 size-2.5 bg-red-500 rounded-full ring-2 ring-background animate-in zoom-in" />
          )}
        </Button>
      } />
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h4 className="font-semibold text-sm">Notifications</h4>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground" onClick={handleMarkAllAsRead}>
              Mark all as read
            </Button>
          )}
        </div>
        <div className="max-h-[300px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
              <Mail className="size-8 opacity-20" />
              <p>You're all caught up</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {notifications.map(notification => {
                const { title, desc } = getNotificationText(notification)
                return (
                  <div 
                    key={notification.id} 
                    className={`flex gap-3 p-4 border-b last:border-0 hover:bg-muted/50 transition-colors cursor-pointer ${!notification.read_at ? 'bg-muted/20' : ''}`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                  <Avatar className="size-8 shrink-0">
                    <AvatarImage src={notification.actor?.avatar_url} />
                    <AvatarFallback className="text-xs">
                      {notification.actor?.full_name?.substring(0,2).toUpperCase() || <CircleAlert className="size-4" />}
                    </AvatarFallback>
                  </Avatar>
                    <div className="flex-1 space-y-1 overflow-hidden">
                      <p className="text-sm leading-tight text-foreground/90 font-medium">
                        {title}
                      </p>
                      {desc && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {desc}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    {!notification.read_at && (
                      <div className="size-2 bg-blue-500 rounded-full shrink-0 mt-1.5" />
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
