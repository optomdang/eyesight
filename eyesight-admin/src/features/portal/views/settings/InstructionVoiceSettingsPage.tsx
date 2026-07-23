import React, { useCallback, useRef, useState } from 'react';
import {
  Box,
  Button,
  Divider,
  Paper,
  Slider,
  Switch,
  Typography,
} from '@mui/material';
import VolumeUpOutlinedIcon from '@mui/icons-material/VolumeUpOutlined';
import { HelpTooltip, LabelWithHelp } from 'src/components/shared/HelpTooltip';
import {
  INSTRUCTION_VOICE_PREVIEW_SAMPLE_IDS,
  INSTRUCTION_VOICE_RATE_DEFAULT,
  INSTRUCTION_VOICE_RATE_MAX,
  INSTRUCTION_VOICE_RATE_MIN,
  loadInstructionVoiceSettings,
  saveInstructionVoiceSettings,
  type InstructionVoiceSettings,
} from 'src/services/instructionVoice.service';
import { useInstructionAudioPlayback } from 'src/hooks/useInstructionAudioPlayback';
import { playInstructionSampleQueue } from 'src/utils/audio/instructionAudioPlayer';
import { normalizeInstructionLang } from 'src/utils/audio/instructionAudioResolver';
import { useTranslation } from 'src/hooks/useTranslation';

const InstructionVoiceSettingsPage: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const { t, currentLanguage } = useTranslation();
  const audioLang = normalizeInstructionLang(currentLanguage);
  const [settings, setSettings] = useState<InstructionVoiceSettings>(() => loadInstructionVoiceSettings());
  const { stop } = useInstructionAudioPlayback(audioLang);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const previewGenerationRef = useRef(0);

  const persist = useCallback((next: InstructionVoiceSettings) => {
    setSettings(next);
    saveInstructionVoiceSettings(next);
  }, []);

  const handleToggle = (_: React.ChangeEvent<HTMLInputElement>, checked: boolean) => {
    persist({ ...settings, enabled: checked });
  };

  const handleRateChange = (_: Event, value: number | number[]) => {
    const rate = Array.isArray(value) ? value[0] : value;
    persist({ ...settings, rate });
  };

  const handlePreview = () => {
    stop();
    previewGenerationRef.current += 1;
    const generation = previewGenerationRef.current;
    setPreviewError(null);
    setPreviewPlaying(true);

    void playInstructionSampleQueue(
      [...INSTRUCTION_VOICE_PREVIEW_SAMPLE_IDS],
      audioLang,
      settings.rate,
      previewGenerationRef,
      generation
    )
      .catch((err: unknown) => {
        if (generation !== previewGenerationRef.current) return;
        if (err instanceof Error && err.message === 'aborted') return;
        setPreviewError(err instanceof Error ? err.message : 'Phát âm thanh thất bại');
      })
      .finally(() => {
        if (generation === previewGenerationRef.current) {
          setPreviewPlaying(false);
        }
      });
  };

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto', p: embedded ? 0 : { xs: 2, md: 3 } }}>
      {!embedded && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
          <VolumeUpOutlinedIcon color="primary" />
          <Typography variant="h4" component="div" sx={{ display: 'flex', alignItems: 'center' }}>
            <LabelWithHelp
              help={t(
                'settings.instructionVoice.info',
                'Phát tự động các câu hướng dẫn và yêu cầu trong bài kiểm tra / bài tập. Không đọc ký tự optotype hay gợi ý đáp án.'
              )}
              gap={1}
            >
              {t('settings.instructionVoice.title', 'Giọng đọc hướng dẫn')}
            </LabelWithHelp>
          </Typography>
        </Box>
      )}

      <Paper sx={{ p: 3, mb: embedded ? 0 : 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, mb: 3 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" fontWeight={600} component="div">
              <LabelWithHelp
                help={t(
                  'settings.instructionVoice.autoPlayHelp',
                  'Khi bật, ứng dụng tự đọc hướng dẫn khi vào màn hình kiểm tra hoặc câu hỏi bài tập.'
                )}
              >
                {t('settings.instructionVoice.autoPlay', 'Phát tiếng tự động')}
              </LabelWithHelp>
            </Typography>
          </Box>
          <Switch
            checked={settings.enabled}
            onChange={handleToggle}
            color="primary"
            sx={{ mt: 0.5, flexShrink: 0 }}
          />
        </Box>

        <Divider sx={{ mb: 3 }} />

        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle1" fontWeight={600} component="div" sx={{ mb: 2 }}>
            <LabelWithHelp
              help={t(
                'settings.instructionVoice.rateHelp',
                'Điều chỉnh tốc độ phát file âm thanh đã tạo sẵn (không gọi API mỗi lần). Mặc định 0.8×; 1.0 là tốc độ gốc của file MP3.'
              )}
            >
              {t('settings.instructionVoice.rate', 'Tốc độ đọc')}
            </LabelWithHelp>
          </Typography>
          <Slider
            value={settings.rate}
            min={INSTRUCTION_VOICE_RATE_MIN}
            max={INSTRUCTION_VOICE_RATE_MAX}
            step={0.05}
            marks={[
              { value: INSTRUCTION_VOICE_RATE_MIN, label: String(INSTRUCTION_VOICE_RATE_MIN) },
              { value: INSTRUCTION_VOICE_RATE_DEFAULT, label: String(INSTRUCTION_VOICE_RATE_DEFAULT) },
              { value: INSTRUCTION_VOICE_RATE_MAX, label: String(INSTRUCTION_VOICE_RATE_MAX) },
            ]}
            valueLabelDisplay="on"
            valueLabelFormat={(v) => `${v.toFixed(2)}×`}
            onChange={handleRateChange}
          />
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
          <Button variant="outlined" onClick={handlePreview} disabled={previewPlaying}>
            {previewPlaying
              ? t('settings.instructionVoice.previewPlaying', 'Đang phát…')
              : t('settings.instructionVoice.preview', 'Nghe thử')}
          </Button>
          <HelpTooltip
            title={t(
              'settings.instructionVoice.previewHint',
              'Phát 3 câu hướng dẫn mẫu ở tốc độ {{rate}}× — thử 0.5 và 1.1 để nghe rõ sự khác biệt.',
              { rate: settings.rate.toFixed(2) }
            )}
          />
        </Box>
        {previewError && (
          <Typography component="span" variant="body2" color="error.main" sx={{ display: 'block', mt: 1 }}>
            {previewError}
          </Typography>
        )}
      </Paper>
    </Box>
  );
};

export default InstructionVoiceSettingsPage;
