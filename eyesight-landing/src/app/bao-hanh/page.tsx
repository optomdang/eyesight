import type { Metadata } from 'next';
import { LinkButton } from '@/components/ui/Button';
import { site } from '@/content/site';
import { zaloLink } from '@/lib/zalo';

export const metadata: Metadata = {
  title: 'KHÔNG HIỆU QUẢ KHÔNG MẤT TIỀN',
  description:
    'Chính sách bảo hành kỹ thuật và cam kết hoàn tiền dành cho các gói điều trị D-VisUp.',
};

const technicalWarranty = [
  'Hỗ trợ xử lý lỗi đăng nhập, lỗi hiển thị và lỗi vận hành bài tập phát sinh từ hệ thống D-VisUp.',
  'Hướng dẫn cài đặt, sử dụng và hiệu chuẩn màn hình trong suốt thời hạn gói.',
  'Cập nhật sửa lỗi và duy trì quyền truy cập các tính năng thuộc gói đã mua.',
  'Tiếp nhận hỗ trợ qua Zalo hoặc email trong thời hạn sử dụng.',
];

const guaranteeConditions = [
  {
    title: 'Hoàn thành đủ thời gian 365 ngày',
    description:
      'Người tập cần theo phác đồ liên tục trong toàn bộ thời hạn gói. Thời gian được tính từ ngày tài khoản điều trị được kích hoạt.',
  },
  {
    title: 'Tuân thủ tối thiểu 90%',
    description:
      'Hoàn thành ít nhất 90% tổng khối lượng/buổi tập được Bác sĩ/Chuyên gia giao trên hệ thống trong 365 ngày. Điều kiện tuân thủ không khó khăn / ngặt nghèo đến mức yêu cầu cao 95% hay 100%, nhưng bạn cần đạt mức tuân thủ 90% để đảm bảo hiệu quả. Ai cũng có việc, có lúc ốm đau, đi du lịch, đi cưới hỏi và vô vàn lý do khác nên hãy cố gắng hoàn thành đủ yêu cầu những lúc có thể để lúc cần có thể nghỉ nhé!',
  },
  {
    title: 'Có Bác sĩ/Chuyên gia theo dõi và xác nhận',
    description:
      'Phác đồ phải được Bác sĩ/Chuyên gia phụ trách hướng dẫn, theo dõi và xác nhận tình trạng tuân thủ cũng như kết quả điều trị.',
  },
  {
    title: 'Tái khám tối thiểu 6 tháng/lần',
    description:
      'Có kết quả đánh giá ban đầu, tái khám khoảng tháng thứ 6 và đánh giá khi kết thúc gói. Khoảng cách giữa các lần đánh giá không vượt quá 6 tháng.',
  },
  {
    title: 'Không ghi nhận cải thiện',
    description:
      'D-VisUp sẽ hoàn tiền 100% nếu không có bất kỳ bài kiểm tra nào (nhìn xa, nhìn gần, tương phản, thị giác lập thể) cải thiện từ 2 dòng/mức thị lực trở lên. Nghĩa là nếu đồng thời cả 4 tiêu chí không cải thiện mức nào hay chỉ cải thiện 1 dòng/mức => Hoàn tiền. Ví dụ: Ban đầu (20/100) → Kết thúc (20/80): Không hiệu quả → Hoàn tiền; Ban đầu (20/100) → Kết thúc (20/63): Hiệu quả. Bác sĩ/Chuyên gia xác nhận dựa trên kết quả trước và sau điều trị, thống nhất giữa hệ thống và khám thực tế.',
  },
];

