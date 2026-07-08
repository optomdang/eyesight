/**
 * VT Quest Engine Hook
 *
 * Orchestrates the full session loop:
 *   WorldMap → StageIntro → Trials (2AFC) → StageResult → ... → SessionComplete
 *
 * Does NOT call portal APIs directly — the component handles start/pause/complete.
 */

import { useCallback, useRef, useState } from 'react';
import type {
  VtEngineState,
  VtSessionState,
  VtSettings,
  VtWorld,
  VtTrial,
  VtTrialResponseInput,
  VtCrowdingStageConfig,
  VtPauseSnapshot,
} from 'src/types/core/vtQuest';
import { DEFAULT_VT_SETTINGS } from 'src/types/core/vtQuest';
import { buildVtPauseSnapshot } from 'src/components/exercises/vt/core/vtPauseSnapshot';
import { createStaircaseState } from 'src/components/exercises/vt/core/staircase';
import {
  createTrial,
  applyResponse,
  applyTrialTimeout,
  finalizeStage,
  isStageDone,
} from 'src/components/exercises/vt/core/trialRunner';
import {
  resolveGaborTaskMode,
  buildGaborTaskTrialMeta,
  resolveGaborStageEndPolicy,
} from 'src/components/exercises/vt/core/gaborTaskModes';
import {
  resolveVernierTaskMode,
  buildVernierTaskTrialMeta,
  resolveVernierStageEndPolicy,
} from 'src/components/exercises/vt/core/vernierTaskModes';
import {
  resolveCrowdingTaskMode,
  buildCrowdingTaskTrialMeta,
  resolveCrowdingStageEndPolicy,
} from 'src/components/exercises/vt/core/crowdingTaskModes';
import {
  resolveStereopsisTaskMode,
  buildStereopsisTaskTrialMeta,
  resolveStereopsisStageEndPolicy,
} from 'src/components/exercises/vt/core/stereopsisTaskModes';
import {
  isBossStage,
  applyBossDifficultyBoost,
} from 'src/components/exercises/vt/gamification/worldMap';
import {
  pickTargetLetter,
  pickFlankerLetters,
} from 'src/components/exercises/vt/stimuli/crowdingRenderer';

// ─── Per-modality staircase parameter sets ───────────────────────────────────

/**
 * Gabor: staircase variable = Michelson contrast [0.02, 1.0]
 * Easy start = 100% Michelson (vision-derived via resolveGaborStartContrast)
 */
const GABOR_PARAMS = {
  startValue: 1.0,
  stepSize: 0.1,
  stepHalveAfterReversals: 4,
  minValue: 0.02,
  maxValue: 1.0,
  minReversals: 6,
  maxTrials: 40,
};

/**
 * Vernier: staircase variable = offset in arcseconds [5, 600]
 * Easy start = large offset (120 arcsec = 2 arcmin, clearly misaligned)
 */
const VERNIER_PARAMS = {
  startValue: 120, // arcsec
  stepSize: 24, // arcsec per step (log-like: ~20% of start)
  stepHalveAfterReversals: 4,
  minValue: 5, // arcsec — fine-grained limit
  maxValue: 600, // arcsec — easy limit
  minReversals: 6,
  maxTrials: 40,
};

/**
 * Crowding: staircase variable = spacing ratio [0.4, 3.5]
 * spacing = ratio × letterHeightPx (center-to-center target-flanker)
 * Easy start = wide spacing (3.0), hard = tight (0.5)
 */
const CROWDING_PARAMS = {
  startValue: 3.0,
  stepSize: 0.25,
  stepHalveAfterReversals: 4,
  minValue: 0.4,
  maxValue: 3.5,
  minReversals: 6,
  maxTrials: 40,
};

/**
 * Stereopsis: staircase variable = arcsec disparity [20, 800]
 * Easy start = large disparity (400 arcsec); hard = fine (20 arcsec)
 */
const STEREOPSIS_PARAMS = {
  startValue: 400,
  stepSize: 40,
  stepHalveAfterReversals: 4,
  minValue: 20,
  maxValue: 800,
  minReversals: 6,
  maxTrials: 40,
};

