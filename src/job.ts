/**
 * Scatter Utility Job Logic
 *
 * Extracts entity IDs from invoke_options and returns them as outputs
 * for rhiza's scatter handoff system to dispatch.
 */

import type { KladosJob, Output } from '@arke-institute/rhiza';
import type { EntityIdInput } from './types';

/**
 * Normalize an entity ID input to the Output format expected by rhiza
 */
function normalizeEntityId(input: EntityIdInput): Output {
  if (typeof input === 'string') {
    return input;
  }

  // Object format with entity_id (and optional routing properties)
  const { entity_id, ...rest } = input;
  if (Object.keys(rest).length === 0) {
    return entity_id;
  }

  // Return as OutputItem for routing support
  return { entity_id, ...rest };
}

/**
 * Process a scatter job
 *
 * Extracts entity_ids from request.input and returns them as outputs.
 * The rhiza handoff system will then scatter them to the next workflow step.
 *
 * @param job - The KladosJob instance
 * @returns Array of entity IDs/outputs for scatter handoff
 */
export async function processScatterJob(job: KladosJob): Promise<Output[]> {
  const input = job.request.input;

  // Validate entity_ids exists and is an array
  const entityIds = input?.entity_ids;

  if (!entityIds) {
    throw new Error('input.entity_ids is required');
  }

  if (!Array.isArray(entityIds)) {
    throw new Error('input.entity_ids must be an array');
  }

  if (entityIds.length === 0) {
    throw new Error('input.entity_ids must not be empty');
  }

  job.log.info(`Scattering ${entityIds.length} entities`);

  // Normalize all inputs to Output format
  const outputs = entityIds.map(normalizeEntityId);

  job.log.success(`Prepared ${outputs.length} outputs for scatter`);

  return outputs;
}
