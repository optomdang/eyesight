'use client';

import { useState } from 'react';
import Image from 'next/image';
import { site, navLinks } from '@/content/site';
import { Button } from '@/components/ui/Button';
import { useRegistration } from '@/contexts/RegistrationContext';
import { useAdminAuth } from '@/contexts/AdminAuthContext';

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { openRegistration } = useRegistration();
  const { isAuthenticated, openLoginModal, logout } = useAdminAuth();

  return (
    <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <a href="/" className="flex items-center">
          <Image
            src="/images/logo-wordmark.png"
            alt={site.productName}
            width={405}
            height={120}
            priority
            className="h-10 w-auto"
          />
        </a>

        <nav className="hidden items-center gap-6 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-gray-600 transition-colors hover:text-brand-teal"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {isAuthenticated ? (
            <>
              <a
                href="/quan-ly/bac-si"
                className="text-sm font-medium text-gray-600 hover:text-brand-teal"
              >
                Quản lý bác sĩ
              </a>
              <button
                type="button"
                onClick={logout}
                className="text-sm font-medium text-gray-600 hover:text-brand-teal"
              >
                Đăng xuất
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => openLoginModal()}
              className="text-sm font-medium text-gray-600 hover:text-brand-teal"
            >
              Đăng nhập
            </button>
          )}
          <Button variant="zalo" size="sm" onClick={() => openRegistration()}>
            Đăng ký
          </Button>
        </div>

        <button
          type="button"
          className="rounded-lg p-2 text-gray-600 md:hidden"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Menu"
        >
          {menuOpen ? '✕' : '☰'}
        </button>
      </div>

      {menuOpen && (
        <div className="border-t border-gray-100 bg-white px-4 py-4 md:hidden">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="block py-2 text-gray-600"
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <div className="mt-4 flex flex-col gap-2">
            {isAuthenticated ? (
              <>
                <a
                  href="/quan-ly/bac-si"
                  className="py-2 text-center text-sm font-medium text-gray-600"
                  onClick={() => setMenuOpen(false)}
                >
                  Quản lý bác sĩ
                </a>
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    setMenuOpen(false);
                  }}
                  className="py-2 text-center text-sm font-medium text-gray-600"
                >
                  Đăng xuất
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  openLoginModal();
                  setMenuOpen(false);
                }}
                className="py-2 text-center text-sm font-medium text-gray-600"
              >
                Đăng nhập
              </button>
            )}
            <Button
              variant="zalo"
              size="sm"
              className="w-full"
              onClick={() => {
                setMenuOpen(false);
                openRegistration();
              }}
            >
              Đăng ký
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
