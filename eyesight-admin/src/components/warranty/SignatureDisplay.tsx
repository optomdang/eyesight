import React from 'react';
import { Box, Typography } from '@mui/material';
import type { WarrantySignatureRecord } from 'src/types/core/warranty';

const RELATION_LABELS: Record<string, string> = {
  parent: 'Cha/mẹ',
  guardian: 'Người giám hộ',
  relative: 'Người thân',
  other: 'Khác',
  'Cha/mẹ': 'Cha/mẹ',
  'Người giám hộ': 'Người giám hộ',
  'Người thân': 'Người thân',
  Khác: 'Khác',
};

export interface SignatureDisplayProps {
  signature: WarrantySignatureRecord;
  /** e.g. "Phụ huynh" / "Bác sĩ" */
  roleLabel: string;
  compact?: boolean;
}

/**
 * Show stored e-sign metadata + drawn signature image when available.
 */
const SignatureDisplay: React.FC<SignatureDisplayProps> = ({
  signature,
  roleLabel,
  compact = false,
}) => {
  const relation =
    signature.signerRelation != null && signature.signerRelation !== ''
      ? RELATION_LABELS[signature.signerRelation] || signature.signerRelation
      : null;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: compact ? 'row' : 'column',
        alignItems: compact ? 'center' : 'flex-start',
        gap: compact ? 1.5 : 1,
        flexWrap: 'wrap',
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" color="text.secondary">
          {roleLabel}: <strong>{signature.signerName}</strong>
          {relation ? ` (${relation})` : ''}
        </Typography>
        {signature.signedAt && (
          <Typography variant="caption" color="text.secondary" display="block">
            {new Date(signature.signedAt).toLocaleString('vi-VN')}
          </Typography>
        )}
      </Box>
      {signature.signatureDataUrl ? (
        <Box
          component="img"
          src={signature.signatureDataUrl}
          alt={`Chữ ký ${roleLabel}`}
          sx={{
            display: 'block',
            maxWidth: compact ? 160 : 280,
            maxHeight: compact ? 64 : 120,
            width: 'auto',
            height: 'auto',
            objectFit: 'contain',
            bgcolor: '#fff',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            p: 0.5,
          }}
        />
      ) : null}
    </Box>
  );
};

export default SignatureDisplay;
