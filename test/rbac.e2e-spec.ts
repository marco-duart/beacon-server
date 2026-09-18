import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { UsersService } from '../src/modules/users/users.service';

interface LoginResponse {
  accessToken: string;
  role: string;
}

describe('RBAC & pagination (e2e)', () => {
  let app: INestApplication<App>;
  let adminToken: string;
  let adminId: number;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();

    const usersService = app.get(UsersService);
    const admin = await usersService.create(
      'admin@beacon.test',
      'super-secret-password',
      'admin',
    );
    adminId = admin.id;

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@beacon.test', password: 'super-secret-password' })
      .expect(200);
    adminToken = (login.body as LoginResponse).accessToken;
  });

  afterEach(async () => {
    await app.close();
  });

  async function createUserAndLogin(
    email: string,
    role: 'member' | 'viewer',
  ): Promise<string> {
    const usersService = app.get(UsersService);
    await usersService.create(email, 'password-123', role);
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'password-123' })
      .expect(200);
    return (login.body as LoginResponse).accessToken;
  }

  it('lets a viewer read but not mutate systems or issues', async () => {
    const server = app.getHttpServer();
    const viewerToken = await createUserAndLogin(
      'viewer@beacon.test',
      'viewer',
    );

    await request(server)
      .post('/systems')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ name: 'Checkout API' })
      .expect(403);

    await request(server)
      .get('/systems')
      .set('Authorization', `Bearer ${viewerToken}`)
      .expect(200);
  });

  it('lets a member resolve issues but not manage systems', async () => {
    const server = app.getHttpServer();
    const memberToken = await createUserAndLogin(
      'member@beacon.test',
      'member',
    );

    const system = await request(server)
      .post('/systems')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Checkout API' })
      .expect(201);
    const { apiKey } = system.body as { apiKey: string };

    await request(server)
      .post('/events')
      .set('X-Beacon-Key', apiKey)
      .send({ type: 'Error', message: 'boom', level: 'error' })
      .expect(202);
    await new Promise((resolve) => setTimeout(resolve, 300));

    const issues = await request(server)
      .get('/issues')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const [issue] = (issues.body as { items: { id: number }[] }).items;

    await request(server)
      .post('/systems')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ name: 'Other' })
      .expect(403);

    await request(server)
      .patch(`/issues/${issue.id}/status`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ status: 'resolved' })
      .expect(200);
  });

  it('paginates /issues', async () => {
    const server = app.getHttpServer();
    const system = await request(server)
      .post('/systems')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Checkout API' })
      .expect(201);
    const { apiKey } = system.body as { apiKey: string };

    for (let i = 0; i < 3; i += 1) {
      await request(server)
        .post('/events')
        .set('X-Beacon-Key', apiKey)
        .send({ type: `Error${i}`, message: `boom ${i}`, level: 'error' })
        .expect(202);
    }
    await new Promise((resolve) => setTimeout(resolve, 300));

    const page1 = await request(server)
      .get('/issues?page=1&pageSize=2')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const body1 = page1.body as {
      items: unknown[];
      total: number;
      page: number;
      pageSize: number;
    };
    expect(body1.items).toHaveLength(2);
    expect(body1.total).toBe(3);

    const page2 = await request(server)
      .get('/issues?page=2&pageSize=2')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const body2 = page2.body as { items: unknown[] };
    expect(body2.items).toHaveLength(1);
  });

  it('blocks self-deletion and protects the last remaining admin', async () => {
    const server = app.getHttpServer();

    await request(server)
      .delete(`/users/${adminId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(403);

    const usersService = app.get(UsersService);
    const secondAdmin = await usersService.create(
      'admin2@beacon.test',
      'password-123',
      'admin',
    );

    // With two admins, deleting one is fine; the other stays protected only while alone.
    await request(server)
      .delete(`/users/${secondAdmin.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    await request(server)
      .patch(`/users/${adminId}/role`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'member' })
      .expect(403);
  });

  it("invalidates a deleted user's token immediately", async () => {
    const server = app.getHttpServer();
    const usersService = app.get(UsersService);
    const member = await usersService.create(
      'temp@beacon.test',
      'password-123',
      'member',
    );
    const login = await request(server)
      .post('/auth/login')
      .send({ email: 'temp@beacon.test', password: 'password-123' })
      .expect(200);
    const token = (login.body as LoginResponse).accessToken;

    await request(server)
      .get('/issues')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    await usersService.remove(member.id, adminId);

    await request(server)
      .get('/issues')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);
  });
});
