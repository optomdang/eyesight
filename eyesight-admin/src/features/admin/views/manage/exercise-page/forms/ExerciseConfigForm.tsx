import React, { useState, useEffect } from 'react';
import { useTranslation } from 'src/hooks/useTranslation';
import type { Exercise, ExerciseConfig } from 'src/types/core';
import useSnackbar from 'src/contexts/UseSnackbar';
import { SNACKBAR_SEVERITY } from 'src/utils/constant';
import * as exerciseService from 'src/services/exercise.service';
import { ConfigForm } from 'src/components/shared/exercise-config';
import useDataTable from 'src/contexts/data-context/useDataTable';
import { getErrorMessage } from 'src/utils/errorHandler';
import { normalizeExerciseConfigPayload } from 'src/utils/exerciseConfigPayload';

interface ExerciseConfigFormProps {
  open: boolean;
  onClose: () => void;
  configData?: ExerciseConfig;
  /** When true, doctors viewing system defaults cannot save changes. */
  readOnly?: boolean;
}

const ExerciseConfigForm: React.FC<ExerciseConfigFormProps> = ({
  open,
  onClose,
  configData,
  readOnly = false,
}) => {
  const { t } = useTranslation();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const { showSnackbar } = useSnackbar();
  const { fetchData } = useDataTable<ExerciseConfig>();

  // Load exercises list when dialog opens
  useEffect(() => {
    if (open) {
      loadExercisesData();
    }
  }, [open]);

  const loadExercisesData = async () => {
    try {
      const exercisesResponse = await exerciseService.getExercises({ limit: 100 });
      if (exercisesResponse?.rows) {
        setExercises(exercisesResponse.rows);
      }
    } catch {
      showSnackbar(t('exercise.loadError'), SNACKBAR_SEVERITY.ERROR);
    }
  };

  const handleSubmit = async (values: Partial<ExerciseConfig>) => {
    if (readOnly) {
      onClose();
      return;
    }
    try {
      const cleanedValues = normalizeExerciseConfigPayload(values, { forUpdate: Boolean(values?.id) });

      if (values?.id) {
        // Update existing config
        await exerciseService.updateExerciseConfigById(values.id, cleanedValues);
        showSnackbar(t('config.updateSuccess'), SNACKBAR_SEVERITY.SUCCESS);
      } else {
        // Create new config
        await exerciseService.createExerciseConfigDirect(cleanedValues);
        showSnackbar(t('config.createSuccess'), SNACKBAR_SEVERITY.SUCCESS);
      }

      fetchData(); // Reload table data
      onClose();
    } catch (error: any) {
      showSnackbar(getErrorMessage(error, t('config.saveError')), SNACKBAR_SEVERITY.ERROR);
      throw error; // Re-throw to prevent form closing
    }
  };

  return (
    <ConfigForm
      open={open}
      onClose={onClose}
      onSubmit={handleSubmit}
      configData={configData}
      readOnly={readOnly}
      submitButtonText={configData ? t('config.update') : t('config.create')}
      exercises={exercises}
    />
  );
};

export default ExerciseConfigForm;
