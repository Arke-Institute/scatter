/**
 * Type definitions for the scatter utility klados
 */

/**
 * Cloudflare Worker environment bindings
 */
export interface Env {
  /** Klados agent ID (fallback, used if network-specific not set) */
  AGENT_ID: string;

  /** Agent version for logging */
  AGENT_VERSION: string;

  /** Arke agent API key (fallback, used if network-specific not set) */
  ARKE_AGENT_KEY: string;

  /** Klados agent ID for test network */
  AGENT_ID_TEST?: string;

  /** Klados agent ID for main network */
  AGENT_ID_MAIN?: string;

  /** Arke agent API key for test network (secret) */
  ARKE_AGENT_KEY_TEST?: string;

  /** Arke agent API key for main network (secret) */
  ARKE_AGENT_KEY_MAIN?: string;

  /** Verification token for endpoint verification (set during registration) */
  VERIFICATION_TOKEN?: string;

  /** Agent ID for verification (used before AGENT_ID is configured) */
  ARKE_VERIFY_AGENT_ID?: string;

  /** Index signature for additional env vars */
  [key: string]: unknown;
}

/**
 * Entity ID input - can be a simple string or an object with routing info
 */
export type EntityIdInput = string | {
  entity_id: string;
  entity_class?: string;
  [key: string]: unknown;
};

/**
 * Expected input for the scatter utility
 */
export interface ScatterInput {
  /** Array of entity IDs to scatter */
  entity_ids: EntityIdInput[];
}
