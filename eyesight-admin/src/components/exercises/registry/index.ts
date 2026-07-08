/**
 * Exercise Registry
 *
 * Single source of truth for which exercise types are supported.
 * Each entry maps an exerciseType key to its UI components.
 *
 * To add a new exercise type:
 * 1. Create the playable component in src/components/exercises/portal/ implementing
 *    PortalExerciseProps (own engine hook + board inside — no rules-of-hooks issue).
 * 2. Create a PreviewComponent in src/components/exercises/admin/.
 * 3. Add ONE entry to exerciseRegistry below (PreviewComponent + ExerciseComponent).
 *    The PortalExercise dispatcher renders ExerciseComponent automatically — no edits
 *    needed to existing exercises.
 */

import React from 'react';
import { VisualSettings } from 'src/types/core';
import type { PortalExerciseProps } from 'src/components/exercises/portal/types';

// ==================== INTERFACES ====================

export interface ExercisePreviewProps {
  visualSettings: VisualSettings;
}

export interface ExerciseRegistryEntry {
  /** Canonical exercise type key (normalized lowercase, e.g. '2048') */
  type: string;
  /** Human-readable display name shown in admin UI */
  displayName: string;
  /** Component used in PreviewDialog admin preview */
  PreviewComponent: React.ComponentType<ExercisePreviewProps>;
  /** Playable exercise component rendered by the PortalExercise dispatcher */
  ExerciseComponent: React.ComponentType<PortalExerciseProps>;
}

// ==================== NORMALIZATION ====================

/**
 * Normalize exercise type string to canonical registry key.
 * Trims whitespace and lowercases.
 */
export function normalizeExerciseType(exerciseType: string): string {
  return String(exerciseType).toLowerCase().trim();
}

// ==================== LOOKUP FUNCTIONS ====================

/**
 * Look up a registry entry by exerciseType (primary) or exercise code (fallback).
 *
 * The code fallback handles legacy data where exerciseType may be empty but
 * code follows a naming convention (e.g. '2048', 'game-2048').
 */
export function getExerciseEntry(
  exerciseType?: string | null,
  exerciseCode?: string | null
): ExerciseRegistryEntry | undefined {
  if (exerciseType) {
    const entry = exerciseRegistry.get(normalizeExerciseType(exerciseType));
    if (entry) return entry;
  }

  // Code-based fallback: find first entry whose type appears in the code
  if (exerciseCode) {
    const normalizedCode = normalizeExerciseType(exerciseCode);
    for (const entry of exerciseRegistry.values()) {
      if (normalizedCode === entry.type || normalizedCode.includes(entry.type)) {
        return entry;
      }
    }
  }

  return undefined;
}

/**
 * Returns true if the exerciseType (or fallback code) is in the registry.
 */
export function isExerciseSupported(
  exerciseType?: string | null,
  exerciseCode?: string | null
): boolean {
  return getExerciseEntry(exerciseType, exerciseCode) !== undefined;
}

/**
 * Return all registered exercise types as an array (sorted by type key).
 */
export function getAllRegisteredTypes(): ExerciseRegistryEntry[] {
  return Array.from(exerciseRegistry.values()).sort((a, b) => a.type.localeCompare(b.type));
}

/**
 * Resolve the playable exercise component for an exerciseType (or fallback code).
 * Returns undefined when the type is not registered (caller renders UnsupportedExercise).
 */
export function getExerciseComponent(
  exerciseType?: string | null,
  exerciseCode?: string | null
): React.ComponentType<PortalExerciseProps> | undefined {
  return getExerciseEntry(exerciseType, exerciseCode)?.ExerciseComponent;
}

// ==================== REGISTRY ====================
// Import lazily at the bottom to avoid circular dependency issues.

import { Game2048Preview } from 'src/components/exercises/admin';
import Game2048Exercise from 'src/components/exercises/portal/Game2048Exercise';
import VtQuestPreview from 'src/components/exercises/vt/admin/VtQuestPreview';
import VtQuestExercise from 'src/components/exercises/vt/portal/VtQuestExercise';
import FarAcuityPreview from 'src/components/exercises/far-acuity/admin/FarAcuityPreview';
import FarAcuityExercise from 'src/components/exercises/far-acuity/portal/FarAcuityExercise';

const exerciseRegistry = new Map<string, ExerciseRegistryEntry>([
  [
    '2048',
    {
      type: '2048',
      displayName: 'Trò chơi 2048',
      PreviewComponent: Game2048Preview,
      ExerciseComponent: Game2048Exercise,
    },
  ],
  [
    'vt-quest',
    {
      type: 'vt-quest',
      displayName: 'Phi hành gia thị giác (tổng hợp)',
      PreviewComponent: VtQuestPreview,
      ExerciseComponent: VtQuestExercise,
    },
  ],
  [
    'vt-gabor',
    {
      type: 'vt-gabor',
      displayName: 'Phi hành gia — Ánh sáng',
      PreviewComponent: VtQuestPreview,
      ExerciseComponent: VtQuestExercise,
    },
  ],
  [
    'vt-vernier',
    {
      type: 'vt-vernier',
      displayName: 'Phi hành gia — Chính xác',
      PreviewComponent: VtQuestPreview,
      ExerciseComponent: VtQuestExercise,
    },
  ],
  [
    'vt-crowding',
    {
      type: 'vt-crowding',
      displayName: 'Phi hành gia — Đám đông',
      PreviewComponent: VtQuestPreview,
      ExerciseComponent: VtQuestExercise,
    },
  ],
  [
    'vt-stereopsis',
    {
      type: 'vt-stereopsis',
      displayName: 'Phi hành gia — Chiều sâu',
      PreviewComponent: VtQuestPreview,
      ExerciseComponent: VtQuestExercise,
    },
  ],
  [
    'far-acuity',
    {
      type: 'far-acuity',
      displayName: 'Bài tập thị lực xa',
      PreviewComponent: FarAcuityPreview,
      ExerciseComponent: FarAcuityExercise,
    },
  ],
]);

export { exerciseRegistry };
