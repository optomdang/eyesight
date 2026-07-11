'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  createDoctorId,
  findDoctorByCode,
  generateDoctorCode,
  getVisibleDoctors,
  validateDoctorForm,
} from '@/lib/doctors';
import { getAdminCredentials } from '@/lib/adminAuth';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import type { DoctorFormData, DoctorRecord } from '@/types/doctor';

interface DoctorsContextValue {
  doctors: DoctorRecord[];
  visibleDoctors: DoctorRecord[];
  loading: boolean;
  addDoctor: (data: DoctorFormData) => Promise<string | null>;
  updateDoctor: (id: string, data: DoctorFormData) => Promise<string | null>;
  removeDoctor: (id: string) => Promise<string | null>;
  setDoctorHidden: (id: string, hidden: boolean) => Promise<string | null>;
  findByCode: (code: string) => DoctorRecord | undefined;
  findVisibleByCode: (code: string) => DoctorRecord | undefined;
  exportJson: () => void;
  importJson: (file: File) => Promise<string | null>;
}

const DoctorsContext = createContext<DoctorsContextValue | null>(null);

export function DoctorsProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAdminAuth();
  const [doctors, setDoctors] = useState<DoctorRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const visibleDoctors = useMemo(() => getVisibleDoctors(doctors), [doctors]);

  const adminHeaders = useCallback((): HeadersInit => {
    const { email, password } = getAdminCredentials();
    if (!email || !password) return {};

    return {
      Authorization: `Basic ${btoa(`${email}:${password}`)}`,
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/doctors${isAuthenticated ? '?scope=all' : ''}`, {
          headers: isAuthenticated ? adminHeaders() : undefined,
          cache: 'no-store',
        });
        if (!res.ok) throw new Error('Không tải được danh sách bác sĩ.');

        const data = (await res.json()) as DoctorRecord[];
        if (!cancelled) {
          setDoctors(data);
        }
      } catch {
        if (!cancelled) setDoctors([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [adminHeaders, isAuthenticated]);

  const persist = useCallback(
    async (next: DoctorRecord[]): Promise<string | null> => {
      const previous = doctors;
      setDoctors(next);

      try {
        const res = await fetch('/api/doctors', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...adminHeaders(),
          },
          body: JSON.stringify({ doctors: next }),
        });

        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(data?.error || 'Không lưu được danh sách bác sĩ.');
        }

        return null;
      } catch (error) {
        setDoctors(previous);
        return error instanceof Error ? error.message : 'Không lưu được danh sách bác sĩ.';
      }
    },
    [adminHeaders, doctors],
  );

  const addDoctor = useCallback(
    async (data: DoctorFormData): Promise<string | null> => {
      const error = validateDoctorForm(data);
      if (error) return error;

      const code = generateDoctorCode(data.title, doctors);
      const record: DoctorRecord = {
        id: createDoctorId(),
        code,
        fullName: data.fullName.trim(),
        dateOfBirth: data.dateOfBirth,
        workplace: data.workplace.trim(),
        title: data.title,
        description: data.description?.trim() || undefined,
        hidden: false,
      };

      return persist([...doctors, record]);
    },
    [doctors, persist],
  );

  const updateDoctor = useCallback(
    async (id: string, data: DoctorFormData): Promise<string | null> => {
      const error = validateDoctorForm(data);
      if (error) return error;

      const index = doctors.findIndex((d) => d.id === id);
      if (index < 0) return 'Không tìm thấy bác sĩ.';

      const existing = doctors[index];
      const updated: DoctorRecord = {
        ...existing,
        fullName: data.fullName.trim(),
        dateOfBirth: data.dateOfBirth,
        workplace: data.workplace.trim(),
        title: data.title,
        description: data.description?.trim() || undefined,
      };

      const next = [...doctors];
      next[index] = updated;
      return persist(next);
    },
    [doctors, persist],
  );

  const removeDoctor = useCallback(
    async (id: string): Promise<string | null> => {
      return persist(doctors.filter((d) => d.id !== id));
    },
    [doctors, persist],
  );

  const setDoctorHidden = useCallback(
    async (id: string, hidden: boolean): Promise<string | null> => {
      const next = doctors.map((d) => (d.id === id ? { ...d, hidden } : d));
      return persist(next);
    },
    [doctors, persist],
  );

  const findByCode = useCallback(
    (code: string) => findDoctorByCode(doctors, code),
    [doctors],
  );

  const findVisibleByCode = useCallback(
    (code: string) => findDoctorByCode(visibleDoctors, code),
    [visibleDoctors],
  );

  const exportJson = useCallback(() => {
    const blob = new Blob([JSON.stringify(doctors, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'doctors.json';
    link.click();
    URL.revokeObjectURL(url);
  }, [doctors]);

  const importJson = useCallback(
    async (file: File): Promise<string | null> => {
      try {
        const text = await file.text();
        const parsed = JSON.parse(text) as DoctorRecord[];
        if (!Array.isArray(parsed) || parsed.length === 0) {
          return 'File JSON không hợp lệ.';
        }

        for (const item of parsed) {
          if (!item.id || !item.code || !item.fullName || !item.title) {
            return 'File JSON thiếu trường bắt buộc.';
          }
        }

        return persist(parsed);
      } catch {
        return 'Không đọc được file JSON.';
      }
    },
    [persist],
  );

  const value = useMemo(
    () => ({
      doctors,
      visibleDoctors,
      loading,
      addDoctor,
      updateDoctor,
      removeDoctor,
      setDoctorHidden,
      findByCode,
      findVisibleByCode,
      exportJson,
      importJson,
    }),
    [
      doctors,
      visibleDoctors,
      loading,
      addDoctor,
      updateDoctor,
      removeDoctor,
      setDoctorHidden,
      findByCode,
      findVisibleByCode,
      exportJson,
      importJson,
    ],
  );

  return <DoctorsContext.Provider value={value}>{children}</DoctorsContext.Provider>;
}

export function useDoctors() {
  const ctx = useContext(DoctorsContext);
  if (!ctx) {
    throw new Error('useDoctors must be used within DoctorsProvider');
  }
  return ctx;
}
