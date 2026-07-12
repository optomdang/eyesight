import React, { useRef, useState } from 'react';
import {
  Box,
  Button,
  TextField,
  FormControlLabel,
  Checkbox,
  Typography,
  Alert,
  MenuItem,
} from '@mui/material';
import SignaturePad, { SignaturePadHandle } from 'src/components/shared/SignaturePad';
import { LabelWithHelp } from 'src/components/shared/HelpTooltip';
import { GUARDIAN_CONSENT_TEXT, E_SIGN_DISCLAIMER } from 'src/content/warrantyPolicy';
import type { SignWarrantyPhasePayload } from 'src/types/core/warranty';

const RELATION_OPTIONS = [
  { value: 'parent', label: 'Cha/Mẹ' },
  { value: 'guardian', label: 'Người giám hộ' },
  { value: 'relative', label: 'Người thân được ủy quyền' },
  { value: 'other', label: 'Khác' },
];

export interface GuardianSignFormProps {
  onSubmit: (payload: SignWarrantyPhasePayload) => Promise<void>;
  disabled?: boolean;
}

const GuardianSignForm: React.FC<GuardianSignFormProps> = ({
  onSubmit,
  disabled = false,
}) => {
  const padRef = useRef<SignaturePadHandle>(null);
  const [signerName, setSignerName] = useState('');
  const [signerRelation, setSignerRelation] = useState('parent');
  const [consent, setConsent] = useState(false);
  const [signatureEmpty, setSignatureEmpty] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit =
    !disabled &&
    consent &&
    signerName.trim().length > 0 &&
    signerRelation.length > 0 &&
    !signatureEmpty &&
    !submitting;

  const handleSubmit = async () => {
    const dataUrl = padRef.current?.toDataUrl();
    if (!dataUrl || !canSubmit) return;

    setSubmitting(true);
    try {
      await onSubmit({
        signatureDataUrl: dataUrl,
        signerName: signerName.trim(),
        signerRelation,
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
        Ký xác nhận (Phụ huynh / Người giám hộ)
      </Typography>

      <Alert severity="info" sx={{ mb: 2 }}>
        {GUARDIAN_CONSENT_TEXT}
      </Alert>

      <TextField
        fullWidth
        size="small"
        label={
          <LabelWithHelp help="Họ tên đầy đủ của phụ huynh hoặc người giám hộ hợp pháp ký thay bệnh nhân.">
            Họ tên người ký
          </LabelWithHelp>
        }
        value={signerName}
        onChange={(e) => setSignerName(e.target.value)}
        disabled={disabled}
        sx={{ mb: 2 }}
        InputLabelProps={{ shrink: true }}
      />

      <TextField
        fullWidth
        select
        size="small"
        label={
          <LabelWithHelp help="Mối quan hệ của người ký với bệnh nhân (trẻ em).">
            Quan hệ với bệnh nhân
          </LabelWithHelp>
        }
        value={signerRelation}
        onChange={(e) => setSignerRelation(e.target.value)}
        disabled={disabled}
        sx={{ mb: 2 }}
        InputLabelProps={{ shrink: true }}
      >
        {RELATION_OPTIONS.map((opt) => (
          <MenuItem key={opt.value} value={opt.value}>
            {opt.label}
          </MenuItem>
        ))}
      </TextField>

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

export default GuardianSignForm;
