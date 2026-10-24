import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';

// Needs the docker-compose Postgres running (readiness hits the DB).
describe('API foundation (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health/live is ok and carries a request id', async () => {
    const res = await request(app.getHttpServer()).get('/health/live').expect(200);
    expect(res.body).toEqual({ status: 'ok' });
    expect(res.headers['x-request-id']).toBeTruthy();
  });

  it('GET /health/ready checks the database', async () => {
    await request(app.getHttpServer()).get('/health/ready').expect(200);
  });

  it('echoes a well-formed x-request-id and replaces a malformed one', async () => {
    const good = await request(app.getHttpServer()).get('/health/live').set('x-request-id', 'abc12345-test');
    expect(good.headers['x-request-id']).toBe('abc12345-test');
    const bad = await request(app.getHttpServer()).get('/health/live').set('x-request-id', 'bad id\twith spaces');
    expect(bad.headers['x-request-id']).not.toBe('bad id\twith spaces');
  });

  it('returns the stable error envelope for unknown routes', async () => {
    const res = await request(app.getHttpServer()).get('/nope').expect(404);
    expect(res.body.error).toMatchObject({ code: 'NOT_FOUND', requestId: res.headers['x-request-id'] });
    expect(JSON.stringify(res.body)).not.toMatch(/stack|at .*\(/);
  });
});
