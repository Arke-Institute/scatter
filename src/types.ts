/**
 * Type definitions for the scatter utility klados
 */

/**
 * Cloudflare Worker environment bindings
 */
export interface Env {
  /** Klados agent ID (registered in Arke) */
  AGENT_ID: string;

  /** Agent version for logging */
  AGENT_VERSION: string;

  /** Arke agent API key (secret) */
  ARKE_AGENT_KEY: string;

  /** Verification token for endpoint verification (set during registration) */
  VERIFICATION_TOKEN?: string;

  /** Agent ID for verification (used before AGENT_ID is configured) */
  ARKE_VERIFY_AGENT_ID?: string;
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
