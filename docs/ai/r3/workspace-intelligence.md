# Workspace Intelligence Context (R3.1)

## Overview
Syncora AI now utilizes a bounded, deterministic context retrieval engine for workspace intelligence. Instead of naively loading all projects and members into every prompt (which wastes tokens and introduces noise), the AI selectively fetches data based on the user's intent.

## Implementation Details
1. **Query Analysis:** `getWorkspaceContext` parses the incoming user query for semantic signals (e.g., "team", "who", "overdue", "stuck").
2. **Bounded Retrieval:**
   - **Projects:** Limited to 5 recent projects unless explicitly requested.
   - **Members:** Fetched only if the query implies team/workload questions.
   - **Tasks:** Active, overdue, or blocked tasks are pre-fetched if the query involves blockers, deadlines, or the authenticated user's "My Work" scope.
3. **Semantic Knowledge (RAG):** Retained via `match_embeddings` for unstructured knowledge retrieval.

## Security & Isolation
- All deterministic queries are strictly scoped to `workspaceId`.
- The system prompt explicitly treats all loaded workspace data as untrusted to prevent prompt injection.

## Verification
- Unit tests in `tests/ai/` pass successfully.
- Baseline R1/R2 functionalities remain intact.
- R3.1 is fully verified and closed.
