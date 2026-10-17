# SYNCORA AI — Environment Matrix
## Release 4.8 Operational & Deployment Standards

This document specifies the distinct runtime environments, operational configurations, security boundaries, and monitoring expectations for SYNCORA AI.

---

## 1. Environment Comparison Matrix

| Dimension | Local Development | Local Integration Testing | Staging Environment | Production Environment |
|---|---|---|---|---|
| **Purpose** | Rapid feature prototyping and developer iteration | Automated end-to-end regression, RLS validation, and queue concurrency tests | Pre-production validation, team dogfooding, and load testing | Customer-facing enterprise work management |
| **Database** | Local Supabase Docker (`127.0.0.1:54322/postgres`) | Local Supabase Docker with isolated schema fixtures (`test-env.ts`) | Managed Supabase Staging Project (dedicated compute instance) | Managed Supabase Production Cluster with Transaction Pooling |
| **Authentication** | Gotrue Auth (`127.0.0.1:54321/auth/v1`) | Gotrue Auth with programmatic test user provisioning/teardown | Supabase Auth (staging tenant) | Supabase Auth with SSO (SAML/OAuth) and MFA enforcement |
| **AI Provider** | `AI_PROVIDER=mock` or `AI_PROVIDER=google` | `AI_PROVIDER=mock` (deterministic unit/integration) + `google` (opt-in live eval) | `AI_PROVIDER=google` or `AI_PROVIDER=openai` | `AI_PROVIDER=openai` (primary) / `AI_PROVIDER=google` (fallback) |
| **AI Model** | `mock` or `gemini-3.5-flash` | `mock` / `gemini-3.5-flash` | `gpt-4o-mini` / `gemini-3.5-flash` | `gpt-4o-mini` (chat) / `gpt-4o` (complex reasoning) |
| **Cron / Scheduler** | Manual HTTP triggering (`/api/ai/cron`) | Programmatic test harness invocation | Supabase `pg_cron` (every 15 min) or GitHub Actions workflow | Vercel Cron or Supabase `pg_cron` with strict secret auth |
| **Secrets Management** | `.env.local` (local workstation) | `.env.local` (injected via dotenvx/npm) | Vercel / Supabase Vault Staging Environment Variables | Vercel Encrypted Secrets + Supabase Vault Production |
| **Allowed Testing** | Ad-hoc mutations, synthetic mock data | High-concurrency claiming, destructive fixture teardown | Synthetic staging orgs; no production data | Non-destructive read-only health checks only |
| **Monitoring & Telemetry** | Structured console output (`stdout`) | Vitest test reporters and assertion output | Structured JSON logging + Vercel Log Drains | Datadog / GCP Cloud Logging + Sentry Error Tracking |
| **Deployment Gates** | Local manual runs | `npm test`, `npx tsc --noEmit`, Playwright E2E | Automated CI/CD pipeline deployment to preview/staging | Manual approval gate + staging green sign-off |

---

## 2. Configuration & Secret Boundaries

### Mandatory Environment Variables

```bash
# Core Supabase Infrastructure
NEXT_PUBLIC_SUPABASE_URL="https://<project-ref>.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="<public-anon-jwt>"
SUPABASE_SERVICE_ROLE_KEY="<confidential-service-role-jwt>"

# AI Provider Configuration
AI_PROVIDER="google" # 'google' | 'openai' | 'mock'
AI_MODEL="gemini-3.5-flash"
GOOGLE_GENERATIVE_AI_API_KEY="AIza..."
OPENAI_API_KEY="sk-..." # When AI_PROVIDER=openai

# Operational Controls & Scheduler
CRON_SECRET="<crypto-random-64-character-hex-string>"
AI_TIMEOUT_MS="45000"
AI_MAX_OUTPUT_TOKENS="2000"
AI_MAX_STEPS="5"
```

### Critical Security Rules
1. **Zero Secret Logging:** Under no circumstance should `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, or AI provider keys be logged to console, disk, or client bundles. All logging must route through `redactSensitiveData()`.
2. **Fail-Closed Production Scheduler:** If `CRON_SECRET` is missing in `production`, `/api/ai/cron` returns HTTP 500 immediately. Timing-safe comparison via `crypto.timingSafeEqual()` is mandatory.
3. **No Cross-Tenant Egress:** Local integration tests provision isolated organizations and workspaces (`test-user-a-...@syncora.test`) and tear them down completely.
