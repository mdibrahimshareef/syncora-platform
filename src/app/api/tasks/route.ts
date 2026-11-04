import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createTask } from '@/lib/api/tasks';
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

export async function POST(request: NextRequest) {
  const { requestId, correlationId } = extractCorrelationContext(request.headers);
  const responseHeaders = {
    [HEADER_REQUEST_ID]: requestId,
    [HEADER_CORRELATION_ID]: correlationId,
  };

  const timer = logger.startTimer('task.create', {
    service: 'tasks-api',
    requestId,
    correlationId,
  });

  try {
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
    const { projectId, taskData } = payload;

    if (!projectId || !taskData) {
      timer.fail(new PlatformError('VALIDATION_ERROR'), {
        errorCategory: 'VALIDATION_ERROR',
        status: 'error',
        userId: user.id,
      });
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400, headers: responseHeaders });
    }

    // Perform authoritative database mutation
    const assigneeId = taskData.assigneeId || (typeof taskData.assignee === 'string' ? taskData.assignee : taskData.assignee?.id) || null;
    const createdTask = await createTask(supabase, projectId, {
      ...taskData,
      userId: user.id,
      assigneeId,
    });

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

    timer.done({
      status: 'success',
      workspaceId: project?.workspace_id,
      userId: user.id,
    });

    return NextResponse.json(createdTask, { headers: responseHeaders });
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