const exclusions = [
  'Tỷ lệ tuân thủ thấp hơn 90%.',
  'Không có hồ sơ đánh giá ban đầu, thiếu lần tái khám định kỳ hoặc thiếu xác nhận của Bác sĩ/Chuyên gia.',
  'Tự ý ngừng, đổi phác đồ, thay đổi kính hoặc thực hiện can thiệp khác không theo hướng dẫn chuyên môn.',
  'Cho mượn, chia sẻ tài khoản hoặc có dấu hiệu làm sai lệch dữ liệu tập luyện và kết quả đánh giá.',
  'Lỗi phát sinh từ thiết bị, kết nối mạng, phần mềm bên thứ ba hoặc sử dụng không đúng hướng dẫn mà không thông báo để được hỗ trợ.',
  'Các khoản khám, tái khám, kính, thiết bị, dịch vụ của Bác sĩ/phòng khám và chi phí bên thứ ba không thuộc phí gói phần mềm D-VisUp.',
];

const claimSteps = [
  'Liên hệ D-VisUp qua Zalo hoặc email trong vòng 30 ngày kể từ ngày kết thúc gói.',
  'Cung cấp mã tài khoản, thông tin gói, hồ sơ đánh giá ban đầu, các lần tái khám và xác nhận của Bác sĩ/Chuyên gia.',
  'D-VisUp đối chiếu dữ liệu tuân thủ trên hệ thống và hồ sơ chuyên môn trong tối đa 15 ngày làm việc.',
  'Nếu đủ điều kiện, D-VisUp hoàn 100% số tiền thực tế đã thanh toán cho gói phần mềm Ultra hoặc Ultimate. Khoản hoàn không bao gồm các chi phí bên thứ ba.',
];

