import type { ApiTokenRecord, UserRecord } from '#/db/types.js';
import { canUseDataApi, canUseLlm, isAdmin } from '#/server/auth/accessControl.js';

/**
 * Capability flags derived from the authenticated user account.
 */
export interface SessionCapabilities {
  /**
   * When true, the token may call entity data routes (collections, environments, etc.).
   */
  dataApi: boolean;

  /**
   * When true, the token may call management routes (user and token administration).
   */
  managementApi: boolean;

  /**
   * When true, the token may call hub-proxied LLM routes.
   */
  llm: boolean;
}

/**
 * JSON payload returned by `GET /auth/session`.
 */
export interface SessionPayload {
  /**
   * User account owning the authenticated bearer token.
   */
  user: {
    /**
     * Stable user account identifier.
     */
    id: string;

    /**
     * Unique display name for the account.
     */
    name: string;

    /**
     * Account role determining API capabilities.
     */
    role: UserRecord['role'];
  };

  /**
   * Metadata for the API token used to authenticate the request.
   */
  token: {
    /**
     * Stable token record identifier.
     */
    id: string;

    /**
     * Non-secret prefix shown in operator listings (for example `hbk_AbCd1234`).
     */
    prefix: string;
  };

  /**
   * Derived capability flags for clients such as HarborClient.
   */
  capabilities: SessionCapabilities;
}

/**
 * Builds the session payload for the authenticated user and API token.
 *
 * @param user - User account resolved from the bearer token.
 * @param apiToken - Active API token record used for authentication.
 * @returns Session payload suitable for JSON serialization.
 */
export function buildSessionPayload(user: UserRecord, apiToken: ApiTokenRecord): SessionPayload {
  return {
    user: {
      id: user.id,
      name: user.name,
      role: user.role
    },
    token: {
      id: apiToken.id,
      prefix: apiToken.tokenPrefix
    },
    capabilities: {
      dataApi: canUseDataApi(user),
      managementApi: isAdmin(user),
      llm: canUseLlm(user)
    }
  };
}
