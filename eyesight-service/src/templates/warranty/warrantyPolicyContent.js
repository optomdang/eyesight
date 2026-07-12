const { WARRANTY_POLICY_VERSION } = require('../../config/warranty');

const E_SIGN_DISCLAIMER =
  'Chữ ký vẽ trên màn hình là bản ghi điện tử xác nhận ý chí của người ký. Đây không tự động được coi là chữ ký viết tay hay chữ ký số theo quy định pháp luật về giao dịch điện tử.';

const GUARDIAN_CONSENT_TEXT =
  'Tôi xác nhận danh tính của mình, đã đọc và hiểu nội dung cam kết bảo hành, tự nguyện ký điện tử và hiểu rằng hệ thống ghi nhận thời gian, thiết bị và dữ liệu kiểm toán liên quan.';

const DOCTOR_CONSENT_TEXT =
  'Tôi xác nhận danh tính, đã rà soát dữ liệu lâm sàng trong biên bản, tự nguyện ký điện tử và hiểu rằng hệ thống ghi nhận thời gian, thiết bị và dữ liệu kiểm toán liên quan.';

const POLICY_VERSION = '1.0';

const ARTICLES = [
  {
    number: 1,
    title: 'Phạm vi áp dụng',
    paragraphs: [
      'Thỏa thuận cam kết bảo hành và hoàn tiền ("Thỏa thuận") áp dụng cho người sử dụng gói phần mềm điều trị thị giác D-VisUp thuộc hệ thống quản lý phòng khám/chuyên gia được ủy quyền.',
      'Thỏa thuận được lập điện tử, có giá trị pháp lý tương đương văn bản giấy khi được các bên ký xác nhận theo quy trình của hệ thống.',
    ],
  },
  {
    number: 2,
    title: 'Định nghĩa',
    paragraphs: [
      '"D-VisUp" / "Bên cung cấp": đơn vị vận hành nền tảng phần mềm theo thông tin pháp lý trên tài liệu.',
      '"Người giám hộ / Người đại diện": cha, mẹ hoặc người hợp pháp ký thay cho người bệnh vị thành niên hoặc không tự ký được.',
      '"Bác sĩ/Chuyên gia phụ trách": bác sĩ hoặc chuyên gia được gán theo dõi và xác nhận kết quả trên hệ thống.',
      '"Gói điều trị": gói phần mềm Amblyopia được gán cho tài khoản điều trị.',
      '"Tuân thủ điều trị": tỷ lệ hoàn thành buổi tập được giao trên hệ thống trong thời hạn gói.',
    ],
  },
  {
    number: 3,
    title: 'Quyền lợi bảo hành kỹ thuật',
    paragraphs: [
      'Áp dụng cho tất cả các gói trong suốt thời hạn sử dụng.',
      'Bảo hành kỹ thuật bao gồm hỗ trợ lỗi đăng nhập, hiển thị, vận hành bài tập; hướng dẫn cài đặt, hiệu chuẩn màn hình; cập nhật sửa lỗi và duy trì quyền truy cập tính năng thuộc gói.',
      'Bảo hành kỹ thuật không bao gồm lỗi phát sinh từ thiết bị, mạng, phần mềm bên thứ ba hoặc sử dụng trái hướng dẫn mà không thông báo để được hỗ trợ.',
    ],
  },
  {
    number: 4,
    title: 'Cam kết hoàn tiền',
    paragraphs: [
      'Chỉ áp dụng cho gói Amblyopia Ultra và Amblyopia Ultimate có gắn cờ cam kết hoàn tiền trên hệ thống.',
      'D-VisUp hoàn 100% số tiền thực tế đã thanh toán cho gói phần mềm nếu người tập đáp ứng đầy đủ điều kiện tại Điều 5 nhưng không ghi nhận cải thiện có ý nghĩa sau khi hoàn thành liệu trình.',
      'Khoản hoàn không bao gồm chi phí khám, tái khám, kính, thiết bị, dịch vụ phòng khám hoặc chi phí bên thứ ba khác.',
    ],
  },
  {
    number: 5,
    title: 'Điều kiện áp dụng cam kết hoàn tiền',
    paragraphs: [
      'Hoàn thành đủ thời gian 365 ngày kể từ ngày kích hoạt tài khoản điều trị.',
      'Tuân thủ tối thiểu 90% tổng số buổi tập được Bác sĩ/Chuyên gia giao trên hệ thống.',
      'Có Bác sĩ/Chuyên gia phụ trách theo dõi, hướng dẫn và xác nhận tình trạng tuân thủ cũng như kết quả.',
      'Có đánh giá ban đầu, tái khám định kỳ tối thiểu 6 tháng/lần và đánh giá khi kết thúc gói.',
      'Bác sĩ/Chuyên gia xác nhận không có cải thiện có ý nghĩa ở các chỉ số thị giác được theo dõi.',
    ],
  },
  {
    number: 6,
    title: 'Trường hợp loại trừ',
    paragraphs: [
      'Tỷ lệ tuân thủ thấp hơn 90%.',
      'Không có hồ sơ đánh giá ban đầu, thiếu lần tái khám định kỳ hoặc thiếu xác nhận chuyên môn.',
      'Tự ý ngừng, đổi phác đồ, thay đổi kính hoặc can thiệp khác không theo hướng dẫn chuyên môn.',
      'Cho mượn, chia sẻ tài khoản hoặc có dấu hiệu làm sai lệch dữ liệu tập luyện và kết quả đánh giá.',
      'Lỗi phát sinh từ thiết bị, kết nối mạng, phần mềm bên thứ ba hoặc sử dụng không đúng hướng dẫn.',
    ],
  },
  {
    number: 7,
    title: 'Quy trình yêu cầu hoàn tiền',
    paragraphs: [
      'Liên hệ D-VisUp qua Zalo hoặc email trong vòng 30 ngày kể từ ngày kết thúc gói.',
      'Cung cấp mã tài khoản, thông tin gói, hồ sơ đánh giá ban đầu, các lần tái khám và xác nhận của Bác sĩ/Chuyên gia.',
      'D-VisUp đối chiếu dữ liệu tuân thủ trên hệ thống và hồ sơ chuyên môn trong tối đa 15 ngày làm việc.',
      'Nếu đủ điều kiện, D-VisUp hoàn 100% phí gói phần mềm đã thanh toán theo phương thức đã thống nhất.',
    ],
  },
  {
    number: 8,
    title: 'Quy trình ký điện tử',
    paragraphs: [
      'Thỏa thuận được thực hiện qua các giai đoạn: ký ban đầu, tái khám (nếu có), kết thúc gói.',
      'Mỗi giai đoạn yêu cầu chữ ký Người giám hộ/Người đại diện và xác nhận của Bác sĩ/Chuyên gia phụ trách.',
      'Chữ ký điện tử được ghi nhận kèm thời gian, mã băm và thông tin người ký; hệ thống không lưu trữ ảnh chữ ký gốc.',
      'Tài liệu hoàn tất được lưu dưới dạng snapshot và mã băm để phục vụ đối chiếu.',
    ],
  },
  {
    number: 9,
    title: 'Tái khám và đánh giá định kỳ',
    paragraphs: [
      'Khoảng cách giữa các lần đánh giá chuyên môn không vượt quá 6 tháng, trừ trường hợp có lý do y khoa được ghi nhận.',
      'Tái khám sớm hơn 6 tháng so với lần đánh giá hoàn tất trước đó phải có lý do ghi rõ trong hồ sơ.',
      'Dữ liệu lâm sàng tại mỗi lần tái khám được nhập và xác nhận trên hệ thống trước khi ký.',
    ],
  },
  {
    number: 10,
    title: 'Bảo mật và lưu trữ',
    paragraphs: [
      'D-VisUp bảo mật dữ liệu cá nhân và dữ liệu y tế theo quy định pháp luật Việt Nam hiện hành.',
      'Người sử dụng có quyền yêu cầu sao chép tài liệu cam kết đã ký thông qua chức năng tải xuống trên hệ thống.',
      'D-VisUp lưu trữ nhật ký thao tác (audit log) cho các thao tác tạo, ký và tải tài liệu cam kết.',
    ],
  },
  {
    number: 11,
    title: 'Giải quyết tranh chấp',
    paragraphs: [
      'Mọi tranh chấp phát sinh được ưu tiên giải quyết thông qua thương lượng, hòa giải.',
      'Nếu không thống nhất, tranh chấp sẽ được giải quyết tại Tòa án có thẩm quyền theo pháp luật Việt Nam.',
      'Thỏa thuận có hiệu lực kể từ thời điểm hoàn tất ký giai đoạn ban đầu và duy trì trong suốt thời hạn gói điều trị.',
    ],
  },
];

