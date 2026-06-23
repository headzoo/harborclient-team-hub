import { afterEach, describe, expect, it, vi } from 'vitest';
import { isSystemUser, SYSTEM_USER_NAME } from '#/db/systemUsers.js';

describe('isSystemUser', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('matches by id when systemUserId is known', () => {
    expect(isSystemUser({ id: 'system-user-id', name: SYSTEM_USER_NAME }, 'system-user-id')).toBe(
      true
    );
  });

  it('does not match by name when systemUserId is known but ids differ', () => {
    expect(isSystemUser({ id: 'other-id', name: SYSTEM_USER_NAME }, 'system-user-id')).toBe(false);
  });

  it('falls back to name matching when systemUserId is null', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    expect(isSystemUser({ id: 'any-id', name: SYSTEM_USER_NAME }, null)).toBe(true);
    expect(warn).toHaveBeenCalledOnce();
  });

  it('returns false for unrelated users when systemUserId is null', () => {
    expect(isSystemUser({ id: 'user-1', name: 'Alice' }, null)).toBe(false);
  });
});
