'use client';

import { useState } from 'react';
import { type Audience } from '@/content/site';
import { Hero } from '@/components/sections/Hero';
import { Features } from '@/components/sections/Features';
import { HowItWorks } from '@/components/sections/HowItWorks';
import { ExerciseShowcase } from '@/components/sections/ExerciseShowcase';
import { Pricing } from '@/components/sections/Pricing';
import { Trust } from '@/components/sections/Trust';
import { FAQ } from '@/components/sections/FAQ';
import { FinalCta } from '@/components/sections/FinalCta';

export function LandingPage() {
  const [audience, setAudience] = useState<Audience>('clinic');

  return (
    <>
      <Hero audience={audience} onAudienceChange={setAudience} />
      <Features audience={audience} />
      <HowItWorks audience={audience} />
      <ExerciseShowcase />
      <Pricing />
      <Trust />
      <FAQ />
      <FinalCta />
    </>
  );
}
