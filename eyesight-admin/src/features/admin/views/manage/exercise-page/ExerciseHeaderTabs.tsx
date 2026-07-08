import React, { memo } from 'react';
import { Add } from '@mui/icons-material';
import { Box, Button, Tab, Tabs } from '@mui/material';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'src/hooks/useTranslation';
import { useExercisePageHeader } from './ExercisePageHeaderContext';
import {
  EXERCISE_PAGE_PATH,
  EXERCISE_TAB_QUERY_KEY,
  parseExerciseTab,
} from './exercisePageTabs';

const tabLinkSx = {
  minHeight: 40,
  py: 0.5,
  px: 1.5,
  fontSize: '0.875rem',
  textTransform: 'none',
  fontWeight: 600,
} as const;

const ExerciseHeaderTabs: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const { createAction } = useExercisePageHeader();
  const exerciseTab = parseExerciseTab(new URLSearchParams(location.search));

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
      <Tabs
        value={exerciseTab}
        aria-label={t('exercise.tabs.ariaLabel', 'Quản lý bài tập')}
        sx={{
          minHeight: 40,
          '& .MuiTabs-indicator': { height: 2 },
          '& .MuiTab-root': tabLinkSx,
        }}
      >
        <Tab
          label={t('exercise.tabs.configs', 'Chế độ tập luyện')}
          value={0}
          component={Link}
          to={`${EXERCISE_PAGE_PATH}?${EXERCISE_TAB_QUERY_KEY}=0`}
          replace
        />
        <Tab
          label={t('exercise.tabs.baseGames', 'Bài tập gốc')}
          value={1}
          component={Link}
          to={`${EXERCISE_PAGE_PATH}?${EXERCISE_TAB_QUERY_KEY}=1`}
          replace
        />
      </Tabs>

      {createAction && createAction.visible !== false && (
        <Button
          variant="contained"
          color="primary"
          size="small"
          startIcon={<Add />}
          onClick={createAction.onClick}
          sx={{ flexShrink: 0, whiteSpace: 'nowrap' }}
        >
          {createAction.label}
        </Button>
      )}
    </Box>
  );
};

export default memo(ExerciseHeaderTabs);
