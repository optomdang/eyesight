'use client';

import Image from 'next/image';
import { pricingPlans } from '@/content/pricing';
import { formatVnd } from '@/lib/format';
import { buildTransferNote, buildVietQrUrl } from '@/lib/vietqr';
import { zaloLink } from '@/lib/zalo';
import { LinkButton } from '@/components/ui/Button';
import type { PersonalInfo } from '@/types/registration';

interface PaymentStepProps {
  personal: PersonalInfo;
  selectedPlanCode: string;
  submitStatus: 'idle' | 'sending' | 'sent' | 'error';
  submitError?: string;
}

export function PaymentStep({
  personal,
  selectedPlanCode,
  submitStatus,
  submitError,
}: PaymentStepProps) {
  const plan = pricingPlans.find((p) => p.code === selectedPlanCode);
  const transferNote = buildTransferNote(personal.fullName, personal.phone);
  const dynamicQrUrl = plan ? buildVietQrUrl(plan.pricePerYear, transferNote) : null;
  const qrSrc = dynamicQrUrl ?? '/images/payment-qr.png';

  const copyTransferNote = async () => {
    try {
      await navigator.clipboard.writeText(transferNote);
    } catch {
      // clipboard may be unavailable
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-gray-600">Gói đã chọn</p>
          <p className="text-lg font-bold text-gray-900">{plan?.name}</p>
          <p className="mt-1 text-2xl font-bold text-brand-teal">
            {plan ? formatVnd(plan.pricePerYear) : '—'}{' '}
            <span className="text-base font-medium">VNĐ/năm</span>
          </p>
        </div>
        <div className="rounded-xl border-2 border-amber-400 bg-amber-50 px-5 py-4 text-center sm:min-w-[280px] sm:max-w-[360px] sm:flex-[1.1]">
          <p className="text-xs font-bold uppercase tracking-wide text-amber-800">Lưu ý quan trọng</p>
          <p className="mt-1.5 text-sm font-semibold leading-6 text-amber-950 sm:text-base">
            Bác sĩ phụ trách thanh toán, bệnh nhân không thanh toán.
          </p>
        </div>
      </div>

      <div className="flex flex-col items-center gap-3">
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <Image
            src={qrSrc}
            alt="Mã QR thanh toán"
            width={280}
            height={dynamicQrUrl ? 280 : 360}
            className="h-auto w-full max-w-[280px]"
            unoptimized
          />
        </div>
        <p className="text-center text-sm text-gray-600">Quét mã QR để chuyển khoản</p>
        {!dynamicQrUrl && (
          <p className="text-center text-xs text-gray-500">
            Vui lòng nhập đúng số tiền gói và nội dung chuyển khoản bên dưới.
          </p>
        )}
      </div>

      <div className="rounded-lg border border-gray-200 px-4 py-3">
        <p className="text-sm text-gray-600">Nội dung chuyển khoản</p>
        <div className="mt-1 flex items-center justify-between gap-2">
          <p className="font-mono text-sm font-semibold text-gray-900">{transferNote}</p>
          <button
            type="button"
            onClick={copyTransferNote}
            className="shrink-0 rounded-lg border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            Sao chép
          </button>
        </div>
      </div>

      {submitStatus === 'sending' && (
        <p className="text-sm text-gray-500">Đang lưu thông tin đăng ký...</p>
      )}
      {submitStatus === 'sent' && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
          Đã ghi nhận thông tin đăng ký.
        </p>
      )}
      {submitStatus === 'error' && submitError && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {submitError} — vui lòng chụp màn hình và gửi qua Zalo.
        </p>
      )}

      <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
        <p className="text-sm text-blue-900">
          Sau khi thanh toán thành công, gửi <strong>ảnh chuyển khoản</strong> qua Zalo để kích hoạt
          tài khoản nhanh.
        </p>
        <LinkButton
          href={zaloLink()}
          variant="zalo"
          size="sm"
          className="mt-3 w-full sm:w-auto"
          target="_blank"
          rel="noopener noreferrer"
        >
          Gửi ảnh thanh toán qua Zalo
        </LinkButton>
      </div>
    </div>
  );
}
