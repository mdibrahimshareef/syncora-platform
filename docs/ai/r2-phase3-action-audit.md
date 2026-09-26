# R2 Phase 3: Secure Action Execution 2.0 Audit

## 1. Current State (Vulnerable)
Currently, action execution is driven entirely by the client. The flow is:
1. AI generates a tool call (e.g., `create_task`).
2. Client `useChat` hook pauses and renders an `ActionProposalCard`.
3. User clicks "Confirm".
4. `AIAssistant.tsx` directly calls a Zustand store action (e.g., `useDataStore.getState().createTask()`).
5. Zustand performs the Supabase mutation from the browser.
6. Client responds to the AI with success/failure.

**Vulnerabilities**:
- The client controls the payload sent to Supabase. A malicious user could intercept the Zustand call and modify the payload before it reaches Supabase.
- Bypasses any potential AI-specific server-side auditing or rate-limiting.

## 2. Target Architecture
The flow must become:
1. AI generates a tool call.
2. Client renders `ActionProposalCard`.
3. User clicks "Confirm".
4. Client sends a POST request to a new endpoint: `/api/ai/action/execute` with `workspaceId`, `toolName`, and `args`.
5. Server:
   - Authenticates the user (`verifyWorkspaceAccess`).
   - Re-validates the `args` payload against strict schemas (using `zod`).
   - Performs idempotency checks (e.g., checking if an identical task was just created).
   - Executes the mutation using the authenticated `createClient` (enforcing RLS).
   - Logs an audit event (AI action executed).
6. Server responds with success/failure and the resulting entity ID.
7. Client resolves the tool call with the server's response.

## 3. Implementation Plan
### Step 1: Define Schemas
Create a shared schema file or reuse `tools.ts` schemas to validate incoming action requests on the server.

### Step 2: Create Action Execution Endpoint
Implement `src/app/api/ai/action/execute/route.ts`.
- It must handle `create_task`, `update_task`, and `assign_task`.
- It must use `createClient` from `@/lib/supabase/server` so RLS is enforced natively.

### Step 3: Update `AIAssistant.tsx`
Replace the Zustand calls in `onToolConfirm` with a `fetch` call to `/api/ai/action/execute`.

### Step 4: Write Tests
Create `tests/ai/phase3.test.ts` to verify the `/api/ai/action/execute` endpoint enforces authentication, validation, and correctly mutates.
