import React from 'react';
import { Stepper, Step, StepLabel, StepContent, Typography, Chip, Stack } from '@mui/material';
import type { WarrantyPhase } from 'src/types/core/warranty';
import {
  getPhaseTypeLabel,
  getWarrantyStatusLabel,
  getWarrantyStatusColor,
} from 'src/utils/warrantyClinicalData';
import SignatureDisplay from './SignatureDisplay';

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
              <Stack spacing={1}>
                {phase.completedAt && (
                  <Typography variant="caption" color="text.secondary">
                    Hoàn tất: {new Date(phase.completedAt).toLocaleString('vi-VN')}
                  </Typography>
                )}
                {phase.guardianSignature && (
                  <SignatureDisplay
                    signature={phase.guardianSignature}
                    roleLabel="Phụ huynh"
                    compact
                  />
                )}
                {phase.doctorSignature && (
                  <SignatureDisplay
                    signature={phase.doctorSignature}
                    roleLabel="Bác sĩ"
                    compact
                  />
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
