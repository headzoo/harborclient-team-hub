import { vi, type Mocked } from 'vitest';
import {
  DEFAULT_THROTTLE_POLICY,
  type IThrottleStore,
  type ThrottlePolicy
} from '#/server/auth/throttle/IThrottleStore.js';

/**
 * Stub {@link IThrottleStore} with unresolved vi.fn mocks for every method.
 *
 * Used by HTTP and auth tests that exercise bearer authentication.
 *
 * @param policy - Optional throttle policy returned by {@link IThrottleStore.getPolicy}.
 * @returns Throttle store stub whose methods can be configured per test.
 */
export function createStubThrottleStore(
  policy: ThrottlePolicy = DEFAULT_THROTTLE_POLICY
): Mocked<IThrottleStore> {
  return {
    connect: vi.fn(),
    disconnect: vi.fn(),
    getPolicy: vi.fn().mockReturnValue(policy),
    isBlocked: vi.fn(),
    recordFailure: vi.fn(),
    reset: vi.fn()
  };
}
