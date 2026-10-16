import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  recordDecisionOutcome,
  evaluateDecisionOutcome,
  getWorkspaceOutcomeHistory
} from '@/lib/ai/outcomes';

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get('workspaceId');
    const recommendationType = searchParams.get('recommendationType') || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 20;

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 });
    }

    const { data: membership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden: not a workspace member' }, { status: 403 });
    }

    const outcomes = await getWorkspaceOutcomeHistory(supabase, workspaceId, {
      recommendationType,
      limit
    });

    return NextResponse.json({ success: true, count: outcomes.length, outcomes });
  } catch (error: any) {
    console.error('[API /api/ai/outcomes GET Error]', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      action = 'record',
      outcomeId,
      workspaceId,
      recommendationId,
      recommendationType,
      decisionContext,
      userAction,
      rejectionReason,
      modificationDetails,
      workflowId,
      actionResult,
      observedOutcome,
      outcomeNotes,
      feedbackScore
    } = body;

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 });
    }

    const { data: membership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden: not a workspace member' }, { status: 403 });
    }

    if (action === 'evaluate') {
      if (!outcomeId) {
        return NextResponse.json({ error: 'outcomeId is required for evaluate action' }, { status: 400 });
      }

      const updated = await evaluateDecisionOutcome(supabase, {
        outcomeId,
        workspaceId,
        actionResult,
        observedOutcome,
        outcomeNotes,
        feedbackScore
      });

      return NextResponse.json({ success: true, outcome: updated });
    }

    if (!recommendationId || !recommendationType || !decisionContext || !userAction) {
      return NextResponse.json(
        { error: 'recommendationId, recommendationType, decisionContext, and userAction are required' },
        { status: 400 }
      );
    }

    const record = await recordDecisionOutcome(supabase, {
      workspaceId,
      userId: user.id,
      recommendationId,
      recommendationType,
      decisionContext,
      userAction,
      rejectionReason,
      modificationDetails,
      workflowId
    });

    return NextResponse.json({ success: true, outcome: record }, { status: 201 });
  } catch (error: any) {
    console.error('[API /api/ai/outcomes POST Error]', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
