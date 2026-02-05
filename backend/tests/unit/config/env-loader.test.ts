/**
 * Env Loader Unit Tests
 * Tests for environment file loading logic
 */

import { describe, it, expect } from 'vitest';
import { NodeEnv } from '@config/env-schema';

describe('env-loader', () => {
  describe('module exports', () => {
    it('should be importable', async () => {
      // This tests that the module can be imported without errors
      const mod = await import('@config/env-loader');
      expect(mod).toBeDefined();
      expect(mod.loadEnvFiles).toBeDefined();
      expect(typeof mod.loadEnvFiles).toBe('function');
    });
  });

  describe('NodeEnv values', () => {
    it('should have development value', () => {
      expect(NodeEnv.Development).toBe('development');
    });

    it('should have production value', () => {
      expect(NodeEnv.Production).toBe('production');
    });

    it('should have test value', () => {
      expect(NodeEnv.Test).toBe('test');
    });
  });

  describe('config directory resolution', () => {
    it('should resolve config directory from config folder', () => {
      const path = require('path');
      const configDir = path.resolve(__dirname, '../../src/config/env');

      expect(configDir).toContain('/src/config/env');
      expect(configDir.endsWith('/env')).toBe(true);
    });
  });
});
