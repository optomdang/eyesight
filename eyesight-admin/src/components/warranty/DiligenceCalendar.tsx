/**
 * Monthly diligence calendar for Warranty Agreement tab.
 * Blue = complete day, yellow = partial, gray = none.
 * Admin/doctor can override a day to complete.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import type { DiligenceCalendarDay, DiligenceCalendarResponse } from 'src/types/core/warranty';
import {
  getMyDiligenceCalendar,
  getPatientDiligenceCalendar,
  overridePatientDiligenceDay,
} from 'src/services/warranty.service';
import useSnackbar from 'src/contexts/UseSnackbar';
import { SNACKBAR_SEVERITY } from 'src/utils/constant';
import { getErrorMessage } from 'src/utils/errorHandler';
import { LabelWithHelp } from 'src/components/shared/HelpTooltip';

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

const OVERALL_COMPLETION_HELP =
  'Tỷ lệ hoàn thành tổng của bệnh nhân (cùng công thức BXH): trung bình % hoàn thành các buổi test và lượt tập theo chu kỳ được giao. ' +
  'Mỗi bài lấy đúng số lần được giao, ưu tiên các lần có % thời gian cao nhất (làm lại đủ sẽ thay lần dở). ' +
  'Ngày bác sĩ/admin duyệt hoàn thành được tính 100% trong tổng; các ngày khác (kể cả hôm nay) giữ đúng % thực tế.';

const overallCompletionColor = (pct: number): string => {
  if (pct > 90) return '#9B8EC4'; // xanh tím pastel
  if (pct >= 80) return '#f9a825'; // vàng
  return '#ed6c02'; // cam
};

const STATUS_COLORS: Record<DiligenceCalendarDay['status'], string> = {
  complete: '#1976d2',
  partial: '#f9a825',
  none: '#eceff1',
};

const formatDuration = (sec: number): string => {
  if (!sec || sec <= 0) return '0 phút';
  const minutes = Math.round(sec / 60);
  if (minutes < 60) return `${minutes} phút`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} giờ ${m} phút` : `${h} giờ`;
};

const shiftMonth = (month: string, delta: number): string => {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const currentMonth = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export interface DiligenceCalendarProps {
  /** Staff view: load calendar for this patient id */
  patientId?: number;
  /** Patient portal: load own calendar via /me */
  self?: boolean;
  canEdit?: boolean;
}

