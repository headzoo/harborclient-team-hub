import { z } from 'zod/v4';

/**
 * Account role values exposed on the session endpoint.
 */
export const userRoleSchema = z.enum(['admin', 'user']);

/**
 * Capability flags returned by `GET /auth/session`.
 */
export const sessionCapabilitiesSchema = z.object({
  dataApi: z.boolean(),
  managementApi: z.boolean(),
  llm: z.boolean()
});

/**
 * Response body schema for `GET /auth/session`.
 */
export const sessionResponseSchema = z.object({
  user: z.object({
    id: z.string(),
    name: z.string(),
    role: userRoleSchema
  }),
  token: z.object({
    id: z.string(),
    prefix: z.string()
  }),
  capabilities: sessionCapabilitiesSchema
});
