import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
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
    
    if (!payload.workspaceId || !payload.periodStart || !payload.periodEnd) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data: newTimesheet, error } = await supabase
      .from('timesheets')
      .insert({
        workspace_id: payload.workspaceId,
        user_id: user.id,
        period_start: payload.periodStart,
        period_end: payload.periodEnd,
        status: payload.status || 'DRAFT',
      })
      .select('*')
      .single();

    if (error) throw new Error(error.message);

    // Emit event asynchronously
    if (newTimesheet.status === 'SUBMITTED') {
      const event: SyncoraEvent = {
        id: crypto.randomUUID(),
        type: 'timesheet.submitted',
        timestamp: new Date().toISOString(),
        workspaceId: payload.workspaceId,
        actorId: user.id,
        payload: {
          timesheetId: newTimesheet.id,
        }
      };
      dispatchEvent(event).catch(console.error);
    }

    return NextResponse.json(newTimesheet, { status: 201 });

  } catch (error: any) {
    console.error('Error creating timesheet:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