function getStageEndOptions(
  world: VtWorld,
  settings: VtSettings
): { trialsPerStage: number; endOnStaircase?: boolean } {
  if (world === 'gabor') {
    const policy = resolveGaborStageEndPolicy(settings, settings.stimulus.gabor);
    return { trialsPerStage: policy.trialsPerStage, endOnStaircase: policy.endOnStaircase };
  }
  if (world === 'vernier') {
    const policy = resolveVernierStageEndPolicy(settings, settings.stimulus.vernier);
    return { trialsPerStage: policy.trialsPerStage, endOnStaircase: policy.endOnStaircase };
  }
  if (world === 'crowding') {
    const policy = resolveCrowdingStageEndPolicy(settings, settings.stimulus.crowding);
    return { trialsPerStage: policy.trialsPerStage, endOnStaircase: policy.endOnStaircase };
  }
  if (world === 'stereopsis') {
    const policy = resolveStereopsisStageEndPolicy(settings, settings.stimulus.stereopsis);
    return { trialsPerStage: policy.trialsPerStage, endOnStaircase: policy.endOnStaircase };
  }
  return { trialsPerStage: settings.trialsPerStage, endOnStaircase: true };
}

function getParamsForWorld(
  world: VtWorld,
  settings: VtSettings,
  gaborStartContrast = GABOR_PARAMS.startValue
) {
  const sc = settings.staircase;
  if (world === 'gabor') {
    return {
      ...GABOR_PARAMS,
      startValue: gaborStartContrast,
      stepSize: sc.stepSize,
      minReversals: sc.minReversals,
      maxTrials: sc.maxTrials,
    };
  }
  if (world === 'vernier') {
    return { ...VERNIER_PARAMS, minReversals: sc.minReversals, maxTrials: sc.maxTrials };
  }
  if (world === 'stereopsis') {
    return { ...STEREOPSIS_PARAMS, minReversals: sc.minReversals, maxTrials: sc.maxTrials };
  }
  // crowding
  return { ...CROWDING_PARAMS, minReversals: sc.minReversals, maxTrials: sc.maxTrials };
}

/** Fresh staircase block for a stage (boss boost + clinical gabor start). */
export function buildStaircaseForStage(
  world: VtWorld,
  settings: VtSettings,
  stageIndex: number,
  gaborStartContrast = GABOR_PARAMS.startValue
): { staircaseState: ReturnType<typeof createStaircaseState>; isBoss: boolean } {
  const params = getParamsForWorld(world, settings, gaborStartContrast);
  const isBoss = isBossStage(stageIndex, settings.stagesPerSession);
  const startValue = isBoss
    ? applyBossDifficultyBoost(params.startValue, world)
    : params.startValue;
  let staircaseState = createStaircaseState({ ...params, startValue });
  if (world === 'gabor') {
    staircaseState = { ...staircaseState, currentValue: gaborStartContrast };
  }
  return { staircaseState, isBoss };
}

// ─── Crowding stage config ────────────────────────────────────────────────────

export type CrowdingStageConfig = VtCrowdingStageConfig;

function buildCrowdingStageConfig(): CrowdingStageConfig {
  const target = pickTargetLetter();
  return { targetLetter: target, flankerLetters: pickFlankerLetters(target) };
}

function buildCrowdingMeta(
  settings: VtSettings,
  stageIndex: number,
  isBoss: boolean,
  cfg: CrowdingStageConfig
): Record<string, unknown> {
  const config = settings.stimulus.crowding;
  const mode = resolveCrowdingTaskMode(config, stageIndex, isBoss);
  return buildCrowdingTaskTrialMeta(mode, config, cfg);
}

/** Per-trial meta for gabor — task-mode fields (empty for legacy location_2afc). */
function buildGaborMeta(
  settings: VtSettings,
  stageIndex: number,
  isBoss: boolean
): Record<string, unknown> | undefined {
  const config = settings.stimulus.gabor;
  const mode = resolveGaborTaskMode(config, stageIndex, isBoss);
  const meta = buildGaborTaskTrialMeta(mode, config);
  return Object.keys(meta).length > 0 ? meta : undefined;
}

/** Per-trial meta for vernier — task-mode fields (empty for legacy alignment_2afc). */
function buildVernierMeta(
  settings: VtSettings,
  stageIndex: number,
  isBoss: boolean
): Record<string, unknown> | undefined {
  const config = settings.stimulus.vernier;
  const mode = resolveVernierTaskMode(config, stageIndex, isBoss);
  const meta = buildVernierTaskTrialMeta(mode, config);
  return Object.keys(meta).length > 0 ? meta : undefined;
}

