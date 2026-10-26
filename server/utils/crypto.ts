import crypto from 'crypto';

// Derive a 32-byte key from env secret
function getKey(): Buffer {
  const secret = process.env.ACCOUNT_ENC_KEY || process.env.JWT_SECRET || 'fallback-secret-change-in-production';
  // Use SHA-256 to derive 32-byte key
  return crypto.createHash('sha256').update(secret).digest();
}

export function encryptAccountNumber(plain: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(12); // AES-GCM recommended 12-byte IV
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Store as base64 iv:ciphertext:tag
  return [iv.toString('base64'), ciphertext.toString('base64'), tag.toString('base64')].join(':');
}

export function decryptAccountNumber(payload: string): string {
  const [ivB64, ctB64, tagB64] = payload.split(':');
  if (!ivB64 || !ctB64 || !tagB64) throw new Error('Invalid encrypted payload');
  try {
    const key = getKey();
    const iv = Buffer.from(ivB64, 'base64');
    const ciphertext = Buffer.from(ctB64, 'base64');
    const tag = Buffer.from(tagB64, 'base64');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
    return plain;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    // Re-throw with a generic error to avoid leaking crypto-specific details
    throw new Error('Decryption failed. The payload may be corrupt or invalid.');
  }
}

export function last4OfAccount(num: string): string {
  const digits = num.replace(/\D/g, '');
  return digits.slice(-4).padStart(4, '0');
}
