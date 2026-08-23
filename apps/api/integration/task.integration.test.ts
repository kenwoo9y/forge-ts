import { ErrorCode } from 'error';
import { describe, expect, it } from 'vitest';
import { app } from '../src/app.js';
import { signUpAndSignIn } from './testAuth.js';
import { testPrisma } from './testClient.js';

async function createTask(authHeaders: Record<string, string>) {
  const res = await app.request('/users/alice/tasks', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ title: 'Buy milk', status: 'todo' }),
  });
  return res.json();
}

describe('Task API (integration)', () => {
  describe('JWT保護', () => {
    it('トークンなしで/tasksにPOSTすると401を返す', async () => {
      const res = await app.request('/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'x', status: 'todo', ownerId: '1' }),
      });

      expect(res.status).toBe(401);
    });

    it('不正なトークンで/tasks/:publicIdにGETすると401を返す', async () => {
      const res = await app.request('/tasks/00000000-0000-0000-0000-000000000000', {
        headers: { Authorization: 'Bearer invalid-token' },
      });

      expect(res.status).toBe(401);
    });

    it('Bearerプレフィックスのないトークンで/tasks/:publicIdにGETすると401を返す', async () => {
      const token = await signUpAndSignIn(app, 'alice');

      const res = await app.request('/tasks/00000000-0000-0000-0000-000000000000', {
        headers: { Authorization: token },
      });

      expect(res.status).toBe(401);
    });
  });

  describe('POST /tasks（ownerIdを直接指定）', () => {
    it('タスクを作成すると201を返し、DBに保存される', async () => {
      const token = await signUpAndSignIn(app, 'alice');
      const owner = await testPrisma.user.findUniqueOrThrow({ where: { username: 'alice' } });

      const res = await app.request('/tasks', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: 'Buy milk', status: 'todo', ownerId: owner.id.toString() }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.title).toBe('Buy milk');
      expect(body.ownerId).toBe(owner.id.toString());

      const record = await testPrisma.task.findUnique({ where: { publicId: body.publicId } });
      expect(record?.title).toBe('Buy milk');
    });
  });

  describe('GET /tasks/:publicId', () => {
    it('タスクが存在する場合：200を返す', async () => {
      const token = await signUpAndSignIn(app, 'alice');
      const authHeaders = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };
      const created = await createTask(authHeaders);

      const res = await app.request(`/tasks/${created.publicId}`, {
        headers: authHeaders,
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.publicId).toBe(created.publicId);
    });

    it('タスクが存在しない場合：404を返す', async () => {
      const token = await signUpAndSignIn(app, 'alice');

      const res = await app.request('/tasks/00000000-0000-0000-0000-000000000000', {
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.code).toBe(ErrorCode.TASK_NOT_FOUND);
    });
  });

  describe('PATCH /tasks/:publicId', () => {
    it('タスクが存在する場合：更新後の情報を返し、DBにも反映される', async () => {
      const token = await signUpAndSignIn(app, 'alice');
      const authHeaders = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };
      const created = await createTask(authHeaders);

      const res = await app.request(`/tasks/${created.publicId}`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ status: 'done' }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe('done');

      const record = await testPrisma.task.findUnique({ where: { publicId: created.publicId } });
      expect(record?.status).toBe('done');
    });

    it('タスクが存在しない場合：404を返す', async () => {
      const token = await signUpAndSignIn(app, 'alice');

      const res = await app.request('/tasks/00000000-0000-0000-0000-000000000000', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'done' }),
      });

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.code).toBe(ErrorCode.TASK_NOT_FOUND);
    });
  });

  describe('DELETE /tasks/:publicId', () => {
    it('タスクが存在する場合：204を返し、DBから削除される', async () => {
      const token = await signUpAndSignIn(app, 'alice');
      const authHeaders = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };
      const created = await createTask(authHeaders);

      const res = await app.request(`/tasks/${created.publicId}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      expect(res.status).toBe(204);

      const record = await testPrisma.task.findUnique({ where: { publicId: created.publicId } });
      expect(record).toBeNull();
    });

    it('タスクが存在しない場合：404を返す', async () => {
      const token = await signUpAndSignIn(app, 'alice');

      const res = await app.request('/tasks/00000000-0000-0000-0000-000000000000', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.code).toBe(ErrorCode.TASK_NOT_FOUND);
    });
  });
});
