import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Slider,
  Stack,
  Typography,
} from '@mui/material';
import { Cloud, Stop, VolumeUp } from '@mui/icons-material';
import { useCloudTtsPlayback } from 'src/hooks/useCloudTtsPlayback';
import {
  fetchCloudTtsStatus,
  type CloudTtsProvider,
  type CloudTtsPreviewStatus,
} from 'src/services/ttsPreview.service';
import {
  INSTRUCTION_AUDIO_SAMPLES,
  type AudioSampleLang,
  getSamplesByCategory,
} from 'src/utils/audio/instructionAudioSamples';
import InstructionAudioSampleTable from './InstructionAudioSampleTable';

const RATE_MARKS = [
  { value: 0.7, label: '0.7' },
  { value: 0.8, label: '0.8' },
  { value: 1.1, label: '1.1' },
];

interface CloudTtsPanelProps {
  lang: AudioSampleLang;
  onLangChange: (lang: AudioSampleLang) => void;
}

const CloudTtsPanel: React.FC<CloudTtsPanelProps> = ({ lang, onLangChange }) => {
  const [status, setStatus] = useState<CloudTtsPreviewStatus | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [provider, setProvider] = useState<CloudTtsProvider>('google');
  const [voiceId, setVoiceId] = useState('');
  const [rate, setRate] = useState(0.8);

  const { playing, loading, activeSampleId, error, speak, speakQueue, stop } = useCloudTtsPlayback();

  useEffect(() => {
    let cancelled = false;
    setLoadingStatus(true);
    fetchCloudTtsStatus()
      .then((data) => {
        if (cancelled) return;
        setStatus(data);
        setStatusError(null);
        if (data.enabledProviders.length > 0) {
          const first = data.enabledProviders[0];
          setProvider(first);
          const firstVoice = data.voices[first]?.voices[0];
          if (firstVoice) setVoiceId(firstVoice.id);
        }
      })
      .catch(() => {
        if (!cancelled) setStatusError('Không tải được trạng thái Cloud TTS. Kiểm tra backend đang chạy.');
      })
      .finally(() => {
        if (!cancelled) setLoadingStatus(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const providerVoices = useMemo(() => {
    if (!status?.voices[provider]) return [];
    return status.voices[provider]!.voices;
  }, [status, provider]);

  const filteredVoices = useMemo(() => {
    if (provider === 'elevenlabs') return providerVoices;
    const prefix = lang === 'vi' ? 'vi' : 'en';
    return providerVoices.filter((v) => v.lang.toLowerCase().startsWith(prefix));
  }, [providerVoices, lang, provider]);

  const selectedVoice = useMemo(
    () => filteredVoices.find((v) => v.id === voiceId) ?? filteredVoices[0],
    [filteredVoices, voiceId]
  );

  useEffect(() => {
    if (selectedVoice && selectedVoice.id !== voiceId) {
      setVoiceId(selectedVoice.id);
    }
  }, [selectedVoice, voiceId]);

  const playbackOptions = useMemo(
    () => ({
      provider,
      voiceId: selectedVoice?.id ?? voiceId,
      lang,
      rate,
    }),
    [provider, selectedVoice, voiceId, lang, rate]
  );

  const busy = playing || loading;

  if (loadingStatus) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (statusError) {
    return <Alert severity="error">{statusError}</Alert>;
  }

  if (!status || status.enabledProviders.length === 0) {
    return (
      <Alert severity="warning" icon={<Cloud />}>
        <Typography variant="subtitle2" gutterBottom>
          Chưa cấu hình Cloud TTS
        </Typography>
        <Typography variant="body2" component="div">
          Thêm ít nhất một API key vào <code>eyesight-service/.env</code>, rồi khởi động lại backend:
          <Box component="ul" sx={{ mt: 1, mb: 0, pl: 2.5 }}>
            <li>
              <strong>Google:</strong> <code>GOOGLE_TTS_API_KEY</code> — bật Cloud Text-to-Speech API
            </li>
            <li>
              <strong>Azure:</strong> <code>AZURE_SPEECH_KEY</code> + <code>AZURE_SPEECH_REGION</code>
            </li>
            <li>
              <strong>ElevenLabs:</strong> <code>ELEVENLABS_API_KEY</code>
            </li>
          </Box>
        </Typography>
      </Alert>
    );
  }

  return (
    <Stack spacing={2.5}>
      <Alert severity="success" icon={<Cloud />}>
        <Typography variant="body2">
          Giọng <strong>neural cloud</strong> — tự nhiên hơn Web Speech. API key chỉ dùng trên server,
          không lộ ra trình duyệt. Mỗi lần phát gọi API (có phí nhỏ theo ký tự).
        </Typography>
      </Alert>

      {error && (
        <Alert severity="error" onClose={stop}>
          {error}
        </Alert>
      )}

      <Paper variant="outlined" sx={{ p: 2.5 }}>
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>
          Cài đặt Cloud TTS
        </Typography>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} flexWrap="wrap" alignItems="center">
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Ngôn ngữ nội dung</InputLabel>
            <Select
              label="Ngôn ngữ nội dung"
              value={lang}
              onChange={(e) => onLangChange(e.target.value as AudioSampleLang)}
              disabled={busy}
            >
              <MenuItem value="vi">Tiếng Việt</MenuItem>
              <MenuItem value="en">English</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Nhà cung cấp</InputLabel>
            <Select
              label="Nhà cung cấp"
              value={provider}
              onChange={(e) => {
                const next = e.target.value as CloudTtsProvider;
                setProvider(next);
                const first = status.voices[next]?.voices[0];
                if (first) setVoiceId(first.id);
              }}
              disabled={busy}
            >
              {status.enabledProviders.map((p) => (
                <MenuItem key={p} value={p}>
                  {status.voices[p]?.label ?? p}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 260, flex: 1 }}>
            <InputLabel>Giọng đọc</InputLabel>
            <Select
              label="Giọng đọc"
              value={selectedVoice?.id ?? ''}
              onChange={(e) => setVoiceId(e.target.value)}
              disabled={busy}
            >
              {filteredVoices.map((v) => (
                <MenuItem key={v.id} value={v.id}>
                  {v.label} ({v.lang})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {busy ? (
            <Button variant="outlined" color="error" startIcon={<Stop />} onClick={stop}>
              Dừng
            </Button>
          ) : (
            <Button
              variant="contained"
              startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <VolumeUp />}
              onClick={() =>
                speakQueue(
                  INSTRUCTION_AUDIO_SAMPLES.map((s) => ({ id: s.id, text: s.text[lang] })),
                  playbackOptions
                )
              }
            >
              Phát tất cả
            </Button>
          )}
        </Stack>

        <Box sx={{ mt: 2, maxWidth: 480 }}>
          <Typography variant="caption" color="text.secondary">
            Tốc độ: {rate.toFixed(2)}
          </Typography>
          <Slider
            size="small"
            min={0.7}
            max={1.2}
            step={0.05}
            value={rate}
            marks={RATE_MARKS}
            onChange={(_e, v) => setRate(v as number)}
            disabled={busy}
          />
        </Box>

        {selectedVoice && (
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
            <Chip size="small" label={status.voices[provider]?.label} color="primary" variant="outlined" />
            <Chip size="small" label={selectedVoice.label} />
            {status.voices[provider]?.modelId && (
              <Chip size="small" label={status.voices[provider]!.modelId!} variant="outlined" />
            )}
          </Stack>
        )}

        {loading && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Đang tạo audio từ cloud… (có thể mất vài giây)
          </Typography>
        )}
      </Paper>

      <InstructionAudioSampleTable
        lang={lang}
        activeSampleId={activeSampleId}
        disabled={busy}
        onPlaySample={(id, text) => speak(text, id, playbackOptions)}
        onPlayCategory={(categoryId) =>
          speakQueue(
            getSamplesByCategory(categoryId).map((s) => ({ id: s.id, text: s.text[lang] })),
            playbackOptions
          )
        }
      />
    </Stack>
  );
};

export default CloudTtsPanel;
