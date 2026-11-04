# SYNCORA Platform Major Release 18 — Phase 3
# Production Operations Runbook: Background Systems, Webhooks & Key Rotation

**Document Version:** 1.0.0  
**Audience:** Site Reliability Engineers (SRE), DevOps, Production Operations, Platform Engineers  
**Scope:** Triage, Dead-Letter Recovery, Key Rotation, Incident Remediation

---

## 1. Quick Diagnostic Reference

| Symptom | Probable Cause | Action |
| :--- | :--- | :--- |
| **Deliveries transitioning to `dead_letter`** | Remote endpoint unreachable, down, or timing out across 3 attempts | Check `error` and `response_status` in `webhook_deliveries`. Follow [Runbook 1](#runbook-1-investigating-dead-letter-deliveries). |
| **Deliveries immediately marked `failed` with `SSRF Blocked`** | Administrator configured webhook pointing to internal IP, loopback, or cloud metadata | Inspect `webhook_endpoints.url`. Advise workspace admin to use public HTTPS endpoint. |
| **Inbound webhooks returning 401 Unauthorized** | Provider signature mismatch or missing signing secret in production environment | Verify `GITHUB_WEBHOOK_SECRET` or `SLACK_SIGNING_SECRET`. Follow [Runbook 2](#runbook-2-inbound-webhook-troubleshooting). |
| **Inbound webhooks rejected with expired timestamp** | Server clock drift exceeding 300 seconds ($5\text{ min}$) | Resynchronize NTP server daemon on application nodes. |
| **Integration OAuth tokens failing decryption** | Primary encryption key rotated without maintaining previous key in rotation list | Add prior key to `SYNCORA_PREVIOUS_ENCRYPTION_KEYS`. Follow [Runbook 3](#runbook-3-zero-downtime-encryption-key-rotation). |

---

## Runbook 1: Investigating Dead-Letter Deliveries

When an external endpoint suffers sustained downtime, delivery attempts are exhausted (`maxAttempts = 3`) and transition to `dead_letter`.

### Step 1: Identify Dead-Letter Deliveries
Run the following SQL query in Supabase / PostgreSQL:
```sql
SELECT 
    d.id AS delivery_id,
    d.workspace_id,
    d.endpoint_id,
    e.name AS endpoint_name,
    e.url AS endpoint_url,
    d.event_type,
    d.response_status,
    d.error,
    d.attempt_count,
    d.created_at
FROM public.webhook_deliveries d
JOIN public.webhook_endpoints e ON d.endpoint_id = e.id
WHERE d.status = 'dead_letter'
ORDER BY d.created_at DESC
LIMIT 50;
```

### Step 2: Diagnose Root Cause
- **HTTP 5xx (500, 502, 503, 504):** The recipient's server crashed or was behind an overloaded gateway.
- **Network error / timeout:** The recipient domain did not respond within 10,000 ms.
- **HTTP 429 Too Many Requests:** The recipient rate-limited the webhook delivery.

### Step 3: Re-enqueuing Recovered Deliveries
Once the external service is restored, re-enqueue deliveries for that endpoint:
```sql
-- Re-enqueue dead-lettered events for a specific endpoint:
UPDATE public.webhook_deliveries
SET 
    status = 'pending',
    attempt_count = 0,
    error = NULL,
    next_retry_at = NOW()
WHERE status = 'dead_letter'
  AND endpoint_id = '<TARGET_ENDPOINT_UUID>';
```

---

## Runbook 2: Inbound Webhook Troubleshooting

### Step 1: Query Inbound Event Audit Log
```sql
SELECT 
    id,
    provider,
    external_event_id,
    event_type,
    status,
    error,
    created_at,
    processed_at
FROM public.inbound_webhook_events
ORDER BY created_at DESC
LIMIT 50;
```

### Step 2: Triage Inbound Failures
1. **Status = `received` (Unprocessed):**
   - Check application server logs for unhandled exceptions during downstream handler execution.
2. **High Volume of Duplicates:**
   - External providers (like GitHub) re-send events if acknowledgement takes $> 10\text{ seconds}$. Ensure processing remains asynchronous so the initial acknowledgment returns in $< 100\text{ ms}$.
3. **401 Signature Rejected in Logs:**
   - Check if `GITHUB_WEBHOOK_SECRET` matches the secret configured in the GitHub repository Webhooks settings.
   - For Slack, ensure the application's **Signing Secret** is set in `SLACK_SIGNING_SECRET`.

---

## Runbook 3: Zero-Downtime Encryption Key Rotation

To rotate OAuth token encryption keys without disrupting live integrations or requiring users to re-authenticate:

### Step 1: Generate New 32-Byte Secret Key
Run in a secure terminal:
```bash
# Generate 64-character hex string (32 bytes):
openssl rand -hex 32
```
Example output: `f4a21e7d9b3c4019a82e1c3b5d7e8f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e`

### Step 2: Update Environment Variables
1. Copy the current active key from `SYNCORA_ENCRYPTION_KEY`.
2. Append it to `SYNCORA_PREVIOUS_ENCRYPTION_KEYS` (comma-separated list of historical keys):
   ```bash
   SYNCORA_PREVIOUS_ENCRYPTION_KEYS="<OLD_KEY_HEX>,<EVEN_OLDER_KEY_HEX>"
   ```
3. Set the newly generated key as the active key:
   ```bash
   SYNCORA_ENCRYPTION_KEY="<NEW_KEY_HEX>"
   ```

### Step 3: Zero-Downtime Deployment
Deploy the updated environment configuration.
- **New Credentials:** Encrypted immediately using `<NEW_KEY_HEX>` with version envelope `v1:...`.
- **Existing Credentials:** Decrypted seamlessly: primary key fails GCM check $\rightarrow$ falls back to `SYNCORA_PREVIOUS_ENCRYPTION_KEYS` $\rightarrow$ succeeds.
- **Re-encryption on Update:** Whenever an integration token is refreshed or updated, it is saved using the active key.

---

## Runbook 4: Monitoring, Metrics & Alert Thresholds

Filter logs using the `PlatformLogger` structured JSON format:

### Alerting Policies

| Alert Name | Query Condition | Threshold | Severity |
| :--- | :--- | :--- | :--- |
| **High Webhook DLQ Rate** | `operation = "webhook.delivery.dead_letter"` | $> 5$ events in 5 minutes | **Warning** |
| **SSRF Probe Detected** | `operation = "webhook.delivery.ssrf_blocked"` | $> 1$ event | **High (Security)** |
| **Signature Rejection Spike** | `operation = "inbound_webhook.signature_rejected"` | $> 10$ events in 5 minutes | **Medium (Security)** |
| **Event Dispatcher Dropping** | `operation = "event.dispatch.background_failure"` | $> 2$ events in 5 minutes | **High (Reliability)** |
| **Encryption Missing in Prod** | `message CONTAINS "SYNCORA_ENCRYPTION_KEY"` | $> 0$ events in prod | **Critical** |

