/**
 * Platform Release 18: Unified Sensitive Data Redaction Engine
 * Recursively redacts passwords, tokens, API keys, cookies, secrets, and database credentials
 * across arbitrary objects, arrays, and serialized strings.
 */

const SENSITIVE_KEY_REGEX = /^(password|token|secret|authorization|cookie|apiKey|api_key|serviceRoleKey|service_role_key|accessToken|access_token|refreshToken|refresh_token|clientSecret|client_secret|encryptionKey|encryption_key|connectionString|connection_string|databaseUrl|database_url|session|sessionId|session_id|privateKey|private_key)$/i;

const BEARER_REGEX = /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi;
const OPENAI_KEY_REGEX = /sk-[A-Za-z0-9\-_]{20,}/gi;
const GOOGLE_KEY_REGEX = /AIza[0-9A-Za-z\-_]{25,}/gi;
const SLACK_TOKEN_REGEX = /xox[baprs]-[A-Za-z0-9-]+/gi;
const GITHUB_TOKEN_REGEX = /gh[pousr][-_][A-Za-z0-9_]{20,}/gi;
const DB_CONN_REGEX = /postgres(ql)?:\/\/[^:]+:[^@]+@/gi;
const JWT_REGEX = /eyJ[A-Za-z0-9\-_]{10,}\.eyJ[A-Za-z0-9\-_]{10,}\.[A-Za-z0-9\-_]{10,}/gi;

/**
 * Deeply sanitizes and redacts sensitive data from payloads before logging.
 * Handles strings, primitive values, arrays, and nested objects with cyclical reference safety.
 */
export function redactSensitiveData<T>(input: T, seen = new WeakSet<object>()): T {
  if (input === null || input === undefined) {
    return input;
  }

  if (typeof input === 'string') {
    let sanitized = input
      .replace(BEARER_REGEX, 'Bearer [REDACTED]')
      .replace(OPENAI_KEY_REGEX, 'sk-[REDACTED]')
      .replace(GOOGLE_KEY_REGEX, 'AIza[REDACTED]')
      .replace(SLACK_TOKEN_REGEX, 'xox-[REDACTED]')
      .replace(GITHUB_TOKEN_REGEX, 'gh[REDACTED]')
      .replace(DB_CONN_REGEX, 'postgres://[REDACTED]:[REDACTED]@')
      .replace(JWT_REGEX, 'eyJ[REDACTED]');
    return sanitized as unknown as T;
  }

  if (typeof input !== 'object') {
    return input;
  }

  // Prevent cyclical object recursion
  if (seen.has(input as object)) {
    return '[Circular]' as unknown as T;
  }
  seen.add(input as object);

  if (Array.isArray(input)) {
    return input.map(item => redactSensitiveData(item, seen)) as unknown as T;
  }

  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(input as Record<string, unknown>)) {
    if (SENSITIVE_KEY_REGEX.test(key)) {
      result[key] = '[REDACTED]';
    } else {
      result[key] = redactSensitiveData(val, seen);
    }
  }

  return result as T;
}