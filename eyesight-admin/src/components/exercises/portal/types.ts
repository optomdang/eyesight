import type { ScreenInfo } from 'src/utils/visionUtils';
import type { Assignment } from 'src/types';

/**
 * Props shared by every playable portal exercise component.
 *
 * The dispatcher (`PortalExercise.tsx`) resolves the exercise type from the
 * assignment and renders the matching component from the exercise registry,
 * forwarding exactly these props. Each game component (e.g. `Game2048Exercise`)
 * implements this contract.
 */
export interface PortalExerciseProps {
  assignmentId: number;
  sessionId: number;
  screenParams: ScreenInfo;
  onGameComplete?: (result: unknown) => void;
  assignment?: Assignment;
  /** Skip API calls; for admin/dev test page */
  sandboxMode?: boolean;
  /** Unlock all planets on world map (sandbox / test) */
  unlockAllWorlds?: boolean;
  /** Override merged vtSettings in sandbox */
  sandboxSettings?: Partial<import('src/types/core/vtQuest').VtSettings>;
  /** Called when user exits sandbox (close / end session) */
  onSandboxExit?: () => void;
}
