import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { dispatchEvent } from '@/lib/events/dispatcher';
import { SyncoraEvent } from '@/lib/integrations/types';
import { checkBudgetThresholds } from '@/lib/api/time-tracking';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await request.json(); // optional payload to update description/project on stop

    // Locate the active timer
    const { data: activeTimer, error: fetchError } = await supabase
      .from('time_entries')
      .select('*')
      .eq('user_id', user.id)
      .is('ended_at', null)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching active timer for stop:', fetchError);
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }

    if (!activeTimer) {
      return NextResponse.json({ error: 'No active timer found.' }, { status: 404 });
    }

    const endedAt = new Date();
    const startedAt = new Date(activeTimer.started_at!);
    // calculate duration
    let durationMinutes = Math.floor((endedAt.getTime() - startedAt.getTime()) / 60000);
    if (durationMinutes < 1) durationMinutes = 1; // minimum 1 min

    const updateData: any = {
      ended_at: endedAt.toISOString(),
      duration_minutes: durationMinutes,
    };

    if (payload.description !== undefined) updateData.description = payload.description;
    if (payload.projectId !== undefined) updateData.project_id = payload.projectId;
    if (payload.taskId !== undefined) updateData.task_id = payload.taskId;

    // Stop timer (Atomically check it hasn't been stopped yet)
    const { data: updatedEntries, error: updateError } = await supabase
      .from('time_entries')
      .update(updateData)
      .eq('id', activeTimer.id)
      .is('ended_at', null)
      .select('*');

    if (updateError) {
      console.error('Error stopping timer:', updateError);
      return NextResponse.json({ error: 'Failed to stop timer' }, { status: 500 });
    }

    if (!updatedEntries || updatedEntries.length === 0) {
      return NextResponse.json({ error: 'Timer already stopped concurrently.' }, { status: 409 });
    }

    const updatedEntry = updatedEntries[0];

    if (updatedEntry.project_id && updatedEntry.duration_minutes > 0) {
      await checkBudgetThresholds(supabase, updatedEntry.workspace_id, updatedEntry.project_id, user.id);
    }

    // Emit event asynchronously
    const event: SyncoraEvent = {
      id: crypto.randomUUID(),
      type: 'time_entry.created',
      timestamp: new Date().toISOString(),
      workspaceId: updatedEntry.workspace_id,
      actorId: user.id,
      payload: {
        timeEntryId: updatedEntry.id,
        projectId: updatedEntry.project_id,
        taskId: updatedEntry.task_id,
        durationMinutes: updatedEntry.duration_minutes,
      }
    };

    dispatchEvent(event).catch(err => {
      console.error('Failed to dispatch time_entry.created event on stop', err);
    });

    return NextResponse.json({
      id: updatedEntry.id,
      durationMinutes: updatedEntry.duration_minutes
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error in POST /api/time-entries/stop:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
