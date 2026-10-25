import { createHash, randomBytes } from 'node:crypto';

// 256-bit single-use token for email links. Only its SHA-256 is stored, so a DB leak cannot be replayed.
export function createToken(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString('base64url');
  return { raw, hash: hashToken(raw) };
}

export function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}
