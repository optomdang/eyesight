import { site } from '@/content/site';
import { zaloLink } from '@/lib/zalo';

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-gray-200 bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <p className="text-lg font-bold text-gray-900">{site.name}</p>
            <p className="mt-2 text-sm text-gray-600">{site.tagline}</p>
          </div>
          <div>
            <p className="font-semibold text-gray-900">Liên kết</p>
            <ul className="mt-3 space-y-2 text-sm text-gray-600">
              <li>
                <a href={site.appUrl} className="hover:text-brand-teal" target="_blank" rel="noopener noreferrer">
                  Đăng nhập ứng dụng
                </a>
              </li>
              <li>
                <a href="/#pricing" className="hover:text-brand-teal">
                  Gói điều trị
                </a>
              </li>
              <li>
                <a href="/bao-hanh" className="hover:text-brand-teal">
                  Chính sách bảo hành
                </a>
              </li>
              <li>
                <a href="/#faq" className="hover:text-brand-teal">
                  Câu hỏi thường gặp
                </a>
              </li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-gray-900">Liên hệ</p>
            <ul className="mt-3 space-y-2 text-sm text-gray-600">
              <li>
                <a href={zaloLink()} target="_blank" rel="noopener noreferrer" className="hover:text-brand-teal">
                  Zalo tư vấn
                </a>
              </li>
              <li>
                <a href={`mailto:${site.email}`} className="hover:text-brand-teal">
                  {site.email}
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-10 border-t border-gray-200 pt-6 text-center text-sm text-gray-500">
          © {year} {site.name}. Hỗ trợ điều trị thị lực theo chỉ định chuyên môn.
        </div>
      </div>
    </footer>
  );
}
