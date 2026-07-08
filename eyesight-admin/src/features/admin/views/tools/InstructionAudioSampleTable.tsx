import React from 'react';
import {
  Box,
  Button,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { PlayArrow } from '@mui/icons-material';
import {
  INSTRUCTION_AUDIO_CATEGORIES,
  type AudioSampleLang,
  getSamplesByCategory,
} from 'src/utils/audio/instructionAudioSamples';

interface InstructionAudioSampleTableProps {
  lang: AudioSampleLang;
  activeSampleId: string | null;
  disabled?: boolean;
  onPlaySample: (sampleId: string, text: string) => void;
  onPlayCategory: (categoryId: string) => void;
}

const InstructionAudioSampleTable: React.FC<InstructionAudioSampleTableProps> = ({
  lang,
  activeSampleId,
  disabled,
  onPlaySample,
  onPlayCategory,
}) => (
  <>
    {INSTRUCTION_AUDIO_CATEGORIES.map((category) => {
      const samples = getSamplesByCategory(category.id);
      return (
        <Paper key={category.id} variant="outlined" sx={{ overflow: 'hidden' }}>
          <Box
            sx={{
              px: 2,
              py: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1,
              bgcolor: 'action.hover',
              flexWrap: 'wrap',
            }}
          >
            <Typography variant="subtitle1" fontWeight={700}>
              {category.label[lang]}
            </Typography>
            <Button
              size="small"
              startIcon={<PlayArrow />}
              onClick={() => onPlayCategory(category.id)}
              disabled={disabled}
            >
              Phát nhóm ({samples.length})
            </Button>
          </Box>

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell width={48} />
                  <TableCell>Mẫu</TableCell>
                  <TableCell>Nội dung ({lang})</TableCell>
                  <TableCell width={140}>Nguồn</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {samples.map((sample) => {
                  const isActive = activeSampleId === sample.id;
                  const text = sample.text[lang];
                  return (
                    <TableRow
                      key={sample.id}
                      hover
                      selected={isActive}
                      sx={isActive ? { bgcolor: 'action.selected' } : undefined}
                    >
                      <TableCell>
                        <IconButton
                          size="small"
                          color={isActive ? 'primary' : 'default'}
                          onClick={() => onPlaySample(sample.id, text)}
                          disabled={disabled}
                          aria-label={`Phát ${sample.label[lang]}`}
                        >
                          <PlayArrow fontSize="small" />
                        </IconButton>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={isActive ? 700 : 500}>
                          {sample.label[lang]}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {text}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="caption"
                          color="text.disabled"
                          sx={{ fontFamily: 'monospace' }}
                        >
                          {sample.source}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      );
    })}
  </>
);

export default InstructionAudioSampleTable;
