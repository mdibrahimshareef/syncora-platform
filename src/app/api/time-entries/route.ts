import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createTimeEntry } from '@/lib/api/time-tracking';
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

  const timer = logger.startTimer('time_entry.create', {
    service: 'time-tracking-api',
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

    if (!payload.workspaceId || payload.durationMinutes === undefined) {
      timer.fail(new PlatformError('VALIDATION_ERROR'), {
        errorCategory: 'VALIDATION_ERROR',
        status: 'error',
        userId: user.id,
      });
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400, headers: responseHeaders });
    }

    if (payload.source === 'MANUAL' && !payload.endedAt) {
      timer.fail(new PlatformError('VALIDATION_ERROR', 'Manual entries must include an end time.'), {
        errorCategory: 'VALIDATION_ERROR',
        status: 'error',
        userId: user.id,
      });
      return NextResponse.json({ error: 'Manual entries must include an end time.' }, { status: 400, headers: responseHeaders });
    }

    // Perform authoritative database mutation
    const createdEntry = await createTimeEntry(supabase, payload, user.id);

    // Emit event asynchronously
    const event: SyncoraEvent = {
      id: crypto.randomUUID(),
      type: 'time_entry.created',
      timestamp: new Date().toISOString(),
      workspaceId: payload.workspaceId,
      actorId: user.id,
      payload: {
        timeEntryId: createdEntry.id,
        projectId: payload.projectId,
        taskId: payload.taskId,
        durationMinutes: payload.durationMinutes,
      }
    };

    dispatchEvent(event).catch((err: unknown) => {
      const errMsg = err instanceof Error ? err.message : String(err);
      logger.error({
        service: 'time-tracking-api',
        operation: 'time_entry.dispatch_event',
        requestId,
        correlationId,
        message: 'Failed to dispatch time_entry.created event',
        metadata: { error: errMsg },
      });
    });

    timer.done({
      status: 'success',
      workspaceId: payload.workspaceId,
      userId: user.id,
    });

    return NextResponse.json(createdEntry, { status: 201, headers: responseHeaders });
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
