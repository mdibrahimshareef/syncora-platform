import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { updateTask } from '@/lib/api/tasks';
import { dispatchEvent } from '@/lib/events/dispatcher';
import { SyncoraEvent } from '@/lib/integrations/types';
import {
  logger,
  extractCorrelationContext,
  classifyError,
  HEADER_REQUEST_ID,
  HEADER_CORRELATION_ID,
  PlatformError,
} from '@/lib/observability';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { requestId, correlationId } = extractCorrelationContext(request.headers);
  const responseHeaders = {
    [HEADER_REQUEST_ID]: requestId,
    [HEADER_CORRELATION_ID]: correlationId,
  };

  const timer = logger.startTimer('task.update', {
    service: 'tasks-api',
    requestId,
    correlationId,
  });

  try {
    const resolvedParams = await params;
    const taskId = resolvedParams.id;
    const supabase = await createClient();

    // Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      timer.fail(new PlatformError('AUTHENTICATION_ERROR'), {
        errorCategory: 'AUTHENTICATION_ERROR',
        status: 'error',
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: responseHeaders });
    }

    const payload = await request.json();

    // Get before state for checking status changes, etc
    const { data: oldTask, error: oldTaskError } = await supabase
      .from('tasks')
      .select('*, projects(workspace_id)')
      .eq('id', taskId)
      .single();

    if (oldTaskError || !oldTask) {
      timer.fail(new PlatformError('NOT_FOUND', `Task ${taskId} not found`), {
        errorCategory: 'NOT_FOUND',
        status: 'error',
        userId: user.id,
      });
      return NextResponse.json({ error: 'Task not found' }, { status: 404, headers: responseHeaders });
    }

    // Perform authoritative database mutation
    const updatedTask = await updateTask(supabase, taskId, payload);

    type ProjectWorkspaceRef = { workspace_id?: string | null };
    const projectsRef = oldTask.projects as ProjectWorkspaceRef | ProjectWorkspaceRef[] | null;
    const projectWorkspaceId = Array.isArray(projectsRef)
      ? projectsRef[0]?.workspace_id
      : projectsRef?.workspace_id;
    const workspaceId = oldTask.workspace_id || projectWorkspaceId || undefined;

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
      const newAssigneeId = payload.assigneeId !== undefined
        ? (payload.assigneeId === 'none' ? null : payload.assigneeId)
        : (payload.assignee ? (typeof payload.assignee === 'string' ? payload.assignee : payload.assignee.id) : undefined);
      if (newAssigneeId !== undefined && newAssigneeId !== oldTask.assignee_id) {
        const assignEvent: SyncoraEvent = {
          id: crypto.randomUUID(),
          type: 'task.assigned',
          workspaceId,
          timestamp: new Date().toISOString(),
          actorId: user.id,
          payload: {
            task: updatedTask,
            assigneeId: newAssigneeId
          }
        };
        await dispatchEvent(assignEvent);
      }
    }

    timer.done({
      status: 'success',
      workspaceId,
      userId: user.id,
    });

    return NextResponse.json(updatedTask, { headers: responseHeaders });
  } catch (error: unknown) {
    const classified = classifyError(error);
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    timer.fail(error, {
      errorCategory: classified.category,
      status: 'error',
      message: errorMessage,
    });
    return NextResponse.json(
      { error: errorMessage },
      { status: classified.statusCode, headers: responseHeaders }
    );
  }
}
