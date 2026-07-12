import React, { useRef, useState } from 'react';
import {
  Box,
  Button,
  TextField,
  FormControlLabel,
  Checkbox,
  Typography,
  Alert,
} from '@mui/material';
import SignaturePad, { SignaturePadHandle } from 'src/components/shared/SignaturePad';
import { LabelWithHelp } from 'src/components/shared/HelpTooltip';
import { DOCTOR_CONSENT_TEXT, E_SIGN_DISCLAIMER } from 'src/content/warrantyPolicy';
import type { SignWarrantyPhasePayload } from 'src/types/core/warranty';

export interface DoctorSignFormProps {
  onSubmit: (payload: SignWarrantyPhasePayload) => Promise<void>;
  disabled?: boolean;
  defaultSignerName?: string;
}

const DoctorSignForm: React.FC<DoctorSignFormProps> = ({
  onSubmit,
  disabled = false,
  defaultSignerName = '',
}) => {
  const padRef = useRef<SignaturePadHandle>(null);
  const [signerName, setSignerName] = useState(defaultSignerName);
  const [consent, setConsent] = useState(false);
  const [signatureEmpty, setSignatureEmpty] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit =
    !disabled && consent && signerName.trim().length > 0 && !signatureEmpty && !submitting;

  const handleSubmit = async () => {
    const dataUrl = padRef.current?.toDataUrl();
    if (!dataUrl || !canSubmit) return;

    setSubmitting(true);
    try {
      await onSubmit({
        signatureDataUrl: dataUrl,
        signerName: signerName.trim(),
        consentAccepted: true,
      });
      padRef.current?.clear();
      setConsent(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box>
      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
        Ký xác nhận (Bác sĩ)
      </Typography>

      <Alert severity="info" sx={{ mb: 2 }}>
        {DOCTOR_CONSENT_TEXT}
      </Alert>

      <TextField
        fullWidth
        size="small"
        label={
          <LabelWithHelp help="Họ tên đầy đủ của bác sĩ/chuyên gia ký xác nhận biên bản.">
            Họ tên bác sĩ
          </LabelWithHelp>
        }
        value={signerName}
        onChange={(e) => setSignerName(e.target.value)}
        disabled={disabled}
        sx={{ mb: 2 }}
        InputLabelProps={{ shrink: true }}
      />

      <SignaturePad
        ref={padRef}
        disabled={disabled}
        onChange={(empty) => setSignatureEmpty(empty)}
      />

      <FormControlLabel
        sx={{ mt: 2, alignItems: 'flex-start' }}
        control={
          <Checkbox
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            disabled={disabled}
          />
        }
        label={
          <LabelWithHelp help={E_SIGN_DISCLAIMER}>
            Tôi đồng ý ký điện tử theo nội dung trên
          </LabelWithHelp>
        }
      />

      <Box sx={{ mt: 2 }}>
        <Button variant="contained" onClick={handleSubmit} disabled={!canSubmit}>
          {submitting ? 'Đang ký...' : 'Ký xác nhận'}
        </Button>
      </Box>
    </Box>
  );
};

export default DoctorSignForm;
