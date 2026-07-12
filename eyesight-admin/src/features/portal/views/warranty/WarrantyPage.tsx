import React, { useCallback, useEffect, useState } from 'react';
import { Box, Typography, Grid, Alert, Chip, Stack, Paper } from '@mui/material';
import PageContainer from 'src/components/container/PageContainer';
import LoadingBoundary from 'src/components/shared/LoadingBoundary';
import useSnackbar from 'src/contexts/UseSnackbar';
import { SNACKBAR_SEVERITY } from 'src/utils/constant';
import type { WarrantyAgreement, WarrantyPhase } from 'src/types/core';
import { getMyWarrantyAgreement } from 'src/services/warranty.service';
import {
  getPhaseTypeLabel,
  getWarrantyStatusLabel,
  getWarrantyStatusColor,
} from 'src/utils/warrantyClinicalData';
import PolicyViewer from 'src/components/warranty/PolicyViewer';
import PhaseTimeline from 'src/components/warranty/PhaseTimeline';
import PdfDownloadButton from 'src/components/warranty/PdfDownloadButton';

const PortalWarrantyPage: React.FC = () => {
  const { showSnackbar } = useSnackbar();

  const [agreement, setAgreement] = useState<WarrantyAgreement | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPhase, setSelectedPhase] = useState<WarrantyPhase | null>(null);

  const loadAgreement = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getMyWarrantyAgreement();
      setAgreement(data);
      if (data?.phases?.length) {
        const pending =
          data.phases.find((p) => p.status === 'awaiting_guardian') ||
          data.phases.find((p) => p.status !== 'completed') ||
          data.phases[data.phases.length - 1];
        setSelectedPhase(pending);
      } else {
        setSelectedPhase(null);
      }
    } catch (error) {
      console.error('Failed to load warranty:', error);
      showSnackbar('Không tải được cam kết bảo hành.', SNACKBAR_SEVERITY.ERROR);
    } finally {
      setLoading(false);
    }
  }, [showSnackbar]);

  useEffect(() => {
    loadAgreement();
  }, [loadAgreement]);

  return (
    <PageContainer
      title="Cam kết bảo hành"
      description="Xem nội dung cam kết bảo hành điều trị D-VisUp"
    >
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Cam kết bảo hành
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Xem nội dung cam kết và tiến trình các giai đoạn.
        </Typography>
      </Box>

      <LoadingBoundary loading={loading} height="300px">
        {!agreement ? (
          <Alert severity="info">
            Chưa có hồ sơ cam kết bảo hành. Vui lòng liên hệ bác sĩ/phòng khám để được hỗ trợ.
          </Alert>
        ) : (
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
                  <Chip
                    label={getWarrantyStatusLabel(agreement.status)}
                    color={getWarrantyStatusColor(agreement.status)}
                    size="small"
                  />
                  <Chip
                    label={`Phiên bản ${agreement.policyVersion}`}
                    size="small"
                    variant="outlined"
                  />
                </Stack>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                  Tiến trình
                </Typography>
                <PhaseTimeline
                  phases={agreement.phases ?? []}
                  selectedPhaseId={selectedPhase?.id}
                  onSelectPhase={setSelectedPhase}
                />
                <Box sx={{ mt: 2 }}>
                  <PdfDownloadButton
                    agreementId={agreement.id}
                    filename="warranty-full.pdf"
                    label="Tải PDF đầy đủ"
                    disabled={(agreement.phases ?? []).every((p) => p.status !== 'completed')}
                  />
                </Box>
              </Paper>
            </Grid>

            <Grid size={{ xs: 12, md: 8 }}>
              {selectedPhase?.status === 'awaiting_guardian' && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  Bác sĩ sẽ gửi link ký qua Zalo hoặc tin nhắn. Vui lòng mở link đó trên điện
                  thoại để ký xác nhận — không ký trực tiếp trên trang này.
                </Alert>
              )}

              {selectedPhase?.status === 'awaiting_doctor' && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  Bạn đã ký xong giai đoạn{' '}
                  <strong>
                    {getPhaseTypeLabel(selectedPhase.phaseType)} (Lần {selectedPhase.phaseNumber})
                  </strong>
                  . Đang chờ bác sĩ xác nhận.
                </Alert>
              )}

              {selectedPhase?.status === 'completed' && selectedPhase.guardianSignature && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  Giai đoạn{' '}
                  <strong>
                    {getPhaseTypeLabel(selectedPhase.phaseType)} (Lần {selectedPhase.phaseNumber})
                  </strong>{' '}
                  đã hoàn tất — ký bởi {selectedPhase.guardianSignature.signerName}
                  {selectedPhase.guardianSignature.signerRelation
                    ? ` (${selectedPhase.guardianSignature.signerRelation})`
                    : ''}{' '}
                  lúc{' '}
                  {new Date(selectedPhase.guardianSignature.signedAt).toLocaleString('vi-VN')}.
                  {selectedPhase.status === 'completed' && (
                    <Box sx={{ mt: 1 }}>
                      <PdfDownloadButton
                        agreementId={agreement.id}
                        phaseId={selectedPhase.id}
                        filename={`warranty-phase-${selectedPhase.phaseNumber}.pdf`}
                        label="Tải PDF giai đoạn này"
                      />
                    </Box>
                  )}
                </Alert>
              )}

              <PolicyViewer policyVersion={agreement.policyVersion} />
            </Grid>
          </Grid>
        )}
      </LoadingBoundary>
    </PageContainer>
  );
};

export default PortalWarrantyPage;
