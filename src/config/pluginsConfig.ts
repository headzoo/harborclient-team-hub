import type { PluginsSection } from '#/config/serverConfig.schema.js';

/**
 * Normalized plugin source settings loaded from server.yaml.
 */
export interface PluginsConfig {
  /**
   * Plugin marketplace catalog JSON URLs offered by this Team Hub.
   */
  catalogs: string[];

  /**
   * Trusted publisher signing-key registry JSON URLs offered by this Team Hub.
   */
  trusted: string[];
}

/**
 * Deduplicates URL strings while preserving the first occurrence.
 *
 * @param urls - Raw URL list from server.yaml.
 * @returns Unique URLs in original order.
 */
function dedupeUrls(urls: string[]): string[] {
  const seen = new Set<string>();
  const deduped: string[] = [];

  for (const url of urls) {
    if (seen.has(url)) {
      continue;
    }
    seen.add(url);
    deduped.push(url);
  }

  return deduped;
}

/**
 * Converts a validated YAML plugins section into normalized runtime config.
 *
 * @param section - Parsed plugins section from server.yaml.
 * @returns Normalized plugin source URLs for route handlers.
 */
export function normalizePluginsConfig(section: PluginsSection): PluginsConfig {
  return {
    catalogs: dedupeUrls(section.catalogs ?? []),
    trusted: dedupeUrls(section.trusted ?? [])
  };
}
