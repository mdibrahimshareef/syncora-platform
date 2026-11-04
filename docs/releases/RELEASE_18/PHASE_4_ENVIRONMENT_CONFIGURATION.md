# SYNCORA PLATFORM RELEASE 18 — PHASE 4: ENVIRONMENT CONFIGURATION & SECRET AUDIT
**Document Version:** 1.0  
**Status:** COMPLETE & VERIFIED  
**Auditor:** Principal DevSecOps & Cloud Configuration Engineer  
**Date:** November 2026  

---

## 1. Executive Summary

This document establishes the environment variable classification, secret management hygiene, runtime schema validation, and credential rotation procedures for SYNCORA Platform Major Release 18.

An automated static audit scanned all source code across `src/` to identify every `process.env` reference, verify that no sensitive secrets are bundled into client-side JavaScript, and ensure that all production environment variables are strictly validated at application startup.

---

## 2. Environment Variable Inventory & Classification

All 26 environment variables utilized in SYNCORA are classified into two strict security tiers:

### 2.1 Tier 1: Client-Accessible Public Variables (NEXT_PUBLIC_*)
> [!CAUTION]
> Variables prefixed with `NEXT_PUBLIC_` are inlined into client-side JavaScript bundles during `next build`. They are visible to anyone inspecting browser network traffic or source maps. They MUST NEVER contain private API keys, service roles, or database passwords.

| Variable Name | Required | Data Type / Format | Description & Security Boundary |
| :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | **Yes** | HTTPS URL | Supabase public API endpoint (e.g., `https://xyz.supabase.co`). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Yes** | JWT String | Anonymous public client key with strict Row-Level Security (RLS) enforcement. |
| `NEXT_PUBLIC_APP_URL` | Optional | HTTPS URL | Canonical base URL for auth redirects, emails, and webhooks (defaults to `http://localhost:3000`). |

### 2.2 Tier 2: Server-Only Secrets & Operational Controls
> [!IMPORTANT]
> Server-only variables are strictly resolved on the server runtime (Node.js / Edge Runtime). Next.js enforces this boundary by omitting non-prefixed variables from client bundles.

| Variable Name | Production Requirement | Format / Constraints | Description & Purpose |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | Defaulted | `'development' \| 'test' \| 'production'` | Node runtime environment mode. |
| `SUPABASE_SERVICE_ROLE_KEY` | **Required** | Secret Key (min 16 chars) | Privileged Supabase key for background jobs, webhook audit logging, and cron operations. |
| `SYNCORA_ENCRYPTION_KEY` | **Required** | 32 Bytes (64 hex or 32 UTF-8 chars) | Primary AES-256-GCM symmetric key used to encrypt OAuth tokens, webhook secrets, and credentials. |
| `SYNCORA_PREVIOUS_ENCRYPTION_KEYS` | Optional | Comma-delimited keys | Previous encryption keys used for zero-downtime decryption during key rotation. |
| `CRON_SECRET` | **Required** | Shared Secret (min 16 chars) | Authorization token required to invoke scheduled cron tasks (`/api/ai/cron`). |
| `GITHUB_CLIENT_ID` | Optional | OAuth Client ID | GitHub App integration client ID. |
| `GITHUB_CLIENT_SECRET` | Optional | OAuth Secret | GitHub App integration client secret. |
| `GITHUB_WEBHOOK_SECRET` | Optional | HMAC Secret | Secret used to verify incoming GitHub webhook signatures. |
| `SLACK_CLIENT_ID` | Optional | OAuth Client ID | Slack App integration client ID. |
| `SLACK_CLIENT_SECRET` | Optional | OAuth Secret | Slack App integration client secret. |
| `SLACK_SIGNING_SECRET` | Optional | HMAC Secret | Secret used to verify incoming Slack webhook signatures. |
| `GOOGLE_CLIENT_ID` | Optional | OAuth Client ID | Google OAuth integration client ID. |
| `GOOGLE_CLIENT_SECRET` | Optional | OAuth Secret | Google OAuth integration client secret. |
| `OPENAI_API_KEY` | Optional | API Key (`sk-...`) | OpenAI API key for AI copilot operations. |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Optional | API Key | Google Gemini API key for AI assistant features. |
| `AI_PROVIDER` | Optional | `'google' \| 'openai'` | Active AI provider selection. |
| `AI_MODEL` | Optional | Model Identifier | Model identifier (e.g., `gemini-2.5-flash`, `gpt-4o`). |
| `AI_EMBEDDING_MODEL` | Optional | Model Identifier | Vector embedding model (e.g., `text-embedding-3-small`). |
| `AI_TIMEOUT_MS` | Optional | Positive Integer | Maximum execution timeout for AI LLM requests (e.g., `15000`). |
| `AI_MAX_STEPS` | Optional | Positive Integer | Agent execution loop maximum step count. |
| `AI_MAX_TOOL_CALLS` | Optional | Positive Integer | Maximum number of tool calls permitted per agent session. |
| `AI_MAX_OUTPUT_TOKENS` | Optional | Positive Integer | Token limit for LLM generation. |
| `AI_AUTONOMY_KILL_SWITCH` | Optional | `'true' \| 'false'` | Global emergency kill-switch to immediately halt all autonomous AI execution. |

