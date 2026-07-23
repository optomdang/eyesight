import React, { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Slider,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { Stop, VolumeUp, Refresh, RecordVoiceOver } from '@mui/icons-material';
import {
  filterVoicesByLang,
  langToBcp47,
  useSpeechSynthesis,
} from 'src/hooks/useSpeechSynthesis';
import {
  INSTRUCTION_AUDIO_SAMPLES,
  type AudioSampleLang,
  getSamplesByCategory,
} from 'src/utils/audio/instructionAudioSamples';
import InstructionAudioSampleTable from './InstructionAudioSampleTable';

type VoiceLangFilter = 'vi' | 'en' | 'all';

const RATE_MARKS = [
  { value: 0.7, label: '0.7' },
  { value: 0.8, label: '0.8' },
  { value: 1.1, label: '1.1' },
  { value: 1.3, label: '1.3' },
];

interface BrowserTtsPanelProps {
  lang: AudioSampleLang;
  onLangChange: (lang: AudioSampleLang) => void;
}

const BrowserTtsPanel: React.FC<BrowserTtsPanelProps> = ({ lang, onLangChange }) => {
  const [voiceLangFilter, setVoiceLangFilter] = useState<VoiceLangFilter>('vi');
  const [voiceUri, setVoiceUri] = useState('');
  const [rate, setRate] = useState(0.8);
  const [pitch, setPitch] = useState(1);

  const { supported, voices, speaking, activeSampleId, speak, speakQueue, stop, refreshVoices } =
    useSpeechSynthesis();

  const filteredVoices = useMemo(
    () => filterVoicesByLang(voices, voiceLangFilter),
    [voices, voiceLangFilter]
  );

  const selectedVoice = useMemo(
    () => voices.find((v) => v.voiceURI === voiceUri) ?? filteredVoices[0],
    [voices, voiceUri, filteredVoices]
  );

  const speechOptions = useMemo(
    () => ({
      voiceUri: selectedVoice?.voiceURI,
      lang: selectedVoice?.lang ?? langToBcp47(lang),
      rate,
      pitch,
    }),
    [selectedVoice, lang, rate, pitch]
  );

  const viVoiceCount = useMemo(
    () => voices.filter((v) => v.lang.toLowerCase().startsWith('vi')).length,
    [voices]
  );
  const enVoiceCount = useMemo(
    () => voices.filter((v) => v.lang.toLowerCase().startsWith('en')).length,
    [voices]
  );

  if (!supported) {
    return (
      <Alert severity="error">
        Trình duyệt không hỗ trợ Web Speech API. Hãy thử Chrome hoặc Edge.
      </Alert>
    );
  }

  return (
    <Stack spacing={2.5}>
      <Alert severity="info" icon={<RecordVoiceOver />}>
        <Typography variant="body2">
          Giọng <strong>miễn phí</strong> từ hệ điều hành — thường nghe máy móc với tiếng Việt. Dùng
          để so sánh với tab Cloud TTS.
        </Typography>
      </Alert>

      <Paper variant="outlined" sx={{ p: 2.5 }}>
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>
          Cài đặt giọng trình duyệt
        </Typography>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} flexWrap="wrap">
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Ngôn ngữ nội dung</InputLabel>
            <Select
              label="Ngôn ngữ nội dung"
              value={lang}
              onChange={(e) => onLangChange(e.target.value as AudioSampleLang)}
            >
              <MenuItem value="vi">Tiếng Việt</MenuItem>
              <MenuItem value="en">English</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Lọc giọng</InputLabel>
            <Select
              label="Lọc giọng"
              value={voiceLangFilter}
              onChange={(e) => {
                setVoiceLangFilter(e.target.value as VoiceLangFilter);
                setVoiceUri('');
              }}
            >
              <MenuItem value="vi">Tiếng Việt ({viVoiceCount})</MenuItem>
              <MenuItem value="en">English ({enVoiceCount})</MenuItem>
              <MenuItem value="all">Tất cả ({voices.length})</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 280, flex: 1 }}>
            <InputLabel>Giọng đọc</InputLabel>
            <Select
              label="Giọng đọc"
              value={selectedVoice?.voiceURI ?? ''}
              onChange={(e) => setVoiceUri(e.target.value)}
            >
              {filteredVoices.map((v) => (
                <MenuItem key={v.voiceURI} value={v.voiceURI}>
                  {v.name} ({v.lang}){v.localService ? '' : ' · cloud'}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Tooltip title="Tải lại danh sách giọng">
            <IconButton onClick={refreshVoices} size="small" aria-label="Tải lại giọng">
              <Refresh />
            </IconButton>
          </Tooltip>

          {speaking ? (
            <Button variant="outlined" color="error" startIcon={<Stop />} onClick={stop}>
              Dừng
            </Button>
          ) : (
            <Button
              variant="contained"
              startIcon={<VolumeUp />}
              onClick={() =>
                speakQueue(
                  INSTRUCTION_AUDIO_SAMPLES.map((s) => ({ id: s.id, text: s.text[lang] })),
                  speechOptions
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
            max={1.3}
            step={0.05}
            value={rate}
            marks={RATE_MARKS}
            onChange={(_e, v) => setRate(v as number)}
            disabled={speaking}
          />
        </Box>

        <Box sx={{ maxWidth: 480 }}>
          <Typography variant="caption" color="text.secondary">
            Cao độ: {pitch.toFixed(2)}
          </Typography>
          <Slider
            size="small"
            min={0.8}
            max={1.2}
            step={0.05}
            value={pitch}
            onChange={(_e, v) => setPitch(v as number)}
            disabled={speaking}
          />
        </Box>

        {selectedVoice && (
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
            <Chip size="small" label={selectedVoice.name} />
            <Chip size="small" label={selectedVoice.lang} variant="outlined" />
          </Stack>
        )}
      </Paper>

      <InstructionAudioSampleTable
        lang={lang}
        activeSampleId={activeSampleId}
        disabled={speaking}
        onPlaySample={(id, text) => speak(text, id, speechOptions)}
        onPlayCategory={(categoryId) =>
          speakQueue(
            getSamplesByCategory(categoryId).map((s) => ({ id: s.id, text: s.text[lang] })),
            speechOptions
          )
        }
      />
    </Stack>
  );
};

export default BrowserTtsPanel;
