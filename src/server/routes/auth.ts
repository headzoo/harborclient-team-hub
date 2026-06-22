import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { buildSessionPayload } from '#/server/auth/sessionCapabilities.js';
import { requireAuthenticatedUser } from '#/server/routes/authorize.js';
import { sessionResponseSchema } from '#/server/routes/schemas/auth.js';

/**
 * Registers bearer-protected authentication introspection routes.
 *
 * @param app - Encapsulated Fastify scope with auth applied.
 */
export async function registerAuthRoutes(app: FastifyInstance): Promise<void> {
  const routes = app.withTypeProvider<ZodTypeProvider>();

  routes.route({
    method: 'GET',
    url: '/auth/session',
    schema: {
      response: {
        200: sessionResponseSchema
      }
    },
    /**
     * Returns the authenticated user, token metadata, and derived API capabilities.
     */
    handler: async (request, reply) => {
      const user = requireAuthenticatedUser(request);
      const apiToken = request.apiToken;

      if (!apiToken) {
        throw new Error('Authenticated API token is required');
      }

      return reply.send(buildSessionPayload(user, apiToken));
    }
  });
}
