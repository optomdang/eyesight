/**
 * Portal Exercise — dispatcher
 *
 * Resolves the exercise type from the assignment and renders the matching
 * playable component from the exercise registry. Each exercise type owns its
 * engine hook + board inside its own component, so adding a new exercise is
 * just: implement a component + register it (no edits here, no rules-of-hooks
 * conflicts). Unknown types fall back to <UnsupportedExercise/>.
 */

import React from 'react';
import { getExerciseComponent } from 'src/components/exercises/registry';
import { resolveVtExerciseTypeFromAssignment } from 'src/components/exercises/vt/core/vtExerciseTypes';
import UnsupportedExercise from './UnsupportedExercise';
import type { PortalExerciseProps } from './types';

const PortalExercise: React.FC<PortalExerciseProps> = (props) => {
  const { assignment } = props;

  const exerciseType = resolveVtExerciseTypeFromAssignment(assignment);
  const exerciseCode =
    assignment?.exercise?.code ?? assignment?.exerciseConfig?.exercise?.code ?? null;

  const ExerciseComponent = getExerciseComponent(exerciseType, exerciseCode);

  if (!ExerciseComponent) {
    return <UnsupportedExercise exerciseType={exerciseType ?? undefined} />;
  }

  return <ExerciseComponent {...props} />;
};

export default PortalExercise;
