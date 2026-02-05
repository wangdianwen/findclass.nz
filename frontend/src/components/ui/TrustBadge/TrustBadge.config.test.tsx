import { describe, it, expect } from 'vitest';
import {
  TRUST_LEVELS,
  TRUST_FILTER_OPTIONS,
  type TrustLevelConfig,
  type TrustLevel,
} from './trustBadgeConstants';
import {
  getTrustLevelConfig,
  getTrustLevelFromScore,
} from './trustBadgeHelpers';

describe('TrustBadge Config', () => {
  describe('TRUST_LEVELS', () => {
    it('should have 5 trust levels', () => {
      expect(TRUST_LEVELS).toHaveLength(5);
    });

    it('should contain all levels S, A, B, C, D', () => {
      const levels = TRUST_LEVELS.map((l: TrustLevelConfig) => l.level);
      expect(levels).toEqual(['S', 'A', 'B', 'C', 'D']);
    });

    it('should have correct score ranges for each level', () => {
      expect(TRUST_LEVELS[0]).toMatchObject({
        level: 'S',
        scoreMin: 95,
        scoreMax: 100,
        searchWeight: 1.95,
      });
      expect(TRUST_LEVELS[1]).toMatchObject({
        level: 'A',
        scoreMin: 80,
        scoreMax: 94,
        searchWeight: 1.8,
      });
      expect(TRUST_LEVELS[2]).toMatchObject({
        level: 'B',
        scoreMin: 75,
        scoreMax: 79,
        searchWeight: 1.1,
      });
      expect(TRUST_LEVELS[3]).toMatchObject({
        level: 'C',
        scoreMin: 60,
        scoreMax: 74,
        searchWeight: 1.0,
      });
      expect(TRUST_LEVELS[4]).toMatchObject({
        level: 'D',
        scoreMin: 0,
        scoreMax: 59,
        searchWeight: 0.64,
      });
    });

    it('should have unique color classes', () => {
      const colorClasses = TRUST_LEVELS.map((l: TrustLevelConfig) => l.colorClass);
      const uniqueClasses = new Set(colorClasses);
      expect(uniqueClasses.size).toBe(5);
    });

    it('should have i18n keys for all levels', () => {
      TRUST_LEVELS.forEach((level: TrustLevelConfig) => {
        expect(level.nameKey).toMatch(/^trust\.level\.[A-Z]\.name$/);
        expect(level.descriptionKey).toMatch(/^trust\.level\.[A-Z]\.description$/);
      });
    });
  });

  describe('TRUST_LEVEL_MAP', () => {
    it('should have entries for all levels', () => {
      expect(TRUST_LEVELS.map(l => l.level)).toEqual(['S', 'A', 'B', 'C', 'D']);
    });

    it('should map each level to correct config', () => {
      (['S', 'A', 'B', 'C', 'D'] as TrustLevel[]).forEach(level => {
        const config = getTrustLevelConfig(level);
        expect(config.level).toBe(level);
      });
    });
  });

  describe('getTrustLevelConfig', () => {
    it('should return correct config for S level', () => {
      const config = getTrustLevelConfig('S');
      expect(config.level).toBe('S');
      expect(config.searchWeight).toBe(1.95);
    });

    it('should return correct config for A level', () => {
      const config = getTrustLevelConfig('A');
      expect(config.level).toBe('A');
      expect(config.searchWeight).toBe(1.8);
    });

    it('should return D level for unknown input', () => {
      const config = getTrustLevelConfig('X' as TrustLevel);
      expect(config.level).toBe('D');
    });
  });

  describe('getTrustLevelFromScore', () => {
    it('should return S for scores 95-100', () => {
      expect(getTrustLevelFromScore(95)).toBe('S');
      expect(getTrustLevelFromScore(97)).toBe('S');
      expect(getTrustLevelFromScore(100)).toBe('S');
    });

    it('should return A for scores 80-94', () => {
      expect(getTrustLevelFromScore(80)).toBe('A');
      expect(getTrustLevelFromScore(85)).toBe('A');
      expect(getTrustLevelFromScore(94)).toBe('A');
    });

    it('should return B for scores 75-79', () => {
      expect(getTrustLevelFromScore(75)).toBe('B');
      expect(getTrustLevelFromScore(77)).toBe('B');
      expect(getTrustLevelFromScore(79)).toBe('B');
    });

    it('should return C for scores 60-74', () => {
      expect(getTrustLevelFromScore(60)).toBe('C');
      expect(getTrustLevelFromScore(65)).toBe('C');
      expect(getTrustLevelFromScore(74)).toBe('C');
    });

    it('should return D for scores 0-59', () => {
      expect(getTrustLevelFromScore(0)).toBe('D');
      expect(getTrustLevelFromScore(30)).toBe('D');
      expect(getTrustLevelFromScore(59)).toBe('D');
    });

    it('should return D for negative scores', () => {
      expect(getTrustLevelFromScore(-10)).toBe('D');
    });
  });

  describe('TRUST_FILTER_OPTIONS', () => {
    it('should have "all" option plus 5 levels', () => {
      expect(TRUST_FILTER_OPTIONS).toHaveLength(6);
    });

    it('should have all option as first', () => {
      expect(TRUST_FILTER_OPTIONS[0].value).toBe('all');
    });

    it('should have correct i18n keys', () => {
      expect(TRUST_FILTER_OPTIONS[0].labelKey).toBe('trust.filter.all');
      TRUST_FILTER_OPTIONS.slice(1).forEach((opt: { labelKey: string }, idx: number) => {
        const levels = ['S', 'A', 'B', 'C', 'D'];
        expect(opt.labelKey).toBe(`trust.filter.${levels[idx]}`);
      });
    });
  });
});
