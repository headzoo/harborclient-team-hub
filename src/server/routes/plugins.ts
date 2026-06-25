import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import type { PluginsConfig } from '#/config/pluginsConfig.js';
import { pluginSourcesResponseSchema } from '#/server/routes/schemas/plugins.js';

/**
 * Options for registering plugin source routes.
 */
export interface RegisterPluginsRoutesOptions {
  /**
   * Normalized plugin source configuration from server.yaml, or null when unset.
   */
  plugins: PluginsConfig | null;
}

/**
 * Registers bearer-protected plugin source routes.
 *
 * @param app - Encapsulated Fastify scope with auth applied.
 * @param options - Plugin source configuration from server.yaml.
 */
export async function registerPluginsRoutes(
  app: FastifyInstance,
  options: RegisterPluginsRoutesOptions
): Promise<void> {
  const routes = app.withTypeProvider<ZodTypeProvider>();

  routes.route({
    method: 'GET',
    url: '/plugins/sources',
    schema: {
      response: {
        200: pluginSourcesResponseSchema
      }
    },
    /**
     * Returns plugin catalog and trusted-publisher URLs configured on this Team Hub.
     */
    handler: async (_request, reply) => {
      if (!options.plugins) {
        return reply.send({
          catalogs: [],
          trusted: []
        });
      }

      return reply.send({
        catalogs: options.plugins.catalogs,
        trusted: options.plugins.trusted
      });
    }
  });
}
