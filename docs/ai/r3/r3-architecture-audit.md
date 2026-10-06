# SYNCORA AI — Release 3 Architecture Audit

## Executive Summary
This document provides an architectural audit of the existing Syncora AI Release 1 and 2 implementation, outlining how it will be safely extended to meet the goals of **Release 3: AI Work Intelligence & Autonomous Assistance**. 

The core philosophy of R3 is **extension, not replacement**. We will reuse the existing Vercel AI SDK abstractions, the `ai_conversations` persistence layer, and the robust R2 action execution pipeline.

*Note on AI Provider:* We are currently using the Vercel AI SDK (`streamText`) with the Google Gemini provider (recently switched from OpenAI). This modern abstraction already fulfills the R3 requirement of avoiding the legacy OpenAI Assistants/Thread API, supporting server-side tool calling, streaming, and structured outputs natively.

---

## R3 Implementation Matrix

| Area | Existing Implementation | R3 Requirement | Reuse Strategy | Planned Changes | Risk Level | Verification Approach |
|---|---|---|---|---|---|---|
| **R3.1 Workspace Intelligence Context** | `context.ts` uses lightweight DB queries & `match_embeddings` (RAG). | Bounded, deterministic retrieval of tasks, activity, and workload. | Reuse `getWorkspaceContext()` and semantic search. | Extend context building to accept intents and perform bounded, deterministic queries (e.g., fetching only Project X's data when asked). | Medium (Latency/Payload Size) | Unit tests for bounded retrieval; payload size monitoring. |
| **R3.2 User Work Intelligence** | Tools accept `assigneeId`, but no explicit "My Work" isolation. | Distinguish user-level ("My Work") vs workspace-level questions. | Reuse `userId` from auth in `orchestrator.ts`. | Add tools/logic specifically scoped to the authenticated user's priorities, assigned tasks, and deadlines. | Low | Auth tests ensuring RLS is respected for user-scoped queries. |
| **R3.3 Project Health & Insights** | Raw data fetched via tools (`get_projects`, `get_task`). | Structured project health analysis & deterministic scoring before LLM. | Reuse existing DB schema. | Create deterministic TS functions (e.g., `calculateProjectHealth`) to generate signals (overdue ratio, blockers) *before* passing to the LLM. | Medium (Logic Complexity) | Unit tests for deterministic health/scoring functions. |
| **R3.4 Response Contracts & Grounding** | `streamText` with `X-Initial-Sources` headers. | Internal structured output (intent, sources, insights) & verifiable sources. | Reuse `streamText` and `AISource` types. | Enforce structured output from the LLM or pre-process text to separate insights. Improve source traceability for deterministic facts. | High (LLM format adherence) | Evals for structured outputs & source accuracy. |
| **R3.5 Conversation Memory** | `persistence.ts` saves to `ai_conversations` & `ai_messages`. | Prevent historical memory from overriding current DB truth; summarize long logs. | Reuse existing DB tables and insertion logic. | Implement context window management (summarize/truncate history) and explicitly instruct the model to prioritize real-time `context.ts` data over history. | Medium | Integration tests with long histories and changed DB states. |
| **R3.6 Quick Actions 2.0** | Basic quick actions likely in UI state. | Add new actionable prompts (e.g., "What's due this week?"). | Reuse existing UI prompt mechanisms in `AIAssistant.tsx`. | Add new data-backed prompts to the UI component. | Low | UI interaction/snapshot tests. |
| **R3.7 Action Intelligence** | `ActionProposalCard.tsx` + `/api/ai/action/execute` with stale-state checks. | Smarter action proposals without weakening security. | **100% Reuse** of R2 security pipeline (validation, idempotency, execution). | Tune prompts and tools to generate batch proposals safely. No changes to the underlying security/mutation mechanism. | Critical (Security) | E2E tests for stale-state, denied actions, and batch confirmations. |
| **R3.8 Cost Controls & Limits** | Basic `maxSteps` in orchestrator. | Per-user limits, max output size, timeouts. | Reuse Vercel environment variables. | Implement rate-limiting middleware, enforce `maxTokens`, and add `abortSignal` timeouts to `streamText`. | Medium | Load tests & rate-limit unit tests. |
| **R3.9 Observability** | `telemetry.ts` logs basic `AITelemetry` to stdout. | Capture intent, token usage, error categories. | Reuse `logAITelemetry`. | Update type to include `tokenUsage` (available in `onFinish`) and `intent`. | Low | Log inspection during test runs. |
| **R3.10 Evaluation Suite** | Basic tests in `tests/ai/`. | Deterministic eval scenarios (grounding, hallucination). | Reuse Vitest setup. | Create `tests/ai/evals/` with scenarios asserting LLM outputs against fixed DB states. | Medium (Flakiness) | CI/CD pipeline execution of eval suites. |
| **R3.11 Security / Red-Team** | `workspace-isolation.test.ts`, `prompt-injection.test.ts` exist. | Adversarial testing (jailbreaks, unauthorized access). | Reuse existing test patterns. | Add explicit red-team prompts to test bounds (e.g., "delete everything", "ignore instructions"). | High | Security test suite passing consistently. |

## Database Audit
- **Existing Tables**: `ai_conversations`, `ai_messages`, `ai_action_logs` are present and sufficient for current persistence and auditing.
- **New Tables Needed?**: No new tables are immediately required. `ai_insights` and `ai_usage` can be deferred unless explicit persistence of insights is demanded beyond the conversation log. RLS is already active on existing tables.

## OpenAI / LLM Architecture Note
The R3 instructions emphasize avoiding the legacy OpenAI Assistants API. We have already audited the `provider.ts` and `orchestrator.ts` files: Syncora is using the Vercel AI SDK Core (`streamText`, `convertToModelMessages`). This architecture is fully aligned with the R3 requirement. It supports server-side tools, streaming, and does not expose API keys to the client.

## Next Steps
The architecture audit (R3.0) is complete. No application code has been modified during this phase.

**Awaiting approval to proceed to Phase R3.1 — Workspace Intelligence Context.**
