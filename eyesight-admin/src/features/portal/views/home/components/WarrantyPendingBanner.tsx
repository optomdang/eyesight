import React, { useEffect, useState } from 'react';
import { Alert, Typography } from '@mui/material';
import { getMyWarrantyAgreement } from 'src/services/warranty.service';

/**
 * Banner on portal home when guardian signature is pending.
 */
const WarrantyPendingBanner: React.FC = () => {
  const [pending, setPending] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;

    getMyWarrantyAgreement()
      .then((agreement) => {
        if (cancelled) return;
        const hasPending = Boolean(
          agreement?.phases?.some((p) => p.status === 'awaiting_guardian')
        );
        setPending(hasPending);
      })
      .catch(() => {
        if (!cancelled) setPending(false);
      })
      .finally(() => {
        if (!cancelled) setChecked(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!checked || !pending) return null;

  return (
    <Alert severity="warning" sx={{ mb: 3 }}>
      <Typography variant="body2">
        <strong>Cam kết bảo hành:</strong> Có giai đoạn đang chờ phụ huynh/người giám hộ ký.
        Vui lòng mở link ký mà bác sĩ gửi qua Zalo hoặc tin nhắn trên điện thoại.
      </Typography>
    </Alert>
  );
};

export default WarrantyPendingBanner;
