import type { FastifyInstance, FastifyReply } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import type { LlmConfig } from '#/config/llmConfig.js';
import type { IDatabase } from '#/db/IDatabase.js';
import { isSystemUser } from '#/db/systemUsers.js';
import { buildAdminUserUpdateInput } from '#/server/admin/userValidation.js';
import { canUseManagementApi } from '#/server/auth/accessControl.js';
import { listHubOfferedModels } from '#/server/llm/models.js';
import { handleDbError } from '#/server/routes/errors.js';
import { denyUnlessAllowed, requireAuthenticatedUser } from '#/server/routes/authorize.js';
import {
  hubUserRecordSchema,
  listAdminCollectionsResponseSchema,
  listAdminEnvironmentsResponseSchema,
  listAdminLlmModelsResponseSchema,
  listAdminUsersResponseSchema,
  serializeHubUser,
  updateAdminUserBodySchema
} from '#/server/routes/schemas/admin.js';
import { errorResponseSchema, idParamSchema } from '#/server/routes/schemas/common.js';
import { emptyResponseSchema } from '#/server/routes/schemas/entities.js';

/**
 * Options for registering management routes.
 */
export interface RegisterAdminRoutesOptions {
  /**
   * Database used to read user accounts and entity metadata.
   */
  db: IDatabase;

  /**
   * Normalized LLM configuration from server.yaml, or null when unset.
   */
  llm: LlmConfig | null;
}

/**
 * Sends a 503 response when LLM support is not configured on the hub.
 *
 * @param reply - Fastify reply used to short-circuit the handler.
 */
function sendLlmUnavailable(reply: FastifyReply): FastifyReply {
  return reply.code(503).send({
    error: 'LLM support is not configured on this Team Hub.'
  });
}

/**
 * Returns 403 when the target account is the internal system user.
 *
 * @param reply - Fastify reply used to send error payloads.
 * @param existing - User record being updated or deleted.
 * @param systemUserId - Cached system user id from the database, when known.
 * @returns True when the request was denied and a response was sent.
 */
function denySystemUserTarget(
  reply: Parameters<typeof denyUnlessAllowed>[0],
  existing: { id: string; name: string },
  systemUserId: string | null
): boolean {
  if (!isSystemUser(existing, systemUserId)) {
    return false;
  }

  void reply.code(403).send(errorResponseSchema.parse({ error: 'Forbidden' }));
  return true;
}

/**
 * Registers bearer-protected management routes for operator accounts.
 *
 * @param app - Encapsulated Fastify scope with auth applied.
 * @param options - Database and LLM configuration.
 */
