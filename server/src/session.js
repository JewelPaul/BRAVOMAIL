import crypto from 'node:crypto';

// 32-byte key derived from SESSION_SECRET or generated ephemeral key
const RAW_SECRET = process.env.SESSION_SECRET || 'bravomail-default-production-session-secret-change-me-32b';
const CIPHER_KEY = crypto.createHash('sha256').update(RAW_SECRET).digest();
const ALGORITHM = 'aes-256-gcm';

const DEFAULT_EXPIRY_MINUTES = parseInt(process.env.SESSION_EXPIRY_MINUTES || '60', 10);

/**
 * Creates an encrypted, tamper-proof session token.
 * Contains the provider credentials and expiration without exposing them to the client.
 */
export function createSessionToken(data, expiryMinutes = DEFAULT_EXPIRY_MINUTES) {
  const now = Date.now();
  const expiresAt = now + expiryMinutes * 60 * 1000;

  const payload = JSON.stringify({
    ...data,
    createdAt: now,
    expiresAt,
  });

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, CIPHER_KEY, iv);
  const ciphertext = Buffer.concat([cipher.update(payload, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  // Return base64url encoded: iv.ciphertext.tag
  return [
    iv.toString('base64url'),
    ciphertext.toString('base64url'),
    tag.toString('base64url'),
  ].join('.');
}

/**
 * Decrypts and verifies a session token.
 * Enforces tamper-proofing and expiration.
 */
export function verifySessionToken(token) {
  if (!token || typeof token !== 'string') {
    throw new Error('Missing or invalid session token format.');
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Malformed session token format.');
  }

  const [ivStr, cipherStr, tagStr] = parts;
  try {
    const iv = Buffer.from(ivStr, 'base64url');
    const ciphertext = Buffer.from(cipherStr, 'base64url');
    const tag = Buffer.from(tagStr, 'base64url');

    const decipher = crypto.createDecipheriv(ALGORITHM, CIPHER_KEY, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    const session = JSON.parse(decrypted.toString('utf8'));

    if (Date.now() > session.expiresAt) {
      const err = new Error('Session has expired.');
      err.code = 'SESSION_EXPIRED';
      throw err;
    }

    return session;
  } catch (err) {
    if (err.code === 'SESSION_EXPIRED') throw err;
    const error = new Error('Invalid or tampered session token.');
    error.code = 'INVALID_TOKEN';
    throw error;
  }
}
