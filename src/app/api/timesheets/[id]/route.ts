import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
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
      return NextResponse.json({ error: 'Missing timesheet id' }, { status: 400 });
    }

    const payload = await request.json();

    const { data: currentTimesheet, error: fetchError } = await supabase
      .from('timesheets')
      .select('status, workspace_id')
      .eq('id', id)
      .single();

    if (fetchError || !currentTimesheet) {
      return NextResponse.json({ error: 'Timesheet not found' }, { status: 404 });
    }

    if (currentTimesheet.status === payload.status) {
      // Idempotent return
      return NextResponse.json({ message: 'No change' }, { status: 200 });
    }

    const updateData: any = {};
    if (payload.status) updateData.status = payload.status;
    if (payload.reviewComment) updateData.review_comment = payload.reviewComment;
    if (payload.status === 'SUBMITTED') updateData.submitted_at = new Date().toISOString();
    if (payload.status === 'APPROVED' || payload.status === 'REJECTED') {
      updateData.reviewed_at = new Date().toISOString();
      updateData.reviewed_by = user.id;
    }

    const { data: updatedTimesheet, error } = await supabase
      .from('timesheets')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw new Error(error.message);

    // Emit event asynchronously
    let eventType = null;
    if (payload.status === 'SUBMITTED') eventType = 'timesheet.submitted';
    else if (payload.status === 'APPROVED') eventType = 'timesheet.approved';
    else if (payload.status === 'REJECTED') eventType = 'timesheet.rejected';

    if (eventType) {
      const event: SyncoraEvent = {
        id: crypto.randomUUID(),
        type: eventType as any,
        timestamp: new Date().toISOString(),
        workspaceId: updatedTimesheet.workspace_id,
        actorId: user.id,
        payload: {
          timesheetId: updatedTimesheet.id,
        }
      };
      dispatchEvent(event).catch(console.error);
    }

    return NextResponse.json(updatedTimesheet, { status: 200 });

  } catch (error: any) {
    console.error('Error updating timesheet:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
