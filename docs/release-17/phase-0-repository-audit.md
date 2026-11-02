# SYNCORA PLATFORM MAJOR RELEASE 17
## Phase 0 — Complete Repository Audit & Architecture Inspection

**Date:** 2026-11-03  
**Release:** Platform Release 17  
**Environment:** Next.js 16.3.4 (Turbopack), React 19.2.8, TypeScript 5, Tailwind CSS 4, Zustand 5.0.15, Vitest 5.0.2, Playwright 1.63.0, Supabase 2.115.0  

---

### 1. Existing Architecture & Tech Stack Verification

A comprehensive repository inspection was conducted across root configuration files, package manifests, source directories, database migrations, and test suites.

#### Verified Dependencies and Versions (`package.json`)
- **Framework & Runtime:** Next.js 16.3.4 (App Router, Turbopack enabled), React 19.2.8, React DOM 19.2.8
- **Language & Types:** TypeScript 5.x (`tsconfig.json` target ES2017, moduleResolution bundler)
- **Styling:** Tailwind CSS 4 (`@tailwindcss/postcss` 4.x), Lucide React 1.39.0, Sonner 2.0.8, framer-motion 13.2.0
- **UI Components:** shadcn/ui, Radix UI (`@radix-ui/react-label`, `@radix-ui/react-slot`), Base UI (`@base-ui/react` 1.7.0), cmdk 1.1.1
- **State Management:** Zustand 5.0.15 (`src/stores/data-store.ts`, `src/stores/ui-store.ts`, `src/stores/organizationStore.ts`)
- **Backend & Database:** Supabase JS 2.115.0, Supabase SSR 0.12.5, PostgreSQL with pgvector and RLS policies
- **Drag & Drop:** `@dnd-kit/core` 6.3.1, `@dnd-kit/sortable` 10.0.0, `@dnd-kit/utilities` 3.2.2
- **Testing:** Vitest 5.0.2 (52 test files, 218 unit/integration tests), Playwright 1.63.0 (11 spec files)
- **Bundle Analysis:** `@next/bundle-analyzer` 16.3.5 (configured in `next.config.ts`)

---

### 2. Relevant File Paths & Module Map

| Domain / Responsibility | Relevant File Paths |
|---|---|
| **App Layout & Shell** | `src/components/layout/AppShell.tsx`<br>`src/components/layout/Header.tsx`<br>`src/components/layout/Sidebar.tsx`<br>`src/components/layout/WorkspaceSwitcher.tsx` |
| **Global State Stores** | `src/stores/data-store.ts` (1,883 lines, monolithic work entity store)<br>`src/stores/ui-store.ts` (UI drawer/modal state)<br>`src/stores/organizationStore.ts` |
| **Task Presentation** | `src/components/tasks/TaskListView.tsx` (Table row rendering)<br>`src/components/tasks/TaskBoard.tsx` (Kanban board)<br>`src/components/tasks/TaskColumn.tsx` (Droppable column)<br>`src/components/tasks/TaskCard.tsx` (Individual card)<br>`src/components/tasks/TaskDetailsPanel.tsx` (Drawer details)<br>`src/components/tasks/TaskFilters.tsx` |
| **Navigation & Shortcuts** | `src/components/navigation/CommandPalette.tsx`<br>`src/components/navigation/GlobalSearch.tsx`<br>`src/components/navigation/NotificationCenter.tsx` |
| **API & Data Access Layer** | `src/lib/api/tasks.ts`<br>`src/lib/api/projects.ts`<br>`src/lib/api/search.ts`<br>`src/lib/api/activity.ts`<br>`src/lib/api/notifications.ts`<br>`src/lib/supabase/client.ts`<br>`src/lib/supabase/server.ts` |
| **Realtime Collaboration** | `src/hooks/useWorkspaceRealtime.ts`<br>`src/hooks/useTaskRealtime.ts`<br>`src/hooks/useProjectRealtime.ts` |
| **Database Migrations** | `supabase/migrations/00001_initial_schema.sql` through `00065_fix_organizations_update_policy.sql` |
| **Test Suites** | `tests/ai/**/*.test.ts` (Vitest)<br>`tests/*.spec.ts` (Playwright) |

