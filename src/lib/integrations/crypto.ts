import crypto from 'crypto';
import { PlatformError } from '@/lib/observability/errors';

const ALGORITHM = 'aes-256-gcm';
const CURRENT_KEY_VERSION = 'v1';

// Dedicated fallback only permitted in non-production test/development environments
const DEV_TEST_KEY_RAW = '0123456789abcdef0123456789abcdef';

/**
 * Resolves and validates a 32-byte (256-bit) encryption key Buffer from an environment string.
 */
function parseKeyBuffer(rawKey: string | undefined): Buffer | null {
  if (!rawKey || typeof rawKey !== 'string') return null;

  const trimmed = rawKey.trim();
  // 1. Check if 64-character hex string (32 bytes)
  if (trimmed.length === 64 && /^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return Buffer.from(trimmed, 'hex');
  }

  // 2. Check if exactly 32-character utf8 string (32 bytes)
  const utf8Buf = Buffer.from(trimmed, 'utf8');
  if (utf8Buf.length === 32) {
    return utf8Buf;
  }

  return null;
}

/**
 * Resolves the primary encryption key buffer with strict production enforcement.
 */
function getActiveEncryptionKey(): { key: Buffer; version: string } {
  const envKey = process.env.SYNCORA_ENCRYPTION_KEY;
  const parsed = parseKeyBuffer(envKey);

  if (parsed) {
    return { key: parsed, version: CURRENT_KEY_VERSION };
  }

  // Strict Production Enforcement: Never permit fallback key in production
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction) {
    throw new PlatformError(
      'INTERNAL_ERROR',
      'SYNCORA_ENCRYPTION_KEY environment variable is missing or invalid. Key must be 32 bytes (256 bits).'
    );
  }

  // Development / Test warning
  if (process.env.NODE_ENV !== 'test') {
    console.warn(
      '[CRYPTO SECURITY WARNING] SYNCORA_ENCRYPTION_KEY not set. Using ephemeral non-production key. Set a secure 32-byte key before deployment.'
    );
  }

  return {
    key: Buffer.from(DEV_TEST_KEY_RAW, 'utf8'),
    version: CURRENT_KEY_VERSION,
  };
}

/**
 * Resolves secondary/previous encryption keys for zero-downtime key rotation.
 */
function getPreviousEncryptionKeys(): Buffer[] {
  const previousKeysRaw = process.env.SYNCORA_PREVIOUS_ENCRYPTION_KEYS;
  if (!previousKeysRaw) return [];

  const candidateStrings = previousKeysRaw.split(',').map((k) => k.trim());
  const validKeys: Buffer[] = [];

  for (const raw of candidateStrings) {
    const parsed = parseKeyBuffer(raw);
    if (parsed) {
      validKeys.push(parsed);
    }
  }

  return validKeys;
}

/**
 * Encrypts sensitive credentials using AES-256-GCM with a versioned envelope.
 * Output format: `v1:<ivHex>:<authTagHex>:<encryptedHex>`
 */
export function encryptToken(text: string): string {
  if (!text) {
    throw new PlatformError('VALIDATION_ERROR', 'Cannot encrypt empty token');
  }

  const { key, version } = getActiveEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag().toString('hex');
  const ivHex = iv.toString('hex');

  // Versioned envelope format: v1:iv:authTag:encryptedData
  return `${version}:${ivHex}:${authTag}:${encrypted}`;
}

/**
 * Decrypts sensitive credentials with support for versioned envelopes,
 * backward-compatible legacy unversioned payloads, and key rotation fallback.
 */
export function decryptToken(encryptedText: string): string {
  if (!encryptedText) {
    throw new PlatformError('VALIDATION_ERROR', 'Cannot decrypt empty payload');
  }

  const parts = encryptedText.split(':');

  let ivHex: string;
  let authTagHex: string;
  let encryptedHex: string;

  if (parts.length === 4 && parts[0] === 'v1') {
    // Versioned envelope: v1:iv:authTag:encrypted
    [, ivHex, authTagHex, encryptedHex] = parts;
  } else if (parts.length === 3) {
    // Legacy unversioned envelope: iv:authTag:encrypted
    [ivHex, authTagHex, encryptedHex] = parts;
  } else {
    throw new PlatformError('VALIDATION_ERROR', 'Invalid encrypted payload format');
  }

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  if (iv.length !== 16 || authTag.length !== 16) {
    throw new PlatformError('VALIDATION_ERROR', 'Invalid IV or AuthTag length in encrypted payload');
  }

  const { key: primaryKey } = getActiveEncryptionKey();
  const candidateKeys = [primaryKey, ...getPreviousEncryptionKeys()];

  let lastDecryptionError: Error | null = null;

  for (const candidateKey of candidateKeys) {
    try {
      const decipher = crypto.createDecipheriv(ALGORITHM, candidateKey, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (err: unknown) {
      lastDecryptionError = err instanceof Error ? err : new Error(String(err));
      // Continue to next candidate key in rotation list
    }
  }

  throw new PlatformError(
    'AUTHENTICATION_ERROR',
    `Decryption failed: integrity check or authentication tag verification failed. (${lastDecryptionError?.message || 'Decryption error'})`
  );
}

/**
 * Checks whether a valid encryption key is currently configured in the environment.
 */
export function isEncryptionConfigured(): boolean {
  return parseKeyBuffer(process.env.SYNCORA_ENCRYPTION_KEY) !== null;
}
