"use client"

import * as React from "react"
import { useNetworkStatus } from "@/hooks/useNetworkStatus"
import { WifiOff } from "lucide-react"

export function OfflineIndicator() {
  const { isOnline } = useNetworkStatus()

  if (isOnline) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-14 left-0 right-0 z-50 bg-amber-500/90 text-amber-950 dark:bg-amber-600/90 dark:text-amber-50 backdrop-blur-md px-4 py-2 text-center text-xs sm:text-sm font-medium flex items-center justify-center gap-2 shadow-md transition-all animate-in slide-in-from-top-2"
    >
      <WifiOff className="size-4 shrink-0" />
      <span>
        You&apos;re offline. Showing previously loaded information. Some actions may be unavailable.
      </span>
    </div>
  )
}

