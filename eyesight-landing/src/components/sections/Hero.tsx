'use client';

import Image from 'next/image';
import { type Audience } from '@/content/site';
import { heroContent } from '@/content/site';
import { LinkButton } from '@/components/ui/Button';
import { zaloLink } from '@/lib/zalo';

interface HeroProps {
  audience: Audience;
  onAudienceChange: (a: Audience) => void;
}

export function Hero({ audience, onAudienceChange }: HeroProps) {
  const content = heroContent[audience];

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-brand-purple via-brand-purple-light to-brand-teal-dark pb-20 pt-16 text-white md:pb-28 md:pt-24">
      <div className="absolute inset-0 opacity-20">
        <div className="absolute -left-20 top-20 h-72 w-72 rounded-full bg-brand-accent blur-3xl" />
        <div className="absolute -right-20 bottom-10 h-96 w-96 rounded-full bg-brand-teal blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex justify-center">
          <div className="inline-flex rounded-full bg-white/10 p-1 backdrop-blur-sm">
            <button
              type="button"
              onClick={() => onAudienceChange('clinic')}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition-all ${
                audience === 'clinic' ? 'bg-white text-brand-purple' : 'text-white/80 hover:text-white'
              }`}
            >
              Phòng khám
            </button>
            <button
              type="button"
              onClick={() => onAudienceChange('patient')}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition-all ${
                audience === 'patient' ? 'bg-white text-brand-purple' : 'text-white/80 hover:text-white'
              }`}
            >
              Bệnh nhân
            </button>
          </div>
        </div>

        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold leading-tight tracking-tight md:text-5xl lg:text-6xl">
            {content.headline}
          </h1>
          <p className="mt-6 text-lg text-white/85 md:text-xl">{content.subheadline}</p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <LinkButton
              href={zaloLink()}
              variant="zalo"
              size="lg"
              target="_blank"
              rel="noopener noreferrer"
            >
              {content.ctaLabel}
            </LinkButton>
          </div>
          <p className="mt-3 text-sm text-white/60">
            Gợi ý nhắn Zalo: &ldquo;{content.ctaHint}&rdquo;
          </p>
        </div>

        <div className="mx-auto mt-16 max-w-4xl">
          <div className="rounded-2xl border border-white/20 bg-white/5 p-2 shadow-2xl">
            <div className="overflow-hidden rounded-xl bg-white">
              <Image
                src="/images/hero-dashboard.png"
                alt="D-VisUp Portal — Dashboard quản lý bệnh nhân và theo dõi điều trị"
                width={3000}
                height={1310}
                sizes="(max-width: 896px) 100vw, 896px"
                className="h-auto w-full"
                priority
                unoptimized
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
