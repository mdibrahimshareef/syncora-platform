import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PlatformLogger, PlatformLogEvent } from '@/lib/observability/logger';

describe('Release 18 Observability: PlatformLogger', () => {
  let consoleInfoSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleDebugSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('emits structured JSON with ISO-8601 timestamp and correct log levels', () => {
    const logger = new PlatformLogger({ service: 'test-service' });

    logger.info({
      operation: 'task.create',
      requestId: 'req-123',
      correlationId: 'corr-456',
      workspaceId: 'ws-789',
      status: 'success'
    });

    expect(consoleInfoSpy).toHaveBeenCalledTimes(1);
    const rawOutput = consoleInfoSpy.mock.calls[0][0];
    const parsed: PlatformLogEvent = JSON.parse(rawOutput);

    expect(parsed.level).toBe('info');
    expect(parsed.service).toBe('test-service');
    expect(parsed.operation).toBe('task.create');
    expect(parsed.requestId).toBe('req-123');
    expect(parsed.correlationId).toBe('corr-456');
    expect(parsed.workspaceId).toBe('ws-789');
    expect(parsed.status).toBe('success');
    expect(new Date(parsed.timestamp).toISOString()).toBe(parsed.timestamp);
  });

  it('emits error level to console.error', () => {
    const logger = new PlatformLogger({ service: 'test-service' });

    logger.error({
      operation: 'task.fail',
      errorCategory: 'DATABASE_ERROR',
      message: 'Failed to insert task record',
      status: 'error'
    });

    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    const parsed: PlatformLogEvent = JSON.parse(consoleErrorSpy.mock.calls[0][0]);

    expect(parsed.level).toBe('error');
    expect(parsed.errorCategory).toBe('DATABASE_ERROR');
    expect(parsed.message).toBe('Failed to insert task record');
    expect(parsed.status).toBe('error');

    logger.warn({ operation: 'task.warn', message: 'Deprecation notice' });
    expect(consoleWarnSpy).toHaveBeenCalledTimes(1);

    logger.debug({ operation: 'task.debug', message: 'Verbose debug info' });
    expect(consoleDebugSpy).toHaveBeenCalledTimes(1);
  });

  it('inherits context via withContext() without mutating parent logger', () => {
    const rootLogger = new PlatformLogger({ service: 'api-gateway' });
    const requestLogger = rootLogger.withContext({
      requestId: 'req-abc',
      correlationId: 'corr-xyz',
      workspaceId: 'ws-111'
    });

    requestLogger.info({ operation: 'check.auth' });

    expect(consoleInfoSpy).toHaveBeenCalledTimes(1);
    const parsed = JSON.parse(consoleInfoSpy.mock.calls[0][0]);
    expect(parsed.service).toBe('api-gateway');
    expect(parsed.requestId).toBe('req-abc');
    expect(parsed.correlationId).toBe('corr-xyz');
    expect(parsed.workspaceId).toBe('ws-111');

    // Root logger remains unchanged
    rootLogger.info({ operation: 'ping' });
    const rootParsed = JSON.parse(consoleInfoSpy.mock.calls[1][0]);
    expect(rootParsed.requestId).toBeUndefined();
    expect(rootParsed.workspaceId).toBeUndefined();
  });

  it('tracks operation duration accurately via startTimer()', async () => {
    const logger = new PlatformLogger({ service: 'timer-test' });
    const timer = logger.startTimer('db.query', { requestId: 'req-timer' });

    // Artificial delay
    await new Promise(resolve => setTimeout(resolve, 20));

    timer.done({ status: 'success', metadata: { rowCount: 42 } });

    expect(consoleInfoSpy).toHaveBeenCalledTimes(1);
    const parsed: PlatformLogEvent = JSON.parse(consoleInfoSpy.mock.calls[0][0]);

    expect(parsed.operation).toBe('db.query');
    expect(parsed.requestId).toBe('req-timer');
    expect(parsed.status).toBe('success');
    expect(typeof parsed.durationMs).toBe('number');
    expect(parsed.durationMs).toBeGreaterThanOrEqual(15);
    expect(parsed.metadata?.rowCount).toBe(42);
  });

  it('emits error log on timer.fail() with errorCategory and message', () => {
    const logger = new PlatformLogger({ service: 'timer-fail-test' });
    const timer = logger.startTimer('payment.process');

    timer.fail(new Error('Card declined'), {
      errorCategory: 'INTEGRATION_ERROR',
      metadata: { code: 'card_declined' }
    });

    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    const parsed: PlatformLogEvent = JSON.parse(consoleErrorSpy.mock.calls[0][0]);

    expect(parsed.operation).toBe('payment.process');
    expect(parsed.level).toBe('error');
    expect(parsed.status).toBe('error');
    expect(parsed.errorCategory).toBe('INTEGRATION_ERROR');
    expect(parsed.message).toBe('Card declined');
    expect(parsed.metadata?.code).toBe('card_declined');
    expect(typeof parsed.durationMs).toBe('number');
  });

  it('automatically redacts sensitive data from message and metadata', () => {
    const logger = new PlatformLogger();

    logger.info({
      operation: 'auth.attempt',
      message: 'Failed login with Bearer top-secret-token-12345',
      metadata: {
        password: 'SuperSecretPassword!',
        apiKey: 'sk-1234567890abcdef12345678',
        safeParam: 'public-value'
      }
    });

    const parsed: PlatformLogEvent = JSON.parse(consoleInfoSpy.mock.calls[0][0]);
    expect(parsed.message).toBe('Failed login with Bearer [REDACTED]');
    expect(parsed.metadata?.password).toBe('[REDACTED]');
    expect(parsed.metadata?.apiKey).toBe('[REDACTED]');
    expect(parsed.metadata?.safeParam).toBe('public-value');
  });
});

