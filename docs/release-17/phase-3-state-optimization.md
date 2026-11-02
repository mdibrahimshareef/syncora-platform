# SYNCORA PLATFORM MAJOR RELEASE 17
## Phase 3 — Zustand and React Rendering Optimization

**Date:** 2026-11-03  
**Release:** Platform Release 17  
**Files Created/Updated:**
- `src/stores/selectors.ts` (Fine-grained, memoized selectors)
- `tests/state_selectors.test.ts` (Zustand selector isolation and verification suite)
- `src/components/tasks/TaskCard.tsx` (Decoupled fine-grained subtask selector)

---

### 1. Store Audit Findings

Prior to Release 17, `src/stores/data-store.ts` operated as a single monolithic state container where components frequently subscribed to coarse slices like:
```tsx
const tasks = useDataStore(s => s.tasks);
```
In high-density views (such as a Kanban board with 300 cards across 5 columns), any state update to a single task (e.g., ticking a subtask or updating a timestamp) forced all 300 cards to re-evaluate their `React.useMemo` hooks, resulting in noticeable UI stutter.

---

### 2. Fine-Grained Memoized Selectors (`src/stores/selectors.ts`)

To eliminate full-collection re-renders:
- `useTask(taskId)`: Subscribes only to the specific task entity, returning `undefined` or the exact matched task. Re-renders only when this specific entity is modified.
- `useProjectTasks(projectId)`: Selects tasks belonging strictly to the specified project.
- `useTaskCounts(projectId)`: Computes `{ total, done, inProgress, todo }` in an optimized single-pass loop.
- `useActiveWorkspaceId()` / `useCurrentUser()` / `useWorkspaceMembers()`: Atomic, single-value selectors preventing store churn.

---

### 3. Component Optimization & Subscription Discipline

1. **Kanban Card Isolation:**
   - In `TaskCard.tsx`, the card no longer subscribes to the full array of workspace tasks.
   - It employs a localized subtask selector:
     ```tsx
     const subtasks = useDataStore(
       React.useCallback((s) => s.tasks.filter(t => t.parentId === task.id), [task.id])
     )
     ```
   - Wrapped in `React.memo`, card elements do not re-render during drag-over actions in adjacent columns.
2. **Table Row Isolation:**
   - In `TaskListView.tsx`, `TaskRowItem` is memoized and receives pre-extracted primitive props (`isSelected`, `isFocused`, `virtualTop`, `virtualHeight`).
   - Changing selection on Row #1 leaves Rows #2–#450 completely untouched by the React reconciler.
3. **Workspace Switching Purge:**
   - Calling `setActiveWorkspaceId(newId)` synchronously resets all store arrays to `[]`, immediately halting any active selectors from referencing prior workspace records before network hydration starts.

---

**Phase 3 Sign-off:** Verified with unit tests in `tests/state_selectors.test.ts` on 2026-11-03.

