/**
 * Platform Release 18: Request & Correlation ID Propagation Utilities
 * Standardizes x-request-id and x-correlation-id handling across proxy and API routes.
 */

export const HEADER_REQUEST_ID = 'x-request-id';
export const HEADER_CORRELATION_ID = 'x-correlation-id';

// Valid identifier pattern: 1-64 characters, alphanumeric, hyphens, underscores
const VALID_ID_REGEX = /^[a-zA-Z0-9\-_]{1,64}$/;

export interface CorrelationContext {
  requestId: string;
  correlationId: string;
}

/**
 * Validates whether an incoming header string is a safe correlation or request ID.
 */
export function isValidIdentifier(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= 64 && VALID_ID_REGEX.test(trimmed);
}

/**
 * Resolves a safe request ID: accepts valid client header, or generates a fresh UUID v4.
 */
export function resolveRequestId(incoming?: string | null): string {
  if (incoming && isValidIdentifier(incoming)) {
    return incoming.trim();
  }
  return crypto.randomUUID();
}

/**
 * Resolves a safe correlation ID: accepts valid incoming correlation ID, or falls back to the resolved request ID.
 */
export function resolveCorrelationId(incoming?: string | null, fallbackRequestId?: string): string {
  if (incoming && isValidIdentifier(incoming)) {
    return incoming.trim();
  }
  return fallbackRequestId || crypto.randomUUID();
}

/**
 * Extracts correlation context from standard Headers or Request objects.
 */
export function extractCorrelationContext(
  headers: Headers | Record<string, string | string[] | undefined>
): CorrelationContext {
  let rawReqId: string | undefined;
  let rawCorrId: string | undefined;

  if (headers instanceof Headers) {
    rawReqId = headers.get(HEADER_REQUEST_ID) || undefined;
    rawCorrId = headers.get(HEADER_CORRELATION_ID) || undefined;
  } else {
    const valReq = headers[HEADER_REQUEST_ID];
    rawReqId = Array.isArray(valReq) ? valReq[0] : valReq;
    const valCorr = headers[HEADER_CORRELATION_ID];
    rawCorrId = Array.isArray(valCorr) ? valCorr[0] : valCorr;
  }

  const requestId = resolveRequestId(rawReqId);
  const correlationId = resolveCorrelationId(rawCorrId, requestId);

  return { requestId, correlationId };
}

