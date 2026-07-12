/**
 * Public warranty signing page — no authentication required.
 * Accessible via shareable link: /sign/warranty/:token
 * Optimized for mobile (guardian or doctor signs on touch device).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Container,
  Divider,
  FormControlLabel,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import DownloadIcon from '@mui/icons-material/Download';
import SignaturePad, { type SignaturePadHandle } from 'src/components/shared/SignaturePad';
import {
  WARRANTY_POLICY_SECTIONS,
  WARRANTY_POLICY_TAGLINE,
  WARRANTY_POLICY_VERSION,
  WARRANTY_REFUND_CRITERIA,
  E_SIGN_DISCLAIMER,
  GUARDIAN_CONSENT_TEXT,
  DOCTOR_CONSENT_TEXT,
} from 'src/content/warrantyPolicy';
import ClinicalExamResultsTable from 'src/components/warranty/ClinicalExamResultsTable';
import {
  getWarrantySignData,
  submitWarrantySignature,
  downloadWarrantyPdfByToken,
  triggerBlobDownload,
  type WarrantySignData,
} from 'src/services/warranty.service';
import { getPhaseTypeLabel } from 'src/utils/warrantyClinicalData';

const RELATION_OPTIONS = [
  { value: 'parent', label: 'Cha/Mẹ' },
  { value: 'guardian', label: 'Người giám hộ' },
  { value: 'relative', label: 'Người thân được ủy quyền' },
  { value: 'other', label: 'Khác' },
];

const RELATION_LABELS: Record<string, string> = Object.fromEntries(
  RELATION_OPTIONS.map((o) => [o.value, o.label])
);

// ─── Section header ─────────────────────────────────────────────────────────
const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Typography
    variant="subtitle1"
    sx={{
      fontWeight: 700,
      mt: 3,
      mb: 1,
      pb: 0.5,
      borderBottom: '2px solid',
      borderColor: 'primary.main',
      color: 'primary.main',
    }}
  >
    {children}
  </Typography>
);

// ─── Clinical data read-only display ────────────────────────────────────────
const ClinicalDataDisplay: React.FC<{ data: WarrantySignData['phase']['clinicalData'] }> = ({
  data,
}) => {
  if (!data || !Object.keys(data).length) {
    return (
      <Typography variant="body2" color="text.secondary">
        Chưa có dữ liệu lâm sàng.
      </Typography>
    );
  }

  const hasDoctorRemarks =
    Boolean(data.clinicalNotes?.trim()) ||
    Boolean(data.doctorConfirmation?.trim()) ||
    data.improvementObserved != null;

  return (
    <Box>
      <ClinicalExamResultsTable examResults={data.examResults} readOnly compact />

      {hasDoctorRemarks && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            Nhận xét của bác sĩ
          </Typography>
          {data.clinicalNotes?.trim() && (
            <Box sx={{ mb: 1.5 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Ghi chú lâm sàng
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                {data.clinicalNotes}
              </Typography>
            </Box>
          )}
          {data.improvementObserved != null && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              Có cải thiện có ý nghĩa:{' '}
              <strong>{data.improvementObserved ? 'Có' : 'Không'}</strong>
            </Typography>
          )}
          {data.doctorConfirmation?.trim() && (
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Xác nhận của bác sĩ
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                {data.doctorConfirmation}
              </Typography>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};

// ─── Policy block (guardian flow) ───────────────────────────────────────────
const PolicyContent: React.FC = () => (
  <>
    <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontStyle: 'italic' }}>
      {WARRANTY_POLICY_TAGLINE}
    </Typography>
    {WARRANTY_REFUND_CRITERIA.map((line) => (
      <Typography key={line} variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
        {line}
      </Typography>
    ))}
    <Box sx={{ mb: 2 }} />
    {WARRANTY_POLICY_SECTIONS.map((section) => (
      <Box key={section.title} sx={{ mb: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
          {section.title}
        </Typography>
        <List dense disablePadding>
          {section.items.map((item) => (
            <ListItem key={item} disableGutters sx={{ alignItems: 'flex-start', py: 0.25 }}>
              <ListItemIcon sx={{ minWidth: 24, mt: 0.3 }}>
                <CheckCircleOutlineIcon sx={{ fontSize: 16, color: 'primary.main' }} />
              </ListItemIcon>
              <ListItemText
                primary={item}
                primaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }}
              />
            </ListItem>
          ))}
        </List>
      </Box>
    ))}
  </>
);

// ─── States ──────────────────────────────────────────────────────────────────
type PageState = 'loading' | 'error' | 'completed' | 'form' | 'success';

// ─── Main page ───────────────────────────────────────────────────────────────
const WarrantySignPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();

  const [pageState, setPageState] = useState<PageState>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [signData, setSignData] = useState<WarrantySignData | null>(null);
  const [signedRole, setSignedRole] = useState<'guardian' | 'doctor' | null>(null);
  const [pdfDownloading, setPdfDownloading] = useState(false);

  const handleDownloadPdf = async () => {
    if (!token) return;
    setPdfDownloading(true);
    try {
      const blob = await downloadWarrantyPdfByToken(token);
      const phase = signData?.phase;
      const patientName = signData?.patientName?.replace(/\s+/g, '-') || 'BN';
      const filename = `warranty-${patientName}-giai-doan-${phase?.phaseNumber ?? 1}.pdf`;
      triggerBlobDownload(blob, filename);
    } catch {
      // silent — user can try again
    } finally {
      setPdfDownloading(false);
    }
  };

  const padRef = useRef<SignaturePadHandle>(null);
  const [signerName, setSignerName] = useState('');
  const [signerRelation, setSignerRelation] = useState('parent');
  const [consent, setConsent] = useState(false);
  const [signatureEmpty, setSignatureEmpty] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const signRole = signData?.signRole ?? null;
  const isDoctorSign = signRole === 'doctor';

  const load = useCallback(async () => {
    if (!token) {
      setErrorMsg('Link không hợp lệ.');
      setPageState('error');
      return;
    }
    try {
      const data = await getWarrantySignData(token);
      setSignData(data);
      setPageState(data.signRole ? 'form' : 'completed');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Link ký không hợp lệ hoặc đã hết hạn.';
      setErrorMsg(msg);
      setPageState('error');
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const canSubmit =
    !submitting &&
    consent &&
    signerName.trim().length >= 2 &&
    (isDoctorSign || Boolean(signerRelation)) &&
    !signatureEmpty;

  const handleSubmit = async () => {
    if (!canSubmit || !token) return;
    const dataUrl = padRef.current?.toDataUrl();
    if (!dataUrl) return;

    setSubmitting(true);
    try {
      await submitWarrantySignature(token, {
        signatureDataUrl: dataUrl,
        signerName: signerName.trim(),
        ...(isDoctorSign ? {} : { signerRelation }),
        consentAccepted: true,
      });
      setSignedRole(signRole);
      setPageState('success');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Không gửi được chữ ký. Vui lòng thử lại.';
      setErrorMsg(msg);
      setPageState('error');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (pageState === 'loading') {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (pageState === 'error') {
    return (
      <Container maxWidth="sm" sx={{ py: 6, textAlign: 'center' }}>
        <ErrorOutlineIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
          Không thể mở link ký
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {errorMsg}
        </Typography>
      </Container>
    );
  }

  // ── Already completed ──────────────────────────────────────────────────────
  if (pageState === 'completed') {
    const phase = signData?.phase;
    const guardian = phase?.guardianSignature;
    const doctor = phase?.doctorSignature;

    return (
      <Container maxWidth="sm" sx={{ py: 6, textAlign: 'center' }}>
        <AssignmentTurnedInIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
          Biên bản đã hoàn tất
        </Typography>
        {guardian && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
            Phụ huynh: {guardian.signerName}
            {guardian.signerRelation
              ? ` (${RELATION_LABELS[guardian.signerRelation] || guardian.signerRelation})`
              : ''}{' '}
            — {new Date(guardian.signedAt).toLocaleString('vi-VN')}
          </Typography>
        )}
        {doctor && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Bác sĩ: {doctor.signerName} — {new Date(doctor.signedAt).toLocaleString('vi-VN')}
          </Typography>
        )}
        {!guardian && !doctor && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Cam kết này đã được ký và lưu hồ sơ.
          </Typography>
        )}
        <Button
          variant="contained"
          startIcon={pdfDownloading ? <CircularProgress size={18} color="inherit" /> : <DownloadIcon />}
          onClick={handleDownloadPdf}
          disabled={pdfDownloading}
          sx={{ minWidth: 200 }}
        >
          {pdfDownloading ? 'Đang tạo PDF…' : 'Tải biên bản PDF'}
        </Button>
      </Container>
    );
  }

  // ── Success ────────────────────────────────────────────────────────────────
  if (pageState === 'success') {
    const isDoctor = signedRole === 'doctor';
    return (
      <Container maxWidth="sm" sx={{ py: 6, textAlign: 'center' }}>
        <AssignmentTurnedInIcon sx={{ fontSize: 72, color: 'success.main', mb: 2 }} />
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
          Đã ký thành công!
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Cảm ơn <strong>{signerName}</strong> đã ký xác nhận cam kết bảo hành D-VisUp.
        </Typography>
        {isDoctor ? (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Giai đoạn đã hoàn tất. Tải biên bản PDF để lưu hồ sơ.
            </Typography>
            <Button
              variant="contained"
              startIcon={pdfDownloading ? <CircularProgress size={18} color="inherit" /> : <DownloadIcon />}
              onClick={handleDownloadPdf}
              disabled={pdfDownloading}
              sx={{ minWidth: 200 }}
            >
              {pdfDownloading ? 'Đang tạo PDF…' : 'Tải biên bản PDF'}
            </Button>
          </>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Bác sĩ phụ trách sẽ ký xác nhận để hoàn tất hồ sơ. Bạn có thể đóng trang này.
          </Typography>
        )}
      </Container>
    );
  }

  // ── Sign form ──────────────────────────────────────────────────────────────
  const phase = signData?.phase;
  const phaseLabel = phase ? getPhaseTypeLabel(phase.phaseType) : '';
  const guardianSig = phase?.guardianSignature;

  return (
    <Box sx={{ bgcolor: 'grey.50', minHeight: '100vh', pb: 6 }}>
      <Box sx={{ bgcolor: 'primary.main', color: 'white', px: 2, py: 2.5 }}>
        <Container maxWidth="sm" disableGutters>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Cam kết bảo hành D-VisUp
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.85, mt: 0.25 }}>
            {isDoctorSign ? 'Ký xác nhận bác sĩ' : 'Ký điện tử xác nhận'}
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="sm" sx={{ px: 2, mt: 2 }}>
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
            <Chip label={`Phiên bản ${signData?.policyVersion ?? WARRANTY_POLICY_VERSION}`} size="small" variant="outlined" />
            {phase && (
              <Chip
                label={`${phaseLabel} — Lần ${phase.phaseNumber}`}
                size="small"
                color="primary"
                variant="outlined"
              />
            )}
            {isDoctorSign && (
              <Chip label="Bác sĩ ký" size="small" color="secondary" variant="filled" />
            )}
          </Stack>
          {signData?.patientName && (
            <Typography variant="body2">
              Bệnh nhân: <strong>{signData.patientName}</strong>
            </Typography>
          )}
          {signData?.packageName && (
            <Typography variant="body2" color="text.secondary">
              Gói điều trị: {signData.packageName}
            </Typography>
          )}
        </Paper>

        {phase && (
          <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
            <SectionTitle>Dữ liệu lâm sàng</SectionTitle>
            <ClinicalDataDisplay data={phase.clinicalData} />
          </Paper>
        )}

        {isDoctorSign && guardianSig && (
          <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: 'success.lighter' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
              Phụ huynh đã ký
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {guardianSig.signerName}
              {guardianSig.signerRelation
                ? ` (${RELATION_LABELS[guardianSig.signerRelation] || guardianSig.signerRelation})`
                : ''}{' '}
              — {new Date(guardianSig.signedAt).toLocaleString('vi-VN')}
            </Typography>
          </Paper>
        )}

        {!isDoctorSign && (
          <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
            <SectionTitle>Nội dung cam kết</SectionTitle>
            <PolicyContent />
          </Paper>
        )}

        <Paper variant="outlined" sx={{ p: 2 }}>
          <SectionTitle>
            {isDoctorSign ? 'Ký xác nhận (Bác sĩ)' : 'Ký xác nhận (Phụ huynh / Người giám hộ)'}
          </SectionTitle>

          <Box
            sx={{
              bgcolor: 'info.lighter',
              border: '1px solid',
              borderColor: 'info.light',
              borderRadius: 1,
              p: 1.5,
              mb: 2,
            }}
          >
            <Typography variant="body2" color="info.dark">
              {isDoctorSign ? DOCTOR_CONSENT_TEXT : GUARDIAN_CONSENT_TEXT}
            </Typography>
          </Box>

          <TextField
            fullWidth
            size="small"
            label={isDoctorSign ? 'Họ tên bác sĩ' : 'Họ tên người ký'}
            placeholder="Nhập họ tên đầy đủ"
            value={signerName}
            onChange={(e) => setSignerName(e.target.value)}
            sx={{ mb: 2 }}
            InputLabelProps={{ shrink: true }}
          />

          {!isDoctorSign && (
            <TextField
              fullWidth
              select
              size="small"
              label="Quan hệ với bệnh nhân"
              value={signerRelation}
              onChange={(e) => setSignerRelation(e.target.value)}
              sx={{ mb: 2 }}
              InputLabelProps={{ shrink: true }}
            >
              {RELATION_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </TextField>
          )}

          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
            Vẽ chữ ký bên dưới
          </Typography>
          <SignaturePad ref={padRef} onChange={(empty) => setSignatureEmpty(empty)} />

          <Divider sx={{ my: 2 }} />

          <FormControlLabel
            sx={{ alignItems: 'flex-start', mb: 2 }}
            control={
              <Checkbox
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                size="small"
                sx={{ pt: 0.25 }}
              />
            }
            label={
              <Typography variant="body2">
                {isDoctorSign
                  ? 'Tôi đồng ý ký điện tử theo nội dung trên'
                  : 'Tôi đồng ý ký điện tử và xác nhận nội dung cam kết trên.'}
              </Typography>
            }
          />

          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
            {E_SIGN_DISCLAIMER}
          </Typography>

          <Button
            variant="contained"
            size="large"
            fullWidth
            onClick={handleSubmit}
            disabled={!canSubmit}
            sx={{ py: 1.5 }}
          >
            {submitting ? (
              <CircularProgress size={22} color="inherit" />
            ) : isDoctorSign ? (
              'Ký xác nhận bác sĩ'
            ) : (
              'Xác nhận và hoàn thành ký'
            )}
          </Button>
        </Paper>
      </Container>
    </Box>
  );
};

export default WarrantySignPage;
