# SYNCORA Platform Major Release 18 — Phase 3
# Outbound Webhook Delivery, SSRF Defense & Delivery Reliability

**Document Version:** 1.0.0  
**Status:** Completed & Verified  
**Scope:** Outbound Event Dispatching, Delivery Records, SSRF Protection, HMAC Signing

---

## 1. Finding 15.1: Webhook Dispatcher RLS Failure Resolution

### 1.1 Root Cause Analysis
In previous releases, when a regular workspace member updated a task, `dispatchEvent()` in `src/lib/events/dispatcher.ts` initialized a Supabase client using `await createClient()`. This client inherited the user's authenticated session cookies.

Migration `00050_release15_core_schema.sql` enabled Row Level Security on the `webhook_idempotency` table but included no policy granting `INSERT` permissions to authenticated users. As a result:
1. The insert failed silently or returned null data.
2. The dispatcher evaluated `if (!idempotencyRecord)` and assumed the event had already been dispatched.
3. Execution exited prematurely without scheduling deliveries or triggering workspace automations.

### 1.2 The Resolution
`src/lib/events/dispatcher.ts` was refactored to perform background queueing operations using `createAdminClient()` from [`src/lib/supabase/server.ts`](file:///c:/Users/Ibrahim/Desktop/SYNCORA-frontend-project/src/lib/supabase/server.ts):

```typescript
// 1. Strict tenant verification:
if (!event.workspaceId || typeof event.workspaceId !== 'string') {
  logger.error({ operation: 'event.dispatch.missing_workspace_id', metadata: { eventId: event.id } });
  return;
}

// 2. Privileged admin client for operational idempotency check:
const adminSupabase = createAdminClient();
const { data: idempotencyRecord, error: idempotencyError } = await adminSupabase
  .from('webhook_idempotency')
  .insert({ event_id: event.id })
  .select('event_id')
  .single();

// 3. Duplicate key detection:
if (idempotencyError?.code === '23505') {
  logger.info({ operation: 'event.dispatch.idempotent_skip', workspaceId: event.workspaceId });
  return;
}

// 4. Endpoints queried strictly inside tenant workspace boundary:
const { data: endpoints } = await adminSupabase
  .from('webhook_endpoints')
  .select('*')
  .eq('workspace_id', event.workspaceId)
  .eq('status', 'active');
```

**Security Preservation:** Privileged elevation is strictly confined to the backend dispatcher. Tenant isolation is maintained because `workspace_id` filtering is strictly enforced at every query boundary.

---

## 2. Server-Side Request Forgery (SSRF) Defense

Outbound webhooks allow workspace administrators to specify arbitrary target URLs. Without validation, an attacker could configure webhooks pointing to internal network infrastructure or cloud metadata endpoints.

### 2.1 The SSRF Blocker: `validateWebhookUrl()`
Implemented in [`src/lib/webhooks/delivery.ts`](file:///c:/Users/Ibrahim/Desktop/SYNCORA-frontend-project/src/lib/webhooks/delivery.ts):

```typescript
export function validateWebhookUrl(urlStr: string): { isValid: boolean; reason?: string }
```

### 2.2 Prohibited Destination Categories

| Category | CIDR / Target Range | Risk Mitigated |
| :--- | :--- | :--- |
| **Loopback** | `127.0.0.0/8`, `localhost`, `[::1]` | Prohibits access to internal local services & debug ports |
| **Cloud Metadata** | `169.254.169.254`, `metadata.google.internal` | Prevents theft of IAM credentials, node tokens, and VM metadata |
| **Private Class A** | `10.0.0.0/8` | Prevents scanning and exploitation of internal VPC workloads |
| **Private Class B** | `172.16.0.0/12` (`172.16.0.0` - `172.31.255.255`) | Prevents internal Docker/Kubernetes container network pivot |
| **Private Class C** | `192.168.0.0/16` | Blocks local intranet appliance probing |
| **Link-Local** | `169.254.0.0/16`, `fe80::/10` | Blocks autoconfigured link-local services |
| **Carrier-Grade NAT** | `100.64.0.0/10` (`100.64.0.0` - `100.127.255.255`) | Blocks shared upstream carrier infrastructure |
| **Documentation IPs** | `192.0.2.0/24`, `198.51.100.0/24`, `203.0.113.0/24` | Blocks non-routable documentation ranges |
| **Internal TLDs** | `*.local`, `*.internal`, `*.corp`, `*.lan` | Prevents split-horizon DNS exploitation |
| **Non-HTTP Protocols** | `file:`, `ftp:`, `gopher:`, `ssh:` | Eliminates local file disclosure and protocol smuggling |

### 2.3 SSRF Validation Test Evidence
Verified via 16 dedicated unit tests in [`tests/webhooks/ssrf.test.ts`](file:///c:/Users/Ibrahim/Desktop/SYNCORA-frontend-project/tests/webhooks/ssrf.test.ts):
```text
✓ tests/webhooks/ssrf.test.ts (16 tests)
  ✓ Valid public destinations (2)
  ✓ Loopback address rejection (3)
  ✓ RFC 1918 Private network rejection (3)
  ✓ Cloud metadata service rejection (3)
  ✓ Internal and non-routable hostnames & protocols (5)
```

---

## 3. Cryptographic Signature & Request Specifications

All outbound webhooks dispatched by SYNCORA carry cryptographic proof of authenticity using HMAC-SHA256:

### 3.1 Request Headers
```http
POST /webhook HTTP/1.1
Host: your-server.example.com
Content-Type: application/json
User-Agent: Syncora-Webhook-Delivery/1.0
X-Syncora-Event: task.created
X-Syncora-Delivery: 9a7b54d3-1c3f-4e02-b289-98319e53b491
X-Syncora-Signature: sha256=a1b2c3d4e5f6... (hex-encoded HMAC-SHA256 digest)
```

### 3.2 Signature Calculation
```typescript
function generateHmacSignature(payload: string, secret: string): string {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload, 'utf8');
  return hmac.digest('hex');
}
```

Recipients verify payloads by computing the HMAC-SHA256 of the raw incoming request body against their configured endpoint secret and comparing using constant-time comparison.

---

## 4. Operational Statistics & Audit Trail

Following each delivery attempt:
1. **Delivery Record Updated:** `public.webhook_deliveries` records `response_status`, `response_time`, `error`, `delivered_at`, and `attempt_count`.
2. **Endpoint Health Updated:** `public.webhook_endpoints` updates `last_delivery_at`, along with `last_success_at` or `last_failure_at`.
3. **Structured Log:** `logger.startTimer('webhook.delivery.attempt')` records execution duration, HTTP status, and error classification.

