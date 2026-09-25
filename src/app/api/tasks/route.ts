import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createTask } from '@/lib/api/tasks';
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
    const { projectId, taskData } = payload;
    
    if (!projectId || !taskData) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Perform authoritative database mutation
    const createdTask = await createTask(supabase, projectId, taskData);

    // Fetch the workspaceId from the project to construct the event
    const { data: project } = await supabase
      .from('projects')
      .select('workspace_id')
      .eq('id', projectId)
      .single();

    if (project) {
      // Emit the authoritative event AFTER successful mutation
      const event: SyncoraEvent = {
        id: crypto.randomUUID(),
        type: 'task.created',
        workspaceId: project.workspace_id,
        timestamp: new Date().toISOString(),
        actorId: user.id,
        payload: {
          task: createdTask
        }
      };
      
      // Dispatch runs asynchronously in the background via after() inside dispatchEvent
      await dispatchEvent(event);
    }

    return NextResponse.json(createdTask);
  } catch (error: any) {
    console.error('Error creating task:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
