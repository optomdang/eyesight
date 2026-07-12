import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  InputAdornment,
  OutlinedInput,
  Typography,
  Alert,
  Chip,
  Stack,
  Divider,
  Paper,
  TextField,
  Tooltip,
} from '@mui/material';
import { LabelWithHelp } from 'src/components/shared/HelpTooltip';
import AddIcon from '@mui/icons-material/Add';
import LinkIcon from '@mui/icons-material/Link';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CloseIcon from '@mui/icons-material/Close';
import { QRCodeSVG } from 'qrcode.react';
import useSnackbar from 'src/contexts/UseSnackbar';
import { SNACKBAR_SEVERITY } from 'src/utils/constant';
import { useConfirm } from 'src/hooks/useConfirm';
import type { PatientWithCompliance, WarrantyAgreement, WarrantyPhase } from 'src/types/core';
import type { WarrantyClinicalData, WarrantyPhaseType } from 'src/types/core/warranty';
import {
  getPatientWarrantyAgreement,
  createPatientWarrantyAgreement,
  createWarrantyPhase,
  updateWarrantyPhaseClinicalData,
  signWarrantyPhase,
  generateWarrantySignToken,
} from 'src/services/warranty.service';
import {
  buildClinicalDataFromPatient,
  isReexamWithinSixMonths,
  getWarrantyStatusLabel,
  getWarrantyStatusColor,
} from 'src/utils/warrantyClinicalData';
import PolicyViewer from 'src/components/warranty/PolicyViewer';
import PhaseTimeline from 'src/components/warranty/PhaseTimeline';
import PdfDownloadButton from 'src/components/warranty/PdfDownloadButton';
import ClinicalDataForm from 'src/components/warranty/ClinicalDataForm';
import DoctorSignForm from 'src/components/warranty/DoctorSignForm';
import useAuth from 'src/contexts/authGuard/useAuth';
import { getErrorMessage } from 'src/utils/errorHandler';

export interface WarrantyAgreementTabProps {
  patient: PatientWithCompliance;
}

