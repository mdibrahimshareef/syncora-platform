# SYNCORA Platform Major Release 18 — Phase 3
# System Architecture: Background Processing, Event Dispatching & Reliable Webhook Delivery

**Document Version:** 1.0.0  
**Status:** Completed & Verified  
**Scope:** Distributed Reliability, Durable Event Dispatching, Idempotent Processing, Outbound & Inbound Webhooks

---

## 1. Executive Summary

SYNCORA Platform Major Release 18 Phase 3 delivers a production-grade asynchronous background processing and event delivery architecture. Prior to this release, three critical reliability and security defects undermined asynchronous workflows:
1. **Finding 15.1:** Event dispatching (`webhook_idempotency`) executed under regular authenticated user sessions where default-deny Row Level Security (RLS) silently failed inserts, causing all webhooks and automations to be dropped without error.
2. **Finding 15.2:** OAuth token encryption fell back to a hardcoded public key (`'0123456789abcdef0123456789abcdef'`), leaving third-party integration credentials vulnerable.
3. **Finding 15.3:** Inbound webhooks lacked durable idempotency, lacked cryptographic signature enforcement, and logged raw sensitive payloads.

Phase 3 resolves all three findings and hardens the platform with:
- Dedicated **SSRF (Server-Side Request Forgery)** protection blocking loopback, link-local, private RFC 1918, carrier-grade NAT, and cloud metadata endpoints.
- Durable database-level idempotency for both inbound (`inbound_webhook_events`) and outbound dispatch (`webhook_idempotency`).
- Cryptographically constant-time signature verification with replay attack defense for GitHub (`x-hub-signature-256`) and Slack (`v0` HMAC-SHA256 with 300s window).
- Bounded retries with exponential backoff, random jitter, and dynamic `Retry-After` header parsing.
- Dead-letter queue (DLQ) state transitions (`'dead_letter'`) when retry bounds are exhausted.
- Full integration with Phase 1 structured logging and correlation context propagation.

---

## 2. Asynchronous Background Architecture Overview

```mermaid
flowchart TD
    subgraph Frontend["Client / API Layer"]
        User["Authenticated User / Service"]
        API["Authoritative Mutation Route (/api/tasks)"]
    end

    subgraph DispatcherLayer["Event Dispatcher Boundary"]
        Dispatcher["src/lib/events/dispatcher.ts"]
        IdempTable[("public.webhook_idempotency")]
        EndpointsTable[("public.webhook_endpoints")]
        DeliveriesTable[("public.webhook_deliveries")]
    end

    subgraph BackgroundExec["Next.js after() Lifecycle"]
        WorkerQueue["Background Task Worker"]
        SSRF["SSRF URL Validator"]
        OutboundFetch["Signed Outbound HTTP POST"]
        AutoEngine["src/lib/automations/engine.ts"]
        DeadLetter[("status: 'dead_letter'")]
    end

    User -->|1. HTTP Mutation| API
    API -->|2. Authoritative DB Commit| API
    API -->|3. dispatchEvent()| Dispatcher
    Dispatcher -->|4. Check & Insert (Admin Client)| IdempTable
    IdempTable -->|Duplicate Key?| Skip["Idempotency Skip (No-op)"]
    Dispatcher -->|5. Query Active Endpoints (Workspace Scoped)| EndpointsTable
    Dispatcher -->|6. Batch Insert (status: pending)| DeliveriesTable
    Dispatcher -->|7. Non-blocking schedule| WorkerQueue
    WorkerQueue -->|8a. Validate URL| SSRF
    SSRF -->|Invalid / Metadata| SSRFBlock["status: failed (SSRF Blocked)"]
    SSRF -->|Valid| OutboundFetch
    OutboundFetch -->|Transient Failure / 429| RetryDelay["Exponential Backoff + Jitter"]
    RetryDelay -->|Exhausted attempts >= 3| DeadLetter
    WorkerQueue -->|8b. Execute Workspace Automations| AutoEngine
```

---

## 3. End-to-End Event Lifecycle

### 3.1 Authoritative Mutation Trigger
Background processing in SYNCORA adheres strictly to the **Observer Pattern**. Mutations (such as task creation, updates, and status transitions) execute authoritatively in the primary database transaction. The mutation response is never blocked by external webhook deliveries or downstream automations.

```typescript
// Authoritative CRUD mutation in src/lib/api/tasks.ts:
const task = await createTaskInDb(supabase, projectId, data);

// Asynchronously dispatch domain event:
await dispatchEvent({
  id: crypto.randomUUID(),
  type: 'task.created',
  workspaceId: task.workspace_id,
  payload: task,
});
```

