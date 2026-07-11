import { LinkButton } from '@/components/ui/Button';
import { zaloLink } from '@/lib/zalo';

export function FinalCta() {
  return (
    <section className="bg-gradient-to-r from-brand-teal to-brand-teal-dark py-16 text-white md:py-20">
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
        <h2 className="text-3xl font-bold md:text-4xl">Sẵn sàng bắt đầu?</h2>
        <p className="mt-4 text-lg text-white/90">
          Liên hệ Zalo để được tư vấn miễn phí — dành cho phòng khám hoặc bệnh nhân tập tại nhà.
        </p>
        <LinkButton
          href={zaloLink()}
          variant="zalo"
          size="lg"
          className="mt-8"
          target="_blank"
          rel="noopener noreferrer"
        >
          Chat Zalo ngay
        </LinkButton>
      </div>
    </section>
  );
}
