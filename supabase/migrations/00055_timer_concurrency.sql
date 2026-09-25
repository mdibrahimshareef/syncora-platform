-- Migration: 00055_timer_concurrency
-- Description: Adds a partial unique index to time_entries to ensure a user can only have one active timer at a time.

CREATE UNIQUE INDEX IF NOT EXISTS unique_active_timer_per_user 
ON time_entries (user_id) 
WHERE ended_at IS NULL;
