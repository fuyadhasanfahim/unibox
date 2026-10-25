import { validateEnv } from './env.js';

const valid = {
  DATABASE_URL: 'postgresql://u:SECRET-PW@127.0.0.1:5432/db',
  REDIS_URL: 'redis://:SECRET-PW@127.0.0.1:6379',
  CORS_ORIGINS: 'http://localhost:3000, https://app.example.com',
  APP_URL: 'http://localhost:3000',
  BETTER_AUTH_SECRET: 'x'.repeat(32),
  INTERNAL_PROXY_SECRET: 'p'.repeat(32),
  TOKEN_ENCRYPTION_KEYS: `v2:${Buffer.alloc(32, 1).toString('base64')},v1:${Buffer.alloc(32, 2).toString('base64')}`,
};

describe('validateEnv', () => {
  it('applies defaults and parses the CORS list', () => {
    const env = validateEnv(valid);
    expect(env.API_PORT).toBe(5000);
    expect(env.NODE_ENV).toBe('development');
    expect(env.CORS_ORIGINS).toEqual(['http://localhost:3000', 'https://app.example.com']);
  });

  it('fails when a required variable is missing', () => {
    const { DATABASE_URL: _omit, ...rest } = valid;
    expect(() => validateEnv(rest)).toThrow(/DATABASE_URL/);
  });

  it('rejects wildcard and path-bearing CORS origins', () => {
    expect(() => validateEnv({ ...valid, CORS_ORIGINS: '*' })).toThrow(/CORS_ORIGINS/);
    expect(() => validateEnv({ ...valid, CORS_ORIGINS: 'http://localhost:3000/' })).toThrow(/CORS_ORIGINS/);
  });

  it('treats an empty RESEND_API_KEY as unset in dev but requires it in production', () => {
    expect(validateEnv({ ...valid, RESEND_API_KEY: '' }).RESEND_API_KEY).toBeUndefined();
    expect(() => validateEnv({ ...valid, NODE_ENV: 'production' })).toThrow(/RESEND_API_KEY: is required in production/);
  });

  it('parses token keys: first is current, bad length or duplicate versions are rejected', () => {
    const env = validateEnv(valid);
    expect(env.TOKEN_ENCRYPTION_KEYS.current).toBe('v2');
    expect([...env.TOKEN_ENCRYPTION_KEYS.keys.keys()]).toEqual(['v2', 'v1']);
    const key = Buffer.alloc(32, 3).toString('base64');
    expect(() => validateEnv({ ...valid, TOKEN_ENCRYPTION_KEYS: `v1:${Buffer.alloc(16).toString('base64')}` })).toThrow(/TOKEN_ENCRYPTION_KEYS/);
    expect(() => validateEnv({ ...valid, TOKEN_ENCRYPTION_KEYS: `v1:${key},v1:${key}` })).toThrow(/TOKEN_ENCRYPTION_KEYS/);
  });

  it('needs the Meta app settings all together or not at all', () => {
    expect(validateEnv(valid).META_GRAPH_VERSION).toBe('v26.0');
    expect(() => validateEnv({ ...valid, META_APP_ID: '123456' })).toThrow(/must be set together/);
    const meta = { META_APP_ID: '123456', META_APP_SECRET: 's'.repeat(32), META_WEBHOOK_VERIFY_TOKEN: 'v'.repeat(24) };
    expect(validateEnv({ ...valid, ...meta }).META_APP_ID).toBe('123456');
  });

  it('rejects a short auth secret', () => {
    expect(() => validateEnv({ ...valid, BETTER_AUTH_SECRET: 'short' })).toThrow(/BETTER_AUTH_SECRET/);
  });

  it('never puts values (secrets) in the error message', () => {
    try {
      validateEnv({ ...valid, REDIS_URL: 'not a url SECRET-PW', API_PORT: 'abc' });
      expect.unreachable();
    } catch (e) {
      expect((e as Error).message).not.toContain('SECRET-PW');
    }
  });
});
