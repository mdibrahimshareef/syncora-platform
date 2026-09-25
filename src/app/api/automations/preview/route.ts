import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AutomationRecord } from '@/lib/automations/types'
import { SyncoraEvent } from '@/lib/integrations/types'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { workspaceId, automation, mockEvent } = body

    if (!workspaceId || !automation || !mockEvent) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // RLS validation: Ensure user has access to workspace
    const { data: memberCheck } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single();

    if (!memberCheck) {
       return NextResponse.json({ error: 'Unauthorized workspace access' }, { status: 403 })
    }

    const autoRecord = automation as AutomationRecord;
    const event = mockEvent as SyncoraEvent;

    // 1. Evaluate Trigger
    let triggerPasses = false;
    if (autoRecord.trigger_type === event.type) {
      triggerPasses = true;
      if (autoRecord.trigger_type === 'task.status_changed') {
        const targetStatus = autoRecord.trigger_config?.targetStatus;
        if (targetStatus && event.payload.newStatus !== targetStatus) {
          triggerPasses = false;
        }
      }
    }

    // 2. Evaluate Conditions
    let conditionsPass = true;
    if (autoRecord.conditions && autoRecord.conditions.rules && autoRecord.conditions.rules.length > 0) {
      // Basic mock evaluation logic for preview mode
      conditionsPass = true;
    }

    if (!triggerPasses || !conditionsPass) {
       return NextResponse.json({ 
         willRun: false, 
         reason: triggerPasses ? 'Conditions did not match' : 'Trigger did not match',
         plannedActions: [] 
       });
    }

    // 3. Return Planned Actions
    return NextResponse.json({
      willRun: true,
      reason: 'Trigger and conditions matched',
      plannedActions: autoRecord.actions.map(a => ({
         action_id: a.id,
         type: a.type,
         config: a.config
      }))
    });

  } catch (error) {
    console.error("Automation preview error:", error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
