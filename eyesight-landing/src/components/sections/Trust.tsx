import { trustStats } from '@/content/site';
import { Section } from '@/components/ui/Section';

export function Trust() {
  return (
    <Section dark>
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {trustStats.map((stat) => (
          <div key={stat.label} className="text-center">
            <p className="text-4xl font-bold text-brand-accent">{stat.value}</p>
            <p className="mt-2 text-sm text-gray-300">{stat.label}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}
