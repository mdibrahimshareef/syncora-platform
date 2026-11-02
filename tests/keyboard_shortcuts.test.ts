// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { 
  isEditableElement, 
  DEFAULT_KEYBOARD_SHORTCUTS,
  isMacPlatform 
} from '../src/lib/keyboard/shortcut-manager'

describe('Platform Release 17 — Keyboard-First Productivity System', () => {
  it('correctly detects editable elements to suppress global shortcuts', () => {
    // Standard non-editable targets
    const div = document.createElement('div')
    const button = document.createElement('button')
    const table = document.createElement('table')

    expect(isEditableElement(div)).toBe(false)
    expect(isEditableElement(button)).toBe(false)
    expect(isEditableElement(table)).toBe(false)

    // Standard editable targets
    const input = document.createElement('input')
    const textarea = document.createElement('textarea')
    const select = document.createElement('select')
    const contentEditableDiv = document.createElement('div')
    contentEditableDiv.setAttribute('contenteditable', 'true')

    expect(isEditableElement(input)).toBe(true)
    expect(isEditableElement(textarea)).toBe(true)
    expect(isEditableElement(select)).toBe(true)
    expect(isEditableElement(contentEditableDiv)).toBe(true)

    // Child of contenteditable
    const childSpan = document.createElement('span')
    contentEditableDiv.appendChild(childSpan)
    expect(isEditableElement(childSpan)).toBe(true)
  })

  it('validates the complete default shortcut registry', () => {
    expect(DEFAULT_KEYBOARD_SHORTCUTS.length).toBeGreaterThanOrEqual(10)

    // Check Navigation sequences
    const homeShortcut = DEFAULT_KEYBOARD_SHORTCUTS.find(s => s.id === 'nav-home')
    expect(homeShortcut).toBeDefined()
    expect(homeShortcut?.sequence).toEqual(['g', 'h'])
    expect(homeShortcut?.category).toBe('Navigation')

    const projectsShortcut = DEFAULT_KEYBOARD_SHORTCUTS.find(s => s.id === 'nav-projects')
    expect(projectsShortcut?.sequence).toEqual(['g', 'p'])

    const myTasksShortcut = DEFAULT_KEYBOARD_SHORTCUTS.find(s => s.id === 'nav-my-tasks')
    expect(myTasksShortcut?.sequence).toEqual(['g', 'm'])

    // Check Task Actions
    const jNav = DEFAULT_KEYBOARD_SHORTCUTS.find(s => s.id === 'task-nav-down')
    expect(jNav?.key).toBe('J')

    const kNav = DEFAULT_KEYBOARD_SHORTCUTS.find(s => s.id === 'task-nav-up')
    expect(kNav?.key).toBe('K')

    const xToggle = DEFAULT_KEYBOARD_SHORTCUTS.find(s => s.id === 'task-toggle-select')
    expect(xToggle?.key).toBe('X')

    const cCreate = DEFAULT_KEYBOARD_SHORTCUTS.find(s => s.id === 'task-create')
    expect(cCreate?.key).toBe('C')

    // Check Global Actions
    const palette = DEFAULT_KEYBOARD_SHORTCUTS.find(s => s.id === 'cmd-palette')
    expect(palette).toBeDefined()

    const help = DEFAULT_KEYBOARD_SHORTCUTS.find(s => s.id === 'shortcut-help')
    expect(help?.key).toBe('?')
  })

  it('simulates sequence key state transitions', () => {
    let sequenceLeader: string | null = null
    let targetRoute: string | null = null

    const handleKey = (key: string, isEditable: boolean) => {
      if (isEditable) {
        sequenceLeader = null
        return
      }

      if (sequenceLeader === 'g') {
        sequenceLeader = null
        if (key === 'h') targetRoute = '/app'
        else if (key === 'p') targetRoute = '/app/projects'
        else if (key === 'm') targetRoute = '/app/my-tasks'
        else if (key === 'i') targetRoute = '/app/inbox'
        else if (key === 'c') targetRoute = '/app/calendar'
        return
      }

      if (key === 'g') {
        sequenceLeader = 'g'
      }
    }

    // Normal typing in input: 'g' then 'h' should NOT navigate
    handleKey('g', true)
    handleKey('h', true)
    expect(targetRoute).toBeNull()

    // Outside input: 'g' then 'p' should navigate to projects
    handleKey('g', false)
    expect(sequenceLeader).toBe('g')
    handleKey('p', false)
    expect(targetRoute).toBe('/app/projects')
    expect(sequenceLeader).toBeNull()

    // 'g' then unrelated key 'z' resets leader without action
    targetRoute = null
    handleKey('g', false)
    expect(sequenceLeader).toBe('g')
    handleKey('z', false)
    expect(sequenceLeader).toBeNull()
    expect(targetRoute).toBeNull()
  })

  it('correctly detects macOS platform from user agent', () => {
    expect(typeof isMacPlatform()).toBe('boolean')

    const originalUserAgent = window.navigator.userAgent
    try {
      Object.defineProperty(window.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        configurable: true,
      })
      expect(isMacPlatform()).toBe(true)

      Object.defineProperty(window.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        configurable: true,
      })
      expect(isMacPlatform()).toBe(false)
    } finally {
      Object.defineProperty(window.navigator, 'userAgent', {
        value: originalUserAgent,
        configurable: true,
      })
    }
  })
})
