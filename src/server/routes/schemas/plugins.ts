import { z } from 'zod/v4';

/**
 * Response schema for Team Hub plugin source URLs exposed to HarborClient.
 */
export const pluginSourcesResponseSchema = z.object({
  catalogs: z.array(z.string()),
  trusted: z.array(z.string())
});

/**
 * Validated plugin source URLs returned by GET /plugins/sources.
 */
export type PluginSourcesResponse = z.infer<typeof pluginSourcesResponseSchema>;
