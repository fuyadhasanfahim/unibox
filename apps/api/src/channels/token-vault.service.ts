import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import type { Env } from '../config/env.js';

const IV = 12;
const TAG = 16;
const DEK = 32;

export type SealedToken = { ciphertext: Buffer; keyVersion: string };

// Envelope encryption for channel access tokens. Every token gets its own random data key (DEK);
// the DEK is wrapped by a versioned master key from TOKEN_ENCRYPTION_KEYS. Both layers are AES-256-GCM
// and bound to `context` (e.g. the channel account id), so a blob copied to another row won't decrypt.
// Blob layout: wrapIv | wrapTag | wrappedDek | iv | tag | token.
// ponytail: master keys come from env; swap `masterKey()` for a KMS call when one exists.
@Injectable()
export class TokenVaultService {
  private readonly current: string;
  private readonly keys: Map<string, Buffer>;

  constructor(config: ConfigService<Env, true>) {
    ({ current: this.current, keys: this.keys } = config.get('TOKEN_ENCRYPTION_KEYS', { infer: true }));
  }

  seal(token: string, context: string): SealedToken {
    const dek = randomBytes(DEK);
    const wrapped = gcm(this.masterKey(this.current), dek, `wrap:${context}`);
    const body = gcm(dek, Buffer.from(token, 'utf8'), `token:${context}`);
    return { ciphertext: Buffer.concat([wrapped, body]), keyVersion: this.current };
  }

  open(sealed: SealedToken, context: string): string {
    const blob = sealed.ciphertext;
    const wrapLen = IV + TAG + DEK;
    const dek = ungcm(this.masterKey(sealed.keyVersion), blob.subarray(0, wrapLen), `wrap:${context}`);
    return ungcm(dek, blob.subarray(wrapLen), `token:${context}`).toString('utf8');
  }

  // True when the token was sealed with an older master key and should be re-sealed.
  needsRotation(keyVersion: string): boolean {
    return keyVersion !== this.current;
  }

  private masterKey(version: string): Buffer {
    const key = this.keys.get(version);
    if (!key) throw new Error(`Unknown token key version "${version}"`);
    return key;
  }
}

function gcm(key: Buffer, plain: Buffer, aad: string): Buffer {
  const iv = randomBytes(IV);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from(aad));
  const ct = Buffer.concat([cipher.update(plain), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ct]);
}

function ungcm(key: Buffer, blob: Buffer, aad: string): Buffer {
  const decipher = createDecipheriv('aes-256-gcm', key, blob.subarray(0, IV));
  decipher.setAAD(Buffer.from(aad));
  decipher.setAuthTag(blob.subarray(IV, IV + TAG));
  return Buffer.concat([decipher.update(blob.subarray(IV + TAG)), decipher.final()]);
}
