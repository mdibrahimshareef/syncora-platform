import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { encryptToken, decryptToken, isEncryptionConfigured } from '@/lib/integrations/crypto';

describe('Release 18 Phase 3: OAuth Credential Encryption & Key Versioning', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('encrypts token using versioned v1 envelope and decrypts accurately', () => {
    process.env.SYNCORA_ENCRYPTION_KEY = 'fedcba9876543210fedcba9876543210'; // 32-char utf8
    const rawSecret = 'gho_16C7e42F292c6912E7710c838347Ae178B4a';

    const encrypted = encryptToken(rawSecret);
    expect(encrypted.startsWith('v1:')).toBe(true);

    const parts = encrypted.split(':');
    expect(parts.length).toBe(4);
    expect(parts[1].length).toBe(32); // 16 bytes hex IV
    expect(parts[2].length).toBe(32); // 16 bytes hex AuthTag

    const decrypted = decryptToken(encrypted);
    expect(decrypted).toBe(rawSecret);
  });

  it('supports backward-compatible decryption of legacy unversioned 3-part payloads', () => {
    const key = '0123456789abcdef0123456789abcdef';
    process.env.SYNCORA_ENCRYPTION_KEY = key;

    // Manually create legacy 3-part payload (iv:authTag:encrypted)
    const crypto = require('crypto');
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(key), iv);
    let enc = cipher.update('legacy-slack-xoxb-token', 'utf8', 'hex');
    enc += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    const legacyPayload = `${iv.toString('hex')}:${authTag}:${enc}`;

    expect(legacyPayload.split(':').length).toBe(3);

    // Decrypt using decryptToken
    const decrypted = decryptToken(legacyPayload);
    expect(decrypted).toBe('legacy-slack-xoxb-token');
  });

  it('seamlessly decrypts credentials encrypted under previous key during key rotation', () => {
    const oldKey = 'old_key_123456789012345678901234'; // 32 bytes
    const newKey = 'new_key_123456789012345678901234'; // 32 bytes

    // 1. Encrypt with old key
    process.env.SYNCORA_ENCRYPTION_KEY = oldKey;
    const encryptedWithOldKey = encryptToken('secret-under-old-key');

    // 2. Rotate to new key with old key listed in previous keys
    process.env.SYNCORA_ENCRYPTION_KEY = newKey;
    process.env.SYNCORA_PREVIOUS_ENCRYPTION_KEYS = oldKey;

    // 3. Attempt decryption under rotated key
    const decrypted = decryptToken(encryptedWithOldKey);
    expect(decrypted).toBe('secret-under-old-key');
  });

  it('rejects tampered or corrupt ciphertexts with integrity verification error', () => {
    process.env.SYNCORA_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef';
    const encrypted = encryptToken('sensitive-client-secret');

    const parts = encrypted.split(':');
    // Tamper with ciphertext by altering last characters
    parts[3] = parts[3].substring(0, parts[3].length - 2) + 'ff';
    const tampered = parts.join(':');

    expect(() => decryptToken(tampered)).toThrow(/Decryption failed/i);
  });

  it('rejects empty or malformed inputs cleanly', () => {
    expect(() => encryptToken('')).toThrow(/Cannot encrypt empty token/i);
    expect(() => decryptToken('')).toThrow(/Cannot decrypt empty payload/i);
    expect(() => decryptToken('invalid:format')).toThrow(/Invalid encrypted payload format/i);
  });

  it('identifies whether valid encryption key is configured', () => {
    process.env.SYNCORA_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef';
    expect(isEncryptionConfigured()).toBe(true);

    delete process.env.SYNCORA_ENCRYPTION_KEY;
    expect(isEncryptionConfigured()).toBe(false);
  });
});

