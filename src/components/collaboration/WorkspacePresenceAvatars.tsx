"use client"

import * as React from "react"
import { useDataStore } from "@/stores/data-store"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export function WorkspacePresenceAvatars() {
  const onlineWorkspaceUsers = useDataStore(s => s.onlineWorkspaceUsers);

  if (!onlineWorkspaceUsers || onlineWorkspaceUsers.length === 0) {
    return null
  }

  const displayUsers = onlineWorkspaceUsers.slice(0, 3)
  const remainingCount = onlineWorkspaceUsers.length - displayUsers.length

  return (
    <div className="flex items-center gap-2">
      <div className="text-xs text-muted-foreground mr-1 hidden sm:block">
        {onlineWorkspaceUsers.length} online in workspace
      </div>
      <div className="flex -space-x-2">
        <TooltipProvider delay={300}>
          {displayUsers.map((user) => (
            <Tooltip key={user.id}>
              <TooltipTrigger>
                <Avatar className="size-7 border-2 border-background shadow-sm hover:z-10 transition-transform hover:scale-110">
                  <AvatarImage src={user.avatarUrl} alt={user.name} />
                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                    {user.initials}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs font-medium">{user.name}</p>
                <p className="text-[10px] text-muted-foreground">Active now</p>
              </TooltipContent>
            </Tooltip>
          ))}
          {remainingCount > 0 && (
            <Tooltip>
              <TooltipTrigger className="relative flex size-7 items-center justify-center rounded-full border-2 border-background bg-muted text-[10px] font-medium text-muted-foreground shadow-sm hover:z-10 cursor-default">
                +{remainingCount}
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">{remainingCount} more online</p>
              </TooltipContent>
            </Tooltip>
          )}
        </TooltipProvider>
      </div>
    </div>
  )
}