export async function registerAdminRoutes(
  app: FastifyInstance,
  options: RegisterAdminRoutesOptions
): Promise<void> {
  const { db, llm } = options;
  const routes = app.withTypeProvider<ZodTypeProvider>();

  routes.route({
    method: 'GET',
    url: '/admin/users',
    schema: {
      response: {
        200: listAdminUsersResponseSchema
      }
    },
    /**
     * Lists all user accounts for operator administration.
     */
    handler: async (request, reply) => {
      try {
        const user = requireAuthenticatedUser(request);
        if (denyUnlessAllowed(reply, canUseManagementApi(user))) {
          return;
        }

        const systemUserId = db.getSystemUserId();
        const users = (await db.listUsers()).filter(
          (record) => !isSystemUser(record, systemUserId)
        );
        return reply.send({
          users: users.map((record) => serializeHubUser(record))
        });
      } catch (error) {
        if (handleDbError(reply, error)) {
          return;
        }

        throw error;
      }
    }
  });

  routes.route({
    method: 'GET',
    url: '/admin/collections',
    schema: {
      response: {
        200: listAdminCollectionsResponseSchema,
        403: errorResponseSchema
      }
    },
    /**
     * Lists all collections for operator user management.
     */
    handler: async (request, reply) => {
      try {
        const user = requireAuthenticatedUser(request);
        if (denyUnlessAllowed(reply, canUseManagementApi(user))) {
          return;
        }

        const collections = await db.listCollections();
        return reply.send({
          collections: collections.map((collection) => ({
            id: collection.id,
            name: collection.name
          }))
        });
      } catch (error) {
        if (handleDbError(reply, error)) {
          return;
        }

        throw error;
      }
    }
  });

  routes.route({
    method: 'GET',
    url: '/admin/environments',
    schema: {
      response: {
        200: listAdminEnvironmentsResponseSchema,
        403: errorResponseSchema
      }
    },
    /**
     * Lists all environments for operator user management.
     */
    handler: async (request, reply) => {
      try {
        const user = requireAuthenticatedUser(request);
        if (denyUnlessAllowed(reply, canUseManagementApi(user))) {
          return;
        }

        const environments = await db.listEnvironments();
        return reply.send({
          environments: environments.map((environment) => ({
            id: environment.id,
            name: environment.name
          }))
        });
      } catch (error) {
        if (handleDbError(reply, error)) {
          return;
        }

        throw error;
      }
    }
  });

  routes.route({
    method: 'GET',
    url: '/admin/llm/models',
    schema: {
      response: {
        200: listAdminLlmModelsResponseSchema,
        403: errorResponseSchema,
        503: errorResponseSchema
      }
    },
    /**
     * Lists all hub-offered LLM models for operator user management.
     */
    handler: async (request, reply) => {
      if (!llm) {
        return sendLlmUnavailable(reply);
      }

      const user = requireAuthenticatedUser(request);
      if (denyUnlessAllowed(reply, canUseManagementApi(user))) {
        return;
      }

      const models = listHubOfferedModels(llm).map((model) => ({
        id: model.id,
        label: model.label,
        provider: model.provider
      }));

      return reply.send({ models });
    }
  });

  routes.route({
    method: 'PUT',
    url: '/admin/users/:id',
    schema: {
      params: idParamSchema,
      body: updateAdminUserBodySchema,
      response: {
        200: hubUserRecordSchema,
        400: errorResponseSchema,
        403: errorResponseSchema,
        404: errorResponseSchema
      }
    },
    /**
     * Updates a user account for operator administration.
     */
    handler: async (request, reply) => {
      try {
        const user = requireAuthenticatedUser(request);
        if (denyUnlessAllowed(reply, canUseManagementApi(user))) {
          return;
        }

        const systemUserId = db.getSystemUserId();
        const existing = await db.findUserById(request.params.id);
        if (!existing) {
          void reply.code(404).send(errorResponseSchema.parse({ error: 'User not found' }));
          return;
        }

        if (denySystemUserTarget(reply, existing, systemUserId)) {
          return;
        }

        const input = buildAdminUserUpdateInput(existing, request.body);
        const updated = await db.updateUser(request.params.id, input, user.id);
        return reply.send(serializeHubUser(updated));
      } catch (error) {
        if (handleDbError(reply, error)) {
          return;
        }

        throw error;
      }
    }
  });

  routes.route({
    method: 'DELETE',
    url: '/admin/users/:id',
    schema: {
      params: idParamSchema,
      response: {
        204: emptyResponseSchema,
        403: errorResponseSchema,
        404: errorResponseSchema
      }
    },
    /**
     * Deletes a user account and removes all of their API tokens.
     */
    handler: async (request, reply) => {
      try {
        const user = requireAuthenticatedUser(request);
        if (denyUnlessAllowed(reply, canUseManagementApi(user))) {
          return;
        }

        const systemUserId = db.getSystemUserId();
        const existing = await db.findUserById(request.params.id);
        if (!existing) {
          void reply.code(404).send(errorResponseSchema.parse({ error: 'User not found' }));
          return;
        }

        if (denySystemUserTarget(reply, existing, systemUserId)) {
          return;
        }

        await db.deleteUser(request.params.id, user.id);
        return reply.code(204).send(null);
      } catch (error) {
        if (handleDbError(reply, error)) {
          return;
        }

        throw error;
      }
    }
  });
}
