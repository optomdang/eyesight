import { useParams, useLocation } from 'react-router-dom';
import { Box } from '@mui/material';
import { ExamProvider, useExamContext } from 'src/contexts/ExamContext';
// Removed legacy getExamAssignments import

// Components
import DistanceStep from './components/DistanceStep';
import InstructionStep from './components/InstructionStep';
import TestStep from './components/TestStep';
import SwitchEyeStep from './components/SwitchEyeStep';
import ResultStep from './components/ResultStep';
import ExamContainer from './components/ExamContainer';
import StereopsisStep from './components/StereopsisStep';

/**
 * ExamPage component
 * Handles different types of vision exams: far, near, contrast, and stereopsis
 */
const ExamPageContent = () => {
  // Use the shared exam context
  const { step } = useExamContext();

  // Render the appropriate step based on the current step
  return (
    <>
      {step === 'distance' && (
        <ExamContainer minimal>
          <DistanceStep />
        </ExamContainer>
      )}

      {step === 'instructions' && (
        <ExamContainer minimal>
          <InstructionStep />
        </ExamContainer>
      )}

      {(step === 'test-right' || step === 'test-left') && (
        <Box sx={{ minHeight: '100vh', bgcolor: 'background.paper' }}>
          <TestStep />
        </Box>
      )}

      {step === 'test-both' && (
        <Box sx={{ minHeight: '100vh', bgcolor: 'background.paper' }}>
          <StereopsisStep />
        </Box>
      )}

      {step === 'switch-eye' && (
        <ExamContainer minimal>
          <SwitchEyeStep />
        </ExamContainer>
      )}

      {step === 'results' && (
        <ExamContainer minimal>
          <ResultStep />
        </ExamContainer>
      )}
    </>
  );
};

const ExamPage = () => {
  const { examType, examId } = useParams<{ examType?: string; examId?: string }>();
  const location = useLocation();

  // Get exam data from navigation state or params
  const stateData = location.state as {
    examType?: string;
    examResultId?: number;
    sessionId?: number; // NEW: Get sessionId from navigation state
  } | null;

  const currentExamType = stateData?.examType || examType;
  const currentExamResultId = stateData?.examResultId || (examId ? parseInt(examId) : null);
  const currentSessionId = stateData?.sessionId; // NEW: Pass sessionId to ExamProvider

  // Fallback to 'far' if examType is invalid
  const validExamType = ['far', 'near', 'contrast', 'stereopsis'].includes(currentExamType || 'far')
    ? (currentExamType as 'far' | 'near' | 'contrast' | 'stereopsis')
    : 'far';

  return (
    <ExamProvider
      examResultId={currentExamResultId}
      initialExamType={validExamType}
      sessionId={currentSessionId} // NEW: Pass sessionId to context
    >
      <ExamPageContent />
    </ExamProvider>
  );
};

export default ExamPage;
