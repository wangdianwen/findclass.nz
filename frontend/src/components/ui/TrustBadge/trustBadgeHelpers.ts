// Trust badge helper functions - separated for react-refresh compatibility
import type { TrustLevel, TrustLevelConfig } from './trustBadgeConstants';

// Map for quick lookup by level - use the exported one from constants
import { TRUST_LEVELS } from './trustBadgeConstants';

/**
 * Get trust level configuration by level
 */
export function getTrustLevelConfig(level: TrustLevel): TrustLevelConfig {
  const levelMap: Record<TrustLevel, TrustLevelConfig> = {
    S: TRUST_LEVELS[0],
    A: TRUST_LEVELS[1],
    B: TRUST_LEVELS[2],
    C: TRUST_LEVELS[3],
    D: TRUST_LEVELS[4],
  };
  return levelMap[level] || levelMap.D;
}

/**
 * Calculate trust level from score
 */
export function getTrustLevelFromScore(score: number): TrustLevel {
  for (const config of TRUST_LEVELS) {
    if (score >= config.scoreMin && score <= config.scoreMax) {
      return config.level;
    }
  }
  return 'D';
}
