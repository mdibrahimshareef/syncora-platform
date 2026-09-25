"use client"

import * as React from "react"
import { Play, Square, Timer, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTimeTrackingStore } from "@/lib/store/timeTrackingStore"
import { useDataStore } from "@/stores/data-store"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export function GlobalTimer() {
  const { activeTimer, stopTimer, updateTimer, startTimer } = useTimeTrackingStore()
  const [elapsed, setElapsed] = React.useState(0)
  const [description, setDescription] = React.useState("")
  const [isOpen, setIsOpen] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)
  const { activeWorkspaceId } = useDataStore()

  // Fetch initial active timer state from server
  React.useEffect(() => {
    async function fetchActiveTimer() {
      try {
        const res = await fetch('/api/time-entries/active')
        if (res.ok) {
          const data = await res.json()
          if (data && data.id) {
            startTimer(data)
          } else {
            stopTimer()
          }
        }
      } catch (err) {
        console.error('Failed to fetch active timer', err)
      }
    }
    fetchActiveTimer()
  }, [startTimer, stopTimer])

  React.useEffect(() => {
    let interval: NodeJS.Timeout
    if (activeTimer) {
      setDescription(activeTimer.description || "")
      const start = new Date(activeTimer.startedAt).getTime()
      
      const updateElapsed = () => {
        const now = new Date().getTime()
        const diff = Math.floor((now - start) / 1000)
        setElapsed(diff)
      }
      
      updateElapsed()
      interval = setInterval(updateElapsed, 1000)
    } else {
      setElapsed(0)
      setDescription("")
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [activeTimer])

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    return [
      hours.toString().padStart(2, '0'),
      minutes.toString().padStart(2, '0'),
      seconds.toString().padStart(2, '0')
    ].join(':')
  }

  const handleStart = async () => {
    if (!activeWorkspaceId || isLoading) return
    setIsLoading(true)
    try {
      const res = await fetch('/api/time-entries/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: activeWorkspaceId,
          description,
          billable: false
        })
      })
      if (res.ok) {
        const data = await res.json()
        startTimer(data)
      } else {
        const errorData = await res.json()
        console.error('Failed to start timer:', errorData.error)
      }
    } catch (err) {
      console.error('Network error starting timer', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleStop = async () => {
    if (!activeTimer || isLoading) return
    setIsLoading(true)
    try {
      const res = await fetch('/api/time-entries/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description
        })
      })
      if (res.ok) {
        stopTimer()
        setIsOpen(false)
        setDescription("")
      } else {
        console.error('Failed to stop timer')
      }
    } catch (err) {
      console.error("Failed to save time entry", err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDescription(e.target.value)
    if (activeTimer) {
      updateTimer({ description: e.target.value })
    }
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger render={
        <Button 
          variant={activeTimer ? "default" : "outline"} 
          size="sm" 
          className={`h-9 gap-2 transition-all ${activeTimer ? 'bg-primary text-primary-foreground hover:bg-primary/90' : ''}`}
        >
          {activeTimer ? (
            <div className="flex items-center gap-2">
              <Square className="size-4 animate-pulse text-destructive" fill="currentColor" />
              <span className="font-mono">{formatTime(elapsed)}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Timer className="size-4" />
              <span className="hidden sm:inline-block">Timer</span>
            </div>
          )}
        </Button>
      } />
      <PopoverContent className="w-80 p-3" align="end">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">Time Tracker</h4>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsOpen(false)}>
              <X className="size-4" />
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <Input
              placeholder="What are you working on?"
              value={description}
              onChange={handleDescriptionChange}
              className="h-9 flex-1 text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !activeTimer) {
                  handleStart()
                }
              }}
            />
            {activeTimer ? (
              <Button size="icon" variant="destructive" className="h-9 w-9 shrink-0" onClick={handleStop}>
                <Square className="size-4" fill="currentColor" />
              </Button>
            ) : (
              <Button size="icon" className="h-9 w-9 shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground" onClick={handleStart}>
                <Play className="size-4" fill="currentColor" />
              </Button>
            )}
          </div>
          {activeTimer && (
            <div className="flex items-center justify-between px-1">
              <div className="text-xs text-muted-foreground font-mono">
                Running: {formatTime(elapsed)}
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
