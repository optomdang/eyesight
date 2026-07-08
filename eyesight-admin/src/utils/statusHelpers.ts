/**
 * Status Helper Utilities
 * Centralized status display functions for consistent UI across the application
 */

import type { ReactNode } from 'react';
import i18n from 'src/utils/i18n';

// Exercise status types (for sessions/assignments)
export type ExerciseStatus = 'incomplete' | 'completed' | 'expired' | 'cancelled';

// Exercise result status types (for individual results)
// MUST match backend (SOT): pass/fail removed (BU 2026-06). Every ended attempt = 'completed'.
export type ExerciseResultStatus = 'incomplete' | 'completed';

// Status configuration interface
export interface StatusConfig {
  color: string; // MUI color token
  text: string; // Localized display text
  icon?: ReactNode; // Optional icon
}

/**
 * Get MUI color token for exercise status
 * @param status - Exercise status
 * @returns MUI color token (e.g., 'success.main', 'warning.main')
 */
export function getStatusColor(status: ExerciseStatus): string {
  switch (status) {
    case 'incomplete':
      return 'warning.main';
    case 'completed':
      return 'success.main';
    case 'expired':
      return 'error.main';
    case 'cancelled':
      return 'error.light';
    default:
      return 'primary.main';
  }
}

/**
 * Get localized display text for exercise status
 * @param status - Exercise status
 * @returns Localized status text
 */
export function getStatusText(status: ExerciseStatus): string {
  switch (status) {
    case 'incomplete':
      return i18n.t('exerciseStatus.incomplete');
    case 'completed':
      return i18n.t('exerciseStatus.completed');
    case 'expired':
      return i18n.t('exerciseStatus.expired');
    case 'cancelled':
      return i18n.t('exerciseStatus.cancelled');
    default:
      return i18n.t('exerciseStatus.unknown');
  }
}

/**
 * Get complete status configuration
 * @param status - Exercise status
 * @returns Status configuration object
 */
export function getStatusConfig(status: ExerciseStatus): StatusConfig {
  return {
    color: getStatusColor(status),
    text: getStatusText(status),
  };
}

/**
 * Check if status is active (can be interacted with)
 * @param status - Exercise status
 * @returns True if status is active
 */
export function isActiveStatus(status: ExerciseStatus): boolean {
  return status === 'incomplete';
}

/**
 * Check if status is final (cannot be changed)
 * @param status - Exercise status
 * @returns True if status is final
 */
export function isFinalStatus(status: ExerciseStatus): boolean {
  return status === 'completed' || status === 'expired' || status === 'cancelled';
}

/**
 * Get all available status values
 * @returns Array of all exercise status values
 */
export function getAllStatusValues(): ExerciseStatus[] {
  return ['incomplete', 'completed', 'expired', 'cancelled'];
}

// ============================================================================
// EXERCISE RESULT STATUS UTILITIES (for individual exercise results)
// ============================================================================

/**
 * Get MUI color token for exercise result status
 * @param status - Exercise result status ('incomplete' | 'completed')
 * @returns MUI color token
 */
export function getResultStatusColor(status: ExerciseResultStatus): string {
  switch (status) {
    case 'completed':
      return 'success.main';
    case 'incomplete':
      return 'warning.main';
    default:
      return 'grey.500';
  }
}

/**
 * Get localized display text for exercise result status
 * @param status - Exercise result status
 * @returns Localized status text
 */
export function getResultStatusText(status: ExerciseResultStatus): string {
  switch (status) {
    case 'completed':
      return i18n.t('exerciseResultStatus.completed');
    case 'incomplete':
      return i18n.t('exerciseResultStatus.incomplete');
    default:
      return i18n.t('exerciseResultStatus.unknown');
  }
}

/**
 * Get complete result status configuration
 * @param status - Exercise result status
 * @returns Status configuration object
 */
export function getResultStatusConfig(status: ExerciseResultStatus): StatusConfig {
  return {
    color: getResultStatusColor(status),
    text: getResultStatusText(status),
  };
}

/**
 * Check if result status indicates completion
 * @param status - Exercise result status
 * @returns True if result is completed
 */
export function isResultCompleted(status: ExerciseResultStatus): boolean {
  return status === 'completed';
}

/**
 * Get all available result status values
 * @returns Array of all exercise result status values
 */
export function getAllResultStatusValues(): ExerciseResultStatus[] {
  return ['incomplete', 'completed'];
}
