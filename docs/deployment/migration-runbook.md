# SYNCORA AI — Migration & Rollback Runbook
## Release 4.8 Database Operations & Upgrades

This runbook documents the safe application, verification, idempotency rules, and forward-recovery procedures for database migrations supporting the SYNCORA AI runtime.

---

## 1. Migration Inventory & Ordering

Migrations must be executed in exact sequential order. Do not skip migrations or apply them out of order.

| Migration File | Primary Purpose | Key Schema Objects Created / Modified |
|---|---|---|
| `00060_ai_governance_policies.sql` | Workspace AI Governance, Quotas & Leases | `ai_workspace_policies`, `ai_usage_metrics`, `increment_ai_usage` RPC, `ai_workflows.lease_expires_at` |
| `00061_ai_durable_runtime.sql` | Durable Queue & Proactive Intelligence | `ai_jobs`, `ai_insights`, `claim_ai_job` RPC (`FOR UPDATE SKIP LOCKED`), Realtime publication |
| `00062_ai_organizational_memory.sql` | Contextual Memory & Decision Outcomes | `ai_memories` (workspace/user scope), `ai_decision_outcomes`, RLS security definer policies |

---

## 2. Idempotency & Safety Requirements

Every migration applied to SYNCORA must satisfy the following safety rules:
1. **Idempotent DDL:** Use `CREATE TABLE IF NOT EXISTS`, `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`.
2. **Idempotent Policy Statements:** Precede every `CREATE POLICY` with `DROP POLICY IF EXISTS "<Policy Name>" ON public.<table>;`.
3. **Security Definer Search Path Protection:** Every `SECURITY DEFINER` function or procedure MUST explicitly declare:
   ```sql
   SET search_path = public, pg_temp;
   ```
   This prevents search-path hijacking attacks by unprivileged users.
4. **Idempotent Triggers:** Precede every `CREATE TRIGGER` with `DROP TRIGGER IF EXISTS <trigger_name> ON public.<table>;`.

---

## 3. Deployment Procedure

### Local & CI Staging Upgrades
```bash
# Verify Docker container status
npx supabase status

# Apply pending migrations
npx supabase migration up --local --include-all

# Verify schema and RLS policies
npx vitest run tests/ai/integration/
```

### Staging / Production Deployment
1. **Pre-Deployment Backup:** Create a full database snapshot via Supabase Dashboard or pg_dump before applying migrations.
2. **Execute Migrations:** Apply migration files via Supabase CLI linked project:
   ```bash
   npx supabase db push
   ```
3. **Smoke Verification:** Run integration test suite targeting staging to confirm `claim_ai_job`, RLS policies, and RPC execution.

---

## 4. Rollback & Forward-Recovery Procedures

### Rule: Prefer Forward-Repair Over Destructive Rollback
In production PostgreSQL environments, dropping tables containing production memory, audit records, or background job histories risks catastrophic data loss. Always prefer forward-repair migrations unless rolling back immediately during a failed maintenance window with zero customer writes.

### Emergency Forward-Recovery (Fixing Broken Policies or Triggers)
If a policy blocks legitimate workspace traffic:
```sql
-- Disable problematic policy temporarily and apply corrected policy
DROP POLICY IF EXISTS "Problematic Policy" ON public.ai_jobs;
CREATE POLICY "Corrected Policy" ON public.ai_jobs
FOR SELECT TO authenticated
USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
```

### Emergency Rollback Script (Pre-Production / Zero-Data Environments Only)
If migrations 00060-00062 must be rolled back on a scratch staging instance:
```sql
-- Revert 00062
DROP TABLE IF EXISTS public.ai_decision_outcomes CASCADE;
DROP TABLE IF EXISTS public.ai_memories CASCADE;

-- Revert 00061
DROP FUNCTION IF EXISTS public.claim_ai_job(TEXT, INTEGER);
DROP TABLE IF EXISTS public.ai_insights CASCADE;
DROP TABLE IF EXISTS public.ai_jobs CASCADE;

-- Revert 00060
DROP FUNCTION IF EXISTS public.increment_ai_usage CASCADE;
DROP TABLE IF EXISTS public.ai_usage_metrics CASCADE;
DROP TABLE IF EXISTS public.ai_workspace_policies CASCADE;
```
