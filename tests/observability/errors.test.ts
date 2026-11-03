import { describe, it, expect } from 'vitest';
import {
  PlatformError,
  classifyError,
} from '@/lib/observability/errors';

describe('Release 18 Observability: Platform Error Taxonomy', () => {
  it('instantiates PlatformError with correct default status and safe messages', () => {
    const error = new PlatformError('AUTHORIZATION_ERROR', 'Internal details: user 42 lacks role owner');

    expect(error.name).toBe('PlatformError');
    expect(error.category).toBe('AUTHORIZATION_ERROR');
    expect(error.statusCode).toBe(403);
    expect(error.userMessage).toBe('You do not have permission to perform this action.');
    expect(error.message).toBe('Internal details: user 42 lacks role owner');
  });

  it('toSafeResponse() produces clean client payload without exposing internal cause or stack', () => {
    const causeError = new Error('FATAL: password authentication failed for user "postgres"');
    const platformError = new PlatformError('DATABASE_ERROR', 'Failed to connect to pool', {
      cause: causeError,
      details: { attempt: 3 }
    });

    const safeResponse = platformError.toSafeResponse();

    expect(safeResponse.category).toBe('DATABASE_ERROR');
    expect(safeResponse.statusCode).toBe(500);
    expect(safeResponse.error).toBe('A database error occurred. Your changes were not saved.');
    expect(safeResponse.details).toEqual({ attempt: 3 });

    // Ensure cause and internal message are not in safe response
    expect((safeResponse as Record<string, unknown>).cause).toBeUndefined();
    expect((safeResponse as Record<string, unknown>).message).toBeUndefined();
  });

  it('classifies Postgres unique constraint violations as CONFLICT_ERROR (409)', () => {
    const pgError = {
      code: '23505',
      message: 'duplicate key value violates unique constraint "tasks_pkey"'
    };

    const classified = classifyError(pgError);
    expect(classified.category).toBe('CONFLICT_ERROR');
    expect(classified.statusCode).toBe(409);
    expect(classified.userMessage).toContain('conflicts with an existing resource');
  });

  it('classifies Postgres RLS violations as AUTHORIZATION_ERROR (403)', () => {
    const pgRlsError = {
      code: '42501',
      message: 'new row violates row-level security policy for table "tasks"'
    };

    const classified = classifyError(pgRlsError);
    expect(classified.category).toBe('AUTHORIZATION_ERROR');
    expect(classified.statusCode).toBe(403);
  });

  it('classifies statement timeouts as DATABASE_TIMEOUT (504)', () => {
    const timeoutError = {
      code: '57014',
      message: 'canceling statement due to statement timeout'
    };

    const classified = classifyError(timeoutError);
    expect(classified.category).toBe('DATABASE_TIMEOUT');
    expect(classified.statusCode).toBe(504);
  });

  it('classifies not found errors as NOT_FOUND (404)', () => {
    const notFoundError = {
      code: 'PGRST116',
      message: 'JSON object requested, multiple (or no) rows returned'
    };

    const classified = classifyError(notFoundError);
    expect(classified.category).toBe('NOT_FOUND');
    expect(classified.statusCode).toBe(404);
  });

  it('classifies rate limit errors as RATE_LIMIT_ERROR (429)', () => {
    const rateLimitError = new Error('Too Many Requests: rate limit exceeded');
    const classified = classifyError(rateLimitError);

    expect(classified.category).toBe('RATE_LIMIT_ERROR');
    expect(classified.statusCode).toBe(429);
  });

  it('classifies unknown errors as INTERNAL_ERROR (500) with safe fallback message', () => {
    const unknownError = 'Something completely weird happened';
    const classified = classifyError(unknownError);

    expect(classified.category).toBe('INTERNAL_ERROR');
    expect(classified.statusCode).toBe(500);
    expect(classified.userMessage).toBe('An unexpected internal error occurred. Please try again later.');
  });
});

