/**
 * Platform Release 18: Unified Production Structured Logger
 * Emits machine-readable JSON with standardized fields, ISO timestamps,
 * trace correlation, duration measurements, and automatic sensitive data redaction.
 */

import { redactSensitiveData } from './redaction';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface PlatformLogEvent {
  timestamp: string;
  level: LogLevel;
  service: string;
  operation: string;

  requestId?: string;
  correlationId?: string;
  traceId?: string;

  workspaceId?: string;
  userId?: string;
  jobId?: string;
  workflowId?: string;

  durationMs?: number;
  status?: 'success' | 'error' | 'pending' | string;
  errorCategory?: string;

  message?: string;
  metadata?: Record<string, unknown>;
  environment?: string;
}

export type LogEventInput = Omit<PlatformLogEvent, 'timestamp' | 'level' | 'environment' | 'service'> & {
  service?: string;
};

export interface LogContext {
  service?: string;
  requestId?: string;
  correlationId?: string;
  traceId?: string;
  workspaceId?: string;
  userId?: string;
  jobId?: string;
  workflowId?: string;
}

export class PlatformLogger {
  private defaultContext: LogContext;

  constructor(defaultContext: LogContext = {}) {
    this.defaultContext = {
      service: 'syncora-core',
      ...defaultContext,
    };
  }

  /**
   * Creates a child logger with bound correlation and service context.
   */
  public withContext(context: LogContext): PlatformLogger {
    return new PlatformLogger({
      ...this.defaultContext,
      ...context,
    });
  }

  private emit(level: LogLevel, input: LogEventInput): PlatformLogEvent {
    const event: PlatformLogEvent = {
      timestamp: new Date().toISOString(),
      level,
      service: input.service || this.defaultContext.service || 'syncora-core',
      operation: input.operation,
      requestId: input.requestId || this.defaultContext.requestId,
      correlationId: input.correlationId || this.defaultContext.correlationId,
      traceId: input.traceId || this.defaultContext.traceId,
      workspaceId: input.workspaceId || this.defaultContext.workspaceId,
      userId: input.userId || this.defaultContext.userId,
      jobId: input.jobId || this.defaultContext.jobId,
      workflowId: input.workflowId || this.defaultContext.workflowId,
      durationMs: input.durationMs,
      status: input.status,
      errorCategory: input.errorCategory,
      message: input.message ? (redactSensitiveData(input.message) as string) : undefined,
      metadata: input.metadata ? (redactSensitiveData(input.metadata) as Record<string, unknown>) : undefined,
      environment: process.env.NODE_ENV || 'development',
    };

    const serialized = JSON.stringify(event);

    switch (level) {
      case 'error':
        console.error(serialized);
        break;
      case 'warn':
        console.warn(serialized);
        break;
      case 'debug':
        console.debug(serialized);
        break;
      case 'info':
      default:
        console.info(serialized);
        break;
    }

    return event;
  }

  public info(input: LogEventInput): PlatformLogEvent {
    return this.emit('info', input);
  }

  public warn(input: LogEventInput): PlatformLogEvent {
    return this.emit('warn', input);
  }

  public error(input: LogEventInput): PlatformLogEvent {
    return this.emit('error', input);
  }

  public debug(input: LogEventInput): PlatformLogEvent {
    return this.emit('debug', input);
  }

  /**
   * Starts an operation timer that emits a structured log event upon completion.
   */
  public startTimer(operation: string, baseInput: Partial<LogEventInput> = {}) {
    const startTime = performance.now();
    return {
      done: (completionInput: Partial<LogEventInput> = {}) => {
        const durationMs = Math.round((performance.now() - startTime) * 100) / 100;
        const payload = {
          operation,
          durationMs,
          status: 'success' as const,
          ...baseInput,
          ...completionInput,
        };
        return completionInput.status === 'error' ? this.error(payload) : this.info(payload);
      },
      fail: (error: unknown, failureInput: Partial<LogEventInput> = {}) => {
        const durationMs = Math.round((performance.now() - startTime) * 100) / 100;
        const errObj = (error && typeof error === 'object') ? (error as Record<string, unknown>) : {};
        const errMessage = typeof errObj.message === 'string' ? errObj.message : String(error);
        const errCategory = typeof errObj.category === 'string' ? errObj.category : failureInput.errorCategory || 'INTERNAL_ERROR';

        return this.error({
          operation,
          durationMs,
          status: 'error',
          errorCategory: errCategory,
          message: errMessage,
          ...baseInput,
          ...failureInput,
        });
      }
    };
  }
}

export const logger = new PlatformLogger();
