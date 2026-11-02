"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useUIStore } from "@/stores/ui-store"
import { useWorkspaceUrl } from "@/hooks/useWorkspaceUrl"
import { isEditableElement } from "@/lib/keyboard/shortcut-manager"
import { toast } from "sonner"

export function GlobalShortcutManager() {
  const router = useRouter()
  const baseUrl = useWorkspaceUrl()

  const {
    isCommandPaletteOpen,
    setCommandPaletteOpen,
    isShortcutHelpOpen,
    setShortcutHelpOpen,
    setCreateTaskOpen,
    selectedTaskId,
    setSelectedTaskId,
  } = useUIStore()

  // Multi-key sequence tracking (e.g. 'g' then 'h')
  const [sequenceLeader, setSequenceLeader] = React.useState<string | null>(null)
  const sequenceTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)

  const clearSequence = React.useCallback(() => {
    if (sequenceTimeoutRef.current) {
      clearTimeout(sequenceTimeoutRef.current)
      sequenceTimeoutRef.current = null
    }
    setSequenceLeader(null)
  }, [])

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Global Command Palette: Cmd/Ctrl + K (always enabled)
      if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setCommandPaletteOpen(!isCommandPaletteOpen)
        clearSequence()
        return
      }

      // 2. Escape: Always dismisses details drawer, palette, or shortcut help
      if (e.key === 'Escape') {
        if (selectedTaskId) {
          setSelectedTaskId(null)
          return
        }
        if (isCommandPaletteOpen) {
          setCommandPaletteOpen(false)
          return
        }
        if (isShortcutHelpOpen) {
          setShortcutHelpOpen(false)
          return
        }
        clearSequence()
        return
      }

      // Check for editable elements (suppress single-key and sequence shortcuts)
      if (isEditableElement(e.target)) {
        clearSequence()
        return
      }

      // 3. Multi-key sequence handling ('G then ...')
      if (sequenceLeader === 'g') {
        e.preventDefault()
        clearSequence()
        const nextKey = e.key.toLowerCase()

        if (nextKey === 'h') {
          router.push(baseUrl)
          toast.info("Navigated to Home")
        } else if (nextKey === 'p') {
          router.push(`${baseUrl}/projects`)
          toast.info("Navigated to Projects")
        } else if (nextKey === 'm') {
          router.push(`${baseUrl}/my-tasks`)
          toast.info("Navigated to My Tasks")
        } else if (nextKey === 'i') {
          router.push(`${baseUrl}/inbox`)
          toast.info("Navigated to Inbox")
        } else if (nextKey === 'c') {
          router.push(`${baseUrl}/calendar`)
          toast.info("Navigated to Calendar")
        }
        return
      }

      // First key in sequence ('g')
      if (e.key.toLowerCase() === 'g' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault()
        setSequenceLeader('g')
        if (sequenceTimeoutRef.current) clearTimeout(sequenceTimeoutRef.current)
        sequenceTimeoutRef.current = setTimeout(() => {
          setSequenceLeader(null)
        }, 1200) // 1.2s timeout window for next key
        return
      }

      // 4. Shortcut Help Reference: '?' (Shift + /)
      if (e.key === '?' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault()
        setShortcutHelpOpen(!isShortcutHelpOpen)
        return
      }

      // 5. Create Task Shortcut: 'c'
      if (e.key.toLowerCase() === 'c' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault()
        setCreateTaskOpen(true)
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      if (sequenceTimeoutRef.current) clearTimeout(sequenceTimeoutRef.current)
    }
  }, [
    isCommandPaletteOpen,
    setCommandPaletteOpen,
    isShortcutHelpOpen,
    setShortcutHelpOpen,
    setCreateTaskOpen,
    selectedTaskId,
    setSelectedTaskId,
    sequenceLeader,
    clearSequence,
    router,
    baseUrl,
  ])

  return null
}
