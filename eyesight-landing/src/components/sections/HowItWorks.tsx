import { type Audience } from '@/content/site';
import { howItWorksByAudience } from '@/content/features';
import { Section, SectionHeader } from '@/components/ui/Section';

interface HowItWorksProps {
  audience: Audience;
}

export function HowItWorks({ audience }: HowItWorksProps) {
  const steps = howItWorksByAudience[audience];

  return (
    <Section id="how-it-works" className="bg-gray-50">
      <SectionHeader title="Cách hoạt động" subtitle="3 bước đơn giản để bắt đầu" />
      <div className="grid gap-8 md:grid-cols-3">
        {steps.map((step) => (
          <div key={step.step} className="relative text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-teal text-xl font-bold text-white">
              {step.step}
            </div>
            <h3 className="mt-4 text-lg font-semibold text-gray-900">{step.title}</h3>
            <p className="mt-2 text-sm text-gray-600">{step.description}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}
