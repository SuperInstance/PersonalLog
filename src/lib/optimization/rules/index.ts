/**
 * Optimization Rules Index
 *
 * Exports all optimization rules for easy registration.
 */

import type { OptimizationRule } from '../types';

import {
  performanceRules,
  getPerformanceRule,
} from './performance-rules';
import {
  qualityRules,
  getQualityRule,
} from './quality-rules';
import {
  resourceRules,
  getResourceRule,
} from './resource-rules';

// ============================================================================
// ALL RULES
// ============================================================================

/**
 * All optimization rules combined
 */
export const allRules: OptimizationRule[] = [
  ...performanceRules,
  ...qualityRules,
  ...resourceRules,
];

/**
 * Get rule by ID from any category
 */
export function getRule(id: string): OptimizationRule | undefined {
  return allRules.find((r) => r.id === id);
}

/**
 * Get rules by category
 */
export function getRulesByCategory(category: string): OptimizationRule[] {
  return allRules.filter((r) => r.category === category);
}

/**
 * Get rules by priority
 */
export function getRulesByPriority(priority: string): OptimizationRule[] {
  return allRules.filter((r) => r.priority === priority);
}

/**
 * Get rules by tag
 */
export function getRulesByTag(tag: string): OptimizationRule[] {
  return allRules.filter((r) => r.tags.includes(tag));
}

/**
 * Get rules by risk level
 */
export function getRulesByRiskLevel(maxRisk: number): OptimizationRule[] {
  return allRules.filter((r) => r.riskLevel <= maxRisk);
}

/**
 * Get auto-apply safe rules
 */
export function getAutoApplySafeRules(): OptimizationRule[] {
  return allRules.filter((r) => r.autoApplySafe);
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  performanceRules,
  getPerformanceRule,
  qualityRules,
  getQualityRule,
  resourceRules,
  getResourceRule,
};
