# User Work Intelligence (R3.2)

## Overview
Syncora AI now deeply integrates the concept of **"My Work"**, enabling the model to distinguish between broad, workspace-level queries ("What is the team doing?") and user-level queries ("What should I work on today?").

## Implementation Details
1. **Implicit Context Bounding:** In `src/lib/ai/context.ts`, queries indicating a personal scope (e.g., "my tasks", "what do I do") trigger bounded retrieval explicitly filtered to tasks where `assignee_id = userId`.
2. **Explicit Tooling:** Added a deterministic `get_my_work` tool in `src/lib/ai/tools.ts`. 
   - This tool strictly enforces the `userId` fetched from server-side authentication headers.
   - It cannot be bypassed to infer private data for other users if not explicitly permitted by workspace RLS policies.
   - It automatically prioritizes non-done, overdue, and upcoming tasks.

## Security & Privacy
- The `get_my_work` tool uses the authenticated `userId`. If the user is unauthenticated, the tool safely fails with an `UNAUTHORIZED` error code.
- User data cannot be explicitly requested by overriding the assignee if using the "My Work" implicit flow, maintaining separation between global team analysis and personal task management.

## Verification
- 29 unit tests pass successfully.
- Tool signature validated.
- R3.2 is fully verified and closed.
