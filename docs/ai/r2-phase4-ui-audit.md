# SYNCORA AI Release 2 - Phase 4 UI Audit

## Current Architecture
- The frontend chat is powered by `@ai-sdk/react`'s `useChat` hook located in `src/components/ai/AIAssistant.tsx`.
- Communication with the backend occurs over `/api/ai/chat` using `POST`.
- The AI streams data asynchronously with `toDataStreamResponse` containing intermediate tool outputs, data objects (like sources), and final text content.

## State of Components

### `AIAssistant.tsx`
- **Render Mechanism:** Renders chat bubbles in a React sheet. Differentiates between User and AI. 
- **Tool Handling:** Uses `msg.parts` to parse `tool-` and `dynamic-tool` types. 
- **Tool UI:** 
  - *Completed tools* are displayed simply as: `✓ Action [toolName] completed.`
  - *Pending tools* trigger `ActionProposalCard`.
- **Sources Handling:** Sources are appended as raw JSON objects to the `StreamData` backend and retrieved via `data` in `useChat`. 
  - Filtering logic relies heavily on client-side mapping (extracting `data.filter(d => d.type === 'sources')`).
  - Duplication exists across multiple tool calls which the client currently patches by explicitly checking `id` uniqueness.
  - It only renders sources at the very end of the *last* assistant message.
- **Empty State:** A basic block with fixed 5 prompts. 
- **Conversations:** There is no UI in `AIAssistant.tsx` to handle past conversations (no history sidebar, no 'new chat' button), but the backend has tables (`ai_conversations`, `ai_messages`).
- **Issues to fix:** Needs better observability. Instead of `Action [toolName] completed.`, we need to show friendly labels (e.g., `🔎 Searching tasks`). Needs robust error states (provider unavailable, timeout, failure).

### `ActionProposalCard.tsx`
- Renders an explicit object-to-grid mapping of raw tool arguments.
- It provides a `Cancel` and `Confirm` button.
- Lacks contextual information on *why* this action is being proposed or explicit targets (e.g., Target project names instead of raw UUIDs).
- Execution flows back into `AIAssistant.tsx`, which hits `/api/ai/action/execute`. Returns status like `already_executed`, `conflict`, `executed`. Currently uses simple toaster notifications to denote these statuses, and updates the `toolResult` string. We need to formalize these into persistent chat-stream UI blocks instead of just toasters.

### Persistence & Storage
- `useChat` natively handles the ephemeral conversation within a single session.
- To implement Phase 4 persistence, the UI must sync the `messages` array from `useChat` with the server database (`ai_conversations` and `ai_messages`), or fetch `initialMessages` from an endpoint on load.

## Planned Changes for Phase 4
- Refactor `AIAssistant.tsx` to cleanly extract UI subcomponents (SourceList, ToolActivity, ActionProposal, ChatMessage).
- Introduce a human-readable mapping for tool names in tool activity.
- Properly render AI operational answers (lists, tables, error states, and execution states).
- Map `already_executed`, `conflict`, and `failed` execution responses to their own dedicated visual cards inside the chat stream.
- Enhance the empty state.
- Keep context bounded: do not send the entire conversation history infinitely to the backend. Slice it logically.
