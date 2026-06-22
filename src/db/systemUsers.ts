import type { CreateUserInput, UserRecord } from '#/db/types.js';

/**
 * Display name assigned to the internal system user for CLI and migration actions.
 */
export const SYSTEM_USER_NAME = 'system';

/**
 * Returns true when the record is the internal system account used for migrations
 * and CLI attribution.
 *
 * @param user - User record or subset with id and name.
 * @param systemUserId - Cached system user id from the database, when known.
 * @returns True for the provisioned system account.
 */
export function isSystemUser(
  user: Pick<UserRecord, 'id' | 'name'>,
  systemUserId?: string | null
): boolean {
  if (systemUserId != null && user.id === systemUserId) {
    return true;
  }

  return user.name === SYSTEM_USER_NAME;
}

/**
 * Builds the input used when creating the system user during database migration.
 *
 * @returns CreateUserInput for the system account with admin role and no entity access.
 */
export function createSystemUserInput(): CreateUserInput {
  return {
    name: SYSTEM_USER_NAME,
    role: 'admin',
    collectionAccess: [],
    environmentAccess: []
  };
}
