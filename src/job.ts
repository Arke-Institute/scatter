/**
 * Scatter Utility Job Logic
 *
 * Two modes of operation:
 * 1. Rhiza handoff mode (default): Extracts entity IDs from input and returns
 *    them as outputs for rhiza's scatter handoff system to dispatch.
 *
 * 2. Generic scatter mode: When target_klados or target_rhiza is specified,
 *    invokes the target directly for each entity ID (fire-and-forget).
 */

import type { KladosJob, Output, InvokeOptions, DelegateOutputItem } from '@arke-institute/rhiza';
import { invokeTarget, delegateToScatterUtility } from '@arke-institute/rhiza';
import type { ArkeClient } from '@arke-institute/sdk';
import type { EntityIdInput } from './types';

const SCATTER_THRESHOLD = 50;
const INVOKE_CONCURRENCY = 10;
const SCATTER_UTILITY_URL = 'https://scatter-utility.arke.institute';

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
 * Two modes of operation:
 * 1. Rhiza handoff mode (default): Returns entity_ids as outputs for rhiza's
 *    scatter handoff to dispatch.
 * 2. Generic scatter mode: When target_klados or target_rhiza is specified,
 *    invokes the target directly for each entity ID.
 *
 * @param job - The KladosJob instance
 * @returns Array of entity IDs/outputs for scatter handoff (empty in generic mode)
 */
export async function processScatterJob(job: KladosJob): Promise<Output[]> {
  const input = job.request.input;
  const targetKlados = input?.target_klados as string | undefined;
  const targetRhiza = input?.target_rhiza as string | undefined;

  // Validate entity_ids exists and is an array
  const entityIds = input?.entity_ids as EntityIdInput[] | undefined;

  if (!entityIds) {
    throw new Error('input.entity_ids is required');
  }

  if (!Array.isArray(entityIds)) {
    throw new Error('input.entity_ids must be an array');
  }

  if (entityIds.length === 0) {
    throw new Error('input.entity_ids must not be empty');
  }

  // GENERIC SCATTER MODE: target specified in input
  if (targetKlados || targetRhiza) {
    const targetId = targetKlados || targetRhiza!;
    const targetType = targetKlados ? 'klados' as const : 'rhiza' as const;

    job.log.info(`Generic scatter: ${entityIds.length} entities → ${targetType} ${targetId}`);

    // Build invoke options (no rhiza context)
    const invokeOpts: InvokeOptions = {
      targetCollection: job.request.target_collection,
      jobCollectionId: job.request.job_collection,
      apiBase: job.request.api_base,
      network: job.request.network,
      parentLogs: [job.logId],
      input: input?.passthrough_input as Record<string, unknown> | undefined,
    };

    // Normalize entity IDs to strings
    const normalizedIds = entityIds.map(id =>
      typeof id === 'string' ? id : id.entity_id
    );

    if (normalizedIds.length > SCATTER_THRESHOLD) {
      // Delegate to scatter-utility service
      const delegateOutputs: DelegateOutputItem[] = normalizedIds.map(id => ({
        id,
        target: targetId,
        targetType,
      }));

      const result = await delegateToScatterUtility({
        outputs: delegateOutputs,
        invokeOptions: invokeOpts,
        scatterUtilityUrl: SCATTER_UTILITY_URL,
        authToken: job.config.authToken!,
      });

      if (!result.accepted) {
        throw new Error(`Scatter delegation failed: ${result.error}`);
      }

      job.log.success(`Delegated ${normalizedIds.length} invocations (dispatch: ${result.dispatchId})`);
    } else {
      // Direct invocation with concurrency control
      // Use the job's existing ArkeClient
      await invokeWithConcurrency(job.client, normalizedIds, targetId, targetType, invokeOpts);
      job.log.success(`Invoked ${normalizedIds.length} targets directly`);
    }

    // Return empty outputs - no rhiza handoff needed
    return [];
  }

  // ORIGINAL BEHAVIOR: return entity_ids for rhiza handoff
  job.log.info(`Scattering ${entityIds.length} entities`);

  // Normalize all inputs to Output format
  const outputs = entityIds.map(normalizeEntityId);

  job.log.success(`Prepared ${outputs.length} outputs for scatter`);

  return outputs;
}

/**
 * Invoke targets with concurrency control
 */
async function invokeWithConcurrency(
  client: ArkeClient,
  entityIds: string[],
  targetId: string,
  targetType: 'klados' | 'rhiza',
  options: InvokeOptions
): Promise<void> {
  const chunks: string[][] = [];
  for (let i = 0; i < entityIds.length; i += INVOKE_CONCURRENCY) {
    chunks.push(entityIds.slice(i, i + INVOKE_CONCURRENCY));
  }

  for (const chunk of chunks) {
    await Promise.all(
      chunk.map(entityId =>
        invokeTarget(client, targetId, targetType, entityId, options)
      )
    );
  }
}
