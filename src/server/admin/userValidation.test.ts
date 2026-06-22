import { describe, expect, it } from 'vitest';
import {
  buildAdminUserUpdateInput,
  normalizeAccessForRole,
  validateAccessList
} from '#/server/admin/userValidation.js';

describe('userValidation', () => {
  const existing = {
    name: 'Alice',
    role: 'user' as const,
    collectionAccess: ['collection-1'],
    environmentAccess: ['env-1'],
    llmAccess: false,
    llmModels: [],
    llmMonthlyTokenLimit: null
  };

  it('rejects mixed wildcard access lists', () => {
    expect(() => validateAccessList(['*', 'collection-1'])).toThrow(
      'Wildcard access "*" must be the only entry.'
    );
  });

  it('clears access lists for admin roles', () => {
    expect(
      normalizeAccessForRole('admin', [], [])
    ).toEqual({
      collectionAccess: [],
      environmentAccess: []
    });
  });

  it('rejects access flags on admin roles', () => {
    expect(() => normalizeAccessForRole('admin', ['*'], [])).toThrow(
      'Admin users cannot have collection or environment access.'
    );
  });

  it('clears access when changing role to admin', () => {
    const input = buildAdminUserUpdateInput(existing, { role: 'admin' });
    expect(input.collectionAccess).toEqual([]);
    expect(input.environmentAccess).toEqual([]);
  });

  it('applies partial field updates', () => {
    const input = buildAdminUserUpdateInput(existing, { name: 'Bob', llmAccess: true });
    expect(input).toEqual({
      name: 'Bob',
      role: undefined,
      collectionAccess: ['collection-1'],
      environmentAccess: ['env-1'],
      llmAccess: true,
      llmModels: undefined,
      llmMonthlyTokenLimit: undefined
    });
  });
});
