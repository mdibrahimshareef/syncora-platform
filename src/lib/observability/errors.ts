/**
 * Platform Release 18: Unified Error Taxonomy
 * Provides standardized, machine-readable error categories, safe user-facing messages,
 * and HTTP status mapping without leaking database internals or sensitive stack traces.
 */

export type PlatformErrorCategory =
  | 'AUTHENTICATION_ERROR'
  | 'AUTHORIZATION_ERROR'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'CONFLICT_ERROR'
  | 'RATE_LIMIT_ERROR'
  | 'DATABASE_ERROR'
  | 'DATABASE_TIMEOUT'
  | 'INTEGRATION_ERROR'
  | 'INTERNAL_ERROR';

const STATUS_CODE_MAP: Record<PlatformErrorCategory, number> = {
  AUTHENTICATION_ERROR: 401,
  AUTHORIZATION_ERROR: 403,
  NOT_FOUND: 404,
  VALIDATION_ERROR: 400,
  CONFLICT_ERROR: 409,
  RATE_LIMIT_ERROR: 429,
  DATABASE_TIMEOUT: 504,
  DATABASE_ERROR: 500,
  INTEGRATION_ERROR: 502,
  INTERNAL_ERROR: 500,
};

const USER_MESSAGE_MAP: Record<PlatformErrorCategory, string> = {
  AUTHENTICATION_ERROR: 'You must be signed in to perform this operation.',
  AUTHORIZATION_ERROR: 'You do not have permission to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
  VALIDATION_ERROR: 'The submitted data was incomplete or invalid.',
  CONFLICT_ERROR: 'This operation conflicts with an existing resource or concurrent update.',
  RATE_LIMIT_ERROR: 'Too many requests. Please slow down and try again shortly.',
  DATABASE_TIMEOUT: 'The database operation timed out. Please try again later.',
  DATABASE_ERROR: 'A database error occurred. Your changes were not saved.',
  INTEGRATION_ERROR: 'An error occurred while communicating with an external service.',
  INTERNAL_ERROR: 'An unexpected internal error occurred. Please try again later.',
};

export class PlatformError extends Error {
  public readonly category: PlatformErrorCategory;
  public readonly statusCode: number;
  public readonly userMessage: string;
  public readonly details?: Record<string, unknown>;

  constructor(
    category: PlatformErrorCategory,
    internalMessage?: string,
    options?: {
      statusCode?: number;
      userMessage?: string;
      details?: Record<string, unknown>;
      cause?: unknown;
    }
  ) {
    super(internalMessage || category);
    this.name = 'PlatformError';
    this.category = category;
    this.statusCode = options?.statusCode || STATUS_CODE_MAP[category] || 500;
    this.userMessage = options?.userMessage || USER_MESSAGE_MAP[category] || 'An unexpected error occurred.';
    this.details = options?.details;
    if (options?.cause !== undefined) {
      this.cause = options.cause;
    }
  }

  /**
   * Generates a safe response payload for API route responses (never exposes internal causes or stacks).
   */
  public toSafeResponse() {
    return {
      error: this.userMessage,
      category: this.category,
      statusCode: this.statusCode,
      ...(this.details ? { details: this.details } : {})
    };
  }
}

/**
 * Classifies an unknown error into a structured PlatformError with appropriate category and status.
 */
export function classifyError(error: unknown, fallbackCategory: PlatformErrorCategory = 'INTERNAL_ERROR'): PlatformError {
  if (error instanceof PlatformError) {
    return error;
  }

  if (!error || typeof error !== 'object') {
    return new PlatformError(fallbackCategory, String(error));
  }

  const errObj = error as Record<string, unknown>;
  const message = typeof errObj.message === 'string' ? errObj.message : '';
  const code = typeof errObj.code === 'string' ? errObj.code : '';

  // PostgreSQL / Supabase Error Codes
  if (code === '23505' || message.includes('unique constraint') || message.includes('duplicate key')) {
    return new PlatformError('CONFLICT_ERROR', message, { cause: error });
  }

  if (code === '42501' || message.includes('row-level security') || message.includes('permission denied')) {
    return new PlatformError('AUTHORIZATION_ERROR', message, { cause: error });
  }

  if (code === '57014' || message.includes('canceling statement due to statement timeout') || message.includes('timeout')) {
    return new PlatformError('DATABASE_TIMEOUT', message, { cause: error });
  }

  if (code.startsWith('23') || code.startsWith('22')) {
    return new PlatformError('VALIDATION_ERROR', message, { cause: error });
  }

  // HTTP / Network / Fetch
  if (message.includes('fetch failed') || message.includes('ECONNREFUSED') || message.includes('ETIMEDOUT')) {
    return new PlatformError('DATABASE_ERROR', message, { cause: error });
  }

  if (message.includes('rate limit') || message.includes('Too Many Requests') || code === '429') {
    return new PlatformError('RATE_LIMIT_ERROR', message, { cause: error });
  }

  if (message.includes('not found') || message.includes('PGRST116') || code === 'PGRST116') {
    return new PlatformError('NOT_FOUND', message, { cause: error });
  }

  return new PlatformError(fallbackCategory, message || 'Unknown error', { cause: error });
}

