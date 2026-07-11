import { type Audience } from '@/content/site';
import { featuresByAudience } from '@/content/features';
import { Section, SectionHeader } from '@/components/ui/Section';
import { Card } from '@/components/ui/Card';

interface FeaturesProps {
  audience: Audience;
}

export function Features({ audience }: FeaturesProps) {
  const features = featuresByAudience[audience];
  const subtitle =
    audience === 'clinic'
      ? 'Công cụ toàn diện cho phòng khám nhãn khoa'
      : 'Trải nghiệm tập luyện thuận tiện tại nhà';

  return (
    <Section id="features">
      <SectionHeader title="Tính năng nổi bật" subtitle={subtitle} />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <Card key={f.title}>
            <span className="text-3xl" role="img" aria-hidden>
              {f.icon}
            </span>
            <h3 className="mt-4 text-lg font-semibold text-gray-900">{f.title}</h3>
            <p className="mt-2 text-sm text-gray-600">{f.description}</p>
          </Card>
        ))}
      </div>
    </Section>
  );
}
