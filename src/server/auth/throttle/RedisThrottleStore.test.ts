import { describe, expect, it } from 'vitest';
import { DEFAULT_THROTTLE_POLICY } from '#/server/auth/throttle/IThrottleStore.js';
import {
  type RedisThrottleClient,
  RedisThrottleStore
} from '#/server/auth/throttle/RedisThrottleStore.js';

/**
 * In-memory Redis client used to unit test throttle key operations.
 */
class FakeRedisClient implements RedisThrottleClient {
  private readonly values = new Map<string, string>();
  private readonly expiries = new Map<string, number>();

  /**
   * Increments a key and returns the new value.
   */
  async incr(key: string): Promise<number> {
    const current = Number(this.values.get(key) ?? '0') + 1;
    this.values.set(key, String(current));
    return current;
  }

  /**
   * Sets a key's time-to-live in seconds.
   */
  async expire(key: string, seconds: number): Promise<number> {
    this.expiries.set(key, seconds);
    return 1;
  }

  /**
   * Returns whether a key exists.
   */
  async exists(...keys: string[]): Promise<number> {
    return keys.some((key) => this.values.has(key)) ? 1 : 0;
  }

  /**
   * Sets a key with an optional expiry in seconds.
   */
  async set(key: string, value: string, mode: 'EX', seconds: number): Promise<'OK'> {
    this.values.set(key, value);
    this.expiries.set(key, seconds);
    return 'OK';
  }

  /**
   * Deletes one or more keys.
   */
  async del(...keys: string[]): Promise<number> {
    let deleted = 0;
    for (const key of keys) {
      if (this.values.delete(key)) {
        deleted += 1;
      }
      this.expiries.delete(key);
    }
    return deleted;
  }

  /**
   * Opens the fake client connection.
   */
  async connect(): Promise<void> {
    return undefined;
  }

  /**
   * Closes the fake client connection.
   */
  async quit(): Promise<'OK'> {
    return 'OK';
  }

  /**
   * Returns the expiry seconds recorded for a key.
   */
  getExpiry(key: string): number | undefined {
    return this.expiries.get(key);
  }

  /**
   * Returns the stored value for a key.
   */
  getValue(key: string): string | undefined {
    return this.values.get(key);
  }
}

describe('RedisThrottleStore', () => {
  it('sets window expiry on the first failure increment', async () => {
    const client = new FakeRedisClient();
    const store = new RedisThrottleStore(client, {}, DEFAULT_THROTTLE_POLICY);

    await store.recordFailure('127.0.0.1:abc');

    expect(client.getExpiry('throttle:fail:127.0.0.1:abc')).toBe(900);
  });

  it('applies a block when the failure threshold is reached', async () => {
    const client = new FakeRedisClient();
    const store = new RedisThrottleStore(
      client,
      {},
      { maxFailures: 3, windowSeconds: 60, blockSeconds: 120 }
    );

    await store.recordFailure('127.0.0.1:abc');
    await store.recordFailure('127.0.0.1:abc');
    const blocked = await store.recordFailure('127.0.0.1:abc');

    expect(blocked).toBe(true);
    expect(await store.isBlocked('127.0.0.1:abc')).toBe(true);
    expect(client.getExpiry('throttle:block:127.0.0.1:abc')).toBe(120);
  });

  it('clears failure and block keys on reset', async () => {
    const client = new FakeRedisClient();
    const store = new RedisThrottleStore(
      client,
      {},
      { maxFailures: 1, windowSeconds: 60, blockSeconds: 120 }
    );

    await store.recordFailure('127.0.0.1:abc');
    expect(await store.isBlocked('127.0.0.1:abc')).toBe(true);

    await store.reset('127.0.0.1:abc');

    expect(await store.isBlocked('127.0.0.1:abc')).toBe(false);
    expect(client.getValue('throttle:fail:127.0.0.1:abc')).toBeUndefined();
    expect(client.getValue('throttle:block:127.0.0.1:abc')).toBeUndefined();
  });

  it('prefixes throttle keys when keyPrefix is configured', async () => {
    const client = new FakeRedisClient();
    const store = new RedisThrottleStore(
      client,
      { keyPrefix: 'harbor' },
      { maxFailures: 1, windowSeconds: 60, blockSeconds: 120 }
    );

    await store.recordFailure('127.0.0.1:abc');

    expect(client.getValue('harbor:throttle:fail:127.0.0.1:abc')).toBe('1');
  });
});
