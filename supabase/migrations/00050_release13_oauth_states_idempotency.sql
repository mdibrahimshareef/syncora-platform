-- Create OAuth States table for secure, server-side verifiable state
CREATE TABLE oauth_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  return_to text,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL
);

-- RLS for OAuth States (Service role and owners only)
ALTER TABLE oauth_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "oauth_states_owner_insert"
  ON oauth_states FOR INSERT
  WITH CHECK (is_workspace_member(workspace_id, auth.uid()) AND 
             EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = oauth_states.workspace_id AND user_id = auth.uid() AND role IN ('owner', 'admin')));

CREATE POLICY "oauth_states_owner_select"
  ON oauth_states FOR SELECT
  USING (is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "oauth_states_owner_delete"
  ON oauth_states FOR DELETE
  USING (is_workspace_member(workspace_id, auth.uid()));

-- Create Webhook Idempotency table
CREATE TABLE webhook_idempotency (
  event_id uuid PRIMARY KEY,
  created_at timestamptz DEFAULT now()
);

-- RLS for Webhook Idempotency (Service role only since this is server-driven)
ALTER TABLE webhook_idempotency ENABLE ROW LEVEL SECURITY;
-- No policies, default deny all to users. The server should use Service Role to check idempotency.
