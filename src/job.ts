/**
 * Scatter Utility Job Logic
 *
 * Two modes of operation:
 * 1. Rhiza handoff mode (default): Receives entity IDs via target_entities and
 *    returns them as outputs for rhiza's scatter handoff system to dispatch.
 *
 * 2. Generic scatter mode: When target_klados or target_rhiza is specified,
 *    invokes the target directly for each entity ID (fire-and-forget).
 *
 * Entity IDs are received via:
 * - request.target_entities (preferred, standard KladosRequest field)
 * - input.entity_ids (deprecated, for backward compatibility)
 */

import type { KladosJob, Output, InvokeOptions, DelegateOutputItem } from '@arke-institute/rhiza';
import { invokeTarget, delegateToScatterUtility } from '@arke-institute/rhiza';
import type { ArkeClient } from '@arke-institute/sdk';

const SCATTER_THRESHOLD = 50;
const INVOKE_CONCURRENCY = 10;
const SCATTER_UTILITY_URL = 'https://scatter-utility.arke.institute';

/**
 * Process a scatter job
 *
 * Two modes of operation:
 * 1. Rhiza handoff mode (default): Returns entity IDs as outputs for rhiza's
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

  // Get entity IDs from target_entities (preferred) or input.entity_ids (deprecated)
  const entityIds: string[] | undefined =
    job.request.target_entities ??
    (input?.entity_ids as string[] | undefined);

  if (!entityIds) {
    throw new Error('target_entities is required (or input.entity_ids for backward compatibility)');
  }

  if (!Array.isArray(entityIds)) {
    throw new Error('target_entities must be an array');
  }

  if (entityIds.length === 0) {
    throw new Error('target_entities must not be empty');
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

    if (entityIds.length > SCATTER_THRESHOLD) {
      // Delegate to scatter-utility service
      const delegateOutputs: DelegateOutputItem[] = entityIds.map(id => ({
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

      job.log.success(`Delegated ${entityIds.length} invocations (dispatch: ${result.dispatchId})`);
    } else {
      // Direct invocation with concurrency control
      await invokeWithConcurrency(job.client, entityIds, targetId, targetType, invokeOpts);
      job.log.success(`Invoked ${entityIds.length} targets directly`);
    }

    // Return empty outputs - no rhiza handoff needed
    return [];
  }

  // RHIZA HANDOFF MODE: return entity IDs for rhiza's scatter handoff to dispatch
  job.log.info(`Scattering ${entityIds.length} entities`);
  job.log.success(`Prepared ${entityIds.length} outputs for scatter`);

  return entityIds;
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
