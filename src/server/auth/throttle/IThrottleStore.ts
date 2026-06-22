/**
 * Policy controlling how failed authentication attempts are counted and blocked.
 */
export interface ThrottlePolicy {
  /**
   * Number of failures within the window before a block is applied.
   */
  maxFailures: number;

  /**
   * Sliding window length in seconds for counting failures.
   */
  windowSeconds: number;

  /**
   * Block duration in seconds after the failure threshold is reached.
   */
  blockSeconds: number;
}

/**
 * Default throttle policy: 10 failures within 15 minutes triggers a 15 minute block.
 */
export const DEFAULT_THROTTLE_POLICY: ThrottlePolicy = {
  maxFailures: 10,
  windowSeconds: 900,
  blockSeconds: 900
};

/**
 * Contract for Redis-backed authentication throttling storage.
 */
export interface IThrottleStore {
  /**
   * Opens a connection to the throttle store.
   */
  connect(): Promise<void>;

  /**
   * Closes the throttle store connection and releases resources.
   */
  disconnect(): Promise<void>;

  /**
   * Returns the configured throttle policy for this store.
   */
  getPolicy(): ThrottlePolicy;

  /**
   * Checks whether the given key is currently blocked.
   *
   * @param key - Throttle key (typically client IP plus token hash).
   * @returns True when further auth attempts should be rejected with HTTP 429.
   */
  isBlocked(key: string): Promise<boolean>;

  /**
   * Records a failed authentication attempt for the given key.
   *
   * @param key - Throttle key (typically client IP plus token hash).
   * @returns True when the failure threshold was reached and a block was applied.
   */
  recordFailure(key: string): Promise<boolean>;

  /**
   * Clears failure counters and blocks for the given key after successful auth.
   *
   * @param key - Throttle key (typically client IP plus token hash).
   */
  reset(key: string): Promise<void>;
}
