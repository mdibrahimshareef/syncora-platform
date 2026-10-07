import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get('workspaceId');
    if (!workspaceId) return NextResponse.json({ error: 'Missing workspaceId' }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: policy, error } = await (supabase as any)
      .from('ai_workspace_policies')
      .select('*')
      .eq('workspace_id', workspaceId)
      .single();

    if (error && error.code !== 'PGRST116') {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Return default policy shape if not exists
    const currentPolicy = policy || {
      workspace_id: workspaceId,
      ai_enabled: true,
      max_workflow_steps: 10,
      max_concurrent_workflows: 2,
      max_daily_requests: 1000,
      require_action_approval: true,
      allow_ai_task_creation: true,
      allow_ai_task_assignment: true,
      allow_ai_task_updates: true,
    };

    return NextResponse.json({ data: currentPolicy });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { workspaceId, ...updates } = body;
    if (!workspaceId) return NextResponse.json({ error: 'Missing workspaceId' }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Validate admin access
    const { data: memberCheck } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single();

    if (!memberCheck || !['owner', 'admin'].includes(memberCheck.role)) {
      return NextResponse.json({ error: 'Forbidden: Must be admin to update AI policies' }, { status: 403 });
    }

    const { data: existing } = await (supabase as any).from('ai_workspace_policies').select('workspace_id').eq('workspace_id', workspaceId).single();

    let result;
    if (existing) {
       const { data, error } = await (supabase as any)
        .from('ai_workspace_policies')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('workspace_id', workspaceId)
        .select()
        .single();
       if (error) throw error;
       result = data;
    } else {
       const { data, error } = await (supabase as any)
        .from('ai_workspace_policies')
        .insert({ workspace_id: workspaceId, ...updates })
        .select()
        .single();
       if (error) throw error;
       result = data;
    }

    return NextResponse.json({ data: result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
