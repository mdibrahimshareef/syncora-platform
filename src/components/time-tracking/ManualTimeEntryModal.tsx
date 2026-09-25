"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Clock } from "lucide-react"
import { useDataStore } from "@/stores/data-store"

interface ManualTimeEntryModalProps {
  taskId?: string
  projectId?: string
}

export function ManualTimeEntryModal({ taskId, projectId }: ManualTimeEntryModalProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [durationMinutes, setDurationMinutes] = React.useState(15)
  const [description, setDescription] = React.useState("")
  const [billable, setBillable] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const { activeWorkspaceId } = useDataStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeWorkspaceId) return

    try {
      setIsSubmitting(true)
      await fetch('/api/time-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: activeWorkspaceId,
          projectId,
          taskId,
          description,
          durationMinutes,
          billable,
          source: 'MANUAL',
          startedAt: new Date().toISOString(), // Mocking start/end times for manual
          endedAt: new Date(Date.now() + durationMinutes * 60000).toISOString()
        })
      })
      setIsOpen(false)
      setDescription("")
      setDurationMinutes(15)
      setBillable(false)
    } catch (err) {
      console.error("Failed to log time", err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger render={
        <Button variant="outline" size="sm" className="h-8 gap-1">
          <Clock className="size-3.5" />
          <span>Log Time</span>
        </Button>
      } />
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Log Time Manually</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="duration">Duration (minutes)</Label>
            <Input 
              id="duration" 
              type="number" 
              min={1} 
              value={durationMinutes} 
              onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 0)} 
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea 
              id="description" 
              placeholder="What did you work on?" 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="resize-none"
              rows={3}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch 
              id="billable" 
              checked={billable} 
              onCheckedChange={setBillable} 
            />
            <Label htmlFor="billable">Billable</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setIsOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || durationMinutes <= 0}>
              {isSubmitting ? "Logging..." : "Save Time"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
