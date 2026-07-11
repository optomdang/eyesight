import { exercises } from '@/content/faq';
import { Section, SectionHeader } from '@/components/ui/Section';
import { Card } from '@/components/ui/Card';

export function ExerciseShowcase() {
  return (
    <Section id="exercises">
      <SectionHeader
        title="Bài tập lâm sàng"
        subtitle="Đa dạng modality — từ khám thị lực đến VT Quest game hóa"
      />
      <div className="grid gap-6 sm:grid-cols-2">
        {exercises.map((ex) => (
          <Card key={ex.name}>
            <span className="text-3xl" role="img" aria-hidden>
              {ex.icon}
            </span>
            <h3 className="mt-3 text-lg font-semibold text-gray-900">{ex.name}</h3>
            <p className="mt-2 text-sm text-gray-600">{ex.description}</p>
          </Card>
        ))}
      </div>
    </Section>
  );
}
