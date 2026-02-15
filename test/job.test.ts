/**
 * Unit tests for scatter job logic
 *
 * Tests the processScatterJob function with mocked KladosJob.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processScatterJob } from '../src/job';
import type { KladosJob } from '@arke-institute/rhiza';

// =============================================================================
// Mock Factory
// =============================================================================

function createMockJob(input: Record<string, unknown> = {}): KladosJob {
  return {
    request: {
      input,
    },
    log: {
      info: vi.fn(),
      success: vi.fn(),
      error: vi.fn(),
    },
  } as unknown as KladosJob;
}

// =============================================================================
// Test Suite
// =============================================================================

describe('processScatterJob', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // Valid Input Tests
  // ===========================================================================

  describe('valid inputs', () => {
    it('should return string entity IDs as-is', async () => {
      const entityIds = ['entity_1', 'entity_2', 'entity_3'];
      const job = createMockJob({ entity_ids: entityIds });

      const outputs = await processScatterJob(job);

      expect(outputs).toEqual(entityIds);
      expect(job.log.info).toHaveBeenCalledWith('Scattering 3 entities');
      expect(job.log.success).toHaveBeenCalledWith('Prepared 3 outputs for scatter');
    });

    it('should handle single entity ID', async () => {
      const job = createMockJob({ entity_ids: ['single_entity'] });

      const outputs = await processScatterJob(job);

      expect(outputs).toEqual(['single_entity']);
    });

    it('should handle large arrays', async () => {
      const entityIds = Array.from({ length: 1000 }, (_, i) => `entity_${i}`);
      const job = createMockJob({ entity_ids: entityIds });

      const outputs = await processScatterJob(job);

      expect(outputs).toHaveLength(1000);
      expect(outputs[0]).toBe('entity_0');
      expect(outputs[999]).toBe('entity_999');
    });
  });

  // ===========================================================================
  // Object Format Tests
  // ===========================================================================

  describe('object format with routing', () => {
    it('should extract entity_id from objects', async () => {
      const entityIds = [
        { entity_id: 'entity_1' },
        { entity_id: 'entity_2' },
      ];
      const job = createMockJob({ entity_ids: entityIds });

      const outputs = await processScatterJob(job);

      // Objects with only entity_id should be normalized to strings
      expect(outputs).toEqual(['entity_1', 'entity_2']);
    });

    it('should preserve entity_class for routing', async () => {
      const entityIds = [
        { entity_id: 'entity_1', entity_class: 'type_a' },
        { entity_id: 'entity_2', entity_class: 'type_b' },
      ];
      const job = createMockJob({ entity_ids: entityIds });

      const outputs = await processScatterJob(job);

      expect(outputs).toEqual([
        { entity_id: 'entity_1', entity_class: 'type_a' },
        { entity_id: 'entity_2', entity_class: 'type_b' },
      ]);
    });

    it('should preserve additional properties for routing', async () => {
      const entityIds = [
        { entity_id: 'entity_1', entity_class: 'type_a', priority: 'high' },
        { entity_id: 'entity_2', custom_field: 'value' },
      ];
      const job = createMockJob({ entity_ids: entityIds });

      const outputs = await processScatterJob(job);

      expect(outputs).toEqual([
        { entity_id: 'entity_1', entity_class: 'type_a', priority: 'high' },
        { entity_id: 'entity_2', custom_field: 'value' },
      ]);
    });

    it('should handle mixed string and object inputs', async () => {
      const entityIds = [
        'entity_1',
        { entity_id: 'entity_2', entity_class: 'special' },
        'entity_3',
      ];
      const job = createMockJob({ entity_ids: entityIds });

      const outputs = await processScatterJob(job);

      expect(outputs).toEqual([
        'entity_1',
        { entity_id: 'entity_2', entity_class: 'special' },
        'entity_3',
      ]);
    });
  });

  // ===========================================================================
  // Error Cases
  // ===========================================================================

  describe('error handling', () => {
    it('should throw if entity_ids is missing', async () => {
      const job = createMockJob({});

      await expect(processScatterJob(job)).rejects.toThrow(
        'input.entity_ids is required'
      );
    });

    it('should throw if entity_ids is undefined', async () => {
      const job = createMockJob({ entity_ids: undefined });

      await expect(processScatterJob(job)).rejects.toThrow(
        'input.entity_ids is required'
      );
    });

    it('should throw if entity_ids is not an array', async () => {
      const job = createMockJob({ entity_ids: 'not_an_array' });

      await expect(processScatterJob(job)).rejects.toThrow(
        'input.entity_ids must be an array'
      );
    });

    it('should throw if entity_ids is an object (not array)', async () => {
      const job = createMockJob({ entity_ids: { id: 'entity_1' } });

      await expect(processScatterJob(job)).rejects.toThrow(
        'input.entity_ids must be an array'
      );
    });

    it('should throw if entity_ids is empty', async () => {
      const job = createMockJob({ entity_ids: [] });

      await expect(processScatterJob(job)).rejects.toThrow(
        'input.entity_ids must not be empty'
      );
    });

    it('should throw if input is missing', async () => {
      const job = {
        request: {},
        log: {
          info: vi.fn(),
          success: vi.fn(),
          error: vi.fn(),
        },
      } as unknown as KladosJob;

      await expect(processScatterJob(job)).rejects.toThrow(
        'input.entity_ids is required'
      );
    });
  });
});
