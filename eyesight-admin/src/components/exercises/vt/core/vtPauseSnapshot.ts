/**
 * VT Quest — pause/resume snapshot helpers.
 * exerciseState is stored flat (session fields + engine overlay) for BE validation.
 */

import type {
  VtCrowdingStageConfig,
  VtGameScreen,
  VtPauseSnapshot,
  VtSessionState,
  VtStageResult,
  VtTrial,
  VtWorld,
} from 'src/types/core/vtQuest';

const WORLDS: VtWorld[] = ['gabor', 'vernier', 'crowding', 'stereopsis'];
const SCREENS: VtGameScreen[] = [
  'world-map',
  'stage-intro',
  'trial',
  'stage-result',
  'session-complete',
];

function isVtWorld(value: unknown): value is VtWorld {
  return typeof value === 'string' && WORLDS.includes(value as VtWorld);
}

function isVtScreen(value: unknown): value is VtGameScreen {
  return typeof value === 'string' && SCREENS.includes(value as VtGameScreen);
}

function parseCrowdingConfig(raw: unknown): VtCrowdingStageConfig | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const targetLetter = typeof o.targetLetter === 'string' ? o.targetLetter : null;
  const flankers = o.flankerLetters;
  if (!targetLetter || !Array.isArray(flankers) || flankers.length < 2) return null;
  return { targetLetter, flankerLetters: [String(flankers[0]), String(flankers[1])] };
}

function parseSession(raw: Record<string, unknown>): VtSessionState | null {
  if (!isVtWorld(raw.currentWorld)) return null;
  if (typeof raw.stageIndex !== 'number') return null;
  if (!raw.staircaseState || typeof raw.staircaseState !== 'object') return null;

  return {
    currentWorld: raw.currentWorld,
    stageIndex: raw.stageIndex,
    completedStages: Array.isArray(raw.completedStages)
      ? (raw.completedStages as VtStageResult[])
      : [],
    staircaseState: raw.staircaseState as VtSessionState['staircaseState'],
    currentStageTrials: Array.isArray(raw.currentStageTrials)
      ? (raw.currentStageTrials as VtTrial[])
      : [],
    totalStars: typeof raw.totalStars === 'number' ? raw.totalStars : 0,
    totalCoins: typeof raw.totalCoins === 'number' ? raw.totalCoins : 0,
    currentCombo: typeof raw.currentCombo === 'number' ? raw.currentCombo : 0,
  };
}

/** Build flat exerciseState for pause API */
export function buildVtPauseSnapshot(state: {
  session: VtSessionState;
  screen: VtGameScreen;
  currentTrial: VtTrial | null;
  isPendingResponse: boolean;
  stimulusVisible: boolean;
  lastStageResult: VtStageResult | null;
  crowdingStageConfig: VtCrowdingStageConfig | null;
  isBossStage: boolean;
}): VtPauseSnapshot {
  return {
    ...state.session,
    snapshotVersion: 1,
    vtScreen: state.screen,
    currentTrial: state.currentTrial,
    isPendingResponse: state.isPendingResponse,
    stimulusVisible: state.stimulusVisible,
    lastStageResult: state.lastStageResult,
    crowdingStageConfig: state.crowdingStageConfig,
    isBossStage: state.isBossStage,
  };
}

/** Parse exerciseState from startExercise resume response */
export function parseVtPauseSnapshot(raw: unknown): VtPauseSnapshot | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const session = parseSession(o);
  if (!session) return null;

  const vtScreen = isVtScreen(o.vtScreen) ? o.vtScreen : 'world-map';

  return {
    ...session,
    snapshotVersion: o.snapshotVersion === 1 ? 1 : undefined,
    vtScreen,
    currentTrial: (o.currentTrial as VtTrial | null) ?? null,
    isPendingResponse: Boolean(o.isPendingResponse),
    stimulusVisible: Boolean(o.stimulusVisible),
    lastStageResult: (o.lastStageResult as VtStageResult | null) ?? null,
    crowdingStageConfig: parseCrowdingConfig(o.crowdingStageConfig),
    isBossStage: Boolean(o.isBossStage),
  };
}