---

### 3. Existing Data Flow Analysis

For task-centric user interactions, the flow currently operates as follows:

```text
User Interaction (Click / Drag / Form Submit)
       ↓
React UI Component (e.g. TaskListView, TaskBoard, TaskForm)
       ↓
Zustand Action (useDataStore: updateTask, moveTask, createTask, bulkUpdateTasks)
       ↓
Optimistic Local State Update (immediate UI update in Zustand state)
       ↓
API Layer / Supabase Client (src/lib/api/tasks.ts)
       ↓
PostgreSQL Execution (Subject to RLS Policies & Triggers)
       ↓
Authoritative Response Reconciled in Zustand
       ↓
Supabase Realtime Broadcast (POSTGRES_CHANGES on tasks, projects, etc.)
       ↓
useWorkspaceRealtime Hook (Dispatches to Zustand reconciliation handlers)
       ↓
React Subscribers Re-rendered
```

#### Identified Data Flow Inefficiencies:
1. **Unvirtualized List Rendering:** In `TaskListView.tsx`, `tasks.map((task) => <TableRow ...>)` renders every task in memory into real DOM nodes. A dataset of 1,000+ tasks creates over 10,000 DOM elements, stalling paint cycles.
2. **Coarse-Grained Zustand Subscriptions:** Several components subscribe to broad slices (e.g. `const tasks = useDataStore(s => s.tasks)`), causing unnecessary re-renders when unrelated properties or other tasks change.
3. **Large Query Payloads in `getTasks` & `getWorkspaceTasks`:** In `src/lib/api/tasks.ts`, `taskIds.join(',')` is used to load dependencies, attachments, and watchers in memory without paging or column projection limits.
4. **Layout Recalculations in Kanban:** Dragging items in `TaskBoard.tsx` causes reflow across adjacent columns because CSS containment (`content-visibility: auto`) is not applied to columns.

---

### 4. Existing Performance Systems

- **Next.js Turbopack:** Active in `next.config.ts`, providing fast dev compilation and production chunking.
- **Bundle Analyzer:** `@next/bundle-analyzer` is present and toggled via `ANALYZE=true`.
- **UI Loading Overlays:** `AppShell.tsx` contains an absolute backdrop spinner tied to `isLoading`.
- **Missing Performance Infrastructure:**
  - No DOM virtualization library (`@tanstack/react-virtual` is NOT yet installed).
  - No centralized request cancellation / abort controllers on fast successive searches.
  - No client-side cache indexing for sub-50ms offline or warm navigation.

---

### 5. Existing Keyboard Interaction Systems

- **Current Implementation:**
  - `CommandPalette.tsx` listens for `keydown` (`Cmd/Ctrl + K` to open palette; `c` to open task dialog).
  - `GlobalSearch.tsx` has a separate `keydown` listener (`Cmd/Ctrl + K`).
  - `sidebar.tsx` binds `Cmd/Ctrl + B` for toggling the sidebar.
- **Shortcomings:**
  - Scattered event listeners across multiple components rather than a single unified keyboard manager.
  - No vim-style navigation (`J` / `K`) in task lists.
  - No `Enter` to open selected task or `Esc` to close details drawer.
  - No multi-key sequences (`G then H` for Home, `G then P` for Projects, `G then M` for My Tasks, `G then I` for Inbox, `G then C` for Calendar).
  - No shortcut cheat-sheet dialog accessible via `?`.
  - Inadequate focus restoration and tab order management when items are unmounted.

---

### 6. Existing Cache and Persistence Systems

- **Zustand In-Memory State:** `data-store.ts` stores state in memory. No IndexedDB or localStorage persistence is used for work entities.
- **Workspace Isolation Strategy:** In `setActiveWorkspaceId(id)`, the store explicitly resets all collections to `[]` (`tasks: []`, `projects: []`, `activity: []`, etc.) before fetching the new workspace. This prevents cross-tenant data leakage.
- **Realtime Invalidation:** Realtime events update or append to the in-memory array. Stale events from mismatched workspaces are rejected based on `workspace_id`.

