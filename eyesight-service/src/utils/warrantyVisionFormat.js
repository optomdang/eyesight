const FAR_VISION_LEVELS = [
  { level: 1, score: '20/400' },
  { level: 2, score: '20/320' },
  { level: 3, score: '20/250' },
  { level: 4, score: '20/200' },
  { level: 5, score: '20/160' },
  { level: 6, score: '20/125' },
  { level: 7, score: '20/100' },
  { level: 8, score: '20/80' },
  { level: 9, score: '20/63' },
  { level: 10, score: '20/50' },
  { level: 11, score: '20/40' },
  { level: 12, score: '20/32' },
  { level: 13, score: '20/25' },
  { level: 14, score: '20/20' },
  { level: 15, score: '20/16' },
  { level: 16, score: '20/12.5' },
  { level: 17, score: '20/10' },
  { level: 18, score: '20/8' },
  { level: 19, score: '20/6.3' },
  { level: 20, score: '20/5' },
];

const NEAR_VISION_LEVELS = [
  { level: 1, score: 'N64' },
  { level: 2, score: 'N32' },
  { level: 3, score: 'N24' },
  { level: 4, score: 'N16' },
  { level: 5, score: 'N12' },
  { level: 6, score: 'N8' },
  { level: 7, score: 'N5' },
  { level: 8, score: 'N3' },
];

const CONTRAST_VISION_LEVELS = [
  { level: 1, score: '0.00' },
  { level: 2, score: '0.15' },
  { level: 3, score: '0.30' },
  { level: 4, score: '0.45' },
  { level: 5, score: '0.60' },
  { level: 6, score: '0.75' },
  { level: 7, score: '0.90' },
  { level: 8, score: '1.05' },
  { level: 9, score: '1.20' },
  { level: 10, score: '1.35' },
  { level: 11, score: '1.50' },
  { level: 12, score: '1.65' },
  { level: 13, score: '1.80' },
  { level: 14, score: '1.95' },
  { level: 15, score: '2.10' },
  { level: 16, score: '2.25' },
];

const STEREOPSIS_LEVELS = [
  { level: 800, score: '800″' },
  { level: 400, score: '400″' },
  { level: 200, score: '200″' },
  { level: 150, score: '150″' },
  { level: 100, score: '100″' },
  { level: 80, score: '80″' },
  { level: 60, score: '60″' },
  { level: 40, score: '40″' },
  { level: 32, score: '32″' },
  { level: 25, score: '25″' },
  { level: 20, score: '20″' },
];

const EXAM_TYPE_LABELS = {
  far: 'Thị lực xa',
  near: 'Thị lực gần',
  contrast: 'Độ tương phản',
  stereopsis: 'Thị giác lập thể',
};

const lookupScore = (levels, levelNum) => {
  const found = levels.find((v) => v.level === levelNum);
  return found ? found.score : `Lv ${levelNum}`;
};

const formatStereopsisLevel = (level) => {
  if (level === null || level === undefined || level === '') return '—';
  const n = typeof level === 'string' ? parseInt(level, 10) : level;
  if (!Number.isFinite(n)) return '—';
  if (n > 0 && n <= 10) return `Lv ${n}`;
  const found = STEREOPSIS_LEVELS.find((v) => v.level === n);
  return found ? found.score : `${n}″`;
};

const formatVisionLevel = (examType, level) => {
  if (level === null || level === undefined || level === '') return '—';
  const levelNum = typeof level === 'string' ? parseInt(level, 10) : level;
  if (!Number.isFinite(levelNum)) return '—';

  switch (examType) {
    case 'far':
      return lookupScore(FAR_VISION_LEVELS, levelNum);
    case 'near':
      return lookupScore(NEAR_VISION_LEVELS, levelNum);
    case 'contrast':
      return lookupScore(CONTRAST_VISION_LEVELS, levelNum);
    case 'stereopsis':
      return formatStereopsisLevel(levelNum);
    default:
      return `Lv ${levelNum}`;
  }
};

const eyesForExam = (examType) => (examType === 'stereopsis' ? ['bothEye'] : ['rightEye', 'leftEye']);

const eyeLabel = (eye) => {
  if (eye === 'leftEye') return 'MT';
  if (eye === 'rightEye') return 'MP';
  return 'Hai mắt';
};

module.exports = {
  EXAM_TYPE_LABELS,
  formatVisionLevel,
  eyesForExam,
  eyeLabel,
};