export default function WarrantyPage() {
  return (
    <div className="bg-white">
      <section className="bg-gradient-to-br from-brand-purple via-brand-purple-light to-brand-teal-dark py-16 text-white md:py-24">
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-accent">
            Cam kết D-VisUp
          </p>
          <h1 className="mt-4 whitespace-nowrap text-xl font-bold tracking-tight sm:text-2xl md:text-4xl lg:text-5xl">
            KHÔNG HIỆU QUẢ KHÔNG MẤT TIỀN
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-white/80 md:text-lg">
            Bảo hành kỹ thuật cho mọi gói và cam kết hoàn tiền có điều kiện dành cho
            Amblyopia Ultra và Amblyopia Ultimate.
          </p>
          <p className="mt-4 text-sm text-white/60">Cập nhật lần cuối: 11/07/2026</p>
        </div>
      </section>

      <main className="mx-auto max-w-4xl space-y-12 px-4 py-12 sm:px-6 md:py-16 lg:px-8">
        <section className="rounded-2xl border border-brand-teal/20 bg-brand-teal/5 p-6 md:p-8">
          <h2 className="text-2xl font-bold text-gray-900">Quyền lợi theo từng gói</h2>
          <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white">
            <div className="grid grid-cols-[1.5fr_1fr_1fr] bg-gray-50 text-sm font-semibold text-gray-900">
              <div className="p-3 sm:p-4">Quyền lợi</div>
              <div className="border-l border-gray-200 p-3 text-center sm:p-4">Standard / Pro</div>
              <div className="border-l border-gray-200 p-3 text-center sm:p-4">Ultra / Ultimate</div>
            </div>
            <div className="grid grid-cols-[1.5fr_1fr_1fr] border-t border-gray-200 text-sm text-gray-700">
              <div className="p-3 sm:p-4">Bảo hành kỹ thuật trong thời hạn gói</div>
              <div className="border-l border-gray-200 p-3 text-center font-semibold text-brand-teal sm:p-4">
                Có
              </div>
              <div className="border-l border-gray-200 p-3 text-center font-semibold text-brand-teal sm:p-4">
                Có
              </div>
            </div>
            <div className="grid grid-cols-[1.5fr_1fr_1fr] border-t border-gray-200 text-sm text-gray-700">
              <div className="p-3 sm:p-4">Cam kết hoàn tiền nếu không cải thiện</div>
              <div className="border-l border-gray-200 p-3 text-center text-gray-400 sm:p-4">
                Không
              </div>
              <div className="border-l border-gray-200 p-3 text-center font-semibold text-amber-600 sm:p-4">
                Có điều kiện
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900">1. Bảo hành kỹ thuật</h2>
          <p className="mt-3 leading-7 text-gray-600">
            Áp dụng cho tất cả các gói trong suốt thời hạn sử dụng. Bảo hành kỹ thuật
            đảm bảo khách hàng có thể truy cập và sử dụng đúng các chức năng thuộc gói đã mua.
          </p>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {technicalWarranty.map((item) => (
              <li
                key={item}
                className="flex gap-3 rounded-xl border border-gray-200 bg-white p-4 text-sm leading-6 text-gray-700"
              >
                <span className="mt-0.5 font-bold text-brand-teal">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-6 md:p-8">
            <p className="text-sm font-semibold uppercase tracking-wider text-amber-700">
              Chỉ áp dụng cho Ultra và Ultimate
            </p>
            <h2 className="mt-2 text-2xl font-bold text-gray-900">
              2. Cam kết hoàn tiền nếu không cải thiện
            </h2>
            <p className="mt-3 leading-7 text-gray-700">
              D-VisUp hoàn 100% số tiền thực tế đã thanh toán cho gói phần mềm nếu người
              tập đáp ứng đầy đủ tất cả điều kiện dưới đây nhưng không ghi nhận cải thiện
              sau khi hoàn thành liệu trình.
            </p>
            <div className="mt-4 rounded-xl border border-amber-200 bg-white/80 p-4 text-sm leading-7 text-gray-800 md:text-base">
              <p className="font-semibold text-gray-900">
                KHÔNG HIỆU QUẢ KHÔNG MẤT TIỀN — áp dụng có điều kiện cho gói Ultra và Ultimate.
              </p>
              <p className="mt-2">
                D-VisUp sẽ hoàn tiền 100% nếu không có bất kỳ bài kiểm tra nào (nhìn xa, nhìn
                gần, tương phản, thị giác lập thể) cải thiện từ 2 dòng/mức thị lực trở lên.
              </p>
              <p className="mt-2">
                Nghĩa là nếu đồng thời cả 4 tiêu chí không cải thiện mức nào hay chỉ cải thiện 1
                dòng/mức =&gt; Hoàn tiền.
              </p>
              <ul className="mt-2 list-inside list-disc space-y-1 text-gray-700">
                <li>Ban đầu (20/100) → Kết thúc (20/80): Không hiệu quả → Hoàn tiền</li>
                <li>Ban đầu (20/100) → Kết thúc (20/63): Hiệu quả</li>
              </ul>
            </div>
            <div className="mt-5 space-y-4 border-t border-amber-200/80 pt-5 text-sm leading-7 text-gray-700 md:text-base">
              <p>
                Bạn có nhớ những lần bạn thử điều trị cho con 3–4 khoá tập nhưng không hiệu
                quả và vẫn mất hàng chục triệu? Chúng tôi và các Bác sĩ, Chuyên gia xây dựng nên các
                chương trình tập rất tin tưởng về hiệu quả vì chúng tôi đã điều trị được rất
                nhiều case khó mà các phương pháp khác đều không hiệu quả hay các bệnh nhân
                đã điều trị ở nhiều viện và gần như tuyệt vọng. Vậy nên chúng tôi không ngại
                việc hoàn tiền 100% nếu thực sự không có hiệu quả.
              </p>
              <p>
                Tuy nhiên, chúng tôi cũng cần bạn thấu hiểu rằng để duy trì vận hành tốt
                chúng tôi cần chi phí (nhân sự, hosting lưu trữ, tên miền, bảo mật, Chuyên
                gia, kỹ sư …) nên cần có các điều kiện tuân thủ. Nếu bạn và trẻ không thể
                tuân thủ điều trị và mong muốn chúng tôi hoàn tiền do không hiệu quả thì sau
                3 tháng chúng tôi sẽ phá sản.
              </p>
              <p>
                Các điều kiện tuân thủ không sinh ra với mục đích loại trừ bảo hành của các
                bạn mà để các bạn tuân thủ điều trị, để con các bạn cải thiện thị lực.
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {guaranteeConditions.map((condition, index) => (
              <div
                key={condition.title}
                className="flex gap-4 rounded-xl border border-gray-200 p-5"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-teal text-sm font-bold text-white">
                  {index + 1}
                </span>
                <div>
                  <h3 className="font-semibold text-gray-900">{condition.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-gray-600">
                    {condition.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900">3. Trường hợp không áp dụng</h2>
          <ul className="mt-5 space-y-3">
            {exclusions.map((item) => (
              <li key={item} className="flex gap-3 text-sm leading-6 text-gray-700">
                <span className="mt-0.5 font-bold text-red-500">×</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900">4. Quy trình yêu cầu hoàn tiền</h2>
          <ol className="mt-5 space-y-4">
            {claimSteps.map((item, index) => (
              <li key={item} className="flex gap-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-purple text-xs font-bold text-white">
                  {index + 1}
                </span>
                <p className="pt-0.5 text-sm leading-6 text-gray-700">{item}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="rounded-2xl border border-brand-purple/20 bg-brand-purple/5 p-6 md:p-8">
          <h2 className="text-xl font-bold text-gray-900">Hồ sơ cam kết và ký điện tử</h2>
          <p className="mt-3 text-sm leading-6 text-gray-600">
            Người bệnh hoặc người đại diện và Bác sĩ/Chuyên gia xác nhận thỏa thuận ban đầu,
            từng biên bản tái khám và biên bản kết thúc điều trị trên ứng dụng D-VisUp. Hệ
            thống lưu nội dung đã ký, thời điểm ký và nhật ký xác thực để bảo đảm khả năng
            đối chiếu. Chữ ký vẽ trên hệ thống là chữ ký điện tử thông thường, không phải chữ
            ký số hoặc chữ ký điện tử chuyên dùng bảo đảm an toàn.
          </p>
          <LinkButton
            href={`${site.appUrl}/portal/warranty`}
            variant="secondary"
            className="mt-5"
          >
            Mở hồ sơ cam kết của tôi
          </LinkButton>
        </section>

        <section className="rounded-2xl bg-gray-50 p-6 md:p-8">
          <h2 className="text-xl font-bold text-gray-900">Lưu ý chuyên môn</h2>
          <p className="mt-3 text-sm leading-6 text-gray-600">
            D-VisUp là công cụ hỗ trợ thực hiện phác đồ, không thay thế việc khám, chẩn
            đoán hoặc chỉ định của Bác sĩ. Hiệu quả điều trị phụ thuộc vào tuổi, tình
            trạng thị giác, bệnh lý đi kèm, kính đang sử dụng và mức độ tuân thủ. Việc
            xác định có hay không có cải thiện phải do Bác sĩ/Chuyên gia phụ trách xác nhận
            trên cơ sở hồ sơ đánh giá trước và sau điều trị.
          </p>
        </section>

        <section className="rounded-2xl bg-brand-purple p-7 text-center text-white md:p-10">
          <h2 className="text-2xl font-bold">Cần hỗ trợ về chính sách?</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/75">
            Liên hệ D-VisUp để được giải thích điều kiện áp dụng trước khi đăng ký gói
            Ultra hoặc Ultimate.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <LinkButton
              href={zaloLink()}
              variant="zalo"
              target="_blank"
              rel="noopener noreferrer"
            >
              Liên hệ Zalo
            </LinkButton>
            <LinkButton href={`mailto:${site.email}`} variant="outline">
              Gửi email
            </LinkButton>
          </div>
        </section>
      </main>
    </div>
  );
}
