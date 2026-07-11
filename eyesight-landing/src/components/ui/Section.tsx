import { type ReactNode } from 'react';

interface SectionProps {
  id?: string;
  children: ReactNode;
  className?: string;
  containerClassName?: string;
  dark?: boolean;
}

export function Section({
  id,
  children,
  className = '',
  containerClassName = '',
  dark = false,
}: SectionProps) {
  return (
    <section
      id={id}
      className={`py-16 md:py-24 ${dark ? 'bg-brand-purple text-white' : 'bg-white'} ${className}`}
    >
      <div className={`mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 ${containerClassName}`}>
        {children}
      </div>
    </section>
  );
}

export function SectionHeader({
  title,
  subtitle,
  light = false,
}: {
  title: string;
  subtitle?: string;
  light?: boolean;
}) {
  return (
    <div className="mb-12 text-center">
      <h2
        className={`text-3xl font-bold tracking-tight md:text-4xl ${
          light ? 'text-white' : 'text-gray-900'
        }`}
      >
        {title}
      </h2>
      {subtitle && (
        <p className={`mt-4 text-lg ${light ? 'text-gray-300' : 'text-gray-600'}`}>{subtitle}</p>
      )}
    </div>
  );
}
