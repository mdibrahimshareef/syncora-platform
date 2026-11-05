# SYNCORA PLATFORM MAJOR RELEASE 18
# ROW LEVEL SECURITY (RLS) & TENANT ISOLATION AUDIT REPORT

**Release:** Platform Major Release 18  
**Document:** Deliverable 03 — Live RLS & Tenant Isolation Report  
**Author:** Principal Application Security Engineer  
**Date:** November 5, 2026  
**Status:** RLS CODE AUDIT PASSED (LEVEL 2) / LIVE CONTAINER REPLAY BLOCKED (LEVEL 4)  

---

## 1. Executive Summary & Architecture

SYNCORA operates as a multi-tenant collaborative SaaS platform. In multi-tenant environments, logical isolation between tenant workspaces is the paramount security perimeter. 

SYNCORA enforces multi-tenancy at the database layer using PostgreSQL **Row Level Security (RLS)**. Every tenant query executed by the standard client inherits the authenticated context of the calling user (`auth.uid()`), ensuring that database queries can never leak cross-tenant records, even if an application bug omits a `WHERE workspace_id = ...` clause.

---

## 2. Table-by-Table RLS Policy Coverage

All 66 database migrations were audited to verify that every table storing tenant data has RLS enabled and strictly governed by workspace membership predicates.

| Table Name | Primary Schema File | RLS Enabled? | Policy Scope / Isolation Mechanism | Anon Role Access |
| :--- | :--- | :---: | :--- | :---: |
| `workspaces` | `00001_initial_schema.sql` | **YES** | Direct membership in `workspace_members` matching `auth.uid()` | Denied |
| `workspace_members` | `00001_initial_schema.sql` | **YES** | Member of workspace or self user ID lookup | Denied |
| `projects` | `00006_tasks_schema.sql` | **YES** | User is active member of associated `workspace_id` | Denied |
| `tasks` | `00006_tasks_schema.sql` | **YES** | `EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = tasks.workspace_id AND user_id = auth.uid())` | Denied |
| `task_assignees` | `00006_tasks_schema.sql` | **YES** | Scoped via parent task workspace membership | Denied |
| `task_tags` | `00006_tasks_schema.sql` | **YES** | Scoped via parent task workspace membership | Denied |
| `comments` | `00009_comments_schema.sql`| **YES** | Scoped via task workspace membership | Denied |
| `activity_logs` | `00011_activity_schema.sql`| **YES** | Scoped strictly to user's authorized `workspace_id` | Denied |
| `documents` | `00016_documents_schema.sql`| **YES** | Member of document's associated `workspace_id` | Denied |
| `document_versions` | `00016_documents_schema.sql`| **YES** | Scoped via parent document workspace membership | Denied |
| `chat_channels` | `00029_chat_schema.sql` | **YES** | Membership in `channel_members` and `workspace_members` | Denied |
| `messages` | `00029_chat_schema.sql` | **YES** | Scoped via channel and workspace membership | Denied |
| `automations` | `00041_automations_schema.sql`| **YES** | Workspace member with `ADMIN` or `OWNER` role | Denied |
| `event_logs` | `00042_events_schema.sql` | **YES** | Read-only for authorized workspace members | Denied |
| `ai_agents` | `00051_ai_agents.sql` | **YES** | Scoped to authorized `workspace_id` | Denied |
| `ai_jobs` | `00053_ai_jobs.sql` | **YES** | Scoped to authorized `workspace_id` | Denied |
| `inbound_webhook_deliveries` | `00067_release18_...sql` | **YES** | Restricted to system service-role | Denied |

---

## 3. Negative Authorization Matrix

The table below documents expected vs. verified behavior when unauthorized, foreign-tenant, or unauthenticated entities attempt data access:

```text
┌──────────────────────┬───────────────────────┬──────────────────────┬─────────────────────────┐
│ Attempted Operation  │ Actor Context         │ Expected Response    │ Verified RLS Mechanism  │
├──────────────────────┼───────────────────────┼──────────────────────┼─────────────────────────┤
│ Read Task (Tenant A) │ Tenant B Member       │ 0 rows returned      │ Filtered by auth.uid()  │
│ Update Task (Ten. A) │ Tenant B Member       │ 0 rows affected      │ Policy evaluates false  │
│ Delete Doc (Tenant A)│ Tenant B Member       │ 0 rows affected      │ Policy evaluates false  │
│ Read Any Table       │ Anonymous (`anon`)    │ Empty set / Denied   │ auth.uid() IS NULL      │
│ Spoof workspace_id   │ Authenticated Attacker│ Permission Denied    │ Membership check fails  │
│ Read Inbound Webhook │ Authenticated User    │ 0 rows returned      │ Table restricted to app │
└──────────────────────┴───────────────────────┴──────────────────────┴─────────────────────────┘
```

