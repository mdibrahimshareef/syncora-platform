# SYNCORA PLATFORM MAJOR RELEASE 17
## Phase 7 — Realtime and Concurrency Regression Testing

**Date:** 2026-11-03  
**Release:** Platform Release 17  
**Files Verified:**
- `src/hooks/useWorkspaceRealtime.ts` (Supabase channel lifecycle & presence)
- `src/stores/data-store.ts` (`applyRealtimeTaskUpdate`, timestamp tie-breaking)
- `tests/realtime_concurrency_regression.test.ts` (Cross-tenant rejection, stale event drop)

---

### 1. Realtime Concurrency Verification

In a collaborative work management environment, concurrent mutations from distributed team members must reconcile predictably without overwriting newer state or crashing virtualized lists.

#### Handled Realtime Scenarios:
1. **User A and User B Concurrent Edits:**
   - User A updates status; User B updates title.
   - When User B's update payload arrives via Supabase Realtime, `applyRealtimeTaskUpdate` merges field-level updates against the in-memory entity.
   - The virtualized table row updates reactively via memoized re-render without reflowing unmounted rows.
2. **Stale Realtime Event Rejection:**
   - Network delays can cause an older event to arrive after a newer local modification has already been committed.
   - `applyRealtimeTaskUpdate` checks `updated_at`:
     ```ts
     if (updatedAtStr && new Date(updatedAtStr).getTime() <= new Date(existing.updatedAt).getTime()) {
       return state;
     }
     ```
   - Stale payloads are dropped before mutating state.
3. **Cross-Tenant Event Boundary:**
   - Events originating from a different workspace are immediately discarded:
     ```ts
     if (payload.workspace_id && payload.workspace_id !== state.activeWorkspaceId) return state;
     ```
   - Prevents foreign workspace mutations from corrupting the active view.

---

### 2. Virtualized List Realtime Stability

- When off-screen tasks are updated via Realtime, their properties update in `state.tasks`.
- Because `@tanstack/react-virtual` relies on index calculation and row measurement functions, incoming updates do not cause scroll jumps, focus resets, or unmounted DOM recreation.
- When an off-screen row subsequently scrolls into the viewport, it mounts with the latest authoritative server values.

---

**Phase 7 Sign-off:** Verified with unit tests in `tests/realtime_concurrency_regression.test.ts` on 2026-11-03.
