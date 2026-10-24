import { validateEnv } from './env.js';

const valid = {
  DATABASE_URL: 'postgresql://u:SECRET-PW@127.0.0.1:5432/db',
  REDIS_URL: 'redis://:SECRET-PW@127.0.0.1:6379',
  CORS_ORIGINS: 'http://localhost:3000, https://app.example.com',
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

  it('never puts values (secrets) in the error message', () => {
    try {
      validateEnv({ ...valid, REDIS_URL: 'not a url SECRET-PW', API_PORT: 'abc' });
      expect.unreachable();
    } catch (e) {
      expect((e as Error).message).not.toContain('SECRET-PW');
    }
  });
});