---

## 3. Secret Scanning & Git Hygiene Audit

### 3.1 Repository Scan Methodology
An automated scan of the git history and tracked files was conducted to detect hardcoded secrets:
1. Checked for exposed AWS keys (`AKIA...`), Supabase service keys, OpenAI keys (`sk-...`), and private RSA/SSH keys.
2. Verified `.gitignore` covers `.env`, `.env.local`, `.env.production`, and credential archives.
3. Verified `.env.example` contains only descriptive placeholder templates.

### 3.2 Audit Findings
- **Real Secrets in Repository:** ZERO found.
- **`.env.example` Status:** Updated in Phase 4 to include all 26 variables with security descriptions, format guidelines, and generation instructions (`openssl rand -hex 32`).
- **Development Key Fallback:** Verified that in `src/lib/integrations/crypto.ts`, the development key fallback is strictly gated by `process.env.NODE_ENV !== 'production'`. In production, attempting to run without `SYNCORA_ENCRYPTION_KEY` immediately throws a `PlatformError`.

---

## 4. Centralized Runtime Validation (`src/lib/env.ts`)

In Platform Release 18 Phase 4, centralized Zod schema validation was introduced:
- `validatePublicEnv()` validates client-accessible variables without disclosing server state.
- `validateServerEnv()` validates server configuration dynamically based on the active `NODE_ENV`.
- In `production`, missing `SUPABASE_SERVICE_ROLE_KEY`, `SYNCORA_ENCRYPTION_KEY`, or `CRON_SECRET` halts startup with a structured error log.
- Validation errors report missing variable keys without logging secret contents.

---

## 5. Encryption Key Rotation Procedure

To rotate `SYNCORA_ENCRYPTION_KEY` in production without service disruption:
1. Generate a new 32-byte key: `NEW_KEY=$(openssl rand -hex 32)`.
2. Move the currently active key to `SYNCORA_PREVIOUS_ENCRYPTION_KEYS`:
   ```bash
   SYNCORA_PREVIOUS_ENCRYPTION_KEYS="$ACTIVE_KEY,$SYNCORA_PREVIOUS_ENCRYPTION_KEYS"
   ```
3. Set `SYNCORA_ENCRYPTION_KEY="$NEW_KEY"`.
4. Deploy the updated environment variables.
5. `src/lib/integrations/crypto.ts` will decrypt existing credentials using the previous keys in the fallback list and automatically re-encrypt new writes using the active key.
6. Once all active credentials have been updated or lazily re-saved, remove the old key from `SYNCORA_PREVIOUS_ENCRYPTION_KEYS`.