### 3.2 Tenant Isolation and Privileged Escalation (Finding 15.1)
1. **Tenant Validation:** Before initiating any database action, `dispatchEvent()` validates that `event.workspaceId` is non-empty and well-formed. Events lacking workspace context are rejected immediately.
2. **Privileged Escalation:** `createAdminClient()` from [`src/lib/supabase/server.ts`](file:///c:/Users/Ibrahim/Desktop/SYNCORA-frontend-project/src/lib/supabase/server.ts) is employed exclusively for internal queueing. Because `webhook_idempotency` and `webhook_deliveries` store operational infrastructure state, authenticated users previously encountered RLS insert denial.
3. **Workspace-Scoped Filtering:** The admin client is strictly restricted by adding `.eq('workspace_id', event.workspaceId)` and `.eq('status', 'active')` to all endpoint queries. Deliveries are generated solely for endpoints within the same workspace.

### 3.3 Background Hand-off via Next.js `after()`
To decouple HTTP request latency from webhook execution, tasks are scheduled using Next.js `after()`:
```typescript
const runBackgroundTasks = async () => {
  const tasks = [
    ...deliveryIds.map(id => processWebhookDelivery(id, event)),
    processIntegrationDelivery(event),
    processEventForAutomations(event, depth)
  ];
  await Promise.allSettled(tasks);
};

try {
  after(runBackgroundTasks);
} catch {
  // Graceful fallback for CLI, test suites, and offline cron execution
  runBackgroundTasks().catch((err) => {
    logger.error({ operation: 'event.dispatch.background_fallback_failure', message: err?.message });
  });
}
```

---

## 4. Inbound Webhook Architecture & Flow

```mermaid
sequenceDiagram
    autonumber
    actor Provider as External Provider (GitHub / Slack)
    participant Route as /api/webhooks/inbound/[provider]
    participant Verifier as Provider Adapter (Signature & Replay)
    participant Idemp as public.inbound_webhook_events
    participant System as Internal Workflow / Realtime

    Provider->>Route: POST /api/webhooks/inbound/[provider] (Raw Body + Signature Headers)
    Route->>Verifier: verifyWebhookSignature(req, rawBody)
    alt Signature Invalid or Timestamp Expired (>300s)
        Verifier-->>Route: false
        Route-->>Provider: 401 Unauthorized { error: 'Invalid webhook signature' }
    else Signature Valid
        Verifier-->>Route: true
        Route->>Idemp: INSERT INTO inbound_webhook_events (provider, external_event_id, status: 'received')
        alt Duplicate Event (Unique Constraint 23505)
            Idemp-->>Route: Unique violation error
            Route-->>Provider: 200 OK { success: true, duplicate: true }
        else First Arrival
            Idemp-->>Route: Success (eventId: UUID)
            Route->>System: Route internal event
            Route->>Idemp: UPDATE status = 'processed', processed_at = NOW()
            Route-->>Provider: 200 OK { success: true, eventId: UUID }
        end
    end
```

---

## 5. Architectural Quality Attributes

| Attribute | Implementation Standard | Verification |
| :--- | :--- | :--- |
| **Durability** | Database-backed tables (`webhook_deliveries`, `inbound_webhook_events`, `ai_jobs`) | PostgreSQL Schema Migration 00067 |
| **Idempotency** | PostgreSQL unique constraints (`event_id`, `(provider, external_event_id)`) | Unit & integration tests |
| **Integrity** | Constant-time HMAC verification (`crypto.timingSafeEqual`) | 8 signature tests passing |
| **Safety** | SSRF blocker rejecting loopback, link-local, private RFC 1918, and metadata | 16 SSRF unit tests passing |
| **Observability** | Platform structured logger with correlation IDs, latency measurement, redaction | 133 unit tests passing |
| **Zero-Downtime Migration** | Versioned envelope (`v1:iv:tag:ciphertext`) with legacy 3-part fallback | Crypto rotation test suite |

---

## 6. Component Relationship Directory

- [`src/lib/events/dispatcher.ts`](file:///c:/Users/Ibrahim/Desktop/SYNCORA-frontend-project/src/lib/events/dispatcher.ts) — Event dispatcher, admin client scoping, deduplication.
- [`src/lib/webhooks/delivery.ts`](file:///c:/Users/Ibrahim/Desktop/SYNCORA-frontend-project/src/lib/webhooks/delivery.ts) — SSRF verification, exponential backoff, Retry-After parsing, dead-letter transition.
- [`src/lib/webhooks/inbound-idempotency.ts`](file:///c:/Users/Ibrahim/Desktop/SYNCORA-frontend-project/src/lib/webhooks/inbound-idempotency.ts) — Database idempotency enforcement for external events.
- [`src/lib/integrations/crypto.ts`](file:///c:/Users/Ibrahim/Desktop/SYNCORA-frontend-project/src/lib/integrations/crypto.ts) — AES-256-GCM token encryption, rotation, and legacy compatibility.
- [`src/lib/integrations/github.ts`](file:///c:/Users/Ibrahim/Desktop/SYNCORA-frontend-project/src/lib/integrations/github.ts) — GitHub HMAC-SHA256 signature verification.
- [`src/lib/integrations/slack.ts`](file:///c:/Users/Ibrahim/Desktop/SYNCORA-frontend-project/src/lib/integrations/slack.ts) — Slack `v0` signature verification & 300s replay defense.
- [`src/app/api/webhooks/inbound/[provider]/route.ts`](file:///c:/Users/Ibrahim/Desktop/SYNCORA-frontend-project/src/app/api/webhooks/inbound/[provider]/route.ts) — Inbound webhook ingestion endpoint.
- [`supabase/migrations/00067_release18_webhook_idempotency_inbound.sql`](file:///c:/Users/Ibrahim/Desktop/SYNCORA-frontend-project/supabase/migrations/00067_release18_webhook_idempotency_inbound.sql) — DDL for inbound idempotency and dead-letter status.

