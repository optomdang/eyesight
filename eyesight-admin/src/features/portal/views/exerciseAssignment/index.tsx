import React from 'react';
import { DataTableProvider } from 'src/contexts/data-context/DataTableContext';
import AssignmentPage from './AssignmentPage';

const Assignments: React.FC = () => {
  return (
    <DataTableProvider endpoint="me/assignments">
      <AssignmentPage />
    </DataTableProvider>
  );
};

export default Assignments;
