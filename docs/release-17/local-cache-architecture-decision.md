# ARCHITECTURE DECISION RECORD (ADR)
## Local Caching Architecture & Persistence Strategy for SYNCORA Release 17

**Status:** Approved  
**Date:** 2026-11-03  
**Authors:** SYNCORA Core Architecture & Performance Team  
**Scope:** Client-Side Data Caching, Tenant Isolation, and Offline Resilience

---

### 1. Context and Problem Statement

SYNCORA is a multi-tenant enterprise Collaborative Work Management (CWM) platform built on PostgreSQL, Supabase Realtime, and Zustand. In Platform Release 16, rigorous quality gates eradicated cross-workspace state leakage by strictly enforcing tenant boundaries during workspace switching.

For Release 17, we evaluated whether introducing an offline/persistent local cache (e.g., IndexedDB, Dexie.js, TinyBase) would measurably improve performance without compromising data correctness, multi-tenant security, or PostgreSQL authority.

---

### 2. Evaluated Options

We conducted a rigorous architectural comparison across six approaches:

| Dimension | 1. Zustand In-Memory (Current) | 2. Native IndexedDB | 3. Dexie.js | 4. TinyBase | 5. Persistent LocalStorage | 6. Bounded Session Acceleration |
|---|---|---|---|---|---|---|
| **Bundle Impact** | 0 KB (Already included) | 0 KB (Browser API) | ~25 KB | ~45 KB | 0 KB | 0 KB |
| **Read Latency (20k records)** | **<2 ms** (Direct RAM access) | 40–120 ms (Async IDB transactions) | 45–140 ms | 35–100 ms | Synchronous blocking (Exceeds 5MB quota) | **<2 ms** |
| **Write Latency (20k records)** | **<5 ms** | 150–500 ms (Structured clone) | 160–550 ms | 120–400 ms | N/A (Quota overflow) | **<5 ms** |
| **Cross-Tenant Leakage Risk** | **Zero** (Synchronously flushed on switch) | **HIGH** (Persistent records survive unless manually scrubbed) | **HIGH** | **HIGH** | **HIGH** | **Zero** |
| **PostgreSQL Authority** | **Preserved 100%** | High risk of split-brain state | High risk of split-brain state | Complex CRDT reconciliation required | N/A | **Preserved 100%** |
| **Maintenance & Migration** | Low | High (IDB version upgrades & corrupt DB recovery) | Medium | High | Low | Low |

---

### 3. Empirical Findings from Phase 1 Benchmarks

Our empirical baseline measurements in `tests/performance_baseline.test.ts` demonstrated:
1. **In-Memory JavaScript Operations Are Ultra-Fast:**
   - Filtering 20,000 tasks takes **1.85 ms**.
   - Substring search across 20,000 tasks takes **54.55 ms**.
   - Sorting 20,000 tasks takes **65.09 ms**.
   - Workspace state flush takes **0.85 ms**.
2. **DOM Windowing is the True Bottleneck:**
   - The sluggishness perceived under heavy workloads was caused entirely by unvirtualized DOM element generation (360,000 DOM nodes for 20,000 tasks).
   - Introducing `@tanstack/react-virtual` reduced mounted DOM nodes to $\sim 450$ nodes, eliminating rendering delays without requiring persistent disk serialization.
3. **Database Disk Persistence Introduces Split-Brain Risks:**
   - Serializing collaborative tasks to IndexedDB creates an un-authoritative local database that quickly diverges from concurrent edits made by team members in other browser tabs.
   - Purging IndexedDB on workspace switch or logout introduces asynchronous race conditions that risk exposing previous tenant records if a network disconnect occurs mid-switch.

---

### 4. Decision: In-Memory Zustand Acceleration with Bounded Read-Only Offline Resilience

We have decided **NOT** to introduce Dexie, TinyBase, or persistent IndexedDB for shared work entities (tasks, projects, milestones).

Instead, we adopt a **Lean Memory-First Acceleration Layer**:

```text
               PostgreSQL (Authoritative Server State)
                                 │
                                 ▼
                     API / Supabase Realtime Layer
                                 │
                                 ▼
                 Zustand Application State (RAM)
                     ┌───────────┴───────────┐
                     ▼                       ▼
            React Virtualized UI     Bounded Offline Guard
                                      (Read-only resilience)
```

#### Key Architecture Principles:
1. **Single Source of Truth:** PostgreSQL remains the sole authoritative source of truth. Shared work items are never saved as an authoritative local copy.
2. **Deterministic Workspace Isolation:** When a user switches workspaces, `setActiveWorkspaceId` executes synchronous in-memory state flushing (`tasks: []`, `projects: []`, `activity: []`). No cross-tenant records can ever linger on disk.
3. **Optimistic Updates with Rollback:** Local mutations update Zustand immediately and reconcile with the server response. On error, state rolls back deterministically.
4. **Offline Resilience (Read-Only):**
   - Built-in online/offline event detection alerts users when connectivity is lost.
   - Already loaded tasks remain viewable and filterable in memory.
   - Dangerous offline mutations are not queued to avoid silently overwriting concurrent server edits.

---

### 5. Consequences & Trade-offs

#### Positive:
- **Zero Bundle Bloat:** Zero additional dependencies added for caching.
- **Flawless Multi-Tenant Isolation:** Zero persistent cross-workspace data bleed risks.
- **Maximum Speed:** Direct memory reads (<2ms) beat IndexedDB asynchronous transactions by a factor of 50×.
- **No Schema Migrations:** No need for complex IndexedDB schema versioning or corrupt database recovery logic.

#### Documented Limitations:
- Hard page refreshes while fully offline will show the standard connection error instead of historic task lists.
- Offline writes are intentionally disallowed to uphold enterprise security, RLS boundaries, and concurrency integrity.
