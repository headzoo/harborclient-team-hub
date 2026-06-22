import type { UpdateUserInput, UserRole } from '#/db/types.js';

/**
 * Returns true when an access list mixes the wildcard with specific ids.
 *
 * @param access - Collection, environment, or LLM model access ids.
 * @returns True when the list is invalid.
 */
export function hasInvalidWildcardAccess(access: string[]): boolean {
  return access.includes('*') && access.length > 1;
}

/**
 * Validates a single access list for wildcard usage.
 *
 * @param access - Collection, environment, or LLM model access ids.
 * @throws {Error} When wildcard access is combined with specific ids.
 */
export function validateAccessList(access: string[]): void {
  if (hasInvalidWildcardAccess(access)) {
    throw new Error('Wildcard access "*" must be the only entry.');
  }
}

/**
 * Normalizes access lists for admin accounts and validates wildcard usage.
 *
 * @param role - Target user role.
 * @param collectionAccess - Parsed collection access ids.
 * @param environmentAccess - Parsed environment access ids.
 * @returns Access lists suitable for persistence.
 * @throws {Error} When admins receive access flags or lists are invalid.
 */
export function normalizeAccessForRole(
  role: UserRole,
  collectionAccess: string[],
  environmentAccess: string[]
): Pick<UpdateUserInput, 'collectionAccess' | 'environmentAccess'> {
  if (role === 'admin') {
    if (collectionAccess.length > 0 || environmentAccess.length > 0) {
      throw new Error('Admin users cannot have collection or environment access.');
    }

    return {
      collectionAccess: [],
      environmentAccess: []
    };
  }

  validateAccessList(collectionAccess);
  validateAccessList(environmentAccess);

  return {
    collectionAccess,
    environmentAccess
  };
}

/**
 * Builds the update payload applied to an existing user record.
 *
 * @param existing - Current user record from the database.
 * @param body - Partial fields from the management API request body.
 * @returns Normalized update input for {@link IDatabase.updateUser}.
 * @throws {Error} When access lists are invalid for the resulting role.
 */
export function buildAdminUserUpdateInput(
  existing: {
    name: string;
    role: UserRole;
    collectionAccess: string[];
    environmentAccess: string[];
    llmAccess: boolean;
    llmModels: string[];
    llmMonthlyTokenLimit: number | null;
  },
  body: {
    name?: string;
    role?: UserRole;
    collectionAccess?: string[];
    environmentAccess?: string[];
    llmAccess?: boolean;
    llmModels?: string[];
    llmMonthlyTokenLimit?: number | null;
  }
): UpdateUserInput {
  const role = body.role ?? existing.role;
  const collectionAccess =
    role === 'admin' ? [] : (body.collectionAccess ?? existing.collectionAccess);
  const environmentAccess =
    role === 'admin' ? [] : (body.environmentAccess ?? existing.environmentAccess);
  const access = normalizeAccessForRole(role, collectionAccess, environmentAccess);

  const llmModels = body.llmModels ?? existing.llmModels;
  validateAccessList(llmModels);

  return {
    name: body.name,
    role: body.role,
    collectionAccess: access.collectionAccess,
    environmentAccess: access.environmentAccess,
    llmAccess: body.llmAccess,
    llmModels: body.llmModels,
    llmMonthlyTokenLimit: body.llmMonthlyTokenLimit
  };
}
