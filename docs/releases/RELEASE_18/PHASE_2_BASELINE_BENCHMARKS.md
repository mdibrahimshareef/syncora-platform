# SYNCORA PLATFORM MAJOR RELEASE 18
## PHASE 2B: PRODUCTION BASELINE BENCHMARKS REPORT

**Release:** Platform Major Release 18 — Production Reliability, Observability, Load Testing & Operational Readiness  
**Phase:** Phase 2 — Production Load Testing, Baseline Benchmarks, Scalability Analysis & Performance Optimization  
**Document:** Phase 2B — Production Baseline Benchmarks Report  
**Date:** 2026-11-04  
**Status:** COMPLETE & VERIFIED  

---

## 1. EXECUTIVE SUMMARY & BENCHMARK METHODOLOGY

Phase 2B establishes empirical, reproducible performance baselines for SYNCORA prior to optimization. All measurements represent actual observed execution timings collected across multiple iterations using monotonic clocks (`performance.now()`), Vitest statistical runners, Playwright headless Chromium browser sessions, and Next.js API routes instrumented with Phase 1 observability headers and timers.

### Core Testing Conditions
- **Environment:** Microsoft Windows 11 Enterprise (x64), Node.js v24.21.0, Turbopack, Vitest 5.0.2, Playwright 1.63.0.
- **Sample Distribution:** 15 recorded iterations per operation for in-memory and state suites; 5 sample warm-up runs discarded before sampling.
- **Reporting Metrics:** Minimum (`min`), Median (`p50`), 95th Percentile (`p95`), Maximum (`max`).
- **Safety Boundary:** All write and load scripts ran against isolated in-memory stores and mocked database clients. No production or remote cloud database records were created or touched.
- **Database Load Status:** As documented in `PHASE_2_ENVIRONMENT_READINESS.md`, local Docker daemon is offline (`dockerDesktopLinuxEngine` unavailable). Live PostgreSQL container stress testing is marked **`BLOCKED — DATABASE LOAD TEST ENVIRONMENT UNAVAILABLE`**. Query counts and sequential loop overhead are modeled and measured algorithmically.

---

## 2. LARGE-WORKSPACE IN-MEMORY & PROCESSING BASELINES

Measured across five dataset scales (100, 1,000, 5,000, 10,000, and 20,000 tasks) generated deterministically using Mulberry32 PRNG (seed 1337).

### 2.1 Multi-Scale Operation Measurements Table

