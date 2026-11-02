/**
 * Platform Release 17: Centralized Keyboard Shortcut Architecture
 * Provides typed shortcut registration, sequence buffering, platform adaptation,
 * and robust input suppression.
 */

export type ShortcutCategory = 'Navigation' | 'Task Actions' | 'Global'

export interface ShortcutDefinition {
  id: string
  key: string
  sequence?: string[]
  modifiers?: ('meta' | 'ctrl' | 'alt' | 'shift')[]
  description: string
  category: ShortcutCategory
  action?: () => void
  enabled?: boolean
}

/**
 * Checks whether an event target is an editable element where single-key shortcuts
 * should be suppressed (inputs, textareas, contenteditable, native selects).
 */
export function isEditableElement(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) {
    // If activeElement is editable, also consider it editable
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      const active = document.activeElement
      if (
        active.tagName === 'INPUT' ||
        active.tagName === 'TEXTAREA' ||
        active.tagName === 'SELECT' ||
        active.isContentEditable ||
        active.getAttribute('contenteditable') === 'true'
      ) {
        return true
      }
    }
    return false
  }

  const tagName = target.tagName.toUpperCase()
  if (
    tagName === 'INPUT' ||
    tagName === 'TEXTAREA' ||
    tagName === 'SELECT' ||
    target.isContentEditable ||
    target.getAttribute('contenteditable') === 'true'
  ) {
    return true
  }

  // Check parent elements for contenteditable or role="textbox"
  return Boolean(target.closest('[contenteditable="true"], [role="textbox"]'))
}

/**
 * Detects whether client platform is macOS for proper modifier key rendering.
 */
export function isMacPlatform(): boolean {
  if (typeof window === 'undefined' || !window.navigator) return false
  return /Mac|iPhone|iPod|iPad/i.test(window.navigator.userAgent)
}

/**
 * Standard Platform Release 17 Shortcut Registry
 */
export const DEFAULT_KEYBOARD_SHORTCUTS: Omit<ShortcutDefinition, 'action'>[] = [
  // Navigation Sequences
  {
    id: 'nav-home',
    key: 'G H',
    sequence: ['g', 'h'],
    description: 'Go to Home / Overview',
    category: 'Navigation',
  },
  {
    id: 'nav-projects',
    key: 'G P',
    sequence: ['g', 'p'],
    description: 'Go to Projects list',
    category: 'Navigation',
  },
  {
    id: 'nav-my-tasks',
    key: 'G M',
    sequence: ['g', 'm'],
    description: 'Go to My Tasks',
    category: 'Navigation',
  },
  {
    id: 'nav-inbox',
    key: 'G I',
    sequence: ['g', 'i'],
    description: 'Go to Inbox notifications',
    category: 'Navigation',
  },
  {
    id: 'nav-calendar',
    key: 'G C',
    sequence: ['g', 'c'],
    description: 'Go to Calendar',
    category: 'Navigation',
  },

  // Task Actions
  {
    id: 'task-nav-down',
    key: 'J',
    description: 'Move task selection down',
    category: 'Task Actions',
  },
  {
    id: 'task-nav-up',
    key: 'K',
    description: 'Move task selection up',
    category: 'Task Actions',
  },
  {
    id: 'task-open',
    key: 'Enter',
    description: 'Open details for selected task',
    category: 'Task Actions',
  },
  {
    id: 'task-toggle-select',
    key: 'X',
    description: 'Toggle selection of highlighted task',
    category: 'Task Actions',
  },
  {
    id: 'task-create',
    key: 'C',
    description: 'Create new task',
    category: 'Task Actions',
  },
  {
    id: 'task-close-details',
    key: 'Esc',
    description: 'Close task details drawer or modal',
    category: 'Task Actions',
  },

  // Global Actions
  {
    id: 'cmd-palette',
    key: isMacPlatform() ? '⌘ K' : 'Ctrl + K',
    modifiers: isMacPlatform() ? ['meta'] : ['ctrl'],
    description: 'Open Command Palette & Search',
    category: 'Global',
  },
  {
    id: 'shortcut-help',
    key: '?',
    description: 'Show keyboard shortcuts reference',
    category: 'Global',
  },
]