const WarrantyAgreementTab: React.FC<WarrantyAgreementTabProps> = ({ patient }) => {
  const { showSnackbar } = useSnackbar();
  const { confirm } = useConfirm();
  const { user } = useAuth();

  const [agreement, setAgreement] = useState<WarrantyAgreement | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedPhase, setSelectedPhase] = useState<WarrantyPhase | null>(null);
  const [clinicalDraft, setClinicalDraft] = useState<WarrantyClinicalData | null>(null);
  const [clinicalDirty, setClinicalDirty] = useState(false);
  const [reexamOverrideDraft, setReexamOverrideDraft] = useState('');
  const [signLinkDialogOpen, setSignLinkDialogOpen] = useState(false);
  const [signLink, setSignLink] = useState('');
  const [signLinkRole, setSignLinkRole] = useState<'guardian' | 'doctor'>('guardian');

  const patientId = patient.id ?? 0;

  const loadAgreement = useCallback(async () => {
    if (!patientId) return;
    setLoading(true);
    try {
      const data = await getPatientWarrantyAgreement(patientId);
      setAgreement(data);
      if (data?.phases?.length) {
        const pending =
          data.phases.find((p) => p.status === 'awaiting_guardian' || p.status === 'draft') ||
          data.phases.find((p) => p.status === 'awaiting_doctor') ||
          data.phases.find((p) => p.status !== 'completed') ||
          data.phases[data.phases.length - 1];
        setSelectedPhase(pending);
        setClinicalDraft(pending.clinicalData ?? {});
      } else {
        setSelectedPhase(null);
        setClinicalDraft(null);
      }
      setClinicalDirty(false);
    } catch (error) {
      console.error('Failed to load warranty agreement:', error);
      showSnackbar('Không tải được cam kết bảo hành.', SNACKBAR_SEVERITY.ERROR);
    } finally {
      setLoading(false);
    }
  }, [patientId, showSnackbar]);

  useEffect(() => {
    loadAgreement();
  }, [loadAgreement]);

  useEffect(() => {
    if (selectedPhase) {
      setClinicalDraft(selectedPhase.clinicalData ?? {});
      setClinicalDirty(false);
    }
  }, [selectedPhase]);

  const isPhaseImmutable = selectedPhase?.status === 'completed';
  const canDoctorSign = selectedPhase?.status === 'awaiting_doctor';
  // Doctor enters clinical data BEFORE sending link to guardian (awaiting_guardian / draft)
  // After guardian signs (awaiting_doctor), data is locked — backend also enforces this
  const canEditClinical = Boolean(
    selectedPhase && !['completed', 'awaiting_doctor'].includes(selectedPhase.status)
  );

  const reexamEarly = useMemo(
    () => (agreement ? isReexamWithinSixMonths(agreement.phases ?? []) : false),
    [agreement]
  );

  const handleCreateAgreement = async () => {
    const ok = await confirm({
      title: 'Tạo cam kết bảo hành',
      message:
        'Tạo hồ sơ cam kết bảo hành mới cho bệnh nhân? Giai đoạn ban đầu sẽ được khởi tạo và gửi cho phụ huynh ký.',
      confirmText: 'Tạo',
    });
    if (!ok) return;

    setActionLoading(true);
    try {
      const data = await createPatientWarrantyAgreement(patientId);
      setAgreement(data);
      const initialPhase = data.phases?.[0] ?? null;
      setSelectedPhase(initialPhase);
      setClinicalDraft(initialPhase?.clinicalData ?? buildClinicalDataFromPatient(patient));
      showSnackbar('Đã tạo cam kết bảo hành.', SNACKBAR_SEVERITY.SUCCESS);
    } catch (error) {
      console.error('Create agreement failed:', error);
      showSnackbar(getErrorMessage(error, 'Không tạo được cam kết bảo hành.'), SNACKBAR_SEVERITY.ERROR);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePullFromPatientTests = () => {
    const fromPatient = buildClinicalDataFromPatient(patient);
    setClinicalDraft((prev) => ({
      ...(prev || {}),
      examResults: fromPatient.examResults,
      compliance: fromPatient.compliance,
    }));
    setClinicalDirty(true);
    showSnackbar('Đã lấy kết quả test từ hồ sơ bệnh nhân.', SNACKBAR_SEVERITY.SUCCESS);
  };

  const handleGenerateSignLink = async (role: 'guardian' | 'doctor' = 'guardian') => {
    if (!agreement || !selectedPhase) return;
    setActionLoading(true);
    try {
      const { token } = await generateWarrantySignToken(agreement.id, selectedPhase.id);
      const appBase = window.location.origin;
      const link = `${appBase}/sign/warranty/${token}`;
      setSignLink(link);
      setSignLinkRole(role);
      setSignLinkDialogOpen(true);
    } catch (error) {
      console.error('Generate sign token failed:', error);
      showSnackbar('Không tạo được link ký. Vui lòng thử lại.', SNACKBAR_SEVERITY.ERROR);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(signLink).then(() => {
      showSnackbar('Đã sao chép link ký!', SNACKBAR_SEVERITY.SUCCESS);
    });
  };

  const handleCreatePhase = async (phaseType: WarrantyPhaseType) => {
    if (!agreement) return;

    const clinicalData = buildClinicalDataFromPatient(patient);
    const needsOverride = phaseType === 'reexam' && isReexamWithinSixMonths(agreement.phases ?? []);

    if (needsOverride) {
      const reason = reexamOverrideDraft.trim();
      if (!reason) {
        showSnackbar(
          'Tái khám sớm hơn 6 tháng — vui lòng nhập lý do bên dưới trước khi tạo.',
          SNACKBAR_SEVERITY.WARNING
        );
        return;
      }
      clinicalData.reexamEarlyOverrideReason = reason;
    }

    const label = phaseType === 'reexam' ? 'tái khám' : 'kết thúc gói';
    const ok = await confirm({
      title: `Tạo giai đoạn ${label}`,
      message: `Tạo giai đoạn ${label} mới với dữ liệu lâm sàng hiện tại?`,
      confirmText: 'Tạo',
    });
    if (!ok) return;

    setActionLoading(true);
    try {
      const data = await createWarrantyPhase(agreement.id, { phaseType, clinicalData });
      setAgreement(data);
      const newPhase = data.phases[data.phases.length - 1];
      setSelectedPhase(newPhase);
      setClinicalDraft(newPhase.clinicalData);
      setReexamOverrideDraft('');
      showSnackbar(`Đã tạo giai đoạn ${label}.`, SNACKBAR_SEVERITY.SUCCESS);
    } catch (error) {
      console.error('Create phase failed:', error);
      showSnackbar('Không tạo được giai đoạn mới.', SNACKBAR_SEVERITY.ERROR);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveClinical = async () => {
    if (!agreement || !selectedPhase || !clinicalDraft || isPhaseImmutable) return;

    if (
      selectedPhase.phaseType === 'reexam' &&
      reexamEarly &&
      !clinicalDraft.reexamEarlyOverrideReason?.trim()
    ) {
      showSnackbar('Vui lòng nhập lý do tái khám sớm (< 6 tháng).', SNACKBAR_SEVERITY.WARNING);
      return;
    }

    setActionLoading(true);
    try {
      const data = await updateWarrantyPhaseClinicalData(agreement.id, selectedPhase.id, {
        clinicalData: clinicalDraft,
      });
      setAgreement(data);
      const updated = data.phases.find((p) => p.id === selectedPhase.id) ?? selectedPhase;
      setSelectedPhase(updated);
      setClinicalDraft(updated.clinicalData);
      setClinicalDirty(false);
      showSnackbar('Đã lưu dữ liệu lâm sàng.', SNACKBAR_SEVERITY.SUCCESS);
    } catch (error) {
      console.error('Save clinical data failed:', error);
      showSnackbar('Không lưu được dữ liệu lâm sàng.', SNACKBAR_SEVERITY.ERROR);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDoctorSign = async (payload: Parameters<typeof signWarrantyPhase>[2]) => {
    if (!agreement || !selectedPhase) return;

    const ok = await confirm({
      title: 'Xác nhận ký',
      message: 'Bạn xác nhận đã rà soát dữ liệu và đồng ý ký điện tử?',
      confirmText: 'Ký',
    });
    if (!ok) return;

    setActionLoading(true);
    try {
      const data = await signWarrantyPhase(agreement.id, selectedPhase.id, payload);
      setAgreement(data);
      const updated = data.phases.find((p) => p.id === selectedPhase.id) ?? selectedPhase;
      setSelectedPhase(updated);
      showSnackbar('Đã ký xác nhận thành công.', SNACKBAR_SEVERITY.SUCCESS);
    } catch (error) {
      console.error('Doctor sign failed:', error);
      showSnackbar('Không ký được. Vui lòng thử lại.', SNACKBAR_SEVERITY.ERROR);
      throw error;
    } finally {
      setActionLoading(false);
    }
  };

  const phases = agreement?.phases ?? [];
  const hasInitial = phases.some((p) => p.phaseType === 'initial');
  const hasFinal = phases.some((p) => p.phaseType === 'final');

  if (!patient.id) {
    return (
      <Typography variant="body2" color="text.secondary">
        Không xác định được bệnh nhân.
      </Typography>
    );
  }

  if (loading) {
    return (
      <Typography variant="body2" color="text.secondary">
        Đang tải cam kết bảo hành...
      </Typography>
    );
  }

  return (
    <Box>
      <Box
        sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}
      >
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Cam kết bảo hành
          </Typography>
          {agreement && (
            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
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
          )}
        </Box>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {!agreement && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleCreateAgreement}
              disabled={actionLoading}
            >
              Tạo cam kết
            </Button>
          )}
          {agreement && (
            <PdfDownloadButton
              agreementId={agreement.id}
              filename={`warranty-${patient.code}-full.pdf`}
              label="Tải PDF đầy đủ"
              disabled={phases.every((p) => p.status !== 'completed')}
            />
          )}
        </Stack>
      </Box>

      {!agreement && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Chưa có hồ sơ cam kết bảo hành cho bệnh nhân này. Nhấn &quot;Tạo cam kết&quot; để bắt đầu
          quy trình ký điện tử.
        </Alert>
      )}

      {agreement && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                Tiến trình các giai đoạn
              </Typography>
              <PhaseTimeline
                phases={phases}
                selectedPhaseId={selectedPhase?.id}
                onSelectPhase={setSelectedPhase}
              />
            </Paper>

            <Stack spacing={1}>
              {hasInitial && !hasFinal && (
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => handleCreatePhase('reexam')}
                  disabled={actionLoading}
                >
                  Tạo tái khám
                </Button>
              )}
              {hasInitial && !hasFinal && (
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => handleCreatePhase('final')}
                  disabled={actionLoading}
                >
                  Tạo kết thúc gói
                </Button>
              )}
            </Stack>

            {reexamEarly && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                Lần đánh giá gần nhất hoàn tất chưa đủ 6 tháng. Khi tạo tái khám cần ghi lý do
                chuyên môn.
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  size="small"
                  sx={{ mt: 1 }}
                  label={
                    <LabelWithHelp
                      variant="help"
                      help="Bắt buộc khi tạo tái khám sớm hơn 6 tháng so với lần trước."
                    >
                      Lý do tái khám sớm
                    </LabelWithHelp>
                  }
                  value={reexamOverrideDraft}
                  onChange={(e) => setReexamOverrideDraft(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Alert>
            )}
          </Grid>

          <Grid size={{ xs: 12, md: 8 }}>
            {selectedPhase ? (
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    Chi tiết giai đoạn
                  </Typography>
                  {selectedPhase.status === 'completed' && (
                    <PdfDownloadButton
                      agreementId={agreement.id}
                      phaseId={selectedPhase.id}
                      filename={`warranty-${patient.code}-phase-${selectedPhase.phaseNumber}.pdf`}
                    />
                  )}
                </Box>

                {canEditClinical && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                      Bước 1: Nhập kết quả khám (cột Ban đầu) và nhận xét bác sĩ bên dưới → Lưu
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      Bước 2: Tạo link ký → Gửi cho phụ huynh (phụ huynh sẽ thấy nhận xét của bác
                      sĩ trên link)
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Nếu bệnh nhân đã test trên cổng: dùng &quot;Lấy từ kết quả test&quot; để điền
                      nhanh, rồi chỉnh lại theo khám thực tế nếu cần. Xem thêm tab Phác đồ điều
                      trị.
                    </Typography>
                    <Box sx={{ mt: 1 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        color="info"
                        startIcon={<LinkIcon />}
                        onClick={() => handleGenerateSignLink('guardian')}
                        disabled={actionLoading}
                      >
                        Tạo link ký cho phụ huynh
                      </Button>
                    </Box>
                  </Alert>
                )}

                {clinicalDraft && (
                  <ClinicalDataForm
                    value={clinicalDraft}
                    onChange={(data) => {
                      setClinicalDraft(data);
                      setClinicalDirty(true);
                    }}
                    readOnlyExamResults={!canEditClinical}
                    readOnlyDoctorRemarks={!canEditClinical}
                    showReexamOverride={selectedPhase.phaseType === 'reexam' && reexamEarly}
                  />
                )}

                {canEditClinical && (
                  <Stack direction="row" spacing={1} sx={{ mt: 2 }} flexWrap="wrap" useFlexGap>
                    <Button
                      variant="outlined"
                      onClick={handlePullFromPatientTests}
                      disabled={actionLoading}
                    >
                      Lấy từ kết quả test
                    </Button>
                    <Button
                      variant="contained"
                      onClick={handleSaveClinical}
                      disabled={actionLoading || !clinicalDirty}
                    >
                      Lưu dữ liệu lâm sàng
                    </Button>
                  </Stack>
                )}

                {selectedPhase.status === 'awaiting_doctor' && (
                  <Alert severity="warning" sx={{ mt: 2 }}>
                    Phụ huynh đã ký — dữ liệu lâm sàng đã được khóa. Vui lòng kiểm tra và ký xác
                    nhận bên dưới, hoặc mở link ký trên điện thoại để ký cảm ứng.
                    <Box sx={{ mt: 1 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        color="warning"
                        startIcon={<LinkIcon />}
                        onClick={() => handleGenerateSignLink('doctor')}
                        disabled={actionLoading}
                      >
                        Mở link ký trên điện thoại
                      </Button>
                    </Box>
                  </Alert>
                )}

                {isPhaseImmutable && (
                  <Alert severity="success" sx={{ mt: 2 }}>
                    Giai đoạn đã hoàn tất — không thể chỉnh sửa.
                  </Alert>
                )}

                <Divider sx={{ my: 3 }} />

                {canDoctorSign && (
                  <DoctorSignForm
                    onSubmit={handleDoctorSign}
                    disabled={actionLoading}
                    defaultSignerName={user?.name || ''}
                  />
                )}

                {selectedPhase.doctorSignature && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                    Đã ký bởi {selectedPhase.doctorSignature.signerName} lúc{' '}
                    {new Date(selectedPhase.doctorSignature.signedAt).toLocaleString('vi-VN')}
                  </Typography>
                )}
              </Paper>
            ) : (
              <Alert severity="info">Chọn một giai đoạn để xem chi tiết.</Alert>
            )}

            <Box sx={{ mt: 3 }}>
              <PolicyViewer policyVersion={agreement.policyVersion} compact />
            </Box>
          </Grid>
        </Grid>
      )}

      {!agreement && (
        <Box sx={{ mt: 2 }}>
          <PolicyViewer compact />
        </Box>
      )}

      {/* Sign Link Dialog */}
      <Dialog
        open={signLinkDialogOpen}
        onClose={() => setSignLinkDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {signLinkRole === 'doctor' ? 'Link ký bác sĩ (điện thoại)' : 'Link ký cho phụ huynh'}
          <IconButton size="small" onClick={() => setSignLinkDialogOpen(false)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {signLinkRole === 'doctor' ? (
              <>
                Mở link trên điện thoại hoặc quét QR để bác sĩ ký xác nhận bằng cảm ứng. Link có
                hiệu lực trong <strong>7 ngày</strong>.
              </>
            ) : (
              <>
                Gửi link hoặc cho bệnh nhân quét QR code bằng điện thoại để ký cam kết. Link có hiệu
                lực trong <strong>7 ngày</strong>. Sau khi phụ huynh ký, cùng link vẫn dùng được
                để bác sĩ ký tiếp.
              </>
            )}
          </Typography>

          {signLink && (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                <QRCodeSVG value={signLink} size={200} />
              </Box>

              <OutlinedInput
                fullWidth
                size="small"
                value={signLink}
                readOnly
                sx={{ mb: 1, fontSize: '0.75rem', fontFamily: 'monospace' }}
                endAdornment={
                  <InputAdornment position="end">
                    <Tooltip title="Sao chép link">
                      <IconButton size="small" onClick={handleCopyLink}>
                        <ContentCopyIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </InputAdornment>
                }
              />

              <Button
                variant="contained"
                fullWidth
                startIcon={<ContentCopyIcon />}
                onClick={handleCopyLink}
                sx={{ mt: 1 }}
              >
                Sao chép link ký
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default WarrantyAgreementTab;