function buildStereopsisMeta(
  settings: VtSettings,
  stageIndex: number,
  isBoss: boolean
): Record<string, unknown> {
  const config = settings.stimulus.stereopsis;
  const mode = resolveStereopsisTaskMode(config, stageIndex, isBoss);
  return buildStereopsisTaskTrialMeta(mode, config);
}

/** Meta builder shared by startStage / next-trial / timeout paths. */
function buildTrialMetaForWorld(
  world: VtWorld,
  settings: VtSettings,
  stageIndex: number,
  isBoss: boolean,
  crowdingConfig: CrowdingStageConfig | null
): Record<string, unknown> | undefined {
  if (world === 'crowding' && crowdingConfig) {
    return buildCrowdingMeta(settings, stageIndex, isBoss, crowdingConfig);
  }
  if (world === 'gabor') return buildGaborMeta(settings, stageIndex, isBoss);
  if (world === 'vernier') return buildVernierMeta(settings, stageIndex, isBoss);
  if (world === 'stereopsis') return buildStereopsisMeta(settings, stageIndex, isBoss);
  return undefined;
}

// ─── Session builder ──────────────────────────────────────────────────────────

function buildInitialSession(
  settings: VtSettings,
  world: VtWorld,
  gaborStartContrast = GABOR_PARAMS.startValue
): VtSessionState {
  const params = getParamsForWorld(world, settings, gaborStartContrast);
  return {
    currentWorld: world,
    stageIndex: 0,
    completedStages: [],
    staircaseState: createStaircaseState(params),
    currentStageTrials: [],
    totalStars: 0,
    totalCoins: 0,
    currentCombo: 0,
  };
}

// ─── Extended engine state with crowding config ──────────────────────────────

