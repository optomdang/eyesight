import React, { useState } from 'react';
import { Box, Typography, Tabs, Tab } from '@mui/material';
import PageContainer from 'src/components/container/PageContainer';
import { DataTableProvider } from 'src/contexts/data-context/DataTableContext';
import ExerciseHistoryTable from './ExerciseHistoryTable';
import ExamHistoryTable from './ExamHistoryTable';
import { useTranslation } from 'src/hooks/useTranslation';

const HistoryPage: React.FC = () => {
  const { t } = useTranslation();
  const [currentTab, setCurrentTab] = useState(0);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  return (
    <PageContainer title={t('history.title')} description={t('history.description')}>
      <Box>
        {/* Page Header */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" gutterBottom>
            {t('history.pageTitle')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('history.pageDescription')}
          </Typography>
        </Box>

        {/* History Tables */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs value={currentTab} onChange={handleTabChange}>
            <Tab label={t('history.exerciseHistory')} />
            <Tab label={t('history.examHistory')} />
          </Tabs>
        </Box>

        {currentTab === 0 && (
          <DataTableProvider endpoint="me/assignments">
            <ExerciseHistoryTable />
          </DataTableProvider>
        )}

        {currentTab === 1 && (
          <DataTableProvider endpoint="me/exam-results">
            <ExamHistoryTable />
          </DataTableProvider>
        )}
      </Box>
    </PageContainer>
  );
};

export default HistoryPage;
