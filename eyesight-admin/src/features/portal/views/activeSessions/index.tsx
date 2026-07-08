import React from 'react';
import { DataTableProvider } from 'src/contexts/data-context/DataTableContext';
import ActiveSessionsPage from './ActiveSessionsPage';

const ActiveSessions: React.FC = () => {
  return (
    <DataTableProvider endpoint="me/assignments" filter={{ status: 'active' }}>
      <ActiveSessionsPage />
    </DataTableProvider>
  );
};

export default ActiveSessions;
