'use client';

import { useState } from 'react';
import { faqItems } from '@/content/faq';
import { Section, SectionHeader } from '@/components/ui/Section';

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <Section id="faq">
      <SectionHeader title="Câu hỏi thường gặp" />
      <div className="mx-auto max-w-3xl divide-y divide-gray-200">
        {faqItems.map((item, i) => (
          <div key={item.question} className="py-4">
            <button
              type="button"
              className="flex w-full items-center justify-between text-left"
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
              aria-expanded={openIndex === i}
            >
              <span className="font-semibold text-gray-900">{item.question}</span>
              <span className="ml-4 text-brand-teal">{openIndex === i ? '−' : '+'}</span>
            </button>
            {openIndex === i && (
              <p className="mt-3 text-sm leading-relaxed text-gray-600">{item.answer}</p>
            )}
          </div>
        ))}
      </div>
    </Section>
  );
}
