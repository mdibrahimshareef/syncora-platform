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
    const projectId = resolvedParams.id;
    if (!projectId) {
      return NextResponse.json({ error: 'Missing project id' }, { status: 400 });
    }

    const payload = await request.json();

    // Check if budget exists, if so update, if not insert
    const { data: existingBudget } = await supabase
      .from('project_budgets')
      .select('id')
      .eq('project_id', projectId)
      .single();

    let result;
    if (existingBudget) {
      const { data, error } = await supabase
        .from('project_budgets')
        .update({
          budget_type: payload.budgetType,
          budget_minutes: payload.budgetMinutes,
          budget_amount: payload.budgetAmount,
          warning_threshold: payload.warningThreshold,
          critical_threshold: payload.criticalThreshold,
          updated_by: user.id,
          warning_dispatched: false,
          critical_dispatched: false
        })
        .eq('project_id', projectId)
        .select('*')
        .single();
      if (error) throw new Error(error.message);
      result = data;
    } else {
      const { data, error } = await supabase
        .from('project_budgets')
        .insert({
          workspace_id: payload.workspaceId,
          project_id: projectId,
          budget_type: payload.budgetType || 'TIME',
          budget_minutes: payload.budgetMinutes || 0,
          budget_amount: payload.budgetAmount,
          warning_threshold: payload.warningThreshold || 75,
          critical_threshold: payload.criticalThreshold || 90,
          updated_by: user.id
        })
        .select('*')
        .single();
      if (error) throw new Error(error.message);
      result = data;
    }

    // Emit event asynchronously
    const event: SyncoraEvent = {
      id: crypto.randomUUID(),
      type: 'project_budget.updated',
      timestamp: new Date().toISOString(),
      workspaceId: result.workspace_id,
      actorId: user.id,
      payload: {
        projectId,
        budgetId: result.id,
      }
    };
    dispatchEvent(event).catch(console.error);

    return NextResponse.json(result, { status: 200 });

  } catch (error: any) {
    console.error('Error updating project budget:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    
    const resolvedParams = await params;
    const projectId = resolvedParams.id;
    if (!projectId) {
      return NextResponse.json({ error: 'Missing project id' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('project_budgets')
      .select('*')
      .eq('project_id', projectId)
      .single();

    // It's normal for a project to not have a budget yet
    if (error && error.code !== 'PGRST116') {
      throw new Error(error.message);
    }

    return NextResponse.json(data || null, { status: 200 });
  } catch (error: any) {
    console.error('Error getting project budget:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
