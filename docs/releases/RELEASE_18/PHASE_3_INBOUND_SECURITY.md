# SYNCORA Platform Major Release 18 — Phase 3
# Inbound Webhook Security, Signature Verification & Replay Protection

**Document Version:** 1.0.0  
**Status:** Completed & Verified  
**Scope:** Inbound Webhooks, Provider Signatures, Replay Attack Defense, Database Idempotency

---

## 1. Finding 15.3: Inbound Webhook Vulnerabilities & Resolution

### 1.1 Defect Assessment
Phase 0 audit identified that `/api/webhooks/inbound/[provider]/route.ts`:
1. Did not implement provider signature verification in `github.ts` or `slack.ts`.
2. Did not persist inbound event identifiers, allowing duplicate-delivery or replayed payloads to trigger duplicate side-effects.
3. Leaked unredacted external event payloads to console logs via `console.log(..., payload)`.

### 1.2 Resolution Architecture
In Phase 3, inbound webhook processing was refactored into a hardened multi-stage ingestion pipeline:

```mermaid
flowchart TD
    Req["Incoming HTTP Request"] --> Lookup["1. Provider Resolution (/api/webhooks/inbound/[provider])"]
    Lookup -->|Unknown| NotFound["404 Not Found"]
    Lookup -->|Known| RawBody["2. Read Raw Request Body"]
    RawBody --> SigCheck{"3. Verify Cryptographic Signature"}
    SigCheck -->|Invalid / Forged| SigReject["401 Unauthorized (Invalid Webhook Signature)"]
    SigCheck -->|Valid| Handshake{"4. Slack URL Challenge?"}
    Handshake -->|Yes| ChallengeRes["200 OK { challenge: token }"]
    Handshake -->|No| ExtractID["5. Extract External Event ID"]
    ExtractID --> IdempCheck{"6. Check & Insert Inbound Event (public.inbound_webhook_events)"}
    IdempCheck -->|Duplicate Key (23505)| DuplicateRes["200 OK { success: true, duplicate: true } (Ignore Replay)"]
    IdempCheck -->|First Arrival| Process["7. Process Internal Handlers & Update status: processed"]
    Process --> SuccessRes["200 OK { success: true, eventId: UUID }"]
```

---

## 2. Cryptographic Provider Signature Verification

### 2.1 GitHub Provider Adapter (`github.ts`)
- **Protocol:** HMAC-SHA256.
- **Header:** `x-hub-signature-256` (`sha256=<hex_digest>`).
- **Secret:** `process.env.GITHUB_WEBHOOK_SECRET`.
- **Implementation:**
  ```typescript
  verifyWebhookSignature: async (req: Request, rawBody: string): Promise<boolean> => {
    const secret = process.env.GITHUB_WEBHOOK_SECRET;
    if (!secret) return false;

    const headerSig = req.headers.get('x-hub-signature-256');
    if (!headerSig || !headerSig.startsWith('sha256=')) return false;

    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(rawBody, 'utf8');
    const expectedSig = `sha256=${hmac.digest('hex')}`;

    const headerBuffer = Buffer.from(headerSig, 'utf8');
    const expectedBuffer = Buffer.from(expectedSig, 'utf8');

    if (headerBuffer.length !== expectedBuffer.length) return false;
    return crypto.timingSafeEqual(headerBuffer, expectedBuffer);
  }
  ```
- **Timing Attack Resistance:** Employs `crypto.timingSafeEqual()` over equal-length buffers to prevent timing side-channel attacks.

### 2.2 Slack Provider Adapter (`slack.ts`)
- **Protocol:** Versioned HMAC-SHA256 with timestamp validation.
- **Headers:** `x-slack-signature` (`v0=<hex_digest>`), `x-slack-request-timestamp`.
- **Secret:** `process.env.SLACK_SIGNING_SECRET`.
- **Replay Attack Defense:**
  - Evaluates difference between server clock and header timestamp:
    ```typescript
    const currentTime = Math.floor(Date.now() / 1000);
    if (Math.abs(currentTime - timestampNum) > 300) {
      return false; // Timestamps older than 5 minutes or > 5 min in future rejected
    }
    ```
- **Signature Base String:** `v0:${timestamp}:${rawBody}`.
- **Comparison:** Evaluated via `crypto.timingSafeEqual()`.
- **Challenge Verification:** Automatically responds to Slack handshake challenge when `payload.type === 'url_verification'`.

---

## 3. Durable Database-Level Idempotency

Durable deduplication is guaranteed by the `public.inbound_webhook_events` table introduced in migration [`00067_release18_webhook_idempotency_inbound.sql`](file:///c:/Users/Ibrahim/Desktop/SYNCORA-frontend-project/supabase/migrations/00067_release18_webhook_idempotency_inbound.sql):

```sql
CREATE TABLE public.inbound_webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL,
    external_event_id TEXT NOT NULL,
    event_type TEXT,
    payload JSONB,
    status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'processed', 'failed')),
    error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    CONSTRAINT uq_inbound_provider_event UNIQUE (provider, external_event_id)
);
```

### 3.1 Deduplication Algorithm
Implemented in [`src/lib/webhooks/inbound-idempotency.ts`](file:///c:/Users/Ibrahim/Desktop/SYNCORA-frontend-project/src/lib/webhooks/inbound-idempotency.ts):
1. **Insert Attempt:** When a webhook arrives, `recordInboundWebhookEvent()` inserts `(provider, external_event_id)`.
2. **Conflict Trapping:** If the row exists, PostgreSQL returns error code `23505` (`unique_violation`).
3. **Replay Response:** The endpoint traps code `23505`, logs `inbound_webhook.duplicate_ignored`, and immediately returns HTTP 200 with `{ success: true, duplicate: true }`.
4. **Zero Duplicate Side-Effects:** Downstream dispatchers and database mutation handlers are completely bypassed on duplicate delivery.

---

## 4. Elimination of Sensitive Data Logging

In previous releases, line 36 of the inbound route logged the raw payload:
```typescript
// VULNERABLE CODE (PREVIOUS):
console.log(`[Inbound Webhook] Received from ${providerName}`, payload);
```

In Phase 3, this was replaced with structured observability logging using [`PlatformLogger`](file:///c:/Users/Ibrahim/Desktop/SYNCORA-frontend-project/src/lib/observability/logger.ts):
- Only sanitized metadata is recorded: `{ provider, externalEventId, eventType, eventId, correlationId }`.
- Request bodies are never dumped to standard output.
- All nested payloads pass through `redactSensitiveData()` to scrub access tokens, private keys, client secrets, and passwords.

---

## 5. Test Suite Verification

Verified through 13 dedicated automated tests:
- [`tests/webhooks/signatures.test.ts`](file:///c:/Users/Ibrahim/Desktop/SYNCORA-frontend-project/tests/webhooks/signatures.test.ts): 8 tests passing.
  - Authentic GitHub HMAC-SHA256 accepted.
  - Tampered payload rejected.
  - Forged signature rejected.
  - Authentic Slack signature within 300s window accepted.
  - Expired Slack timestamp (>300s) rejected (replay defense).
  - Tampered Slack payload rejected.
- [`tests/webhooks/inbound_route.test.ts`](file:///c:/Users/Ibrahim/Desktop/SYNCORA-frontend-project/tests/webhooks/inbound_route.test.ts): 5 tests passing.
  - Unknown provider returns 404.
  - Invalid signature returns 401.
  - Valid GitHub delivery records event and returns 200.
  - Duplicate delivery returns 200 with `duplicate: true` without re-processing.
  - Slack URL verification challenge returns challenge token.

