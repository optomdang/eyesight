import React, { useState } from 'react';
import { Button, CircularProgress } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import useSnackbar from 'src/contexts/UseSnackbar';
import { SNACKBAR_SEVERITY } from 'src/utils/constant';
import {
  downloadWarrantyPhasePdf,
  downloadWarrantyAggregatePdf,
  triggerBlobDownload,
} from 'src/services/warranty.service';

export interface PdfDownloadButtonProps {
  agreementId: number;
  phaseId?: number;
  filename: string;
  label?: string;
  variant?: 'text' | 'outlined' | 'contained';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
}

const PdfDownloadButton: React.FC<PdfDownloadButtonProps> = ({
  agreementId,
  phaseId,
  filename,
  label = 'Tải PDF',
  variant = 'outlined',
  size = 'small',
  disabled = false,
}) => {
  const { showSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    try {
      const blob =
        phaseId != null
          ? await downloadWarrantyPhasePdf(agreementId, phaseId)
          : await downloadWarrantyAggregatePdf(agreementId);
      triggerBlobDownload(blob, filename);
    } catch (error) {
      console.error('PDF download failed:', error);
      const message =
        error instanceof Error && error.message
          ? error.message
          : 'Không tải được PDF. Vui lòng thử lại.';
      showSnackbar(message, SNACKBAR_SEVERITY.ERROR);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      startIcon={loading ? <CircularProgress size={16} /> : <DownloadIcon />}
      onClick={handleDownload}
      disabled={disabled || loading}
    >
      {label}
    </Button>
  );
};

export default PdfDownloadButton;
