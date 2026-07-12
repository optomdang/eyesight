import React from 'react';
import { Stepper, Step, StepLabel, StepContent, Typography, Chip, Stack } from '@mui/material';
import type { WarrantyPhase } from 'src/types/core/warranty';
import {
  getPhaseTypeLabel,
  getWarrantyStatusLabel,
  getWarrantyStatusColor,
} from 'src/utils/warrantyClinicalData';

export interface PhaseTimelineProps {
  phases: WarrantyPhase[];
  selectedPhaseId?: number | null;
  onSelectPhase?: (phase: WarrantyPhase) => void;
}

const PhaseTimeline: React.FC<PhaseTimelineProps> = ({
  phases,
  selectedPhaseId,
  onSelectPhase,
}) => {
  const sorted = [...phases].sort((a, b) => a.phaseNumber - b.phaseNumber);
  const activeIndex = Math.max(
    0,
    sorted.findIndex((p) => p.id === selectedPhaseId) >= 0
      ? sorted.findIndex((p) => p.id === selectedPhaseId)
      : sorted.findIndex((p) => p.status !== 'completed')
  );

  if (sorted.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        Chưa có giai đoạn nào.
      </Typography>
    );
  }

  return (
    <Stepper activeStep={activeIndex} orientation="vertical" nonLinear>
      {sorted.map((phase) => {
        const isSelected = phase.id === selectedPhaseId;
        const statusColor = getWarrantyStatusColor(phase.status);

        return (
          <Step key={phase.id} completed={phase.status === 'completed'} expanded>
            <StepLabel
              optional={
                <Chip
                  label={getWarrantyStatusLabel(phase.status)}
                  size="small"
                  color={statusColor}
                  variant="outlined"
                />
              }
              sx={{
                cursor: onSelectPhase ? 'pointer' : 'default',
                '& .MuiStepLabel-label': {
                  fontWeight: isSelected ? 700 : 400,
                },
              }}
              onClick={() => onSelectPhase?.(phase)}
            >
              {getPhaseTypeLabel(phase.phaseType)} (Lần {phase.phaseNumber})
            </StepLabel>
            <StepContent>
              <Stack spacing={0.5}>
                {phase.completedAt && (
                  <Typography variant="caption" color="text.secondary">
                    Hoàn tất: {new Date(phase.completedAt).toLocaleString('vi-VN')}
                  </Typography>
                )}
                {phase.guardianSignature && (
                  <Typography variant="caption" color="text.secondary">
                    Phụ huynh: {phase.guardianSignature.signerName}
                    {phase.guardianSignature.signerRelation
                      ? ` (${phase.guardianSignature.signerRelation})`
                      : ''}
                  </Typography>
                )}
                {phase.doctorSignature && (
                  <Typography variant="caption" color="text.secondary">
                    Bác sĩ: {phase.doctorSignature.signerName}
                  </Typography>
                )}
              </Stack>
            </StepContent>
          </Step>
        );
      })}
    </Stepper>
  );
};

export default PhaseTimeline;
