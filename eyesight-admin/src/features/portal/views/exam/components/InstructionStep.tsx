import { Box, Typography, Button, List, ListItem } from '@mui/material';
import { useMemo } from 'react';
import { useTranslation } from 'src/hooks/useTranslation';
import { useExamContext } from 'src/contexts/ExamContext';
import { useAutoInstructionAudioQueue } from 'src/hooks/useInstructionAudioPlayback';
import { getExamInstructionAudioIds } from 'src/utils/audio/instructionAudioResolver';

const InstructionStep: React.FC = () => {
  const { t, currentLanguage } = useTranslation();
  const { handleStartTest, examType } = useExamContext();

  const audioSampleIds = useMemo(() => getExamInstructionAudioIds(examType), [examType]);

  useAutoInstructionAudioQueue(audioSampleIds, {
    lang: currentLanguage,
    dedupeKey: `exam-instructions:${examType}:${currentLanguage}`,
  });
  const examTitleMap = {
    far: t('exam.far', 'Far Vision'),
    near: t('exam.near', 'Near Vision'),
    contrast: t('exam.contrast', 'Contrast'),
    stereopsis: t('exam.stereopsis', 'Stereopsis'),
  } as const;
  const testTitle = examTitleMap[examType] || examType;
  const isStereopsis = examType === 'stereopsis';

  return (
    <Box sx={{ px: 4, py: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" gutterBottom>
          {t('exam.welcome', 'Chào mừng')} <strong>{t('exam.you', 'Bạn')}</strong>{' '}
          {t('exam.toTest', 'đến với bài kiểm tra')} {testTitle}
        </Typography>
      </Box>

      <Typography variant="body1" paragraph>
        {t('exam.intro', 'Bài kiểm tra này nhằm đánh giá và theo dõi tiến triển khả năng')}{' '}
        {testTitle} {t('exam.ofEyes', 'của mắt trong quá')}
        {t('exam.treatment', ' trình điều trị.')}.
      </Typography>

      <List sx={{ listStyleType: 'decimal', pl: 3 }} disablePadding>
        {/* Mục 1: đeo kính - áp dụng cho tất cả */}
        <ListItem sx={{ display: 'list-item' }}>
          {t('exam.ifWearGlasses', 'Nếu')} <strong>{t('exam.you', 'Bạn')}</strong>{' '}
          {t('exam.wearGlasses', 'có đeo kính,')}{' '}
          <strong>{t('exam.putOnGlasses', 'hãy đeo kính vào nhé')}</strong>.
          {isStereopsis && (
            <>
              <br />
              <strong style={{ color: '#d32f2f' }}>
                {t(
                  'exam.stereopsisGlassesNote',
                  'Với bài kiểm tra này bạn cần mở cả 2 mắt, đeo kính xanh đỏ chồng lên kính đang đeo.'
                )}
              </strong>
            </>
          )}
        </ListItem>

        {/* Mục 2: che mắt - chỉ cho far/near/contrast */}
        {!isStereopsis && (
          <ListItem sx={{ display: 'list-item' }}>
            <strong>
              {t('exam.alwaysRightFirst', 'Chúng ta luôn luôn kiểm tra mắt phải trước')}
            </strong>
            , {t('exam.please', 'hãy')}{' '}
            <strong>{t('exam.coverLeftEye', 'che mắt trái lại')}</strong>.
          </ListItem>
        )}

        {/* Mục hướng dẫn chọn đáp án - khác nhau theo examType */}
        {!isStereopsis ? (
          <ListItem sx={{ display: 'list-item' }}>
            <strong>{t('exam.supporter', 'Người hỗ trợ')}</strong>{' '}
            {t('exam.chooseDirection', 'chọn hướng')} (
            <strong>{t('exam.directions', 'Lên, Xuống, Trái, Phải')}</strong>){' '}
            {t('exam.correspondingTo', 'tương ứng với hướng bị khuyết của chữ')}{' '}
            <strong>E & C</strong> {t('exam.orFill', 'hoặc điền')}{' '}
            <strong>{t('exam.lettersOrNumbers', 'chữ cái hoặc số')}</strong>{' '}
            {t('exam.intoBlanks', 'vào các ô trống tương ứng')}.
          </ListItem>
        ) : (
          <ListItem sx={{ display: 'list-item' }}>
            <strong>{t('exam.supporter', 'Người hỗ trợ')}</strong>{' '}
            {t(
              'exam.stereopsisDirectionNote',
              'hỏi bạn hình hoặc số nào nổi lên khỏi nền, chọn hình hoặc điền số ở thanh dưới rồi bấm Xác nhận. Đúng sẽ tự sang bước tiếp; sai thì bài dừng.'
            )}
            .
          </ListItem>
        )}

        {/* Không nhắc/gợi ý - áp dụng cho tất cả */}
        <ListItem sx={{ display: 'list-item' }}>
          <strong>{t('exam.noHints', 'Không nhắc/gợi ý')}</strong>;{' '}
          {t('exam.ifCannotGuess', 'nếu không đoán được, bỏ qua và nhấn xác nhận.')}
          <br />
          {t(
            'exam.noHintsAny',
            'Không nhắc/gợi ý bằng bất cứ hình thức nào (ví dụ: "Chữ gì mẹ mới nói nhỉ?", "Chữ gì hình tròn nhỉ?", ...)'
          )}
          .
        </ListItem>

        {/* Không nheo mắt - áp dụng cho tất cả */}
        <ListItem sx={{ display: 'list-item' }}>
          <strong>{t('exam.allowGuess', 'Được phép cố gắng đoán')}</strong>{' '}
          {t('exam.butNoSquint', 'nhưng')}{' '}
          <strong>{t('exam.doNotSquint', 'không được nheo mắt')}</strong>,{' '}
          {t('exam.observer', 'người hỗ trợ cần quan sát trẻ để đảm bảo tính chính xác.')}
        </ListItem>

        {/* Xáo trộn ký tự - chỉ cho far/near/contrast */}
        {!isStereopsis && (
          <ListItem sx={{ display: 'list-item' }}>
            {t(
              'exam.ifCompromised',
              'Nếu dòng thị lực đã bị lộ do trẻ không trung thực (ví dụ: mở che mắt, nheo mắt, rướn người lên phía trước ...) hoặc bạn cảm thấy không tin tưởng về tính chính xác thì'
            )}{' '}
            <strong>{t('exam.recheckLevel', 'hãy kiểm tra lại cấp độ đó')}</strong>.
            <br />
            <strong>
              {t(
                'exam.shuffleIfNeeded',
                'Chỉ nên xáo trộn ký tự và kiểm tra lại khi thực sự thấy kết quả không đáng tin cậy.'
              )}
            </strong>
          </ListItem>
        )}

        {/* Không cherry-pick - áp dụng cho tất cả */}
        <ListItem sx={{ display: 'list-item' }}>
          <strong>
            {t('exam.doNotCherryPick', 'Đừng cố gắng lựa chọn các ký tự bạn cho là tốt')}
          </strong>{' '}
          {t('exam.andRetry', 'và cố gắng thử nhiều lần để đạt kết quả cao.')}
          <br />
          {t('exam.letSoftwarePick', 'Hãy để phần mềm')}{' '}
          <strong>{t('exam.randomPick', 'lựa chọn ngẫu nhiên để đảm bảo khách quan')}</strong>{' '}
          {t(
            'exam.because',
            'vì chúng tôi đã có tính toán và phân tích, sự lựa chọn hay cố gắng can thiệp sẽ'
          )}{' '}
          <strong>
            {t(
              'exam.affectResult',
              'ảnh hưởng tới kết quả phân tích dẫn tới sụt giảm hiệu quả điều trị'
            )}
          </strong>
          .
        </ListItem>

        {/* Ánh sáng - áp dụng cho tất cả */}
        <ListItem sx={{ display: 'list-item' }}>
          <strong>
            {t('exam.noExtraLight', 'Không cần bật đèn phòng quá sáng hay mở cửa để tăng độ sáng')}
          </strong>
          .
          <br />
          {t('exam.screensHaveContrast', 'Màn hình điện tử đã có độ tương phản tốt,')}{' '}
          <strong>
            {t(
              'exam.moreLightLessAccurate',
              'việc tăng thêm độ sáng có thể làm giảm tính chính xác của kết quả'
            )}
          </strong>
          .
        </ListItem>
      </List>

      <Button variant="contained" onClick={handleStartTest} sx={{ mt: 4 }}>
        {t('exam.start', 'Bắt đầu kiểm tra')}
      </Button>
    </Box>
  );
};

export default InstructionStep;
