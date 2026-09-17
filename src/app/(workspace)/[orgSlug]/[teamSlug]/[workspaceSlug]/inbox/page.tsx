"use client"

import * as React from "react"
import { useDataStore } from "@/stores/data-store"
import { useUIStore } from "@/stores/ui-store"
import { Inbox, CheckCircle2, User, MessageSquare, AlertCircle, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { formatDistanceToNow } from "date-fns"

export default function InboxPage() {
  const notifications = useDataStore(s => s.notifications);
  const unreadNotificationCount = useDataStore(s => s.unreadNotificationCount);
  const markNotificationAsRead = useDataStore(s => s.markNotificationAsRead);
  const markAllNotificationsAsRead = useDataStore(s => s.markAllNotificationsAsRead);
  const projects = useDataStore(s => s.projects);
  const workspaceTasks = useDataStore(s => s.workspaceTasks);
  const { setSelectedTaskId, selectedTaskId } = useUIStore()

  const handleNotificationClick = async (notification: any) => {
    if (!notification.read_at) {
      await markNotificationAsRead(notification.id)
    }
    if (notification.entity_type === 'task') {
      setSelectedTaskId(notification.entity_id)
    }
  }

  const getIconForType = (type: string) => {
    switch (type) {
      case 'TASK_ASSIGNED':
        return <User className="size-4 text-blue-500" />
      case 'TASK_STATUS_CHANGED':
        return <CheckCircle2 className="size-4 text-emerald-500" />
      case 'COMMENT_ADDED':
        return <MessageSquare className="size-4 text-purple-500" />
      default:
        return <AlertCircle className="size-4 text-slate-500" />
    }
  }

  const getNotificationContent = (notification: any) => {
    const meta = notification.metadata || {}
    const actorName = notification.actor?.full_name || 'Someone'

    switch (notification.type) {
      case 'TASK_ASSIGNED':
        return (
          <p className="text-sm">
            <span className="font-semibold">{actorName}</span> assigned you to <span className="font-medium">{meta.task_title}</span>
          </p>
        )
      case 'TASK_STATUS_CHANGED':
        return (
          <p className="text-sm">
            <span className="font-semibold">{actorName}</span> changed the status of <span className="font-medium">{meta.task_title}</span> to <span className="font-semibold">{meta.new_status}</span>
          </p>
        )
      case 'COMMENT_ADDED':
        return (
          <p className="text-sm">
            <span className="font-semibold">{actorName}</span> commented on <span className="font-medium">{meta.task_title}</span>
          </p>
        )
      default:
        return <p className="text-sm">New notification from {actorName}</p>
    }
  }

  return (
    <div className="flex-1 space-y-6 p-6 md:p-8 pt-6 h-full flex flex-col max-w-4xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Inbox</h2>
          <p className="text-muted-foreground">
            {unreadNotificationCount > 0 
              ? `You have ${unreadNotificationCount} unread notification${unreadNotificationCount > 1 ? 's' : ''}.`
              : "You're all caught up!"}
          </p>
        </div>
        
        {unreadNotificationCount > 0 && (
          <Button variant="outline" onClick={() => markAllNotificationsAsRead()}>
            Mark all as read
          </Button>
        )}
      </div>
      
      <div className="flex-1 border rounded-lg bg-card overflow-hidden flex flex-col">
        {notifications.length === 0 ? (
          <div className="flex-1 flex items-center justify-center min-h-[400px]">
            <div className="flex flex-col items-center justify-center text-center max-w-sm">
              <div className="size-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <Inbox className="size-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-1">You're all caught up!</h3>
              <p className="text-sm text-muted-foreground">
                There are no new notifications or mentions at the moment. Enjoy the silence.
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y overflow-y-auto">
            {notifications.map((notif) => {
              const notification = notif as any;
              const isUnread = !notification.read_at
              const meta = (notification.metadata as Record<string, any>) || {}
              return (
                <div 
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-4 flex gap-4 cursor-pointer hover:bg-muted/50 transition-colors relative ${isUnread ? 'bg-primary/5 dark:bg-primary/10' : ''}`}
                >
                  {isUnread && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                  )}
                  
                  <Avatar className="size-10 shrink-0">
                    <AvatarImage src={notification.actor?.avatar_url} />
                    <AvatarFallback>{notification.actor?.full_name?.substring(0,2).toUpperCase() || 'U'}</AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 flex flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <div className="p-1 rounded-md bg-background border shadow-sm">
                        {getIconForType(notification.type)}
                      </div>
                      <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                        <Clock className="size-3" />
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    
                    {getNotificationContent(notification)}
                    
                    {meta.project_id && (
                      <span className="text-xs text-muted-foreground mt-1 truncate">
                        Project: {projects.find(p => p.id === meta.project_id)?.name || 'Unknown Project'}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
