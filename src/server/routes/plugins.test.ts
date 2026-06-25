import { describe, expect, it } from 'vitest';
import { createStubDatabase } from '#/db/stubDatabase.js';
import { authHeader, createProtectedTestApp } from '#/server/routes/test/createTestApp.js';

const samplePluginsConfig = {
  catalogs: ['https://harborclient.com/plugin_catalog.json'],
  trusted: ['https://harborclient.com/plugins/trusted.json']
};

describe('plugins routes', () => {
  it('returns empty arrays when plugins are not configured', async () => {
    const db = createStubDatabase();
    const app = await createProtectedTestApp({ db, withValidAuth: true, plugins: null });

    const response = await app.inject({
      method: 'GET',
      url: '/plugins/sources',
      headers: authHeader()
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      catalogs: [],
      trusted: []
    });
    await app.close();
  });

  it('returns configured plugin source URLs for an authenticated user', async () => {
    const db = createStubDatabase();
    const app = await createProtectedTestApp({
      db,
      withValidAuth: true,
      plugins: samplePluginsConfig
    });

    const response = await app.inject({
      method: 'GET',
      url: '/plugins/sources',
      headers: authHeader()
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(samplePluginsConfig);
    await app.close();
  });

  it('returns 401 without a bearer token', async () => {
    const db = createStubDatabase();
    const app = await createProtectedTestApp({
      db,
      withValidAuth: true,
      plugins: samplePluginsConfig
    });

    const response = await app.inject({
      method: 'GET',
      url: '/plugins/sources'
    });

    expect(response.statusCode).toBe(401);
    await app.close();
  });
});