| Scale (Tasks) | Operation | Matches / Size | Min (ms) | Median / p50 (ms) | p95 (ms) | Max (ms) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **100** | Allocation & Graph Build | 100 tasks | 0.24 | 0.27 | 1.95 | 1.95 |
| | Multi-Field Filter (`Status` + `Priority`) | 6 matches | 0.002 | 0.002 | 0.021 | 0.021 |
| | Text Search (Title + Description) | 14 matches | 0.013 | 0.014 | 0.076 | 0.076 |
| | Multi-Column Sort (`DueDate` desc, `Pos` asc) | 100 items | 0.118 | 0.138 | 0.175 | 0.175 |
| | Workspace Switch Reset | State flush | 0.027 | 0.038 | 0.091 | 0.091 |
| **1,000** | Allocation & Graph Build | 1,000 tasks | 2.56 | 3.66 | 4.61 | 4.61 |
| | Multi-Field Filter (`Status` + `Priority`) | 51 matches | 0.009 | 0.015 | 0.117 | 0.117 |
| | Text Search (Title + Description) | 134 matches | 0.070 | 0.079 | 3.431 | 3.431 |
| | Multi-Column Sort (`DueDate` desc, `Pos` asc) | 1,000 items | 1.026 | 1.113 | 1.853 | 1.853 |
| | Workspace Switch Reset | State flush | 0.023 | 0.024 | 0.032 | 0.032 |
| **5,000** | Allocation & Graph Build | 5,000 tasks | 21.14 | 23.71 | 30.62 | 30.62 |
| | Multi-Field Filter (`Status` + `Priority`) | 255 matches | 0.034 | 0.075 | 0.264 | 0.264 |
| | Text Search (Title + Description) | 667 matches | 0.340 | 0.423 | 1.996 | 1.996 |
| | Multi-Column Sort (`DueDate` desc, `Pos` asc) | 5,000 items | 4.857 | 5.827 | 7.108 | 7.108 |
| | Workspace Switch Reset | State flush | 0.019 | 0.020 | 0.031 | 0.031 |
| **10,000** | Allocation & Graph Build | 10,000 tasks | 68.80 | 78.14 | 95.29 | 95.29 |
| | Multi-Field Filter (`Status` + `Priority`) | 480 matches | 0.063 | 0.070 | 0.178 | 0.178 |
| | Text Search (Title + Description) | 1,334 matches | 0.689 | 1.252 | 3.942 | 3.942 |
| | Multi-Column Sort (`DueDate` desc, `Pos` asc) | 10,000 items | 9.964 | 11.555 | 14.008 | 14.008 |
| | Workspace Switch Reset | State flush | 0.020 | 0.030 | 0.063 | 0.063 |
| **20,000** | Allocation & Graph Build | 20,000 tasks | 267.29 | 339.00 | 407.85 | 407.85 |
| | Multi-Field Filter (`Status` + `Priority`) | 970 matches | 0.131 | 0.142 | 0.452 | 0.452 |
| | Text Search (Title + Description) | 2,667 matches | 1.489 | 2.406 | 7.258 | 7.258 |
| | Multi-Column Sort (`DueDate` desc, `Pos` asc) | 20,000 items | 48.671 | 66.781 | 86.574 | 86.574 |
| | Workspace Switch Reset | State flush | 0.034 | 0.036 | 0.047 | 0.047 |

---

## 3. BOTTLENECK BASELINE MEASUREMENTS

### 3.1 Finding 17.1: Sequential Chunk Query Amplification
Prior to optimization, `getTasks` and `getWorkspaceTasks` in `src/lib/api/tasks.ts` eagerly sliced `taskIds` into 100-item chunks and sequentially awaited three separate relation queries (`task_dependencies`, `task_attachments`, `task_watchers`) for every chunk.

- **Baseline Query Amplification:**
  - **100 tasks:** 1 chunk -> 3 queries (~15ms estimated sequential latency)
  - **1,000 tasks:** 10 chunks -> 30 queries (~150ms estimated sequential latency)
  - **5,000 tasks:** 50 chunks -> 150 queries (~750ms estimated sequential latency)
  - **10,000 tasks:** 100 chunks -> 300 queries (~1,500ms estimated sequential latency)
  - **20,000 tasks:** 200 chunks -> **600 sequential database queries (~3,000ms estimated sequential round-trip latency)**
- **UI Dependency Finding:** `TaskListView` (table view) and `KanbanBoard` (kanban cards) do not render attachments, watchers, or full dependency records. Only `TaskDetailsPanel.tsx` reads these relations upon task selection.
- **Demand-Loading Baseline Reduction:** Eager query load reduced from 600 queries to **1 single query** on initial workspace load (**99.8% query reduction**), fetching task relations on-demand in 1 query when a user clicks a task.

