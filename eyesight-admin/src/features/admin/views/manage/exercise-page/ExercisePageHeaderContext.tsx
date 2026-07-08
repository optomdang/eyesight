import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

export interface ExerciseCreateAction {
  label: string;
  onClick: () => void;
  visible?: boolean;
}

interface ExercisePageHeaderContextValue {
  createAction: ExerciseCreateAction | null;
  setCreateAction: (action: ExerciseCreateAction | null) => void;
}

const ExercisePageHeaderContext = createContext<ExercisePageHeaderContextValue | null>(null);

export const ExercisePageHeaderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [createAction, setCreateActionState] = useState<ExerciseCreateAction | null>(null);
  const setCreateAction = useCallback((action: ExerciseCreateAction | null) => {
    setCreateActionState(action);
  }, []);

  const value = useMemo(
    () => ({ createAction, setCreateAction }),
    [createAction, setCreateAction]
  );

  return (
    <ExercisePageHeaderContext.Provider value={value}>{children}</ExercisePageHeaderContext.Provider>
  );
};

export function useExercisePageHeader(): ExercisePageHeaderContextValue {
  const ctx = useContext(ExercisePageHeaderContext);
  if (!ctx) {
    throw new Error('useExercisePageHeader must be used within ExercisePageHeaderProvider');
  }
  return ctx;
}
