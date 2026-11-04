# SYNCORA PLATFORM RELEASE 18 — PHASE 4: PRODUCTION SMOKE TEST RUNBOOK
**Document Version:** 1.0  
**Status:** COMPLETE & READY FOR POST-DEPLOYMENT VERIFICATION  
**Auditor:** Principal Quality & Release Verification Engineer  
**Date:** November 2026  

---

## 1. Executive Summary

This document specifies the synthetic, non-destructive post-deployment smoke test suite for SYNCORA Platform Major Release 18.

Following any staging or production deployment, an operations engineer or automated deployment pipeline must execute this 14-journey test suite to verify core system functionality before routing user traffic to the release.

---

## 2. Test Execution Principles & Safeguards

- **Synthetic Tenant Isolation:** All write tests must operate exclusively inside a designated synthetic canary workspace (`workspace_slug: 'synthetic-canary'`). Never perform automated test mutations against customer production data.
- **Idempotency & Clean-up:** Any resources created during synthetic smoke tests (e.g., test tasks or test webhooks) must be automatically tagged with `synthetic_test: true` and cleaned up at the conclusion of the test run.
- **Non-Destructive:** No destructive operations (e.g. workspace deletion, member removal) may be executed in production.

---

## 3. The 14 Critical Production Smoke Test Journeys

| Journey # | Target Feature / Flow | Test Procedure | Expected Result | Pass/Fail Criteria |
| :---: | :--- | :--- | :--- | :--- |
| **01** | **Process Liveness** | `curl -f -s https://$HOST/api/health/live` | HTTP 200, JSON `{ status: 'ok', uptime: >0 }` | Response time < 50ms, status 200 |
| **02** | **Database Readiness** | `curl -f -s https://$HOST/api/health/ready` | HTTP 200, JSON `{ status: 'ready', checks: { database: 'connected' } }` | Response time < 500ms, status 200 |
| **03** | **Static Asset Delivery** | Fetch landing page `/` and verify `_next/static/` CSS and JS chunks load without 404s. | HTTP 200, valid Content-Type `text/html`, bundle hash resolves. | Assets return 200 with cache headers |
| **04** | **Unauthenticated Route Guard** | Request protected route `/app` without session cookies. | HTTP 307 / 302 Redirect to `/login?redirectedFrom=/app`. | User cannot access `/app` anonymously |
| **05** | **Authentication Flow** | Submit valid synthetic credentials to `/api/auth` or Supabase Auth. | HTTP 200, sets secure `sb-access-token` and `sb-refresh-token` cookies. | Session cookies issued with `HttpOnly` and `SameSite` |
| **06** | **Workspace Resolution** | Access `/app/canary-org/canary-team/synthetic-canary`. | HTTP 200, renders workspace header, sidebar navigation, and team selector. | Zero layout crash, page loads < 1.5s |
| **07** | **Task Board Query** | Navigate to `/.../tasks` board view. | HTTP 200, loads tasks JSON payload via RLS-scoped query. | Tasks rendered by status column |
| **08** | **Task Mutation & RLS** | Create a task: `"Synthetic Verification Task - #TIMESTAMP"`. | HTTP 201/200, task persists in DB with `workspace_id = canary_id`. | Foreign workspace cannot select or edit this task |
| **09** | **Documents & Rich Text** | Navigate to `/.../docs` and open a test document. | HTTP 200, Tiptap document editor loads, content fetches cleanly. | Document content rendered without error |
| **10** | **Realtime Presence** | Connect WebSocket client to Supabase Realtime channel `workspace:synthetic-canary`. | WebSocket handshake 101, receives `SUBSCRIBED` status message. | Realtime connection active < 200ms |
| **11** | **Event Dispatching** | Update task status from `todo` to `done`. | Event logged in `event_logs`, automation rule triggers event evaluation. | Event recorded with valid timestamp & workspaceId |
| **12** | **SSRF Outbound Guard** | Configure outbound webhook pointing to `http://169.254.169.254/latest/meta-data/` and trigger delivery. | Webhook engine aborts immediately: `"SSRF Blocked: Destination IP is in a private, loopback, or cloud-metadata range"`. Zero retries. | Security block verified, target never contacted |
| **13** | **Inbound Webhook Verification** | Send valid HMAC-signed webhook to `/api/webhooks/inbound/github`. Repeat exact same payload twice. | 1st request returns HTTP 200. 2nd request returns HTTP 200 `{ status: 'duplicate_ignored' }`. | Idempotent deduplication verified |
| **14** | **Rate Limiter Enforcement** | Send 65 rapid requests from single client IP to `/api/webhooks/inbound/github`. | First 60 requests accepted; request 61-65 return HTTP 429 Too Many Requests with RFC headers. | 429 received, `Retry-After` header present |

---

## 4. Rollback Criteria

If any of the following conditions occur during post-deployment smoke testing, the release must be immediately rolled back:
1. **Journey 01 or 02 Fails:** Liveness or readiness probes return non-200.
2. **Journey 04 or 08 Fails:** Row-Level Security bypass or unauthenticated access to protected workspace routes is detected.
3. **Journey 12 Fails:** Outbound webhook delivers to private/metadata IP without being blocked.
4. **Error Spike:** Application-wide 5xx error rate exceeds 1% during smoke test execution.

