/**
 * VT Quest — World map logic.
 * Manages planet unlocking and stage progression across session.
 */

import type { VtWorld, VtSessionState } from 'src/types/core/vtQuest';

export interface WorldInfo {
  id: VtWorld;
  label: string;
  description: string;
  /** Emoji placeholder for Phase 1 (replaced by AI asset in Phase 2) */
  emoji: string;
  /** Color used for CSS Planet SVG */
  color: string;
  unlockAfterStages: number;
}

export const WORLDS: WorldInfo[] = [
  {
    id: 'gabor',
    label: 'Hành tinh Sáng',
    description: 'Luyện nhìn ánh sáng mờ',
    emoji: '🌟',
    color: '#FFD93D',
    unlockAfterStages: 0,
  },
  {
    id: 'vernier',
    label: 'Hành tinh Chính xác',
    description: 'Luyện nhìn thẳng hàng',
    emoji: '🔵',
    color: '#4ECDC4',
    unlockAfterStages: 3,
  },
  {
    id: 'crowding',
    label: 'Hành tinh Đám đông',
    description: 'Luyện nhìn trong đám đông',
    emoji: '🟣',
    color: '#6C5CE7',
    unlockAfterStages: 6,
  },
  {
    id: 'stereopsis',
    label: 'Hành tinh Chiều sâu',
    description: 'Luyện nhìn chiều sâu (RDS)',
    emoji: '🔴🔵',
    color: '#E17055',
    unlockAfterStages: 9,
  },
];

/** Get worlds unlocked at current stage count */
export function getUnlockedWorlds(totalStagesCompleted: number): WorldInfo[] {
  return WORLDS.filter((w) => totalStagesCompleted >= w.unlockAfterStages);
}

/** Check if a particular world is available */
export function isWorldUnlocked(world: VtWorld, totalStagesCompleted: number): boolean {
  const info = WORLDS.find((w) => w.id === world);
  return info ? totalStagesCompleted >= info.unlockAfterStages : false;
}

/** Get world info by id */
export function getWorldInfo(world: VtWorld): WorldInfo {
  return WORLDS.find((w) => w.id === world) ?? WORLDS[0];
}

/** Total stages completed across all worlds in a session */
export function totalStagesCompleted(session: VtSessionState): number {
  return session.completedStages.length;
}

/** Whether this is a "boss stage" (every N stages, default 5) */
export function isBossStage(stageIndex: number, stagesPerSession = 5): boolean {
  const interval = Math.max(2, stagesPerSession);
  return stageIndex > 0 && (stageIndex + 1) % interval === 0;
}

/** Boss stage: boost difficulty per modality */
export function applyBossDifficultyBoost(startValue: number, world: VtWorld): number {
  if (world === 'gabor') {
    // Lower contrast = harder for gabor
    return Math.max(0.02, startValue * 0.85);
  }
  if (world === 'vernier') {
    // Lower offset (arcsec) = harder to detect misalignment
    return Math.max(10, startValue * 0.85);
  }
  if (world === 'crowding') {
    // Lower spacing ratio = more crowded = harder
    return Math.max(0.5, startValue * 0.85);
  }
  if (world === 'stereopsis') {
    // Lower arcsec disparity = harder stereopsis
    return Math.max(20, startValue * 0.85);
  }
  return startValue;
}
