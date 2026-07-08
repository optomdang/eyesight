import React from 'react';
import { useLocation } from 'react-router-dom';
import PageContainer from 'src/components/container/PageContainer';
import { DataTableProvider } from 'src/contexts/data-context/DataTableContext';
import { useTranslation } from 'src/hooks/useTranslation';
import ExerciseConfigTab from './ExerciseConfigTab';
import BaseExerciseTab from './BaseExerciseTab';
import { parseExerciseTab } from './exercisePageTabs';

const Exercise: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const currentTab = parseExerciseTab(new URLSearchParams(location.search));

  return (
    <PageContainer
      title={t('exercise.exerciseManagement')}
      description={t('exercise.exerciseManagementDescription')}
    >
      {currentTab === 0 && (
        <DataTableProvider endpoint="exercise-configs">
          <ExerciseConfigTab />
        </DataTableProvider>
      )}

      {currentTab === 1 && (
        <DataTableProvider endpoint="exercises">
          <BaseExerciseTab />
        </DataTableProvider>
      )}
    </PageContainer>
  );
};

export default Exercise;