const ANNEXES = [
  {
    id: 'A',
    title: 'Phụ lục A — Bảng quyền lợi theo gói',
    rows: [
      { benefit: 'Bảo hành kỹ thuật trong thời hạn gói', standardPro: 'Có', ultraUltimate: 'Có' },
      { benefit: 'Cam kết hoàn tiền nếu không cải thiện', standardPro: 'Không', ultraUltimate: 'Có điều kiện' },
    ],
  },
  {
    id: 'B',
    title: 'Phụ lục B — Mẫu thông tin lâm sàng ghi nhận',
    fields: [
      'Họ tên người bệnh, mã bệnh nhân',
      'Tên gói điều trị và thời hạn',
      'Thị lực xa/gần OD/OS tại thời điểm đánh giá',
      'Tỷ lệ tuân thủ buổi tập trên hệ thống',
      'Nhận xét và xác nhận của Bác sĩ/Chuyên gia',
      'Ngày đánh giá',
    ],
  },
  {
    id: 'C',
    title: 'Phụ lục C — Liên hệ hỗ trợ',
    note: 'Thông tin liên hệ hỗ trợ được in trên từng tài liệu PDF theo cấu hình tổ chức tại thời điểm phát hành.',
  },
];

/** Derived sections for PDF rendering */
const WARRANTY_POLICY_SECTIONS = ARTICLES.map((article) => ({
  title: `Điều ${article.number}. ${article.title}`,
  items: article.paragraphs,
}));

