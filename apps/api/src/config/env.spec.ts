import { validateEnv } from './env.js';

const valid = {
  DATABASE_URL: 'postgresql://u:SECRET-PW@127.0.0.1:5432/db',
  REDIS_URL: 'redis://:SECRET-PW@127.0.0.1:6379',
  CORS_ORIGINS: 'http://localhost:3000, https://app.example.com',
  APP_URL: 'http://localhost:3000',
  BETTER_AUTH_SECRET: 'x'.repeat(32),
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
