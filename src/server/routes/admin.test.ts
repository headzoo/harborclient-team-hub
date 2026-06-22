import { describe, expect, it } from 'vitest';
import { createStubDatabase } from '#/db/stubDatabase.js';
import {
  authHeader,
  createProtectedTestApp,
  sampleApiTokenRecord,
  sampleUserRecord
} from '#/server/routes/test/createTestApp.js';
import { sampleAttribution } from '#/server/routes/test/sampleAttribution.js';

describe('GET /admin/users', () => {
  it('omits the internal system user from the response', async () => {
    const db = createStubDatabase();
    const adminUser = {
      ...sampleUserRecord,
      id: 'admin-1',
      name: 'Ops',
      role: 'admin' as const,
      collectionAccess: [],
      environmentAccess: []
    };
    const systemUser = {
      ...sampleUserRecord,
      id: 'system-user-id',
      name: 'system',
      role: 'admin' as const,
      collectionAccess: [],
      environmentAccess: []
    };
    const listedUser = {
      ...sampleUserRecord,
      id: 'user-2',
      name: 'Alice'
    };
    db.getSystemUserId.mockReturnValue('system-user-id');
    db.listUsers.mockResolvedValue([systemUser, adminUser, listedUser]);

    const app = await createProtectedTestApp({
      db,
      withValidAuth: true,
      user: adminUser
    });

    const response = await app.inject({
      method: 'GET',
      url: '/admin/users',
      headers: authHeader()
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().users.map((user: { id: string }) => user.id)).toEqual([
      'admin-1',
      'user-2'
    ]);

    await app.close();
  });

  it('returns all users for admin-role tokens', async () => {
    const db = createStubDatabase();
    const adminUser = {
      ...sampleUserRecord,
      id: 'admin-1',
      name: 'Ops',
      role: 'admin' as const,
      collectionAccess: [],
      environmentAccess: []
    };
    const listedUser = {
      ...sampleUserRecord,
      id: 'user-2',
      name: 'Alice'
    };
    db.listUsers.mockResolvedValue([adminUser, listedUser]);

    const app = await createProtectedTestApp({
      db,
      withValidAuth: true,
      user: adminUser
    });

    const response = await app.inject({
      method: 'GET',
      url: '/admin/users',
      headers: authHeader()
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      users: [
        {
          id: 'admin-1',
          name: 'Ops',
          role: 'admin',
          collectionAccess: [],
          environmentAccess: [],
          llmAccess: false,
          llmModels: [],
          llmMonthlyTokenLimit: null,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z'
        },
        {
          id: 'user-2',
          name: 'Alice',
          role: 'user',
          collectionAccess: ['*'],
          environmentAccess: ['*'],
          llmAccess: false,
          llmModels: [],
          llmMonthlyTokenLimit: null,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z'
        }
      ]
    });
    expect(db.listUsers).toHaveBeenCalledOnce();

    await app.close();
  });

  it('returns 403 for user-role tokens', async () => {
    const db = createStubDatabase();
    const app = await createProtectedTestApp({
      db,
      withValidAuth: true,
      user: sampleUserRecord
    });

    const response = await app.inject({
      method: 'GET',
      url: '/admin/users',
      headers: authHeader()
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({ error: 'Forbidden' });
    expect(db.listUsers).not.toHaveBeenCalled();

    await app.close();
  });

  it('returns 401 without a bearer token', async () => {
    const db = createStubDatabase();
    const app = await createProtectedTestApp({ db });

    const response = await app.inject({
      method: 'GET',
      url: '/admin/users'
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: 'Unauthorized' });

    await app.close();
  });
});

describe('PUT /admin/users/:id', () => {
  it('updates a user for admin-role tokens', async () => {
    const db = createStubDatabase();
    const adminUser = {
      ...sampleUserRecord,
      id: 'admin-1',
      name: 'Ops',
      role: 'admin' as const,
      collectionAccess: [],
      environmentAccess: []
    };
    const targetUser = {
      ...sampleUserRecord,
      id: 'user-2',
      name: 'Alice'
    };
    const updatedUser = {
      ...targetUser,
      name: 'Alice Updated',
      updatedAt: new Date('2026-01-02T00:00:00.000Z')
    };

    db.findUserById.mockResolvedValue(targetUser);
    db.updateUser.mockResolvedValue(updatedUser);

    const app = await createProtectedTestApp({
      db,
      withValidAuth: true,
      user: adminUser
    });
    db.findUserById.mockImplementation(async (id: string) => {
      if (id === sampleApiTokenRecord.userId || id === adminUser.id) {
        return adminUser;
      }

      if (id === targetUser.id) {
        return targetUser;
      }

      return null;
    });

    const response = await app.inject({
      method: 'PUT',
      url: '/admin/users/user-2',
      headers: authHeader(),
      payload: { name: 'Alice Updated' }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().name).toBe('Alice Updated');
    expect(db.updateUser).toHaveBeenCalledWith(
      'user-2',
      expect.objectContaining({ name: 'Alice Updated' }),
      'admin-1'
    );

    await app.close();
  });

  it('clears access lists when changing role to admin', async () => {
    const db = createStubDatabase();
    const adminUser = {
      ...sampleUserRecord,
      id: 'admin-1',
      role: 'admin' as const,
      collectionAccess: [],
      environmentAccess: []
    };
    const targetUser = {
      ...sampleUserRecord,
      id: 'user-2',
      name: 'Alice'
    };

    db.findUserById.mockResolvedValue(targetUser);
    db.updateUser.mockResolvedValue({
      ...targetUser,
      role: 'admin',
      collectionAccess: [],
      environmentAccess: []
    });

    const app = await createProtectedTestApp({
      db,
      withValidAuth: true,
      user: adminUser
    });
    db.findUserById.mockImplementation(async (id: string) => {
      if (id === sampleApiTokenRecord.userId || id === adminUser.id) {
        return adminUser;
      }

      if (id === targetUser.id) {
        return targetUser;
      }

      return null;
    });

    const response = await app.inject({
      method: 'PUT',
      url: '/admin/users/user-2',
      headers: authHeader(),
      payload: { role: 'admin', collectionAccess: ['*'] }
    });

    expect(response.statusCode).toBe(200);
    expect(db.updateUser).toHaveBeenCalledWith(
      'user-2',
      expect.objectContaining({
        role: 'admin',
        collectionAccess: [],
        environmentAccess: []
      }),
      'admin-1'
    );

    await app.close();
  });

  it('returns 404 when the user does not exist', async () => {
    const db = createStubDatabase();
    const adminUser = {
      ...sampleUserRecord,
      role: 'admin' as const,
      collectionAccess: [],
      environmentAccess: []
    };

    db.findUserById.mockResolvedValue(null);

    const app = await createProtectedTestApp({
      db,
      withValidAuth: true,
      user: adminUser
    });
    db.findUserById.mockImplementation(async (id: string) => {
      if (id === sampleApiTokenRecord.userId || id === adminUser.id) {
        return adminUser;
      }

      return null;
    });

    const response = await app.inject({
      method: 'PUT',
      url: '/admin/users/missing-id',
      headers: authHeader(),
      payload: { name: 'Updated' }
    });

    expect(response.statusCode).toBe(404);
    expect(db.updateUser).not.toHaveBeenCalled();

    await app.close();
  });

  it('returns 403 for user-role tokens', async () => {
    const db = createStubDatabase();
    const app = await createProtectedTestApp({
      db,
      withValidAuth: true,
      user: sampleUserRecord
    });

    const response = await app.inject({
      method: 'PUT',
      url: '/admin/users/user-2',
      headers: authHeader(),
      payload: { name: 'Updated' }
    });

    expect(response.statusCode).toBe(403);
    expect(db.updateUser).not.toHaveBeenCalled();

    await app.close();
  });

  it('returns 403 when updating the system user', async () => {
    const db = createStubDatabase();
    const adminUser = {
      ...sampleUserRecord,
      id: 'admin-1',
      role: 'admin' as const,
      collectionAccess: [],
      environmentAccess: []
    };
    const systemUser = {
      ...sampleUserRecord,
      id: 'system-user-id',
      name: 'system',
      role: 'admin' as const,
      collectionAccess: [],
      environmentAccess: []
    };

    db.getSystemUserId.mockReturnValue('system-user-id');
    db.findUserById.mockResolvedValue(systemUser);

    const app = await createProtectedTestApp({
      db,
      withValidAuth: true,
      user: adminUser
    });
    db.findUserById.mockImplementation(async (id: string) => {
      if (id === sampleApiTokenRecord.userId || id === adminUser.id) {
        return adminUser;
      }

      if (id === systemUser.id) {
        return systemUser;
      }

      return null;
    });

    const response = await app.inject({
      method: 'PUT',
      url: '/admin/users/system-user-id',
      headers: authHeader(),
      payload: { name: 'Updated' }
    });

    expect(response.statusCode).toBe(403);
    expect(db.updateUser).not.toHaveBeenCalled();

    await app.close();
  });
});

describe('DELETE /admin/users/:id', () => {
  it('deletes a user for admin-role tokens', async () => {
    const db = createStubDatabase();
    const adminUser = {
      ...sampleUserRecord,
      id: 'admin-1',
      role: 'admin' as const,
      collectionAccess: [],
      environmentAccess: []
    };
    const targetUser = {
      ...sampleUserRecord,
      id: 'user-2',
      name: 'Alice'
    };

    db.findUserById.mockResolvedValue(targetUser);
    db.deleteUser.mockResolvedValue(undefined);

    const app = await createProtectedTestApp({
      db,
      withValidAuth: true,
      user: adminUser
    });
    db.findUserById.mockImplementation(async (id: string) => {
      if (id === sampleApiTokenRecord.userId || id === adminUser.id) {
        return adminUser;
      }

      if (id === targetUser.id) {
        return targetUser;
      }

      return null;
    });

    const response = await app.inject({
      method: 'DELETE',
      url: '/admin/users/user-2',
      headers: authHeader()
    });

    expect(response.statusCode).toBe(204);
    expect(db.deleteUser).toHaveBeenCalledWith('user-2', 'admin-1');

    await app.close();
  });

  it('returns 404 when the user does not exist', async () => {
    const db = createStubDatabase();
    const adminUser = {
      ...sampleUserRecord,
      role: 'admin' as const,
      collectionAccess: [],
      environmentAccess: []
    };

    db.findUserById.mockResolvedValue(null);

    const app = await createProtectedTestApp({
      db,
      withValidAuth: true,
      user: adminUser
    });
    db.findUserById.mockImplementation(async (id: string) => {
      if (id === sampleApiTokenRecord.userId || id === adminUser.id) {
        return adminUser;
      }

      return null;
    });

    const response = await app.inject({
      method: 'DELETE',
      url: '/admin/users/missing-id',
      headers: authHeader()
    });

    expect(response.statusCode).toBe(404);
    expect(db.deleteUser).not.toHaveBeenCalled();

    await app.close();
  });

  it('returns 403 for user-role tokens', async () => {
    const db = createStubDatabase();
    const app = await createProtectedTestApp({
      db,
      withValidAuth: true,
      user: sampleUserRecord
    });

    const response = await app.inject({
      method: 'DELETE',
      url: '/admin/users/user-2',
      headers: authHeader()
    });

    expect(response.statusCode).toBe(403);
    expect(db.deleteUser).not.toHaveBeenCalled();

    await app.close();
  });

  it('returns 403 when deleting the system user', async () => {
    const db = createStubDatabase();
    const adminUser = {
      ...sampleUserRecord,
      id: 'admin-1',
      role: 'admin' as const,
      collectionAccess: [],
      environmentAccess: []
    };
    const systemUser = {
      ...sampleUserRecord,
      id: 'system-user-id',
      name: 'system',
      role: 'admin' as const,
      collectionAccess: [],
      environmentAccess: []
    };

    db.getSystemUserId.mockReturnValue('system-user-id');
    db.findUserById.mockResolvedValue(systemUser);

    const app = await createProtectedTestApp({
      db,
      withValidAuth: true,
      user: adminUser
    });
    db.findUserById.mockImplementation(async (id: string) => {
      if (id === sampleApiTokenRecord.userId || id === adminUser.id) {
        return adminUser;
      }

      if (id === systemUser.id) {
        return systemUser;
      }

      return null;
    });

    const response = await app.inject({
      method: 'DELETE',
      url: '/admin/users/system-user-id',
      headers: authHeader()
    });

    expect(response.statusCode).toBe(403);
    expect(db.deleteUser).not.toHaveBeenCalled();

    await app.close();
  });
});

const sampleLlmConfig = {
  providers: {
    openai: { apiKey: 'sk-test' }
  },
  models: ['gpt-4o']
};

const sampleCollection = {
  id: 'collection-1',
  name: 'Shared API',
  variables: [],
  headers: [],
  auth: { type: 'none' as const, basic: { username: '', password: '' }, bearer: { token: '' } },
  preRequestScript: '',
  postRequestScript: '',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  ...sampleAttribution
};

const sampleEnvironment = {
  id: 'env-1',
  name: 'Production',
  variables: [],
  createdAt: new Date('2026-01-02T00:00:00.000Z'),
  updatedAt: new Date('2026-01-02T00:00:00.000Z'),
  ...sampleAttribution
};

describe('GET /admin/collections', () => {
  it('returns all collections for admin-role tokens', async () => {
    const db = createStubDatabase();
    db.listCollections.mockResolvedValue([sampleCollection]);
    const adminUser = {
      ...sampleUserRecord,
      id: 'admin-1',
      role: 'admin' as const,
      collectionAccess: [],
      environmentAccess: []
    };
    const app = await createProtectedTestApp({
      db,
      withValidAuth: true,
      user: adminUser
    });

    const response = await app.inject({
      method: 'GET',
      url: '/admin/collections',
      headers: authHeader()
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      collections: [{ id: 'collection-1', name: 'Shared API' }]
    });

    await app.close();
  });

  it('returns 403 for user-role tokens', async () => {
    const db = createStubDatabase();
    const app = await createProtectedTestApp({
      db,
      withValidAuth: true,
      user: sampleUserRecord
    });

    const response = await app.inject({
      method: 'GET',
      url: '/admin/collections',
      headers: authHeader()
    });

    expect(response.statusCode).toBe(403);
    expect(db.listCollections).not.toHaveBeenCalled();

    await app.close();
  });
});

describe('GET /admin/environments', () => {
  it('returns all environments for admin-role tokens', async () => {
    const db = createStubDatabase();
    db.listEnvironments.mockResolvedValue([sampleEnvironment]);
    const adminUser = {
      ...sampleUserRecord,
      id: 'admin-1',
      role: 'admin' as const,
      collectionAccess: [],
      environmentAccess: []
    };
    const app = await createProtectedTestApp({
      db,
      withValidAuth: true,
      user: adminUser
    });

    const response = await app.inject({
      method: 'GET',
      url: '/admin/environments',
      headers: authHeader()
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      environments: [{ id: 'env-1', name: 'Production' }]
    });

    await app.close();
  });

  it('returns 403 for user-role tokens', async () => {
    const db = createStubDatabase();
    const app = await createProtectedTestApp({
      db,
      withValidAuth: true,
      user: sampleUserRecord
    });

    const response = await app.inject({
      method: 'GET',
      url: '/admin/environments',
      headers: authHeader()
    });

    expect(response.statusCode).toBe(403);
    expect(db.listEnvironments).not.toHaveBeenCalled();

    await app.close();
  });
});

describe('GET /admin/llm/models', () => {
  it('returns all hub-offered models for admin-role tokens', async () => {
    const db = createStubDatabase();
    const adminUser = {
      ...sampleUserRecord,
      id: 'admin-1',
      role: 'admin' as const,
      collectionAccess: [],
      environmentAccess: []
    };
    const app = await createProtectedTestApp({
      db,
      withValidAuth: true,
      llm: sampleLlmConfig,
      user: adminUser
    });

    const response = await app.inject({
      method: 'GET',
      url: '/admin/llm/models',
      headers: authHeader()
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      models: [{ id: 'gpt-4o', label: 'GPT-4o', provider: 'openai' }]
    });

    await app.close();
  });

  it('returns 503 when LLM is not configured', async () => {
    const db = createStubDatabase();
    const adminUser = {
      ...sampleUserRecord,
      id: 'admin-1',
      role: 'admin' as const,
      collectionAccess: [],
      environmentAccess: []
    };
    const app = await createProtectedTestApp({
      db,
      withValidAuth: true,
      llm: null,
      user: adminUser
    });

    const response = await app.inject({
      method: 'GET',
      url: '/admin/llm/models',
      headers: authHeader()
    });

    expect(response.statusCode).toBe(503);

    await app.close();
  });

  it('returns 403 for user-role tokens', async () => {
    const db = createStubDatabase();
    const app = await createProtectedTestApp({
      db,
      withValidAuth: true,
      llm: sampleLlmConfig,
      user: sampleUserRecord
    });

    const response = await app.inject({
      method: 'GET',
      url: '/admin/llm/models',
      headers: authHeader()
    });

    expect(response.statusCode).toBe(403);

    await app.close();
  });
});
