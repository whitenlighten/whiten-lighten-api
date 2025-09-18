// ADDED: helpers to encrypt/decrypt TOTP secrets before saving to DB.
// Make sure ENCRYPTION_KEY is 32 bytes (hex) in .env
import * as crypto from 'crypto';

const ALGO = 'aes-256-gcm';

export function encrypt(text: string): string {
  const key = Buffer.from(process.env.ENCRYPTION_KEY || '', 'hex');
  if (key.length !== 32) throw new Error('ENCRYPTION_KEY must be 32 bytes (hex).');

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decrypt(payload: string): string {
  const key = Buffer.from(process.env.ENCRYPTION_KEY || '', 'hex');
  if (key.length !== 32) throw new Error('ENCRYPTION_KEY must be 32 bytes (hex).');

  const [ivHex, tagHex, encHex] = payload.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const encrypted = Buffer.from(encHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}
