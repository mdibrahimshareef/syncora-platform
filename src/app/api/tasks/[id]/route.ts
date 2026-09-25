import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { updateTask } from '@/lib/api/tasks';
import { dispatchEvent } from '@/lib/events/dispatcher';
import { SyncoraEvent } from '@/lib/integrations/types';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const taskId = resolvedParams.id;
    const supabase = await createClient();
    
    // Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await request.json();
    
    // Get before state for checking status changes, etc
    const { data: oldTask } = await supabase
      .from('tasks')
      .select('*, projects(workspace_id)')
      .eq('id', taskId)
      .single();

    if (!oldTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Perform authoritative database mutation
    const updatedTask = await updateTask(supabase, taskId, payload);

    const workspaceId = oldTask.projects?.workspace_id;

    if (workspaceId) {
      // 1. Emit task.updated
      const updateEvent: SyncoraEvent = {
        id: crypto.randomUUID(),
        type: 'task.updated',
        workspaceId,
        timestamp: new Date().toISOString(),
        actorId: user.id,
        payload: {
          task: updatedTask,
          previous: oldTask
        }
      };
      await dispatchEvent(updateEvent);

      // 2. Conditionally emit task.status_changed
      if (payload.status && payload.status !== oldTask.status) {
        const statusEvent: SyncoraEvent = {
          id: crypto.randomUUID(),
          type: 'task.status_changed',
          workspaceId,
          timestamp: new Date().toISOString(),
          actorId: user.id,
          payload: {
            task: updatedTask,
            previousStatus: oldTask.status,
            newStatus: payload.status
          }
        };
        await dispatchEvent(statusEvent);
      }

      // 3. Conditionally emit task.assigned
      if (payload.assigneeId && payload.assigneeId !== oldTask.assignee_id) {
        const assignEvent: SyncoraEvent = {
          id: crypto.randomUUID(),
          type: 'task.assigned',
          workspaceId,
          timestamp: new Date().toISOString(),
          actorId: user.id,
          payload: {
            task: updatedTask,
            assigneeId: payload.assigneeId
          }
        };
        await dispatchEvent(assignEvent);
      }
    }

    return NextResponse.json(updatedTask);
  } catch (error: any) {
    console.error('Error updating task:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
