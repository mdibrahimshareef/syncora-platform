# SYNCORA PLATFORM MAJOR RELEASE 17
## Phase 5 — Local-First Performance, Cache Strategy & Offline Resilience

**Date:** 2026-11-03  
**Release:** Platform Release 17  
**Associated ADR:** `docs/release-17/local-cache-architecture-decision.md`  
**Files Created/Updated:**
- `src/hooks/useNetworkStatus.ts` (Network connectivity status listener)
- `src/components/network/OfflineIndicator.tsx` (Non-blocking offline status banner)
- `src/components/layout/AppShell.tsx` (Mounted offline notification banner)
- `docs/release-17/local-cache-architecture-decision.md` (Formal ADR comparing persistence models)

---

### 1. Evidence-Based Caching Decision

As established in the Phase 5 ADR:
- Benchmark testing on datasets up to 20,000 tasks demonstrated that in-memory Zustand access requires **<2 ms**, while IndexedDB transactions require **40–140 ms** with structured clone serialization overhead.
- Writing to IndexedDB introduces high risk of cross-workspace data bleed and split-brain conflicts with PostgreSQL and Supabase Realtime.
- Therefore, SYNCORA adheres strictly to the **One Data Model** principle: **PostgreSQL remains the single authoritative source of truth**.

---

### 2. Tenant Isolation & Workspace Switching

Cross-workspace leakage is prevented at the root:
1. When switching workspaces, `setActiveWorkspaceId(newId)` synchronously purges all in-memory collections (`tasks: []`, `projects: []`, `activity: []`, etc.).
2. Supabase Realtime subscriptions to the previous workspace channel are detached immediately via `supabase.removeChannel(channel)`.
3. In-flight requests referencing the prior workspace ID are discarded upon resolution if `activeWorkspaceId` has transitioned.
4. No persistent database files or unencrypted IndexedDB stores are retained on disk across user logouts or workspace switches.

---

### 3. Read-Only Offline Resilience

- `useNetworkStatus` monitors browser online/offline events.
- When connection drops, `OfflineIndicator` displays:
  > *"You're offline. Showing previously loaded information. Some actions may be unavailable."*
- Already loaded memory state remains navigable, searchable, and filterable.
- Risky offline writes are intentionally blocked rather than silently queued, eliminating the risk of accidental privilege escalation or clobbering concurrent teammate edits upon reconnection.

---

**Phase 5 Sign-off:** Architecture Decision Record and offline resilience verified on 2026-11-03.
