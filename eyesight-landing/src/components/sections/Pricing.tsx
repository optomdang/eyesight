'use client';

import { pricingPlans } from '@/content/pricing';
import { Section, SectionHeader } from '@/components/ui/Section';
import { Card, Badge } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useRegistration } from '@/contexts/RegistrationContext';
import { formatVnd, getDailyPrice } from '@/lib/format';

function getHighlightVariant(plan: (typeof pricingPlans)[number]): false | 'popular' | 'recommended' {
  if (plan.popular) return 'popular';
  if (plan.recommended) return 'recommended';
  return false;
}

export function Pricing() {
  const { openRegistration } = useRegistration();

  return (
    <Section
        id="pricing"
        className="overflow-visible bg-gray-50"
        containerClassName="max-w-[1240px] px-4 sm:px-5"
      >
        <SectionHeader
          title="Gói điều trị Amblyopia"
          subtitle="4 mức độ — từ cơ bản đến toàn diện."
        />
        <div className="grid gap-3 overflow-visible pt-5 md:grid-cols-2 lg:grid-cols-4 lg:items-stretch">
          {pricingPlans.map((plan) => {
            const dailyPrice = getDailyPrice(plan.pricePerYear, plan.durationDays);
            const highlight = getHighlightVariant(plan);
            const featured = highlight !== false;

            return (
              <div key={plan.code} className="flex h-full flex-col justify-end">
                <Card highlight={highlight} className="relative flex flex-col px-4 py-5">
                  {plan.popular && (
                    <div className="pointer-events-none absolute left-1/2 top-0 z-20 -translate-x-1/2 -translate-y-1/2">
                      <Badge>Phổ biến nhất</Badge>
                    </div>
                  )}
                  {plan.recommended && (
                    <div className="pointer-events-none absolute left-1/2 top-0 z-20 -translate-x-1/2 -translate-y-1/2">
                      <Badge variant="recommended">Gói đề xuất</Badge>
                    </div>
                  )}
                  <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                  <div className="mt-2">
                    <p className="text-2xl font-bold text-brand-teal">
                      {formatVnd(dailyPrice)}
                      <span className="text-base font-semibold">/ngày</span>
                    </p>
                    <p className="mt-0.5 text-[10px] leading-tight text-gray-400">
                      {formatVnd(plan.pricePerYear)}/năm
                    </p>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    {plan.durationDays} ngày · {plan.exerciseCount} chế độ tập
                  </p>
                  <ul className="mt-4 space-y-1.5 text-sm leading-snug text-gray-600">
                    {plan.highlights.map((h) => (
                      <li key={h.text} className="flex items-start gap-2">
                        <span className="shrink-0 text-brand-teal">✓</span>
                        <span className={h.bold ? 'font-bold text-gray-900' : undefined}>{h.text}</span>
                      </li>
                    ))}
                    {plan.specialNote && (
                      <li className="flex items-start gap-2 pt-1 text-sm font-bold text-amber-600">
                        <span className="shrink-0">✓</span>
                        {plan.specialNote}
                      </li>
                    )}
                  </ul>
                  <Button
                    variant={featured ? 'zalo' : 'outline'}
                    size="sm"
                    className="mt-5 w-full shrink-0"
                    onClick={() => openRegistration(plan.code)}
                  >
                    Đăng ký
                  </Button>
                </Card>
              </div>
            );
          })}
        </div>
      </Section>
  );
}
