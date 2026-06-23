import { SYSTEM_USER_NAME } from '#/db/systemUsers.js';
import type { UserRecord } from '#/db/types.js';

/**
 * Error thrown when a user name is already assigned to another account.
 */
export class DuplicateUserNameError extends Error {
  /**
   * Creates a duplicate-name error with a client-facing message.
   *
   * @param name - Display name that is already in use.
   */
  constructor(name: string) {
    super(`User name "${name}" is already in use.`);
    this.name = 'DuplicateUserNameError';
  }
}

/**
 * Error thrown when a display name is reserved for the internal system account.
 */
export class ReservedUserNameError extends Error {
  /**
   * Creates a reserved-name error with a client-facing message.
   *
   * @param name - Display name that is reserved.
   */
  constructor(name: string) {
    super(`User name "${name}" is reserved for the internal system account.`);
    this.name = 'ReservedUserNameError';
  }
}

/**
 * Ensures a display name is not reserved for the internal system account.
 *
 * @param name - Candidate display name.
 * @throws {ReservedUserNameError} When the name is reserved.
 */
export function assertUserNameNotReserved(name: string): void {
  if (name === SYSTEM_USER_NAME) {
    throw new ReservedUserNameError(name);
  }
}

/**
 * Ensures a display name is not already used by a different user account.
 *
 * @param name - Candidate display name.
 * @param userId - User identifier being updated.
 * @param existing - User record returned by {@link IDatabase.findUserByName}, if any.
 * @throws {DuplicateUserNameError} When another account already uses the name.
 */
export function assertUserNameAvailable(
  name: string,
  userId: string,
  existing: UserRecord | null
): void {
  if (existing && existing.id !== userId) {
    throw new DuplicateUserNameError(name);
  }
}
