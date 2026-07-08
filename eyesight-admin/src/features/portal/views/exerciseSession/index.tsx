import React from 'react';
import { useParams } from 'react-router-dom';
import { DataTableProvider } from 'src/contexts/data-context/DataTableContext';
import ExerciseSessionPage from './ExerciseSessionPage';

const Sessions: React.FC = () => {
  const { assignmentId } = useParams<{ assignmentId: string }>();

  if (!assignmentId) {
    return <div>Assignment ID is required</div>;
  }

  return (
    <DataTableProvider endpoint={`me/assignments/${assignmentId}/sessions`}>
      <ExerciseSessionPage />
    </DataTableProvider>
  );
};

export default Sessions;
