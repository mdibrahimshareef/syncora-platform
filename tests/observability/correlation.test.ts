import { describe, it, expect } from 'vitest';
import {
  HEADER_REQUEST_ID,
  HEADER_CORRELATION_ID,
  isValidIdentifier,
  resolveRequestId,
  resolveCorrelationId,
  extractCorrelationContext,
} from '@/lib/observability/correlation';

describe('Release 18 Observability: Request & Correlation ID Engine', () => {
  it('validates safe identifiers strictly', () => {
    expect(isValidIdentifier('req-12345-abcde')).toBe(true);
    expect(isValidIdentifier('corr_9876_XYZ')).toBe(true);
    expect(isValidIdentifier('550e8400-e29b-41d4-a716-446655440000')).toBe(true);

    // Invalid identifiers
    expect(isValidIdentifier('')).toBe(false);
    expect(isValidIdentifier('   ')).toBe(false);
    expect(isValidIdentifier('id with spaces')).toBe(false);
    expect(isValidIdentifier('id<script>alert(1)</script>')).toBe(false);
    expect(isValidIdentifier('a'.repeat(65))).toBe(false); // Exceeds 64 chars
    expect(isValidIdentifier(null)).toBe(false);
    expect(isValidIdentifier(undefined)).toBe(false);
  });

  it('accepts valid incoming request ID or generates a valid UUID v4 fallback', () => {
    const validCustomId = 'client-req-999';
    expect(resolveRequestId(validCustomId)).toBe('client-req-999');

    // Missing -> generates UUID
    const generated = resolveRequestId(null);
    expect(generated).toBeDefined();
    expect(generated.length).toBe(36); // UUID v4 format
    expect(isValidIdentifier(generated)).toBe(true);

    // Malformed -> generates fresh UUID
    const rejected = resolveRequestId('invalid id with spaces');
    expect(rejected).not.toBe('invalid id with spaces');
    expect(rejected.length).toBe(36);
  });

  it('propagates correlation ID or falls back to resolved request ID', () => {
    const customCorrelationId = 'batch-job-series-42';
    expect(resolveCorrelationId(customCorrelationId, 'req-1')).toBe('batch-job-series-42');

    // Missing correlation ID -> defaults to request ID
    expect(resolveCorrelationId(null, 'req-primary-123')).toBe('req-primary-123');

    // Malformed correlation ID -> defaults to request ID
    expect(resolveCorrelationId('bad/correlation/id', 'req-primary-123')).toBe('req-primary-123');
  });

  it('extracts correlation context from standard Headers instance', () => {
    const headers = new Headers();
    headers.set(HEADER_REQUEST_ID, 'inbound-req-001');
    headers.set(HEADER_CORRELATION_ID, 'inbound-corr-002');

    const context = extractCorrelationContext(headers);
    expect(context.requestId).toBe('inbound-req-001');
    expect(context.correlationId).toBe('inbound-corr-002');
  });

  it('extracts correlation context from plain record object', () => {
    const recordHeaders = {
      [HEADER_REQUEST_ID]: 'plain-req-1',
      [HEADER_CORRELATION_ID]: 'plain-corr-1',
    };

    const context = extractCorrelationContext(recordHeaders);
    expect(context.requestId).toBe('plain-req-1');
    expect(context.correlationId).toBe('plain-corr-1');
  });

  it('handles missing headers gracefully by generating identifiers', () => {
    const emptyHeaders = new Headers();
    const context = extractCorrelationContext(emptyHeaders);

    expect(isValidIdentifier(context.requestId)).toBe(true);
    expect(isValidIdentifier(context.correlationId)).toBe(true);
    expect(context.correlationId).toBe(context.requestId); // Correlation ID falls back to request ID
  });
});