const DiligenceCalendar: React.FC<DiligenceCalendarProps> = ({
  patientId,
  self = false,
  canEdit = false,
}) => {
  const { showSnackbar } = useSnackbar();
  const [month, setMonth] = useState(currentMonth);
  const [data, setData] = useState<DiligenceCalendarResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [overrideDay, setOverrideDay] = useState<DiligenceCalendarDay | null>(null);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!self && !patientId) return;
    setLoading(true);
    try {
      const res = self
        ? await getMyDiligenceCalendar(month)
        : await getPatientDiligenceCalendar(patientId as number, month);
      setData(res);
    } catch (error) {
      setData(null);
      showSnackbar(getErrorMessage(error, 'Không tải được lịch chăm chỉ'), SNACKBAR_SEVERITY.ERROR);
    } finally {
      setLoading(false);
    }
  }, [patientId, self, month, showSnackbar]);

  useEffect(() => {
    void load();
  }, [load]);

  const dayMap = useMemo(() => {
    const map = new Map<string, DiligenceCalendarDay>();
    data?.days?.forEach((d) => map.set(d.date, d));
    return map;
  }, [data]);

  const cells = useMemo(() => {
    const [y, m] = month.split('-').map(Number);
    const first = new Date(y, m - 1, 1);
    // JS: 0=Sun … convert to Mon-first index
    const startPad = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(y, m, 0).getDate();
    const total = startPad + daysInMonth;
    const rows = Math.ceil(total / 7) * 7;
    const list: Array<{ date: string | null; dayNum: number | null }> = [];
    for (let i = 0; i < rows; i += 1) {
      const dayNum = i - startPad + 1;
      if (dayNum < 1 || dayNum > daysInMonth) {
        list.push({ date: null, dayNum: null });
      } else {
        const date = `${month}-${String(dayNum).padStart(2, '0')}`;
        list.push({ date, dayNum });
      }
    }
    return list;
  }, [month]);

  const monthLabel = useMemo(() => {
    const [y, m] = month.split('-').map(Number);
    return `Tháng ${m}/${y}`;
  }, [month]);

  const handleConfirmOverride = async () => {
    if (!overrideDay || !patientId) return;
    setSaving(true);
    try {
      const res = await overridePatientDiligenceDay(patientId, overrideDay.date, {
        reason: reason.trim() || undefined,
      });
      setData(res.calendar);
      setOverrideDay(null);
      setReason('');
      showSnackbar('Đã đánh dấu ngày hoàn thành.', SNACKBAR_SEVERITY.SUCCESS);
    } catch (error) {
      showSnackbar(
        getErrorMessage(error, 'Không cập nhật được ngày tuân thủ.'),
        SNACKBAR_SEVERITY.ERROR
      );
    } finally {
      setSaving(false);
    }
  };

  const overallPct =
    data?.overallCompletionPct != null ? Math.round(data.overallCompletionPct) : null;
  const overallColor =
    overallPct != null ? overallCompletionColor(overallPct) : 'text.secondary';

  return (
    <Box sx={{ mt: 2 }}>
      <Paper variant="outlined" sx={{ p: 2, mb: 1.5, textAlign: 'center' }}>
        <Typography
          component="div"
          title="% Hoàn thành (tổng)"
          aria-label="% Hoàn thành (tổng)"
          sx={{
            fontWeight: 800,
            lineHeight: 1,
            fontSize: '4.5rem', // ~3× default h3 (~1.5rem)
            color: overallColor,
          }}
        >
          <LabelWithHelp help={OVERALL_COMPLETION_HELP} variant="info">
            {overallPct != null ? `${overallPct}%` : loading ? '…' : '—'}
          </LabelWithHelp>
        </Typography>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
          Lịch theo dõi hoàn thành
        </Typography>
        <Stack direction="row" alignItems="center" spacing={0.5}>
          <IconButton size="small" onClick={() => setMonth((m) => shiftMonth(m, -1))} aria-label="Tháng trước">
            <ChevronLeftIcon fontSize="small" />
          </IconButton>
          <Typography variant="body2" sx={{ minWidth: 96, textAlign: 'center', fontWeight: 600 }}>
            {monthLabel}
          </Typography>
          <IconButton size="small" onClick={() => setMonth((m) => shiftMonth(m, 1))} aria-label="Tháng sau">
            <ChevronRightIcon fontSize="small" />
          </IconButton>
        </Stack>
      </Box>

      <Stack direction="row" spacing={1.5} sx={{ mb: 1.5, flexWrap: 'wrap' }}>
        <Stack direction="row" spacing={0.75} alignItems="center">
          <Box sx={{ width: 12, height: 12, borderRadius: 0.5, bgcolor: STATUS_COLORS.complete }} />
          <Typography variant="caption">Hoàn thành</Typography>
        </Stack>
        <Stack direction="row" spacing={0.75} alignItems="center">
          <Box sx={{ width: 12, height: 12, borderRadius: 0.5, bgcolor: STATUS_COLORS.partial }} />
          <Typography variant="caption">Chưa đủ</Typography>
        </Stack>
        <Stack direction="row" spacing={0.75} alignItems="center">
          <Box sx={{ width: 12, height: 12, borderRadius: 0.5, bgcolor: STATUS_COLORS.none, border: '1px solid #cfd8dc' }} />
          <Typography variant="caption">Không hoạt động</Typography>
        </Stack>
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 0.5,
        }}
      >
        {WEEKDAYS.map((w) => (
          <Typography
            key={w}
            variant="caption"
            sx={{ textAlign: 'center', fontWeight: 700, color: 'text.secondary' }}
          >
            {w}
          </Typography>
        ))}
        {cells.map((cell, idx) => {
          if (!cell.date) {
            return <Box key={`empty-${idx}`} sx={{ aspectRatio: '1', minHeight: 28 }} />;
          }
          const day = dayMap.get(cell.date);
          const status = day?.status ?? 'none';
          const tooltip = day
            ? [
                `${cell.date}${day.overridden ? ' (đã chỉnh bởi bác sĩ/admin)' : ''}`,
                `Hoàn thành: ${day.completionPct}%`,
                `Thời gian tập: ${formatDuration(day.actualSec)}`,
                day.assignedSec > 0 ? `Thời lượng giao: ${formatDuration(day.assignedSec)}` : null,
                day.dailyExamRequired > 0
                  ? `Test ngày: ${day.dailyExamCompleted}/${day.dailyExamRequired}`
                  : null,
              ]
                .filter(Boolean)
                .join('\n')
            : cell.date;

          const canOverride =
            canEdit && day && day.status !== 'complete' && !loading;

          return (
            <Tooltip key={cell.date} title={<Box sx={{ whiteSpace: 'pre-line' }}>{tooltip}</Box>} arrow>
              <Box
                component="button"
                type="button"
                disabled={!canOverride}
                onClick={() => {
                  if (canOverride && day) {
                    setOverrideDay(day);
                    setReason('');
                  }
                }}
                sx={{
                  aspectRatio: '1',
                  minHeight: 28,
                  border: '1px solid',
                  borderColor: status === 'none' ? '#cfd8dc' : 'transparent',
                  borderRadius: 1,
                  bgcolor: STATUS_COLORS[status],
                  color: status === 'none' ? 'text.secondary' : '#fff',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: canOverride ? 'pointer' : 'default',
                  opacity: loading ? 0.5 : 1,
                  p: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                }}
              >
                {cell.dayNum}
                {day?.overridden ? (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 2,
                      right: 2,
                      width: 5,
                      height: 5,
                      borderRadius: '50%',
                      bgcolor: '#fff',
                    }}
                  />
                ) : null}
              </Box>
            </Tooltip>
          );
        })}
      </Box>

      {canEdit && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          Bấm vào ngày vàng/xám để đánh dấu hoàn thành (dùng khi hệ thống lỗi khiến bệnh nhân không
          tập được). Ngày đó sẽ được tính 100% và cập nhật tuân thủ.
        </Typography>
      )}

      <Dialog open={Boolean(overrideDay)} onClose={() => !saving && setOverrideDay(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Đánh dấu hoàn thành ngày</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 1.5 }}>
            Ngày <strong>{overrideDay?.date}</strong> sẽ được đánh dấu hoàn thành (100%). Các buổi
            bài tập/test theo ngày còn thiếu sẽ được ghi nhận hoàn thành để cập nhật chỉ số tuân thủ.
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={2}
            label="Lý do (tuỳ chọn)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ví dụ: Lỗi hệ thống — xác nhận bệnh nhân đã tập đủ"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOverrideDay(null)} disabled={saving}>
            Huỷ
          </Button>
          <Button variant="contained" onClick={() => void handleConfirmOverride()} disabled={saving}>
            Xác nhận hoàn thành
          </Button>
        </DialogActions>
      </Dialog>
      </Paper>
    </Box>
  );
};

export default DiligenceCalendar;
