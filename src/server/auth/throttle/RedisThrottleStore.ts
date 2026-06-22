import Redis from 'ioredis';
import { redisSectionSchema } from '#/config/serverConfig.schema.js';
import { formatZodError } from '#/db/validation.js';
import {
  DEFAULT_THROTTLE_POLICY,
  type IThrottleStore,
  type ThrottlePolicy
} from '#/server/auth/throttle/IThrottleStore.js';

/**
 * Minimal Redis client surface used by {@link RedisThrottleStore}.
 */
export interface RedisThrottleClient {
  /**
   * Increments a key and returns the new value.
   */
  incr(key: string): Promise<number>;

  /**
   * Sets a key's time-to-live in seconds.
   */
  expire(key: string, seconds: number): Promise<number>;

  /**
   * Returns whether a key exists.
   */
  exists(...keys: string[]): Promise<number>;

  /**
   * Sets a key with an optional expiry in seconds.
   */
  set(key: string, value: string, mode: 'EX', seconds: number): Promise<'OK' | null>;

  /**
   * Deletes one or more keys.
   */
  del(...keys: string[]): Promise<number>;

  /**
   * Opens the Redis connection.
   */
  connect(): Promise<void>;

  /**
   * Closes the Redis connection.
   */
  quit(): Promise<'OK' | undefined>;
}

/**
 * Validated Redis connection settings from server.yaml.
 */
export interface RedisThrottleConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
  maxFailures?: number;
  windowSeconds?: number;
  blockSeconds?: number;
}

/**
 * Redis-backed implementation of authentication throttling counters and blocks.
 */
export class RedisThrottleStore implements IThrottleStore {
  /**
   * Creates a Redis throttle store from an injected client and policy.
   *
   * @param client - Redis client implementing the throttle command surface.
   * @param config - Connection metadata including optional key prefix.
   * @param policy - Failure counting and block duration settings.
   */
  constructor(
    private readonly client: RedisThrottleClient,
    private readonly config: Pick<RedisThrottleConfig, 'keyPrefix'>,
    private readonly policy: ThrottlePolicy
  ) {}

  /**
   * Validates raw config and constructs a {@link RedisThrottleStore}.
   *
   * @param config - Raw `redis` section from server.yaml.
   * @returns Configured Redis throttle store instance.
   * @throws {Error} When config fails Redis-specific validation.
   */
  static fromConfig(config: unknown): RedisThrottleStore {
    const parsed = redisSectionSchema.safeParse(config);
    if (!parsed.success) {
      throw new Error(formatZodError(parsed.error));
    }

    const policy: ThrottlePolicy = {
      maxFailures: parsed.data.maxFailures ?? DEFAULT_THROTTLE_POLICY.maxFailures,
      windowSeconds: parsed.data.windowSeconds ?? DEFAULT_THROTTLE_POLICY.windowSeconds,
      blockSeconds: parsed.data.blockSeconds ?? DEFAULT_THROTTLE_POLICY.blockSeconds
    };

    const client = new Redis({
      host: parsed.data.host,
      port: parsed.data.port,
      password: parsed.data.password,
      db: parsed.data.db,
      lazyConnect: true
    }) as unknown as RedisThrottleClient;

    return new RedisThrottleStore(client, { keyPrefix: parsed.data.keyPrefix }, policy);
  }

  /**
   * Opens the underlying Redis connection.
   */
  async connect(): Promise<void> {
    await this.client.connect();
  }

  /**
   * Closes the underlying Redis connection.
   */
  async disconnect(): Promise<void> {
    await this.client.quit();
  }

  /**
   * Returns the configured throttle policy.
   */
  getPolicy(): ThrottlePolicy {
    return this.policy;
  }

  /**
   * Checks whether the throttle block key exists for the given auth key.
   *
   * @param key - Throttle key (typically client IP plus token hash).
   */
  async isBlocked(key: string): Promise<boolean> {
    const blocked = await this.client.exists(this.blockKey(key));
    return blocked > 0;
  }

  /**
   * Increments the failure counter and applies a block when the threshold is reached.
   *
   * @param key - Throttle key (typically client IP plus token hash).
   * @returns True when a new block was applied.
   */
  async recordFailure(key: string): Promise<boolean> {
    const failKey = this.failKey(key);
    const count = await this.client.incr(failKey);

    if (count === 1) {
      await this.client.expire(failKey, this.policy.windowSeconds);
    }

    if (count >= this.policy.maxFailures) {
      await this.client.set(this.blockKey(key), '1', 'EX', this.policy.blockSeconds);
      return true;
    }

    return false;
  }

  /**
   * Clears failure and block keys after successful authentication.
   *
   * @param key - Throttle key (typically client IP plus token hash).
   */
  async reset(key: string): Promise<void> {
    await this.client.del(this.failKey(key), this.blockKey(key));
  }

  /**
   * Builds the Redis key used to count failed auth attempts.
   *
   * @param key - Throttle key (typically client IP plus token hash).
   */
  private failKey(key: string): string {
    return `${this.prefix()}throttle:fail:${key}`;
  }

  /**
   * Builds the Redis key used to mark an auth key as blocked.
   *
   * @param key - Throttle key (typically client IP plus token hash).
   */
  private blockKey(key: string): string {
    return `${this.prefix()}throttle:block:${key}`;
  }

  /**
   * Returns the configured key prefix, if any.
   */
  private prefix(): string {
    const keyPrefix = this.config.keyPrefix;
    if (!keyPrefix) {
      return '';
    }

    return keyPrefix.endsWith(':') ? keyPrefix : `${keyPrefix}:`;
  }
}
