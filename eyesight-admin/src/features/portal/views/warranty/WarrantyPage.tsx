import React, { useCallback, useEffect, useState } from 'react';
import { Box, Typography, Grid, Alert, Chip, Stack, Paper, Divider } from '@mui/material';
import PageContainer from 'src/components/container/PageContainer';
import LoadingBoundary from 'src/components/shared/LoadingBoundary';
import useSnackbar from 'src/contexts/UseSnackbar';
import { SNACKBAR_SEVERITY } from 'src/utils/constant';
import { useConfirm } from 'src/hooks/useConfirm';
import type { WarrantyAgreement, WarrantyPhase } from 'src/types/core';
import { getMyWarrantyAgreement, signWarrantyPhase } from 'src/services/warranty.service';
import {
  getPhaseTypeLabel,
  getWarrantyStatusLabel,
  getWarrantyStatusColor,
} from 'src/utils/warrantyClinicalData';
import PolicyViewer from 'src/components/warranty/PolicyViewer';
import PhaseTimeline from 'src/components/warranty/PhaseTimeline';
import PdfDownloadButton from 'src/components/warranty/PdfDownloadButton';
import ClinicalDataForm from 'src/components/warranty/ClinicalDataForm';
import GuardianSignForm from 'src/components/warranty/GuardianSignForm';

const PortalWarrantyPage: React.FC = () => {
  const { showSnackbar } = useSnackbar();
  const { confirm } = useConfirm();

  const [agreement, setAgreement] = useState<WarrantyAgreement | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPhase, setSelectedPhase] = useState<WarrantyPhase | null>(null);
  const [signing, setSigning] = useState(false);

  const loadAgreement = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getMyWarrantyAgreement();
      setAgreement(data);
      if (data?.phases?.length) {
        const pending =
          data.phases.find((p) => p.status === 'awaiting_guardian') ||
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

  const canGuardianSign = selectedPhase?.status === 'awaiting_guardian';

  const handleGuardianSign = async (payload: Parameters<typeof signWarrantyPhase>[2]) => {
    if (!agreement || !selectedPhase) return;

    const ok = await confirm({
      title: 'Xác nhận ký',
      message:
        'Bạn xác nhận đã đọc nội dung cam kết và đồng ý ký điện tử với tư cách phụ huynh/người giám hộ?',
      confirmText: 'Ký',
    });
    if (!ok) return;

    setSigning(true);
    try {
      const data = await signWarrantyPhase(agreement.id, selectedPhase.id, payload);
      setAgreement(data);
      const updated = data.phases.find((p) => p.id === selectedPhase.id) ?? selectedPhase;
      setSelectedPhase(updated);
      showSnackbar('Đã ký xác nhận thành công.', SNACKBAR_SEVERITY.SUCCESS);
    } catch (error) {
      console.error('Guardian sign failed:', error);
      showSnackbar('Không ký được. Vui lòng thử lại.', SNACKBAR_SEVERITY.ERROR);
      throw error;
    } finally {
      setSigning(false);
    }
  };

  return (
    <PageContainer
      title="Cam kết bảo hành"
      description="Xem và ký cam kết bảo hành điều trị D-VisUp"
    >
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Cam kết bảo hành
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Xem chính sách, tiến trình các giai đoạn và ký xác nhận khi được yêu cầu.
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
                  phases={agreement.phases}
                  selectedPhaseId={selectedPhase?.id}
                  onSelectPhase={setSelectedPhase}
                />
                <Box sx={{ mt: 2 }}>
                  <PdfDownloadButton
                    agreementId={agreement.id}
                    filename="warranty-full.pdf"
                    label="Tải PDF đầy đủ"
                    disabled={agreement.phases.every((p) => p.status !== 'completed')}
                  />
                </Box>
              </Paper>
            </Grid>

            <Grid size={{ xs: 12, md: 8 }}>
              {selectedPhase ? (
                <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      mb: 2,
                    }}
                  >
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {getPhaseTypeLabel(selectedPhase.phaseType)} (Lần {selectedPhase.phaseNumber})
                    </Typography>
                    {selectedPhase.status === 'completed' && (
                      <PdfDownloadButton
                        agreementId={agreement.id}
                        phaseId={selectedPhase.id}
                        filename={`warranty-phase-${selectedPhase.phaseNumber}.pdf`}
                      />
                    )}
                  </Box>

                  <ClinicalDataForm
                    value={selectedPhase.clinicalData}
                    onChange={() => {}}
                    readOnly
                  />

                  {selectedPhase.status === 'awaiting_doctor' && (
                    <Alert severity="info" sx={{ mt: 2 }}>
                      Bạn đã ký xong. Đang chờ bác sĩ xác nhận.
                    </Alert>
                  )}

                  {selectedPhase.guardianSignature && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                      Đã ký bởi {selectedPhase.guardianSignature.signerName}
                      {selectedPhase.guardianSignature.signerRelation
                        ? ` (${selectedPhase.guardianSignature.signerRelation})`
                        : ''}{' '}
                      lúc{' '}
                      {new Date(selectedPhase.guardianSignature.signedAt).toLocaleString('vi-VN')}
                    </Typography>
                  )}

                  <Divider sx={{ my: 3 }} />

                  {canGuardianSign && (
                    <GuardianSignForm onSubmit={handleGuardianSign} disabled={signing} />
                  )}
                </Paper>
              ) : (
                <Alert severity="info" sx={{ mb: 3 }}>
                  Chưa có giai đoạn nào.
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
