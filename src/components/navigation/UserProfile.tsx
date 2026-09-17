"use client"

import * as React from "react"
import { useDataStore } from "@/stores/data-store"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { useWorkspaceUrl } from "@/hooks/useWorkspaceUrl"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuGroup,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { 
  LogOut, 
  User as UserIcon, 
  Settings, 
  Moon, 
  Sun,
  Laptop,
  MessageSquare,
  UserCircle,
  CheckSquare,
  Sliders,
  ArrowRightLeft
} from "lucide-react"

export function UserProfile() {
  const currentUser = useDataStore(s => s.currentUser);
  const router = useRouter()
  const { setTheme } = useTheme()
  const baseUrl = useWorkspaceUrl()
  const [isLoggingOut, setIsLoggingOut] = React.useState(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      
      // Clear client-side state
      useDataStore.setState({ 
        currentUser: null,
        activeWorkspaceId: null,
        workspaces: [],
        projects: [],
        tasks: []
      })
      
      router.push("/auth/login")
      router.refresh()
    } catch (error) {
      console.error("Logout error:", error)
      setIsLoggingOut(false)
    }
  }

  const getInitials = (name?: string) => {
    if (!name) return "U"
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" className="relative size-8 rounded-full" />}>
        <Avatar className="size-8">
          <AvatarImage src={currentUser?.avatarUrl} alt={currentUser?.name || "User"} />
          <AvatarFallback className="bg-primary/10 text-primary text-xs">
            {getInitials(currentUser?.name)}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-60" align="end">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{currentUser?.name || "User"}</p>
              <p className="text-xs leading-none text-muted-foreground">
                {currentUser?.email || ""}
              </p>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => router.push(`${baseUrl}/account`)}>
            <UserIcon className="mr-2 size-4" />
            <span>Profile</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push(`${baseUrl}/account`)}>
            <Settings className="mr-2 size-4" />
            <span>Account settings</span>
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Moon className="mr-2 size-4" />
              <span>Theme</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent>
                <DropdownMenuItem onClick={() => setTheme("light")}>
                  <Sun className="mr-2 size-4" />
                  <span>Light</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("dark")}>
                  <Moon className="mr-2 size-4" />
                  <span>Dark</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("system")}>
                  <Laptop className="mr-2 size-4" />
                  <span>System</span>
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />
        
        <DropdownMenuGroup>
          <DropdownMenuLabel className="uppercase tracking-wider font-semibold text-[10px]">
            Help us improve
          </DropdownMenuLabel>
          <DropdownMenuItem>
            <MessageSquare className="mr-2 size-4" />
            <span>Send feedback</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuLabel className="uppercase tracking-wider font-semibold text-[10px]">
            SYNCORA
          </DropdownMenuLabel>
          <DropdownMenuItem>
            <UserCircle className="mr-2 size-4" />
            <span>Personal space</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push("/app/my-tasks")}>
            <CheckSquare className="mr-2 size-4" />
            <span>Tasks</span>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Sliders className="mr-2 size-4" />
            <span>Personal settings</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />
        
        <DropdownMenuGroup>
          <DropdownMenuItem>
            <ArrowRightLeft className="mr-2 size-4" />
            <span>Switch account</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleLogout} disabled={isLoggingOut}>
            <LogOut className="mr-2 size-4" />
            <span>{isLoggingOut ? "Logging out..." : "Log out"}</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