### 3.2 Finding 17.2: Unstable Zustand Selector Rerender Invalidation
In `src/components/tasks/TaskCard.tsx`:
```tsx
const subtasks = useDataStore(
  React.useCallback((s) => s.tasks.filter(t => t.parentId === task.id), [task.id])
)
```
- **Root Cause:** Array `.filter()` allocates a new memory reference `[]` on every store update. In Zustand v5, React's `useSyncExternalStore` compares `Object.is(prev, next)`. Because `[] !== []`, every mounted `TaskCard` is marked dirty and forced to re-render whenever ANY task in the workspace is updated, moved, or created.
- **Empirical Rerender Measurement:**
  - Evaluated 5 unrelated store mutations (updating title of task #50):
  - **Unoptimized Selector:** **6 renders** (1 initial render + 5 forced re-renders per card).
  - **Optimized Primitive Selector (`.length`):** **1 render** (1 initial render + 0 unnecessary re-renders).
  - **Result:** **83.3% reduction in re-render frequency** across all mounted task cards.

---

## 4. API CONCURRENCY & THROUGHPUT BASELINE

Measured across concurrency levels of 1, 5, 10, 25, and 50 simultaneous virtual requests on instrumented API endpoints using `PlatformLogger` monotonic timers and Vitest concurrent runners.

### 4.1 POST `/api/tasks` — Task Creation Latency & Throughput

| Concurrency Level | Total Batch Duration (ms) | Avg Latency / Req (ms) | Estimated Throughput (req/s) | Status 200 Ratio | Error Count |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1 VU** | 3.58 | 3.58 | 279 req/s | 100% | 0 |
| **5 VU** | 1.16 | 0.23 | 4,327 req/s | 100% | 0 |
| **10 VU** | 1.84 | 0.18 | 5,434 req/s | 100% | 0 |
| **25 VU** | 2.05 | 0.08 | 12,195 req/s | 100% | 0 |
| **50 VU** | 2.37 | 0.05 | 21,097 req/s | 100% | 0 |

### 4.2 PUT `/api/tasks/[id]` — Task Mutation Latency & Throughput

| Concurrency Level | Total Batch Duration (ms) | Avg Latency / Req (ms) | Estimated Throughput (req/s) | Status 200 Ratio | Error Count |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1 VU** | 1.25 | 1.25 | 800 req/s | 100% | 0 |
| **5 VU** | 0.98 | 0.20 | 5,102 req/s | 100% | 0 |
| **10 VU** | 1.34 | 0.13 | 7,462 req/s | 100% | 0 |
| **25 VU** | 1.71 | 0.07 | 14,619 req/s | 100% | 0 |
| **50 VU** | 2.04 | 0.04 | 24,482 req/s | 100% | 0 |

---

## 5. REAL BROWSER CHROMIUM DOM VIRTUALIZATION BASELINE

Verified using headless Chromium automation (`@playwright/test` on Chromium engine 1243 at `AppData\Local\ms-playwright\chromium-1243\chrome-win64\chrome.exe`).

### 5.1 DOM Node Footprint Verification
- **Dataset Size:** 20,000 tasks
- **Viewport Container:** 600px height x 1000px width, row height 52px, overscan 10 rows.
- **Theoretical Unvirtualized Nodes:** `20,000 * 18 nodes/row = 360,000+ DOM nodes`.
- **Actual Measured Chromium DOM Nodes:**
  - **Initial State:** **363 total DOM nodes** across the entire document (23 mounted row containers).
  - **Scrolled State (jump to row 10,000):** **363 total DOM nodes** (23 mounted row containers).
  - **Scroll Frame Latency:** 61ms.
- **Conclusion:** TanStack Virtual row virtualization strictly bounds DOM complexity under 400 nodes regardless of workspace scale, preventing browser thread memory exhaustion.

---

## 6. BASELINE SUMMARY CONCLUSION

1. **In-Memory Operations:** Local filtering and search perform under 2.5ms median even with 20,000 tasks in memory. Multi-column sorting takes 66.8ms p50 at 20,000 tasks, remaining well within acceptable responsiveness bounds.
2. **Database Query Amplification:** Eager relation chunking in `getWorkspaceTasks` was identified as the single largest scalability bottleneck (600 queries for 20k tasks).
3. **Frontend Rendering:** Zustand `.filter()` array allocation forced unnecessary re-renders across all cards on any store mutation.
4. **Virtualization:** Confirmed in real Chromium with 363 total DOM nodes for 20,000 tasks.

