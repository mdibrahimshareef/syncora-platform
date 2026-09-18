-- Migration: 00049_release13_integrations_webhooks.sql
-- Description: Creates the foundation for External Integrations and Webhooks

-- 1. Integrations Table (Workspace Scoped)
CREATE TABLE IF NOT EXISTS public.integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'disconnected',
    auth_type TEXT NOT NULL DEFAULT 'oauth2',
    external_account_id TEXT,
    external_account_name TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_connected_at TIMESTAMPTZ,
    last_error_at TIMESTAMPTZ,
    last_error TEXT,
    disconnected_at TIMESTAMPTZ
);

-- Index for fast lookup by workspace
CREATE INDEX idx_integrations_workspace_id ON public.integrations(workspace_id);
-- Index for provider uniqueness per workspace
CREATE UNIQUE INDEX idx_integrations_workspace_provider ON public.integrations(workspace_id, provider) WHERE status != 'disconnected';

-- 2. Integration Credentials (Isolated secrets)
-- We separate this to ensure standard SELECTs on 'integrations' don't expose tokens.
CREATE TABLE IF NOT EXISTS public.integration_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    integration_id UUID NOT NULL REFERENCES public.integrations(id) ON DELETE CASCADE,
    access_token TEXT,
    refresh_token TEXT,
    scopes TEXT[],
    token_expires_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Webhook Endpoints
CREATE TABLE IF NOT EXISTS public.webhook_endpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    secret TEXT NOT NULL, -- Used for HMAC signing
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'disabled', 'failing'
    subscribed_events TEXT[] DEFAULT '{}'::text[],
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_delivery_at TIMESTAMPTZ,
    last_success_at TIMESTAMPTZ,
    last_failure_at TIMESTAMPTZ
);

CREATE INDEX idx_webhook_endpoints_workspace_id ON public.webhook_endpoints(workspace_id);

-- 4. Webhook Deliveries (Logs)
CREATE TABLE IF NOT EXISTS public.webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint_id UUID NOT NULL REFERENCES public.webhook_endpoints(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    event_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'delivered', 'failed', 'retrying'
    attempt_count INTEGER NOT NULL DEFAULT 0,
    response_status INTEGER,
    response_time INTEGER,
    error TEXT,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    delivered_at TIMESTAMPTZ,
    next_retry_at TIMESTAMPTZ
);

CREATE INDEX idx_webhook_deliveries_endpoint_id ON public.webhook_deliveries(endpoint_id);
CREATE INDEX idx_webhook_deliveries_workspace_id ON public.webhook_deliveries(workspace_id);


-- Row Level Security (RLS)

-- Integrations
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Workspace members can view integrations" ON public.integrations FOR SELECT USING (
  public.is_workspace_member(workspace_id)
);
CREATE POLICY "Workspace owners and admins can manage integrations" ON public.integrations FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.workspace_members 
    WHERE workspace_id = public.integrations.workspace_id 
    AND user_id = auth.uid() 
    AND role IN ('owner', 'admin')
  )
);

-- Integration Credentials
-- STRICT: Only accessible by service role for reading. Owners can insert/update.
ALTER TABLE public.integration_credentials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Workspace owners can manage integration credentials" ON public.integration_credentials FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.integrations i
    JOIN public.workspace_members w ON w.workspace_id = i.workspace_id
    WHERE i.id = public.integration_credentials.integration_id 
    AND w.user_id = auth.uid() 
    AND w.role IN ('owner', 'admin')
  )
);

-- Webhook Endpoints
ALTER TABLE public.webhook_endpoints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Workspace members can view webhooks" ON public.webhook_endpoints FOR SELECT USING (
  public.is_workspace_member(workspace_id)
);
CREATE POLICY "Workspace owners and admins can manage webhooks" ON public.webhook_endpoints FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.workspace_members 
    WHERE workspace_id = public.webhook_endpoints.workspace_id 
    AND user_id = auth.uid() 
    AND role IN ('owner', 'admin')
  )
);

-- Webhook Deliveries
ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Workspace members can view webhook deliveries" ON public.webhook_deliveries FOR SELECT USING (
  public.is_workspace_member(workspace_id)
);
