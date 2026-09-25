import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createTimeEntry } from '@/lib/api/time-tracking';
import { dispatchEvent } from '@/lib/events/dispatcher';
import { SyncoraEvent } from '@/lib/integrations/types';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await request.json();
    
    if (!payload.workspaceId || payload.durationMinutes === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (payload.source === 'MANUAL' && !payload.endedAt) {
      return NextResponse.json({ error: 'Manual entries must include an end time.' }, { status: 400 });
    }


    // Perform authoritative database mutation
    const createdEntry = await createTimeEntry(supabase, payload, user.id);

    // Emit event asynchronously
    const event: SyncoraEvent = {
      id: crypto.randomUUID(),
      type: 'time_entry.created',
      timestamp: new Date().toISOString(),
      workspaceId: payload.workspaceId,
      actorId: user.id,
      payload: {
        timeEntryId: createdEntry.id,
        projectId: payload.projectId,
        taskId: payload.taskId,
        durationMinutes: payload.durationMinutes,
      }
    };

    // Use Next.js after() when upgraded, for now just fire and forget
    dispatchEvent(event).catch(err => {
      console.error('Failed to dispatch time_entry.created event', err);
    });

    return NextResponse.json(createdEntry, { status: 201 });

  } catch (error: any) {
    console.error('Error creating time entry:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
