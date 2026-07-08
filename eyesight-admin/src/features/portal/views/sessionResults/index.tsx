import React from 'react';
import { useParams } from 'react-router-dom';
import { DataTableProvider } from 'src/contexts/data-context/DataTableContext';
import SessionResultsPage from './SessionResultsPage';

const SessionResults: React.FC = () => {
  const { assignmentId, sessionId } = useParams<{ assignmentId: string; sessionId: string }>();

  if (!assignmentId || !sessionId) {
    return <div>Assignment ID và Session ID là bắt buộc</div>;
  }

  return (
    <DataTableProvider endpoint={`me/assignments/${assignmentId}/sessions/${sessionId}/results`}>
      <SessionResultsPage />
    </DataTableProvider>
  );
};

export default SessionResults;
