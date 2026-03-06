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
 * Optional input for generic scatter mode
 *
 * Note: Entity IDs are now received via request.target_entities (standard KladosRequest field)
 * rather than input.entity_ids. The input is only used for generic scatter mode options.
 */
export interface ScatterInput {
  /** Klados ID to invoke directly (generic scatter mode) */
  target_klados?: string;

  /** Rhiza ID to invoke directly (generic scatter mode) */
  target_rhiza?: string;

  /** Input to pass through to each target invocation */
  passthrough_input?: Record<string, unknown>;

  /**
   * @deprecated Use request.target_entities instead.
   * Kept for backward compatibility with existing workflows.
   */
  entity_ids?: string[];
}
