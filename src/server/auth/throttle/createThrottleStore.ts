import type { IThrottleStore } from '#/server/auth/throttle/IThrottleStore.js';
import { RedisThrottleStore } from '#/server/auth/throttle/RedisThrottleStore.js';

/**
 * Creates a throttle store instance from the raw `redis` section of server.yaml.
 *
 * @param config - Raw `redis` section from server.yaml.
 * @returns Configured throttle store for authentication rate limiting.
 * @throws {Error} When config fails validation.
 */
export function createThrottleStore(config: unknown): IThrottleStore {
  return RedisThrottleStore.fromConfig(config);
}