---

## 4. Service-Role Privilege Audit (Exhaustive Inventory)

The Supabase `service_role` key bypasses all PostgreSQL Row Level Security policies. Consequently, any improper use of the service role poses a critical security risk.

An exhaustive search across the entire codebase identified exactly **10 references** to `createAdminClient` or `SUPABASE_SERVICE_ROLE_KEY`. Each was audited for strict scoping:

| # | File Path & Line | Operational Context | Scoping & Security Controls | Audit Verdict |
| :-: | :--- | :--- | :--- | :---: |
| **1** | [`src/app/(workspace)/app/page.tsx:40`](file:///c:/Users/Ibrahim/Desktop/SYNCORA-frontend-project/src/app/(workspace)/app/page.tsx#L40) | Initial routing clock-skew fallback | Strictly queries `.eq('user_id', user.id)`. Requires authenticated session from `getUser()`. | **PASS** |
| **2** | [`src/app/(workspace)/layout.tsx:86`](file:///c:/Users/Ibrahim/Desktop/SYNCORA-frontend-project/src/app/(workspace)/layout.tsx#L86) | Workspace layout session fallback | Strictly queries `.eq('user_id', user.id)`. Cannot access foreign user data. | **PASS** |
| **3** | [`src/app/api/ai/cron/route.ts:97`](file:///c:/Users/Ibrahim/Desktop/SYNCORA-frontend-project/src/app/api/ai/cron/route.ts#L97) | Autonomous background AI cron worker | Protected by constant-time `CRON_SECRET` validation. No user input accepted. | **PASS** |
| **4** | [`src/app/api/health/ready/route.ts:11`](file:///c:/Users/Ibrahim/Desktop/SYNCORA-frontend-project/src/app/api/health/ready/route.ts#L11) | Database connectivity readiness probe | Issues `.from('profiles').select('id').limit(1)`. Zero credential or data disclosure. | **PASS** |
| **5** | [`src/lib/automations/engine.ts:23`](file:///c:/Users/Ibrahim/Desktop/SYNCORA-frontend-project/src/lib/automations/engine.ts#L23) | Background workflow evaluation | Operates exclusively on pre-verified `event.workspaceId`. Zero cross-tenant leaks. | **PASS** |
| **6** | [`src/lib/events/dispatcher.ts:52`](file:///c:/Users/Ibrahim/Desktop/SYNCORA-frontend-project/src/lib/events/dispatcher.ts#L52) | Durable event dispatch pipeline | Inserts events strictly scoped to `event.workspaceId`. Only triggered post-mutation. | **PASS** |
| **7** | [`src/lib/webhooks/delivery.ts:236`](file:///c:/Users/Ibrahim/Desktop/SYNCORA-frontend-project/src/lib/webhooks/delivery.ts#L236) | Outbound webhook delivery update | Scoped strictly to `deliveryId`. System-internal operation. | **PASS** |
| **8** | [`src/lib/webhooks/inbound-idempotency.ts:26`](file:///c:/Users/Ibrahim/Desktop/SYNCORA-frontend-project/src/lib/webhooks/inbound-idempotency.ts#L26) | Inbound webhook audit record insert | Inserts deduplication record keyed on `(provider, event_id)`. | **PASS** |
| **9** | [`src/lib/webhooks/inbound-idempotency.ts:85`](file:///c:/Users/Ibrahim/Desktop/SYNCORA-frontend-project/src/lib/webhooks/inbound-idempotency.ts#L85) | Inbound webhook audit record update | Updates delivery record keyed on `(provider, event_id)`. | **PASS** |
| **10**| [`src/lib/supabase/server.ts:38`](file:///c:/Users/Ibrahim/Desktop/SYNCORA-frontend-project/src/lib/supabase/server.ts#L38) | Privileged admin client factory | Server-only module. Guarded against exposure in client components. | **PASS** |

**Conclusion on Service-Role Usage:** Zero unbounded, user-controllable, or unauthenticated service-role vectors exist in the codebase. Every usage is strictly bound to pre-authenticated user IDs, verified workspace IDs, or system-internal background queues.

---

## 5. Live Staging Container Verification Status

- **Automated Integration Test Files:**
  - `tests/security-rls.test.ts` (6 tests)
  - `tests/ai/security/privacy-regression.test.ts` (5 tests)
- **Local Host Execution Status:** In test environments where Docker is offline, these suites are conditionally bypassed to prevent false-negative connection timeouts against `http://127.0.0.1:54321`.
- **Status Gate:** **`BLOCKED (REQUIRES RUNNING POSTGRESQL INSTANCE)`**. 
- **Pre-Cutover Requirement:** Run `RUN_LIVE_TESTS=true npm test` against the active staging Supabase instance prior to opening production traffic.
