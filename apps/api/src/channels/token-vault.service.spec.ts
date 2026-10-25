import type { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.js';
import { TokenVaultService } from './token-vault.service.js';

const vault = (keys: Record<string, number>) => {
  const map = new Map(Object.entries(keys).map(([v, fill]) => [v, Buffer.alloc(32, fill)]));
  const config = { get: () => ({ current: map.keys().next().value, keys: map }) } as unknown as ConfigService<Env, true>;
  return new TokenVaultService(config);
};

describe('TokenVaultService', () => {
  const token = 'EAAG-secret-page-token';

  it('round-trips, never stores the token in plaintext, and differs on every seal', () => {
    const v = vault({ v1: 1 });
    const a = v.seal(token, 'acct1');
    expect(a.ciphertext.includes(Buffer.from(token))).toBe(false);
    expect(v.open(a, 'acct1')).toBe(token);
    expect(v.seal(token, 'acct1').ciphertext.equals(a.ciphertext)).toBe(false);
  });

  it('refuses a blob moved to another row, a tampered blob and a wrong key', () => {
    const v = vault({ v1: 1 });
    const sealed = v.seal(token, 'acct1');
    expect(() => v.open(sealed, 'acct2')).toThrow();
    const tampered = Buffer.from(sealed.ciphertext);
    tampered[tampered.length - 1] ^= 1;
    expect(() => v.open({ ...sealed, ciphertext: tampered }, 'acct1')).toThrow();
    expect(() => vault({ v1: 9 }).open(sealed, 'acct1')).toThrow();
  });

  it('opens tokens sealed with an older key after rotation and flags them', () => {
    const old = vault({ v1: 1 }).seal(token, 'acct1');
    const rotated = vault({ v2: 2, v1: 1 });
    expect(rotated.open(old, 'acct1')).toBe(token);
    expect(rotated.needsRotation(old.keyVersion)).toBe(true);
    expect(rotated.needsRotation('v2')).toBe(false);
  });
});
