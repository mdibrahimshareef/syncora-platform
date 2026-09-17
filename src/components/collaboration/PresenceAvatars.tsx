"use client"

import * as React from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useProjectRealtime } from "@/hooks/useProjectRealtime"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export function PresenceAvatars({ projectId }: { projectId: string }) {
  const { onlineUsers } = useProjectRealtime(projectId)

  if (!onlineUsers || onlineUsers.length === 0) {
    return null
  }

  // Show up to 3 avatars, then a +X badge
  const displayUsers = onlineUsers.slice(0, 3)
  const remainingCount = onlineUsers.length - displayUsers.length

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground mr-1 hidden sm:inline-block">
        {onlineUsers.length} online
      </span>
      <div className="flex -space-x-2">
        <TooltipProvider>
          {displayUsers.map(user => (
            <Tooltip key={user.id}>
              <TooltipTrigger render={
                <Avatar className="size-6 border-2 border-background ring-1 ring-primary/20 shadow-sm z-10 hover:z-20 transition-transform hover:scale-110">
                  <AvatarImage src={user.avatarUrl} />
                  <AvatarFallback className="text-[9px] bg-primary/10 text-primary font-medium">
                    {user.initials}
                  </AvatarFallback>
                </Avatar>
              } />
              <TooltipContent side="bottom" className="text-xs">
                {user.name}
              </TooltipContent>
            </Tooltip>
          ))}
          {remainingCount > 0 && (
            <Tooltip>
              <TooltipTrigger render={
                <div className="size-6 rounded-full bg-muted border-2 border-background flex items-center justify-center z-10 text-[9px] font-medium text-muted-foreground hover:z-20 transition-transform hover:scale-110">
                  +{remainingCount}
                </div>
              } />
              <TooltipContent side="bottom" className="text-xs">
                {remainingCount} more online
              </TooltipContent>
            </Tooltip>
          )}
        </TooltipProvider>
      </div>
      <div className="size-2 rounded-full bg-emerald-500 animate-pulse ml-1" />
    </div>
  )
}
