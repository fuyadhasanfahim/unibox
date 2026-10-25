import { hash, verify, type Algorithm } from '@node-rs/argon2';

// Argon2id with OWASP's recommended minimum (19 MiB, 2 iterations, 1 lane).
// `Algorithm` is an ambient const enum (unusable as a value with isolatedModules); 2 = Argon2id.
const ARGON2ID = 2 as Algorithm.Argon2id;
const OPTIONS = { algorithm: ARGON2ID, memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const;

export function hashPassword(password: string): Promise<string> {
  return hash(password, OPTIONS);
}

export async function verifyPassword({ hash: digest, password }: { hash: string; password: string }): Promise<boolean> {
  try {
    return await verify(digest, password);
  } catch {
    // Malformed hash: treat as a failed login, never as a server error.
    return false;
  }
}
