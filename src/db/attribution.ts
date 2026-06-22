import type { UserRecord } from '#/db/types.js';

/**
 * Resolves the display name for an acting user id.
 *
 * @param findUserById - Lookup function provided by the active database backend.
 * @param actingUserId - User identifier performing the action.
 * @returns The user's display name, or null when the user no longer exists.
 */
export async function resolveActingUserName(
  findUserById: (id: string) => Promise<UserRecord | null>,
  actingUserId: string
): Promise<string | null> {
  const user = await findUserById(actingUserId);
  return user?.name ?? null;
}
