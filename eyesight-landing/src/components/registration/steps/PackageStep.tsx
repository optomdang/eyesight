'use client';

import { pricingPlans } from '@/content/pricing';
import { hasRefundGuarantee } from '@/lib/recommendPackage';
import { formatVnd, getDailyPrice } from '@/lib/format';
import type { StepErrors } from '@/lib/validateRegistration';

interface PackageStepProps {
  selectedPlanCode: string;
  recommendedPlanCodes: string[];
  visiblePlanCodes: string[];
  recommendationReason: string;
  errors: StepErrors;
  onChange: (planCode: string) => void;
}

export function PackageStep({
  selectedPlanCode,
  recommendedPlanCodes,
  visiblePlanCodes,
  recommendationReason,
  errors,
  onChange,
}: PackageStepProps) {
  const visiblePlans = pricingPlans.filter((p) => visiblePlanCodes.includes(p.code));

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-brand-teal/30 bg-brand-teal/5 px-4 py-3">
        <p className="text-sm font-semibold text-brand-teal">Gói khuyến nghị</p>
        <p className="mt-1 text-sm text-gray-700">{recommendationReason}</p>
        <a
          href="/bao-hanh"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block text-sm font-semibold text-brand-teal underline-offset-4 hover:underline"
        >
          Xem chính sách bảo hành và hoàn tiền
        </a>
      </div>

      {errors.selectedPlanCode && (
        <p className="text-sm text-red-600">{errors.selectedPlanCode}</p>
      )}

      <div
        className={`grid gap-3 ${
          visiblePlans.length === 1 ? 'grid-cols-1' : 'sm:grid-cols-2'
        }`}
      >
        {visiblePlans.map((plan) => {
          const isSelected = selectedPlanCode === plan.code;
          const isRecommended = recommendedPlanCodes.includes(plan.code);
          const showRefund = hasRefundGuarantee(plan.code);
          const dailyPrice = getDailyPrice(plan.pricePerYear, plan.durationDays);

          const hasBadges = isRecommended || showRefund;

          return (
            <button
              key={plan.code}
              type="button"
              onClick={() => onChange(plan.code)}
              className={`relative rounded-xl border-2 p-4 text-left transition ${
                isSelected
                  ? 'border-brand-teal bg-brand-teal/5 ring-2 ring-brand-teal/20'
                  : 'border-gray-200 hover:border-brand-teal/50'
              }`}
            >
              {hasBadges && (
                <div className="absolute right-3 top-3 flex flex-col items-end gap-1">
                  {isRecommended && (
                    <span className="whitespace-nowrap rounded-full bg-brand-teal px-2 py-0.5 text-[10px] font-semibold leading-none text-white">
                      Khuyến nghị
                    </span>
                  )}
                  {showRefund && (
                    <span className="whitespace-nowrap rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-semibold leading-none text-white">
                      Hoàn tiền
                    </span>
                  )}
                </div>
              )}

              <h4
                className={`font-semibold leading-snug text-gray-900 ${
                  hasBadges ? 'pr-[5.5rem]' : ''
                }`}
              >
                {plan.name}
              </h4>
              <p className="mt-1 text-lg font-bold text-brand-teal">
                {formatVnd(dailyPrice)}
                <span className="text-sm font-medium">/ngày</span>
              </p>
              <p className="text-xs text-gray-500">{formatVnd(plan.pricePerYear)}/năm</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
