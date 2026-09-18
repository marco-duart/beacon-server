import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { UsersService } from '../src/modules/users/users.service';

async function waitFor(
  assertion: () => Promise<void>,
  timeoutMs = 3000,
  intervalMs = 50,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      await assertion();
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }
  throw lastError;
}

describe('Ingestion flow (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();

    await app
      .get(UsersService)
      .create('admin@beacon.test', 'super-secret-password', 'admin');
  });

  afterEach(async () => {
    await app.close();
  });

  it('turns a reported error into a queryable issue', async () => {
    const server = app.getHttpServer();

    const loginResponse = await request(server)
      .post('/auth/login')
      .send({ email: 'admin@beacon.test', password: 'super-secret-password' })
      .expect(200);
    const token = (loginResponse.body as { accessToken: string }).accessToken;

    const systemResponse = await request(server)
      .post('/systems')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Checkout API' })
      .expect(201);
    const { apiKey, id: systemId } = systemResponse.body as {
      apiKey: string;
      id: number;
    };

    await request(server)
      .post('/events')
      .set('X-Beacon-Key', apiKey)
      .send({
        type: 'TypeError',
        message: "Cannot read properties of undefined (reading 'foo')",
        level: 'error',
        environment: 'production',
        stacktrace: 'at handler (checkout.ts:42:7)',
      })
      .expect(202);

    await waitFor(async () => {
      const issuesResponse = await request(server)
        .get(`/issues?systemId=${systemId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      const { items } = issuesResponse.body as { items: unknown[] };
      expect(items).toHaveLength(1);
    });

    const issuesResponse = await request(server)
      .get(`/issues?systemId=${systemId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const { items } = issuesResponse.body as {
      items: { id: number; type: string; count: number }[];
    };
    const [issue] = items;
    expect(issue).toMatchObject({ type: 'TypeError', count: 1 });

    const eventsResponse = await request(server)
      .get(`/issues/${issue.id}/events`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(eventsResponse.body).toHaveLength(1);
  });
});
