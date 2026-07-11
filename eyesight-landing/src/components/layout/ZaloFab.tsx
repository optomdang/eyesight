import { zaloLink } from '@/lib/zalo';

export function ZaloFab() {
  return (
    <a
      href={zaloLink()}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#0068FF] text-white shadow-lg shadow-blue-500/40 transition-transform hover:scale-110"
      aria-label="Liên hệ Zalo"
      title="Liên hệ Zalo tư vấn"
    >
      <svg viewBox="0 0 24 24" className="h-7 w-7 fill-current" aria-hidden>
        <path d="M12 2C6.48 2 2 5.82 2 10.5c0 2.58 1.46 4.9 3.74 6.44L5 22l5.01-2.76c.64.09 1.29.14 1.99.14 5.52 0 10-3.82 10-8.5S17.52 2 12 2z" />
      </svg>
    </a>
  );
}
