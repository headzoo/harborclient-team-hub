import { z } from 'zod/v4';
import type { UserRecord } from '#/db/types.js';
import { userRoleSchema } from '#/server/routes/schemas/auth.js';
import { timestampSchema } from '#/server/routes/schemas/common.js';
import { listLlmModelsResponseSchema } from '#/server/routes/schemas/llm.js';

/**
 * Lightweight id/name pair returned by admin resource list routes.
 */
export const adminResourceOptionSchema = z.object({
  id: z.string(),
  name: z.string()
});

/**
 * Response body schema for `GET /admin/collections`.
 */
export const listAdminCollectionsResponseSchema = z.object({
  collections: z.array(adminResourceOptionSchema)
});

/**
 * Response body schema for `GET /admin/environments`.
 */
export const listAdminEnvironmentsResponseSchema = z.object({
  environments: z.array(adminResourceOptionSchema)
});

/**
 * Response body schema for `GET /admin/llm/models`.
 */
export const listAdminLlmModelsResponseSchema = listLlmModelsResponseSchema;
export const hubUserRecordSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: userRoleSchema,
  collectionAccess: z.array(z.string()),
  environmentAccess: z.array(z.string()),
  llmAccess: z.boolean(),
  llmModels: z.array(z.string()),
  llmMonthlyTokenLimit: z.number().int().nonnegative().nullable(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema
});

/**
 * Response body schema for `GET /admin/users`.
 */
export const listAdminUsersResponseSchema = z.object({
  users: z.array(hubUserRecordSchema)
});

/**
 * Request body schema for `PUT /admin/users/:id`.
 */
export const updateAdminUserBodySchema = z.object({
  name: z.string().trim().min(1).optional(),
  role: userRoleSchema.optional(),
  collectionAccess: z.array(z.string()).optional(),
  environmentAccess: z.array(z.string()).optional(),
  llmAccess: z.boolean().optional(),
  llmModels: z.array(z.string()).optional(),
  llmMonthlyTokenLimit: z.number().int().nonnegative().nullable().optional()
});

/**
 * Serializes a user record for JSON management API responses.
 *
 * @param user - User record from the database layer.
 * @returns User with ISO timestamp strings.
 */
export function serializeHubUser(user: UserRecord) {
  return {
    id: user.id,
    name: user.name,
    role: user.role,
    collectionAccess: user.collectionAccess,
    environmentAccess: user.environmentAccess,
    llmAccess: user.llmAccess,
    llmModels: user.llmModels,
    llmMonthlyTokenLimit: user.llmMonthlyTokenLimit,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString()
  };
}
