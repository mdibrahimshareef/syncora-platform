import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await request.json();
    
    if (!payload.workspaceId) {
      return NextResponse.json({ error: 'Missing workspaceId' }, { status: 400 });
    }

    // DEBUG: check if user is a member
    const { data: isMemberData, error: isMemberError } = await supabase
      .from('workspace_members')
      .select('*')
      .eq('workspace_id', payload.workspaceId)
      .eq('user_id', user.id);
      
    console.log(`[DEBUG] User ${user.id} member of ${payload.workspaceId}?`, isMemberData?.length ? 'YES' : 'NO', isMemberError);

    // Attempt to create the new active timer. 
    // Migration 00055 enforces a partial unique index, preventing 2 active timers per user.
    const { data: newEntry, error: insertError } = await supabase
      .from('time_entries')
      .insert({
        workspace_id: payload.workspaceId,
        project_id: payload.projectId || null,
        task_id: payload.taskId || null,
        user_id: user.id,
        description: payload.description || '',
        started_at: new Date().toISOString(),
        duration_minutes: 0,
        billable: payload.billable ?? false,
        status: 'DRAFT',
        source: 'TIMER',
      })
      .select('*')
      .single();

    if (insertError) {
      if (insertError.code === '23505') {
        return NextResponse.json({ error: 'An active timer is already running.' }, { status: 409 });
      }
      console.error('Error starting timer:', insertError);
      return NextResponse.json({ error: 'Failed to start timer' }, { status: 500 });
    }

    return NextResponse.json({
      id: newEntry.id,
      workspaceId: newEntry.workspace_id,
      projectId: newEntry.project_id,
      taskId: newEntry.task_id,
      description: newEntry.description,
      startedAt: newEntry.started_at,
      billable: newEntry.billable
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error in POST /api/time-entries/start:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
