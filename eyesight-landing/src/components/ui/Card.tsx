import { type ReactNode } from 'react';

type HighlightVariant = 'popular' | 'recommended';

export function Card({
  children,
  className = '',
  highlight = false,
}: {
  children: ReactNode;
  className?: string;
  highlight?: false | HighlightVariant;
}) {
  const styles: Record<HighlightVariant, string> = {
    popular:
      'border-brand-teal bg-gradient-to-b from-brand-teal/10 to-white shadow-xl shadow-brand-teal/20 ring-2 ring-brand-teal',
    recommended:
      'border-amber-400 bg-gradient-to-b from-amber-50 to-white shadow-xl shadow-amber-200/60 ring-2 ring-amber-400',
  };

  return (
    <div
      className={`overflow-visible rounded-2xl border p-6 transition-shadow hover:shadow-2xl ${
        highlight ? styles[highlight] : 'border-gray-200 bg-white shadow-sm'
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function Badge({
  children,
  variant = 'default',
}: {
  children: ReactNode;
  variant?: 'default' | 'recommended';
}) {
  const styles =
    variant === 'recommended'
      ? 'bg-amber-500 text-white'
      : 'bg-brand-teal text-white';

  return (
    <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold shadow-md ${styles}`}>
      {children}
    </span>
  );
}
