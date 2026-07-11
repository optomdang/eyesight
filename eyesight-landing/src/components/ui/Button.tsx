import { type ButtonHTMLAttributes, type AnchorHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'outline' | 'zalo';

const variants: Record<Variant, string> = {
  primary:
    'bg-brand-teal text-white hover:bg-brand-teal-dark shadow-lg shadow-brand-teal/25',
  secondary: 'bg-brand-purple text-white hover:bg-brand-purple-light',
  outline:
    'border-2 border-brand-teal text-brand-teal hover:bg-brand-teal/5',
  zalo: 'bg-[#0068FF] text-white hover:bg-[#0052CC] shadow-lg shadow-blue-500/25',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: 'sm' | 'md' | 'lg';
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: ButtonProps) {
  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

interface LinkButtonProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  variant?: Variant;
  size?: 'sm' | 'md' | 'lg';
}

export function LinkButton({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: LinkButtonProps) {
  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  return (
    <a
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </a>
  );
}
