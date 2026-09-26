# R2 Phase 2 Source Audit

## 1. Existing Source Metadata Format
Currently, `AISource` is defined in `src/lib/ai/context.ts` as:
```typescript
export type AISource = {
  id: string;
  type: string;
  title: string;
  snippet: string;
  workspaceId: string;
  projectId?: string;
  url?: string;
}
```

## 2. Source URL Generation Locations
- URLs are generated **on the client** in `src/components/ai/AIAssistant.tsx` (lines 205-243).
- The client infers the URL base using `activeWorkspace.orgSlug`, `teamSlug`, and `slug`.
- It uses conditional logic like: `if (source.type === 'project') href = ...`

## 3. Usage of `x-ai-sources` Headers
- The backend `src/app/api/ai/chat/route.ts` injects `x-ai-sources` as a base64 encoded JSON string into the response headers.
- The frontend `AIAssistant.tsx` decodes this header and sets the `sources` state.
- **Problem:** Headers are sent *before* the stream begins, meaning tool-generated sources (which happen *during* the stream) cannot be included in this header.

## 4. Message Persistence
- Unverified, but typically AI SDK useChat messages are kept in memory unless backed by a DB. If persisted, sources need to be saved.

## 5. Tool Results Source IDs
- Currently, `src/lib/ai/tools.ts` read/analysis tools return only the raw data (e.g., `return { success: true, data: ... }`). They do NOT return an `AISource` or URL.

## 6. Canonical Syncora Routes
Based on `src/app/api` and common UI routes:
- **Tasks**: `/projects/[projectId]?task=[taskId]` (inferred from client)
- **Projects**: `/projects/[projectId]` (inferred from client)
- **Time Entries**: `?` (has API endpoints)
- **Documents/Docs**: `/docs/[docId]` (inferred from client)

## 7. Non-Canonical Routes
- Entities like `automation` or aggregated `workload` analysis might not have a direct clickable route representing the specific source item, or it may exist in a settings modal.

## 8. Semantic RAG Metadata
- `src/lib/ai/context.ts` calls `match_embeddings`. It returns `resource_id`, `resource_type`, `title`, and `metadata?.project_id`. This is mostly sufficient but lacks a deterministic `url`.

## 9. Workspace Boundaries
- Semantic retrieval is properly scoped via `p_workspace_id: workspaceId` in `match_embeddings`.
- The `x-ai-sources` only ever contains semantic matches, which are workspace-scoped.

## 10. Frontend URL Trust
- Currently, the frontend *builds* the URL itself rather than trusting the model, but it is doing so dynamically on the client, violating the "server-owned URLs" invariant.

## Next Steps
1. Create `src/lib/ai/sources.ts` to define the unified `AISource` type and URL resolver.
2. Modify tools in `src/lib/ai/tools.ts` to return `sources`.
3. Migrate `orchestrator.ts` to collect `toolResults`, deduplicate them with semantic sources, and stream them via `toDataStreamResponse()` or a custom message annotation, replacing the premature `x-ai-sources` header.
4. Update `AIAssistant.tsx` to read sources from the stream annotations/data rather than the header.