export interface VtEngineStateExtended extends VtEngineState {
  /** Populated when world = crowding, persists for the whole stage */
  crowdingStageConfig: CrowdingStageConfig | null;
  /** Whether the current stage is a boss stage */
  isBossStage: boolean;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UseVtQuestEngineOptions {
  /** Merged vtSettings from exercise config (falls back to defaults) */
  settings?: Partial<VtSettings>;
  /** Starting world — from config modalities[0] */
  initialWorld?: VtWorld;
  /** Resume state from a paused session */
  initialState?: VtSessionState;
  /** Vision-derived staircase starting points */
  staircaseContext?: {
    gaborStartContrast?: number;
  };
  /** Single-modality exercise: skip world map between stages */
  singleModality?: VtWorld;
}

interface UseVtQuestEngineReturn {
  engineState: VtEngineStateExtended;
  /** Start exploring world map (after session starts from portal) */
  openWorldMap: () => void;
  /** Player selects a world from the map */
  selectWorld: (world: VtWorld) => void;
  /** Begin the actual trial sequence for selected world */
  startStage: () => void;
  /** Record a trial response (side / option index / card indices) */
  submitResponse: (response: VtTrialResponseInput) => void;
  /** No response in time — ease difficulty and show a new stimulus */
  handleTrialTimeout: () => void;
  /** Continue from stage result back to world map */
  continueAfterStage: () => void;
  /** Force session complete (timeout / end button) */
  forceComplete: () => void;
  /** Serialize current state for pause */
  serializeForPause: () => VtPauseSnapshot;
  /** Restore engine from saved exerciseState */
  restoreFromSnapshot: (snapshot: VtPauseSnapshot) => void;
}

export function useVtQuestEngine(options: UseVtQuestEngineOptions = {}): UseVtQuestEngineReturn {
  const mergedSettings: VtSettings = { ...DEFAULT_VT_SETTINGS, ...options.settings };
  const initialWorld: VtWorld =
    options.singleModality ?? options.initialWorld ?? mergedSettings.modalities[0] ?? 'gabor';
  const singleModality = options.singleModality;
  const gaborStartContrast =
    options.staircaseContext?.gaborStartContrast ?? GABOR_PARAMS.startValue;
  const gaborStartContrastRef = useRef(gaborStartContrast);
  gaborStartContrastRef.current = gaborStartContrast;

  const [engineState, setEngineState] = useState<VtEngineStateExtended>(() => {
    const session =
      options.initialState ?? buildInitialSession(mergedSettings, initialWorld, gaborStartContrast);
    return {
      screen: 'world-map',
      session,
      settings: mergedSettings,
      isPendingResponse: false,
      currentTrial: null,
      lastStageResult: null,
      stimulusVisible: false,
      crowdingStageConfig: null,
      isBossStage: false,
    };
  });

  const trialStartTimeRef = useRef<number>(0);

  const openWorldMap = useCallback(() => {
    setEngineState((prev) => ({
      ...prev,
      screen: 'world-map',
      isPendingResponse: false,
      crowdingStageConfig: null,
    }));
  }, []);

  const selectWorld = useCallback(
    (world: VtWorld) => {
      setEngineState((prev) => {
        const { staircaseState, isBoss } = buildStaircaseForStage(
          world,
          prev.settings,
          prev.session.stageIndex,
          gaborStartContrast
        );

        // Build crowding config fresh for each new stage
        const crowdingConfig = world === 'crowding' ? buildCrowdingStageConfig() : null;

        const newSession: VtSessionState = {
          ...prev.session,
          currentWorld: world,
          staircaseState,
          currentStageTrials: [],
          currentCombo: 0,
        };

        return {
          ...prev,
          screen: 'stage-intro',
          session: newSession,
          crowdingStageConfig: crowdingConfig,
          isBossStage: isBoss,
        };
      });
    },
    [gaborStartContrast]
  );

  const startStage = useCallback(() => {
    setEngineState((prev) => {
      const world = prev.session.currentWorld;
      const meta = buildTrialMetaForWorld(
        world,
        prev.settings,
        prev.session.stageIndex,
        prev.isBossStage,
        prev.crowdingStageConfig
      );

      let staircaseState = prev.session.staircaseState;
      if (world === 'gabor' && prev.session.currentStageTrials.length === 0) {
        const clinicalStart = gaborStartContrastRef.current;
        staircaseState = { ...staircaseState, currentValue: clinicalStart };
      }

      const trial = createTrial(0, world, staircaseState.currentValue, meta);
      trialStartTimeRef.current = Date.now();

      return {
        ...prev,
        screen: 'trial',
        session: { ...prev.session, staircaseState },
        isPendingResponse: true,
        stimulusVisible: true,
        currentTrial: trial,
      };
    });
  }, []);

  const submitResponse = useCallback((response: VtTrialResponseInput) => {
    setEngineState((prev) => {
      if (!prev.isPendingResponse || !prev.currentTrial) return prev;

      const rt = Date.now() - trialStartTimeRef.current;
      const params = getParamsForWorld(prev.session.currentWorld, prev.settings);
      const newSession = applyResponse(prev.session, prev.currentTrial, response, rt, params);
      const stageEnd = getStageEndOptions(prev.session.currentWorld, prev.settings);
      const done = isStageDone(newSession, stageEnd.trialsPerStage, params, {
        endOnStaircase: stageEnd.endOnStaircase,
      });

      if (done) {
        const stageResult = finalizeStage(
          newSession.currentWorld,
          newSession.stageIndex,
          newSession.currentStageTrials,
          newSession,
          params
        );

        const updatedSession: VtSessionState = {
          ...newSession,
          completedStages: [...newSession.completedStages, stageResult],
          totalStars: newSession.totalStars + stageResult.stars,
          totalCoins: newSession.totalCoins + stageResult.coinsEarned,
          stageIndex: newSession.stageIndex + 1,
          currentStageTrials: [],
        };

        // Session ends only when timer runs out (portal) or forceComplete — not on stage quota.
        return {
          ...prev,
          screen: 'stage-result',
          session: updatedSession,
          isPendingResponse: false,
          stimulusVisible: false,
          currentTrial: null,
          lastStageResult: stageResult,
          crowdingStageConfig: null,
        };
      }

      // Prepare next trial — reuse same crowding config for the whole stage
      const world = newSession.currentWorld;
      const meta = buildTrialMetaForWorld(
        world,
        prev.settings,
        newSession.stageIndex,
        prev.isBossStage,
        prev.crowdingStageConfig
      );

      const nextTrial: VtTrial = createTrial(
        newSession.currentStageTrials.length,
        world,
        newSession.staircaseState.currentValue,
        meta
      );

      trialStartTimeRef.current = Date.now();

      return {
        ...prev,
        session: newSession,
        currentTrial: nextTrial,
        isPendingResponse: true,
        stimulusVisible: true,
      };
    });
  }, []);

  const handleTrialTimeout = useCallback(() => {
    setEngineState((prev) => {
      if (!prev.isPendingResponse || !prev.currentTrial || prev.screen !== 'trial') return prev;

      const params = getParamsForWorld(prev.session.currentWorld, prev.settings);
      const newSession = applyTrialTimeout(prev.session, params);
      const world = newSession.currentWorld;

      const crowdingConfig = prev.crowdingStageConfig;

      const meta = buildTrialMetaForWorld(
        world,
        prev.settings,
        newSession.stageIndex,
        prev.isBossStage,
        crowdingConfig
      );

      const nextTrial = createTrial(
        prev.currentTrial.trialIndex,
        world,
        newSession.staircaseState.currentValue,
        meta
      );

      trialStartTimeRef.current = Date.now();

      return {
        ...prev,
        session: newSession,
        currentTrial: nextTrial,
        crowdingStageConfig: crowdingConfig,
        isPendingResponse: true,
        stimulusVisible: true,
      };
    });
  }, []);

  const continueAfterStage = useCallback(() => {
    setEngineState((prev) => {
      if (singleModality) {
        const world = prev.session.currentWorld;
        const { staircaseState, isBoss } = buildStaircaseForStage(
          world,
          prev.settings,
          prev.session.stageIndex,
          gaborStartContrastRef.current
        );

        return {
          ...prev,
          screen: 'stage-intro',
          session: {
            ...prev.session,
            staircaseState,
            currentStageTrials: [],
            currentCombo: 0,
          },
          lastStageResult: null,
          crowdingStageConfig: null,
          isBossStage: isBoss,
        };
      }

      return {
        ...prev,
        screen: 'world-map',
        lastStageResult: null,
        crowdingStageConfig: null,
        isBossStage: false,
      };
    });
  }, [singleModality]);

  const forceComplete = useCallback(() => {
    setEngineState((prev) => ({
      ...prev,
      screen: 'session-complete',
      isPendingResponse: false,
      stimulusVisible: false,
      crowdingStageConfig: null,
    }));
  }, []);

  const serializeForPause = useCallback((): VtPauseSnapshot => {
    return buildVtPauseSnapshot({
      session: engineState.session,
      screen: engineState.screen,
      currentTrial: engineState.currentTrial,
      isPendingResponse: engineState.isPendingResponse,
      stimulusVisible: engineState.stimulusVisible,
      lastStageResult: engineState.lastStageResult,
      crowdingStageConfig: engineState.crowdingStageConfig,
      isBossStage: engineState.isBossStage,
    });
  }, [engineState]);

  const restoreFromSnapshot = useCallback(
    (snapshot: VtPauseSnapshot) => {
      const {
        snapshotVersion: _v,
        vtScreen,
        currentTrial,
        isPendingResponse,
        stimulusVisible,
        lastStageResult,
        crowdingStageConfig,
        isBossStage,
        ...session
      } = snapshot;

      const resetGaborStageStart =
        session.currentWorld === 'gabor' && session.currentStageTrials.length === 0;
      const clinicalGaborStart = gaborStartContrastRef.current;
      const staircaseState =
        resetGaborStageStart && session.staircaseState
          ? { ...session.staircaseState, currentValue: clinicalGaborStart }
          : session.staircaseState;

      let restoredTrial = currentTrial ?? null;
      if (restoredTrial && resetGaborStageStart && restoredTrial.world === 'gabor') {
        restoredTrial = { ...restoredTrial, difficultyValue: clinicalGaborStart };
      }

      setEngineState({
        screen:
          singleModality && (vtScreen === 'world-map' || vtScreen == null)
            ? 'stage-intro'
            : (vtScreen ?? (singleModality ? 'stage-intro' : 'world-map')),
        session: { ...session, staircaseState },
        settings: mergedSettings,
        isPendingResponse: isPendingResponse ?? false,
        currentTrial: restoredTrial,
        lastStageResult: lastStageResult ?? null,
        stimulusVisible: stimulusVisible ?? false,
        crowdingStageConfig: crowdingStageConfig ?? null,
        isBossStage: isBossStage ?? false,
      });
    },
    [mergedSettings, singleModality]
  );

  return {
    engineState,
    openWorldMap,
    selectWorld,
    startStage,
    submitResponse,
    handleTrialTimeout,
    continueAfterStage,
    forceComplete,
    serializeForPause,
    restoreFromSnapshot,
  };
}
