import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: activeTimer, error } = await supabase
      .from('time_entries')
      .select('*')
      .eq('user_id', user.id)
      .is('ended_at', null)
      .maybeSingle();

    if (error) {
      console.error('Error fetching active timer:', error);
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }

    if (!activeTimer) {
      return NextResponse.json(null, { status: 200 });
    }

    return NextResponse.json({
      id: activeTimer.id,
      workspaceId: activeTimer.workspace_id,
      projectId: activeTimer.project_id,
      taskId: activeTimer.task_id,
      description: activeTimer.description,
      startedAt: activeTimer.started_at,
      billable: activeTimer.billable
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error in GET /api/time-entries/active:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
