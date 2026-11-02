"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { useUIStore } from "@/stores/ui-store"
import { DEFAULT_KEYBOARD_SHORTCUTS, ShortcutCategory } from "@/lib/keyboard/shortcut-manager"
import { Keyboard } from "lucide-react"

export function ShortcutHelpDialog() {
  const isShortcutHelpOpen = useUIStore(s => s.isShortcutHelpOpen)
  const setShortcutHelpOpen = useUIStore(s => s.setShortcutHelpOpen)

  const categories: ShortcutCategory[] = ['Navigation', 'Task Actions', 'Global']

  return (
    <Dialog open={isShortcutHelpOpen} onOpenChange={setShortcutHelpOpen}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Keyboard className="size-5 text-primary" />
            <DialogTitle className="text-lg font-semibold">Keyboard Shortcuts</DialogTitle>
          </div>
          <DialogDescription>
            Quick navigation and productivity commands for SYNCORA.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {categories.map((cat) => {
            const items = DEFAULT_KEYBOARD_SHORTCUTS.filter(s => s.category === cat)
            if (items.length === 0) return null

            return (
              <div key={cat} className="space-y-2.5">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {cat}
                </h4>
                <div className="grid grid-cols-1 divide-y border rounded-lg bg-card/50">
                  {items.map((shortcut) => (
                    <div
                      key={shortcut.id}
                      className="flex items-center justify-between px-3.5 py-2.5 text-sm"
                    >
                      <span className="text-foreground/90">{shortcut.description}</span>
                      <div className="flex items-center gap-1.5">
                        {shortcut.sequence ? (
                          <div className="flex items-center gap-1">
                            {shortcut.sequence.map((k, idx) => (
                              <React.Fragment key={idx}>
                                {idx > 0 && <span className="text-xs text-muted-foreground font-medium">then</span>}
                                <kbd className="px-2 py-0.5 text-xs font-mono font-medium rounded border bg-muted text-muted-foreground shadow-xs uppercase">
                                  {k}
                                </kbd>
                              </React.Fragment>
                            ))}
                          </div>
                        ) : (
                          <kbd className="px-2 py-0.5 text-xs font-mono font-medium rounded border bg-muted text-muted-foreground shadow-xs">
                            {shortcut.key}
                          </kbd>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
