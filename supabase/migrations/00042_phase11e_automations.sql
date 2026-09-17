-- Phase 11E: Automations & Triggers
-- The `automations` table was created in 00029_release_10b_schema.sql, but we need to strictly
-- enforce the new Phase 11E event types and action types.

-- 1. Add CHECK constraints to automations table for trigger_type and action_type
ALTER TABLE public.automations 
  ADD CONSTRAINT automations_trigger_type_check 
  CHECK (trigger_type IN ('on_status_change', 'on_task_create', 'on_due_date'));

ALTER TABLE public.automations 
  ADD CONSTRAINT automations_action_type_check 
  CHECK (action_type IN ('assign_user', 'notify_user', 'create_subtask', 'trigger_webhook'));

-- 2. Optional: We can insert a seed automation if we have a known workspace, but since
-- this is global schema, we rely on the application to create automations.
