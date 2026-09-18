import crypto from 'crypto';

// In a real application, this should be stored securely in an environment variable.
// E.g., process.env.SYNCORA_ENCRYPTION_KEY (must be 32 bytes/256 bits).
// For the sake of this implementation, if it's missing, we use a fallback, 
// but in production, missing this key should crash the app.
const ENCRYPTION_KEY = process.env.SYNCORA_ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef'; 
const ALGORITHM = 'aes-256-gcm';

export function encryptToken(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag().toString('hex');
  
  // Format: iv:authTag:encryptedData
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

export function decryptToken(encryptedText: string): string {
  const parts = encryptedText.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted text format');
  }
  
  const [ivHex, authTagHex, encryptedHex] = parts;
  
  const decipher = crypto.createDecipheriv(
    ALGORITHM, 
    Buffer.from(ENCRYPTION_KEY), 
    Buffer.from(ivHex, 'hex')
  );
  
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  
  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
