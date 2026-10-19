"use client"

import * as React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { SlidersHorizontal, Sparkles, RefreshCw, Check, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { UserAIPreferences, DEFAULT_AI_PREFERENCES } from '@/lib/ai/preferences'

interface AIPreferencesModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workspaceId?: string
}

export function AIPreferencesModal({ open, onOpenChange, workspaceId }: AIPreferencesModalProps) {
  const [preferences, setPreferences] = React.useState<UserAIPreferences>(DEFAULT_AI_PREFERENCES)
  const [isLoading, setIsLoading] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)

  React.useEffect(() => {
    if (!open || !workspaceId) return

    let cancelled = false
    const loadPreferences = async () => {
      try {
        setIsLoading(true)
        const res = await fetch(`/api/ai/preferences?workspaceId=${workspaceId}`)
        const data = await res.json()
        if (!cancelled && data.preferences) {
          setPreferences(data.preferences)
        }
      } catch (err) {
        console.error('Failed to load AI preferences:', err)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void loadPreferences()

    return () => { cancelled = true }
  }, [open, workspaceId])

  const handleSave = async (updated: Partial<UserAIPreferences>) => {
    if (!workspaceId) return
    const next = { ...preferences, ...updated }
    setPreferences(next)
    setIsSaving(true)

    try {
      const res = await fetch('/api/ai/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, preferences: updated })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save preferences')
      toast.success('AI preferences saved')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error saving preferences'
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = async () => {
    if (!workspaceId) return
    setIsSaving(true)
    try {
      const res = await fetch(`/api/ai/preferences?workspaceId=${workspaceId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to reset')
      setPreferences(DEFAULT_AI_PREFERENCES)
      toast.success('Preferences reset to default')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error resetting'
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 flex items-center justify-center">
              <SlidersHorizontal className="size-4 text-indigo-500" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold">AI Assistant Preferences</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Customize how Syncora AI analyzes work and formats recommendations.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Detail Level Selector */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-foreground">Response Detail Level</Label>
            <div className="grid grid-cols-3 gap-2">
              {(['concise', 'balanced', 'comprehensive'] as const).map(lvl => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => handleSave({ detailLevel: lvl })}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs capitalize transition-all cursor-pointer ${
                    preferences.detailLevel === lvl
                      ? 'border-indigo-600 bg-indigo-500/10 text-indigo-600 font-semibold shadow-2xs'
                      : 'border-border/70 bg-card hover:bg-accent/40 text-muted-foreground'
                  }`}
                >
                  <span>{lvl}</span>
                  <span className="text-[10px] font-normal opacity-70 mt-0.5">
                    {lvl === 'concise' ? 'Key bullets' : lvl === 'comprehensive' ? 'Deep dive' : 'Standard'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Personalization Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl border border-border/70 bg-card/50">
            <div className="space-y-0.5 pr-3">
              <div className="flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-indigo-500" />
                <Label className="text-xs font-medium text-foreground cursor-pointer" htmlFor="pref-personalization">
                  Adaptive Personalization
                </Label>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Allows AI to adapt to your working style and remembered agreements.
              </p>
            </div>
            <Switch
              id="pref-personalization"
              checked={preferences.enablePersonalization}
              onCheckedChange={checked => handleSave({ enablePersonalization: checked })}
            />
          </div>

          {/* Outcome Ranking Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl border border-border/70 bg-card/50">
            <div className="space-y-0.5 pr-3">
              <div className="flex items-center gap-1.5">
                <Check className="size-3.5 text-emerald-500" />
                <Label className="text-xs font-medium text-foreground cursor-pointer" htmlFor="pref-outcomes">
                  Outcome-Informed Ranking
                </Label>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Prioritizes recommendation patterns that have succeeded in past sprints.
              </p>
            </div>
            <Switch
              id="pref-outcomes"
              checked={preferences.enableOutcomeRanking}
              disabled={!preferences.enablePersonalization}
              onCheckedChange={checked => handleSave({ enableOutcomeRanking: checked })}
            />
          </div>

          {/* Privacy Guarantee Note */}
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/40 border border-border/50 text-[11px] text-muted-foreground">
            <ShieldCheck className="size-4 text-emerald-600 shrink-0 mt-0.5" />
            <p>
              Preferences are private to your account within this workspace. They never override security policies or authoritative database data.
            </p>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between w-full pt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleReset}
            disabled={isSaving || isLoading}
            className="text-xs text-muted-foreground hover:text-foreground h-8 px-2"
          >
            <RefreshCw className="size-3 mr-1" />
            Reset Defaults
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs h-8 px-4"
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