const getPhaseTypeLabel = (phaseType) => {
  switch (phaseType) {
    case 'initial':
      return 'Đánh giá ban đầu';
    case 'reexam':
      return 'Tái khám';
    case 'final':
      return 'Kết thúc gói';
    default:
      return phaseType;
  }
};

const getPolicyMeta = () => ({
  version: POLICY_VERSION,
  policyVersion: WARRANTY_POLICY_VERSION,
  title: 'THỎA THUẬN CAM KẾT BẢO HÀNH VÀ HOÀN TIỀN D-VISUP',
  articleCount: ARTICLES.length,
  annexCount: ANNEXES.length,
  sections: WARRANTY_POLICY_SECTIONS,
  articles: ARTICLES,
  annexes: ANNEXES,
  eSignDisclaimer: E_SIGN_DISCLAIMER,
  guardianConsentText: GUARDIAN_CONSENT_TEXT,
  doctorConsentText: DOCTOR_CONSENT_TEXT,
});

module.exports = {
  POLICY_VERSION,
  ARTICLES,
  ANNEXES,
  WARRANTY_POLICY_VERSION,
  E_SIGN_DISCLAIMER,
  GUARDIAN_CONSENT_TEXT,
  DOCTOR_CONSENT_TEXT,
  WARRANTY_POLICY_SECTIONS,
  getPhaseTypeLabel,
  getPolicyMeta,
};
