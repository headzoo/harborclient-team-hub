import type { CreateUserInput } from '#/db/types.js';

/**
 * Display name assigned to the internal system user for CLI and migration actions.
 */
export const SYSTEM_USER_NAME = 'system';

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
