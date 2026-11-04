-- Migration: 00067_release18_webhook_idempotency_inbound.sql
-- Description: Phase 3 - Inbound Webhook Idempotency, Outbound Delivery Dead-Letter Status & RLS Hardening

-- 1. Create Inbound Webhook Events table for durable signature verification and idempotency
CREATE TABLE IF NOT EXISTS public.inbound_webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL,
    external_event_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'processing', 'processed', 'failed', 'duplicate')),
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    CONSTRAINT uq_inbound_provider_event UNIQUE (provider, external_event_id)
);

-- Indexes for fast duplicate check and status polling
CREATE INDEX IF NOT EXISTS idx_inbound_provider_event_id 
    ON public.inbound_webhook_events(provider, external_event_id);
CREATE INDEX IF NOT EXISTS idx_inbound_status_created 
    ON public.inbound_webhook_events(status, created_at);

-- 2. Enable RLS on inbound_webhook_events
ALTER TABLE public.inbound_webhook_events ENABLE ROW LEVEL SECURITY;

-- Deny public/anon access. Accessible by service role (server-driven) and workspace owners/admins for audit
CREATE POLICY "Service role manages inbound webhook events"
    ON public.inbound_webhook_events
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- 3. Webhook Idempotency RLS Hardening
-- Ensure service_role has explicit full access on webhook_idempotency
CREATE POLICY "Service role manages webhook idempotency"
    ON public.webhook_idempotency
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- 4. Webhook Deliveries RLS Hardening
-- Allow service_role to insert and update delivery records
CREATE POLICY "Service role manages webhook deliveries"
    ON public.webhook_deliveries
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- 5. Add dead_letter status support and response headers tracking to webhook_deliveries if missing
ALTER TABLE public.webhook_deliveries 
    DROP CONSTRAINT IF EXISTS webhook_deliveries_status_check;

ALTER TABLE public.webhook_deliveries 
    ADD CONSTRAINT webhook_deliveries_status_check 
    CHECK (status IN ('pending', 'delivered', 'failed', 'retrying', 'dead_letter'));

-- Index on next_retry_at for background retry worker
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_retry 
    ON public.webhook_deliveries(status, next_retry_at) 
    WHERE status IN ('pending', 'retrying');

