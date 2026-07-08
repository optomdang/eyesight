import React, { createContext, useContext, ReactNode } from 'react';
import { useExamState, ExamStateType } from 'src/services/exam-state';

interface ExamProviderProps {
  children: ReactNode;
  examResultId: number | null;
  initialExamType: 'far' | 'near' | 'contrast' | 'stereopsis';
  sessionId?: number; // NEW: Optional sessionId from navigation state
}

const ExamContext = createContext<ExamStateType | null>(null);

export const ExamProvider: React.FC<ExamProviderProps> = ({
  children,
  examResultId,
  initialExamType,
  sessionId, // NEW: Receive sessionId prop
}) => {
  const examState = useExamState(examResultId, initialExamType, sessionId); // NEW: Pass sessionId

  return <ExamContext.Provider value={examState}>{children}</ExamContext.Provider>;
};

export const useExamContext = () => {
  const context = useContext(ExamContext);
  if (!context) {
    throw new Error('useExamContext must be used within ExamProvider');
  }
  return context;
};
