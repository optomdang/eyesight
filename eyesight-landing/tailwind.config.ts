import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          teal: '#0D9488',
          'teal-dark': '#0F766E',
          purple: '#1E1040',
          'purple-light': '#2D1B69',
          accent: '#4ECDC4',
        },
      },
      fontFamily: {
        sans: ['var(--font-be-vietnam)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
