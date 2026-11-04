# SYNCORA Platform Major Release 18 — Phase 3
# Retry Policies, Exponential Backoff, Jitter & Dead-Letter Recovery

**Document Version:** 1.0.0  
**Status:** Completed & Verified  
**Scope:** Outbound Retry State Machine, Rate Limiting Backpressure, Dead-Letter Processing

---

## 1. Retry Strategy & Failure Classification

Outbound delivery operations in [`src/lib/webhooks/delivery.ts`](file:///c:/Users/Ibrahim/Desktop/SYNCORA-frontend-project/src/lib/webhooks/delivery.ts) strictly distinguish between transient (retryable) errors and permanent (non-retryable) errors.

### 1.1 Error Classification Matrix

| HTTP / Network Outcome | Error Category | Action | Maximum Attempts |
| :--- | :--- | :--- | :--- |
| **HTTP 200–299** | Success | Mark `status: 'delivered'` | 1 |
| **HTTP 429 Too Many Requests** | Transient (Rate Limit) | Parse `Retry-After`, Backoff & Retry | 3 |
| **HTTP 500, 502, 503, 504** | Transient (Remote Server Error) | Exponential Backoff with Jitter | 3 |
| **Network Timeout / Abort** | Transient (Timeout) | Exponential Backoff with Jitter | 3 |
| **SSRF Target Blocked** | Permanent (Security Violation) | Immediate Abort (`status: 'failed'`) | 1 (No retry) |
| **Endpoint Disabled** | Permanent (Config State) | Immediate Abort (`status: 'failed'`) | 1 (No retry) |
| **HTTP 400, 401, 403, 404** | Permanent (Client Error) | Mark `status: 'failed'` | 1 (No retry) |
| **Exhausted Attempts (Attempt 3)** | Permanent (Exhaustion) | Mark `status: 'dead_letter'` | 3 |

---

## 2. Exponential Backoff with Random Jitter

To prevent the **Thundering Herd Problem** (where dozens of concurrent webhooks retry against an recovering external service at the exact same millisecond), SYNCORA implements truncated binary exponential backoff with full jitter:

### 2.1 Mathematical Formulation

$$\text{delay} = \min\left(30000\text{ ms},\; 2^{\text{attempt}} \times 1000\text{ ms}\right) + \text{random}(0, 250\text{ ms})$$

- **Attempt 1 Failure:** $2^1 \times 1000\text{ ms} + \text{jitter} \approx 2000\text{ ms} - 2250\text{ ms}$
- **Attempt 2 Failure:** $2^2 \times 1000\text{ ms} + \text{jitter} \approx 4000\text{ ms} - 4250\text{ ms}$
- **Attempt 3 Failure:** Exhausts `maxAttempts = 3` $\rightarrow$ Transitions to `dead_letter`.

### 2.2 Implementation in Code
```typescript
function calculateBackoffMs(attempt: number, retryAfterMs?: number): number {
  if (retryAfterMs !== undefined && retryAfterMs > 0) {
    return Math.min(60000, Math.max(1000, retryAfterMs));
  }
  const base = Math.min(30000, Math.pow(2, attempt) * 1000);
  const jitter = Math.floor(Math.random() * 250);
  return base + jitter;
}
```

---

## 3. Dynamic `Retry-After` Header Handling

When a recipient returns HTTP 429 (Too Many Requests), the server often includes a `Retry-After` header indicating how long the client should wait before making another request.

SYNCORA parses both standard formats:
1. **Delta-Seconds (Integer):** E.g. `Retry-After: 30`
   - Parsed as `parseInt(header, 10) * 1000`.
   - Clamped between 1,000 ms (minimum) and 60,000 ms (maximum) to prevent unbound serverless thread starvation.
2. **HTTP-Date (RFC 7231):** E.g. `Retry-After: Wed, 04 Nov 2026 13:30:00 GMT`
   - Calculated as `parsedDate - Date.now()`.
   - Clamped to safe upper bounds.

---

## 4. Dead-Letter Queue (DLQ) Mechanics

Prior to Release 18, failed deliveries were simply stamped with `status = 'failed'`, making it difficult for operations engineers to differentiate between permanent rejection (e.g. 404 or SSRF block) and genuine delivery exhaustion.

### 4.1 Schema Update
Migration [`00067_release18_webhook_idempotency_inbound.sql`](file:///c:/Users/Ibrahim/Desktop/SYNCORA-frontend-project/supabase/migrations/00067_release18_webhook_idempotency_inbound.sql) upgraded the check constraint:
```sql
ALTER TABLE public.webhook_deliveries 
  ADD CONSTRAINT webhook_deliveries_status_check 
  CHECK (status IN ('pending', 'delivered', 'failed', 'retrying', 'dead_letter'));
```

### 4.2 Dead-Letter Classification
When `attempt >= maxAttempts` (attempt 3) fails:
1. Status is marked `dead_letter`.
2. `response_status`, `response_time`, and `error` are recorded.
3. Structured event `webhook.delivery.dead_letter` is emitted at `error` level:
   ```json
   {
     "level": "error",
     "operation": "webhook.delivery.dead_letter",
     "metadata": {
       "deliveryId": "del-dlq",
       "endpointId": "ep-1",
       "totalAttempts": 3,
       "responseStatus": 500
     }
   }
   ```

---

## 5. Operator Replay & Recovery Runbook

When a remote service resolves an outage, dead-lettered deliveries can be inspected and safely re-enqueued.

### 5.1 Inspect Dead-Letter Deliveries
```sql
SELECT 
    id,
    workspace_id,
    endpoint_id,
    event_type,
    response_status,
    error,
    attempt_count,
    created_at
FROM public.webhook_deliveries
WHERE status = 'dead_letter'
ORDER BY created_at DESC
LIMIT 50;
```

### 5.2 Re-enqueue for Delivery
```sql
-- Re-enqueue dead-lettered deliveries for a specific endpoint:
UPDATE public.webhook_deliveries
SET 
    status = 'pending',
    attempt_count = 0,
    error = NULL,
    next_retry_at = NOW()
WHERE status = 'dead_letter'
  AND endpoint_id = '<ENDPOINT_UUID>';
```
*(Background workers or cron jobs will pick up `status = 'pending'` deliveries and re-dispatch).*