---

### 7. Existing Testing Infrastructure

- **Vitest 5.0.2:** Unit & integration tests in `tests/**/*.test.ts`. All 52 test files and 218 tests pass cleanly with `testTimeout: 20000` (allowing real Supabase integration roundtrips).
- **Playwright 1.63.0:** End-to-end tests in `tests/*.spec.ts` testing auth, responsive layouts, workspace isolation, and action RLS.
- **Type Checking:** `npx tsc --noEmit` runs with 0 errors.
- **Production Build:** `npm run build` compiles all 40 routes successfully in 12.7s.

---

### 8. Identified Bottlenecks

1. **DOM Bloat on Large Lists:**
   - Rendering 1,000 tasks creates ~10,000 DOM nodes.
   - Initial render time scales linearly with dataset size ($O(N)$ DOM nodes).
2. **Search Input Latency:**
   - `CommandPalette.tsx` uses a simple `setTimeout(300ms)` without request cancellation. Typing quickly can cause out-of-order response reconciliation.
3. **Full Store Re-renders:**
   - Monolithic store design causes downstream components to re-evaluate when unrelated state keys update.
4. **Kanban Column Layout Thrashing:**
   - Moving cards across columns causes global style recalculations without CSS containment boundaries.
5. **Lack of Fast Local Lookups:**
   - Every workspace switch requires complete network hydration before any task can be displayed.

---

### 9. Risks & Mitigation Plan

| Risk | Impact | Mitigation |
|---|---|---|
| **Virtualization Focus Loss** | Keyboard navigation loses focus when off-screen rows unmount. | Maintain virtualized focused index and programmatic focus restoration using `aria-activedescendant` or managed ref targets. |
| **Cross-Tenant Cache Leakage** | Cached Workspace A data shown in Workspace B. | Strict multi-tenant cache keys: `[userId, orgId, workspaceId, entityType]`. Full cache invalidation on workspace switch and logout. |
| **Optimistic Overwrites** | Optimistic rollback clobbers a newer server update. | Entity versioning / timestamp comparison before applying rollback or reconciliations. |
| **Input Collision with Shortcuts** | Typing in inputs triggers navigation shortcuts. | Strict input suppression check (`isEditableElement` checking `INPUT`, `TEXTAREA`, `contenteditable`, and active modal overlays). |

---

### 10. Recommended Implementation Sequence

1. **Phase 1: Performance Baseline** — Measure and document current metrics across critical user journeys (List rendering, search, filters, memory).
2. **Phase 2: Large-Data Rendering Architecture** — Install `@tanstack/react-virtual`, implement a production virtualized task list with variable row heights, stable keys, and CSS containment (`content-visibility: auto`) for Kanban columns.
3. **Phase 3: Zustand & React Rendering Optimization** — Implement selector memoization, normalized entity maps (`tasksById`), shallow equality selectors, and subscription lifecycle discipline.
4. **Phase 4: Keyboard-First Productivity System** — Build a unified `GlobalShortcutManager`, keyboard sequences (`G then H`, etc.), `J/K` list navigation, selection toggling (`X`), command palette improvements, and accessible `?` shortcut modal.
5. **Phase 5: Local-First Performance & Cache Strategy** — Produce ADR comparing Zustand memory vs IndexedDB; implement bounded, tenant-isolated local cache with safe invalidation and zero cross-workspace leakage.
6. **Phase 6: Search & Filtering Performance** — Add debounced search with `AbortController`, local memoized filtering for loaded datasets, and indexed server queries.
7. **Phases 7–16: Realtime, API, Bundle, Responsive, Accessibility, Error Recovery, Security, CI & Final Verification.**

---

**Audit Sign-off:** Verified against live code, tests, and build on 2026-11-03.
