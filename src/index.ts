/**
 * Scatter Utility Klados
 *
 * A simple klados that receives entity IDs via input.entity_ids
 * and returns them as outputs for rhiza's scatter handoff to dispatch.
 *
 * Usage in workflow:
 *   - Invoke with: { input: { entity_ids: ["id1", "id2", ...] } }
 *   - Define scatter handoff in rhiza flow: { scatter: "next_step" }
 *   - Rhiza auto-delegates to scatter-utility service if >50 items
 */

import { Hono } from 'hono';
import { KladosJob, getKladosConfig, type KladosRequest } from '@arke-institute/rhiza';
import { processScatterJob } from './job';
import type { Env } from './types';

const app = new Hono<{ Bindings: Env }>();

/**
 * Health check endpoint
 */
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    agent_id: c.env.AGENT_ID,
    version: c.env.AGENT_VERSION,
  });
});

/**
 * Arke verification endpoint
 * Required to verify ownership of this endpoint before activating the klados.
 */
app.get('/.well-known/arke-verification', (c) => {
  const token = c.env.VERIFICATION_TOKEN;
  const kladosId = c.env.ARKE_VERIFY_AGENT_ID || c.env.AGENT_ID;

  if (!token || !kladosId) {
    return c.json({ error: 'Verification not configured' }, 500);
  }

  return c.json({
    verification_token: token,
    klados_id: kladosId,
  });
});

/**
 * Main job processing endpoint
 */
app.post('/process', async (c) => {
  const req = await c.req.json<KladosRequest>();

  // Get network-aware config (uses AGENT_ID_TEST/MAIN and ARKE_AGENT_KEY_TEST/MAIN)
  const config = getKladosConfig(c.env, req.network);

  // Accept the job immediately
  const job = KladosJob.accept(req, config);

  // Process in background
  c.executionCtx.waitUntil(
    job.run(async () => {
      return await processScatterJob(job);
    })
  );

  // Return acceptance immediately
  return c.json(job.acceptResponse);
});

export default app;
