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
  clearDoctorsStorage,
  createDoctorId,
  fetchDefaultDoctors,
  findDoctorByCode,
  generateDoctorCode,
  loadDoctorsFromStorage,
  saveDoctorsToStorage,
  validateDoctorForm,
} from '@/lib/doctors';
import type { DoctorFormData, DoctorRecord } from '@/types/doctor';

interface DoctorsContextValue {
  doctors: DoctorRecord[];
  loading: boolean;
  addDoctor: (data: DoctorFormData) => string | null;
  updateDoctor: (id: string, data: DoctorFormData) => string | null;
  removeDoctor: (id: string) => void;
  findByCode: (code: string) => DoctorRecord | undefined;
  resetToDefault: () => Promise<void>;
  exportJson: () => void;
  importJson: (file: File) => Promise<string | null>;
}

const DoctorsContext = createContext<DoctorsContextValue | null>(null);

export function DoctorsProvider({ children }: { children: ReactNode }) {
  const [doctors, setDoctors] = useState<DoctorRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const stored = loadDoctorsFromStorage();
      if (stored) {
        if (!cancelled) {
          setDoctors(stored);
          setLoading(false);
        }
        return;
      }

      try {
        const defaults = await fetchDefaultDoctors();
        if (!cancelled) {
          setDoctors(defaults);
          saveDoctorsToStorage(defaults);
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
  }, []);

  const persist = useCallback((next: DoctorRecord[]) => {
    setDoctors(next);
    saveDoctorsToStorage(next);
  }, []);

  const addDoctor = useCallback(
    (data: DoctorFormData): string | null => {
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
      };

      persist([...doctors, record]);
      return null;
    },
    [doctors, persist],
  );

  const updateDoctor = useCallback(
    (id: string, data: DoctorFormData): string | null => {
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
      persist(next);
      return null;
    },
    [doctors, persist],
  );

  const removeDoctor = useCallback(
    (id: string) => {
      persist(doctors.filter((d) => d.id !== id));
    },
    [doctors, persist],
  );

  const findByCode = useCallback(
    (code: string) => findDoctorByCode(doctors, code),
    [doctors],
  );

  const resetToDefault = useCallback(async () => {
    clearDoctorsStorage();
    const defaults = await fetchDefaultDoctors();
    persist(defaults);
  }, [persist]);

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

        persist(parsed);
        return null;
      } catch {
        return 'Không đọc được file JSON.';
      }
    },
    [persist],
  );

  const value = useMemo(
    () => ({
      doctors,
      loading,
      addDoctor,
      updateDoctor,
      removeDoctor,
      findByCode,
      resetToDefault,
      exportJson,
      importJson,
    }),
    [
      doctors,
      loading,
      addDoctor,
      updateDoctor,
      removeDoctor,
      findByCode,
      resetToDefault,
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
