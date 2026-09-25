import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { updateTimeEntry } from '@/lib/api/time-tracking';
import { dispatchEvent } from '@/lib/events/dispatcher';
import { SyncoraEvent } from '@/lib/integrations/types';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    
    // Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const { id } = resolvedParams;
    if (!id) {
      return NextResponse.json({ error: 'Missing entry id' }, { status: 400 });
    }

    const payload = await request.json();

    // Perform authoritative database mutation
    const updatedEntry = await updateTimeEntry(supabase, id, payload);

    // Emit event asynchronously
    const event: SyncoraEvent = {
      id: crypto.randomUUID(),
      type: 'time_entry.updated',
      timestamp: new Date().toISOString(),
      workspaceId: updatedEntry.workspaceId,
      actorId: user.id,
      payload: {
        timeEntryId: updatedEntry.id,
        projectId: updatedEntry.projectId,
        taskId: updatedEntry.taskId,
        durationMinutes: updatedEntry.durationMinutes,
      }
    };

    // Use Next.js after() when upgraded, for now just fire and forget
    dispatchEvent(event).catch(err => {
      console.error('Failed to dispatch time_entry.updated event', err);
    });

    return NextResponse.json(updatedEntry, { status: 200 });

  } catch (error: any) {
    console.error('Error updating time entry:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
