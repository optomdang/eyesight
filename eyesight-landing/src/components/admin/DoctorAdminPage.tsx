'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Field, SelectInput, TextInput } from '@/components/registration/FormFields';
import { AdminLoginForm } from '@/components/admin/AdminLoginForm';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { useDoctors } from '@/contexts/DoctorsContext';
import {
  doctorTitleOptions,
  formatDoctorBirthDate,
  getDoctorTitleLabel,
} from '@/lib/doctors';
import type { DoctorFormData, DoctorRecord, DoctorTitle } from '@/types/doctor';

const emptyForm: DoctorFormData = {
  fullName: '',
  dateOfBirth: '',
  workplace: '',
  title: 'doctor',
  description: '',
};

export function DoctorAdminPage() {
  const { isAuthenticated, loading: authLoading, login } = useAdminAuth();
  const { doctors, loading, addDoctor, updateDoctor, removeDoctor, setDoctorHidden, exportJson, importJson } =
    useDoctors();
  const [form, setForm] = useState<DoctorFormData>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startEdit = (doctor: DoctorRecord) => {
    setEditingId(doctor.id);
    setForm({
      fullName: doctor.fullName,
      dateOfBirth: doctor.dateOfBirth,
      workplace: doctor.workplace,
      title: doctor.title,
      description: doctor.description ?? '',
    });
    setFormError('');
    setStatusMessage('');
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormError('');
  };

  const handleSubmit = async () => {
    const error = editingId ? await updateDoctor(editingId, form) : await addDoctor(form);
    if (error) {
      setFormError(error);
      return;
    }
    setStatusMessage(editingId ? 'Đã cập nhật bác sĩ.' : 'Đã thêm bác sĩ mới.');
    resetForm();
  };

  const handleDelete = async (doctor: DoctorRecord) => {
    if (!window.confirm(`Xóa ${doctor.fullName} (${doctor.code})?`)) return;
    const error = await removeDoctor(doctor.id);
    if (error) {
      setStatusMessage(error);
      return;
    }
    if (editingId === doctor.id) resetForm();
    setStatusMessage('Đã xóa bác sĩ.');
  };

  const handleImport = async (file: File | undefined) => {
    if (!file) return;
    const error = await importJson(file);
    if (error) {
      setStatusMessage(error);
      return;
    }
    setStatusMessage('Đã khôi phục danh sách từ file.');
    resetForm();
  };

  if (authLoading) {
    return <p className="px-4 py-16 text-center text-sm text-gray-500">Đang tải...</p>;
  }

  if (!isAuthenticated) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center px-4 py-16">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <AdminLoginForm
            onSubmit={login}
            title="Quản lý Bác sĩ"
            description="Đăng nhập bằng tài khoản admin để truy cập trang quản lý."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Quản lý Bác sĩ / Chuyên gia</h1>
          <p className="mt-2 text-sm text-gray-600">
            Danh sách này dùng cho bước chọn Bác sĩ khi đăng ký và các trang hiển thị sau này.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={exportJson}
            title="Tải file sao lưu danh sách bác sĩ"
          >
            Sao lưu danh sách
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            title="Khôi phục danh sách từ file đã sao lưu"
          >
            Khôi phục từ file
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              handleImport(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </div>
      </div>

      {statusMessage && (
        <p className="mt-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">{statusMessage}</p>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1.1fr]">
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">
            {editingId ? 'Sửa thông tin' : 'Thêm mới'}
          </h2>

          <div className="mt-5 space-y-4">
            <Field label="Họ tên *">
              <TextInput
                value={form.fullName}
                onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                placeholder="VD: Nguyễn Văn A"
              />
            </Field>

            <Field label="Ngày tháng năm sinh *">
              <TextInput
                type="date"
                value={form.dateOfBirth}
                onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))}
              />
            </Field>

            <Field label="Đơn vị công tác *">
              <TextInput
                value={form.workplace}
                onChange={(e) => setForm((f) => ({ ...f, workplace: e.target.value }))}
                placeholder="VD: Phòng khám Nhãn khoa ABC"
              />
            </Field>

            <Field label="Chức danh *">
              <SelectInput
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value as DoctorTitle }))}
              >
                {doctorTitleOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </SelectInput>
            </Field>

            <Field label="Mô tả">
              <textarea
                value={form.description ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
                placeholder="Thông tin thêm (không bắt buộc)"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20"
              />
            </Field>

            {formError && <p className="text-sm text-red-600">{formError}</p>}

            <div className="flex gap-3 pt-2">
              <Button type="button" onClick={handleSubmit}>
                {editingId ? 'Lưu thay đổi' : 'Thêm bác sĩ'}
              </Button>
              {editingId && (
                <Button type="button" variant="outline" onClick={resetForm}>
                  Hủy
                </Button>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Danh sách ({loading ? '…' : doctors.length})
            </h2>
          </div>

          {loading ? (
            <p className="px-6 py-8 text-sm text-gray-500">Đang tải...</p>
          ) : doctors.length === 0 ? (
            <p className="px-6 py-8 text-sm text-gray-500">Chưa có bác sĩ nào.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {doctors.map((doctor) => (
                <div
                  key={doctor.id}
                  className={`px-6 py-4 ${doctor.hidden ? 'bg-gray-50' : ''}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900">
                        <span className="font-mono text-brand-teal">{doctor.code}</span> — {doctor.fullName}
                        {doctor.hidden && (
                          <span className="ml-2 rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600">
                            Đã ẩn
                          </span>
                        )}
                      </p>
                      <p className="mt-1 text-sm text-gray-600">
                        {getDoctorTitleLabel(doctor.title)} · Sinh {formatDoctorBirthDate(doctor.dateOfBirth)}
                      </p>
                      <p className="mt-1 text-sm text-gray-600">{doctor.workplace}</p>
                      {doctor.description && (
                        <p className="mt-2 text-sm text-gray-500">{doctor.description}</p>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          const nextHidden = !doctor.hidden;
                          const error = await setDoctorHidden(doctor.id, nextHidden);
                          setStatusMessage(
                            error ||
                              (nextHidden
                                ? `Đã ẩn ${doctor.fullName} khỏi danh sách lựa chọn.`
                                : `Đã hiện ${doctor.fullName} trên danh sách lựa chọn.`),
                          );
                        }}
                        className="rounded-lg border border-amber-200 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-50"
                      >
                        {doctor.hidden ? 'Hiện lại' : 'Ẩn'}
                      </button>
                      <button
                        type="button"
                        onClick={() => startEdit(doctor)}
                        className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Sửa
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(doctor)}
                        className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                      >
                        Xóa
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <p className="mt-8 text-sm text-gray-500">
        <strong>Sao lưu danh sách</strong> — tải file JSON về máy để giữ bản backup.
        <strong> Khôi phục từ file</strong> — nạp lại danh sách từ file đã sao lưu (thay thế toàn bộ).
        Nút <strong>Ẩn</strong> chỉ ẩn khỏi dropdown đăng ký và trang công khai; bác sĩ vẫn hiện ở đây.
        Dữ liệu được lưu trên server.
      </p>
    </div>
  );
}
