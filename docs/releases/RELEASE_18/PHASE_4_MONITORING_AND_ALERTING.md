# SYNCORA PLATFORM RELEASE 18 — PHASE 4: MONITORING, OBSERVABILITY & ALERTING RUNBOOK
**Document Version:** 1.0  
**Status:** COMPLETE & VERIFIED  
**Auditor:** Principal Site Reliability & Observability Engineer  
**Date:** November 2026  

---

## 1. Executive Summary

This document specifies the production monitoring architecture, health check probes, structured logging standards, metric tracking, and alert escalation thresholds for SYNCORA Platform Major Release 18.

Observability is built upon three core components:
1. **Health Check Probes (`/api/health/live` & `/api/health/ready`):** Enable automated container lifecycle management and load balancer traffic routing.
2. **Unified Structured Logger (`@/lib/observability/logger`):** Emits standardized JSON with trace correlation, duration profiling, and automatic secret redaction.
3. **Alerting Threshold Matrix:** Defines exact operational service-level objectives (SLOs) and paging thresholds for on-call engineers.

---

## 2. Health Check Probes Specification

### 2.1 Liveness Probe (`GET /api/health/live`)
- **Intent:** Answers: *"Is the Node.js/Next.js application process running and capable of handling HTTP requests?"*
- **Dependencies:** Zero external dependencies (no database calls).
- **Execution Cost:** Sub-millisecond (< 1ms).
- **HTTP Response Codes:**
  - `200 OK`: Application process is active.
- **Payload Schema:**
  ```json
  {
    "status": "ok",
    "service": "syncora-core",
    "uptime": 14205,
    "timestamp": "2026-11-04T18:00:00.000Z"
  }
  ```

### 2.2 Readiness Probe (`GET /api/health/ready`)
- **Intent:** Answers: *"Is the application connected to required backing services (Supabase PostgreSQL) and ready to serve user traffic?"*
- **Dependencies:** Supabase database query (`.from('profiles').select('id').limit(1)`).
- **Timeout Limit:** 5000ms timeout guard (`Promise.race`).
- **HTTP Response Codes:**
  - `200 OK`: Backing database responded successfully within timeout.
  - `503 Service Unavailable`: Database is unreachable, unconfigured, or timed out.
- **Security Guard:** Never discloses connection strings, database credentials, or internal stack traces in HTTP responses.
- **Payload Schema (Ready):**
  ```json
  {
    "status": "ready",
    "service": "syncora-core",
    "checks": {
      "database": "connected"
    },
    "timestamp": "2026-11-04T18:00:00.000Z"
  }
  ```
- **Payload Schema (Unhealthy):**
  ```json
  {
    "status": "unhealthy",
    "service": "syncora-core",
    "checks": {
      "database": "unreachable"
    },
    "timestamp": "2026-11-04T18:00:00.000Z"
  }
  ```

---

## 3. Structured Logging Architecture

### 3.1 Standard JSON Event Schema
All system logs emitted via `logger` conform to the `PlatformLogEvent` specification:
```json
{
  "timestamp": "2026-11-04T18:02:15.120Z",
  "level": "info",
  "service": "syncora-core",
  "operation": "webhook_delivery",
  "requestId": "req_01h7x2...",
  "correlationId": "corr_99a8b7...",
  "traceId": "trace_44c3d2...",
  "workspaceId": "ws_12345...",
  "durationMs": 42.5,
  "status": "success",
  "message": "Webhook delivery succeeded",
  "metadata": {
    "subscriptionId": "sub_789",
    "attempt": 1
  },
  "environment": "production"
}
```

### 3.2 Automated Redaction Guardrails
The logger integrates with `@/lib/observability/redaction`. All log fields (including `message`, `metadata`, and error details) automatically mask sensitive keys:
- Passwords, access tokens, refresh tokens, bearer headers, HMAC secrets, encryption keys, and session cookies are replaced with `[REDACTED]`.

---

## 4. Production Alerting Threshold Matrix

| Severity | Alert Rule | Condition & Duration | Notification Channel | Immediate Action Runbook |
| :--- | :--- | :--- | :--- | :--- |
| **P1 — Critical** | Service Outage | `/api/health/ready` returns 503 for > 2 minutes | PagerDuty (Voice/SMS), Slack `#ops-critical` | Inspect Supabase database status, connection pool limits, and recent DDL changes. |
| **P1 — Critical** | High API Error Rate | 5xx error rate > 3% across all routes over 5 minutes | PagerDuty, Slack `#ops-critical` | Check application logs for unhandled exceptions or Supabase gateway timeouts. |
| **P2 — High** | Webhook Delivery Spike | Outbound delivery failure rate > 15% over 15 minutes | Slack `#ops-alerts`, Email | Inspect dead letter queue (`webhook_deliveries` status='failed'). Verify target host reachability. |
| **P2 — High** | DDoS / Rate Limiting | Rate limiter 429 responses > 100 req/min from single IP | Slack `#ops-security` | Inspect offending IP addresses via Cloudflare / edge firewall; apply IP block if malicious. |
| **P3 — Medium** | Latency Degradation | API p95 latency > 1500ms over 15 minutes | Slack `#ops-performance` | Check PostgreSQL slow query logs; inspect index usage via `pg_stat_statements`. |

---

## 5. Log Aggregation & Query Runbook

### Sample Log Queries (CloudWatch / Datadog / GCP Cloud Logging):
- **Find all unhandled 500 errors:**
  ```text
  service: "syncora-core" AND level: "error" AND status: "error"
  ```
- **Track webhook SSRF blocking events:**
  ```text
  service: "syncora-core" AND message: *"SSRF Blocked"*
  ```
- **Trace a specific user session across operations:**
  ```text
  correlationId: "corr_99a8b7..." OR traceId: "trace_44c3d2..."
  ```

