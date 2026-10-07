import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkWorkspaceAdmin } from '@/lib/ai/governance';

/**
 * Phase 9: Runtime Observability
 * Fetch jobs for the admin dashboard.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const workspaceId = url.searchParams.get('workspaceId');

    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace ID is required' }, { status: 400 });
    }

    const supabase = await createClient();

    // 1. Verify workspace admin RBAC
    const isAdmin = await checkWorkspaceAdmin(supabase, workspaceId);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
    }

    // 2. Fetch jobs
    const { data: jobs, error } = await supabase
      .from('ai_jobs')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    return NextResponse.json({ jobs });
  } catch (error: any) {
    console.error('Fetch Jobs API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
