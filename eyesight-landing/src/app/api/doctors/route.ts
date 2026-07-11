import { NextRequest, NextResponse } from 'next/server';
import defaultDoctors from '../../../../public/data/doctors.json';
import type { DoctorRecord, DoctorTitle } from '@/types/doctor';

export const dynamic = 'force-dynamic';

const DOCTORS_KV_KEY = 'd-visup:doctors';
const doctorTitles: DoctorTitle[] = ['doctor', 'optometrist', 'optician', 'nurse'];

function getKvConfig() {
  return {
    url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '',
    token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '',
  };
}

function getAdminCredentials() {
  return {
    email: (process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL || '').trim().toLowerCase(),
    password: process.env.ADMIN_PASSWORD || process.env.NEXT_PUBLIC_ADMIN_PASSWORD || '',
  };
}

function isAuthorized(request: NextRequest): boolean {
  const expected = getAdminCredentials();
  if (!expected.email || !expected.password) return false;

  const authorization = request.headers.get('authorization') ?? '';
  if (!authorization.startsWith('Basic ')) return false;

  try {
    const decoded = Buffer.from(authorization.slice('Basic '.length), 'base64').toString('utf8');
    const separatorIndex = decoded.indexOf(':');
    if (separatorIndex < 0) return false;

    const email = decoded.slice(0, separatorIndex).trim().toLowerCase();
    const password = decoded.slice(separatorIndex + 1);
    return email === expected.email && password === expected.password;
  } catch {
    return false;
  }
}

async function kvCommand<T>(command: unknown[]): Promise<T> {
  const { url, token } = getKvConfig();
  if (!url || !token) {
    throw new Error('Chưa cấu hình server storage.');
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error('Không kết nối được server storage.');
  }

  const data = (await res.json()) as { result?: T; error?: string };
  if (data.error) throw new Error(data.error);
  return data.result as T;
}

async function readDoctors(): Promise<DoctorRecord[]> {
  try {
    const stored = await kvCommand<string | null>(['GET', DOCTORS_KV_KEY]);
    if (!stored) return defaultDoctors as DoctorRecord[];

    const parsed = JSON.parse(stored) as DoctorRecord[];
    return validateDoctors(parsed) ? parsed : (defaultDoctors as DoctorRecord[]);
  } catch {
    return defaultDoctors as DoctorRecord[];
  }
}

async function writeDoctors(doctors: DoctorRecord[]): Promise<void> {
  await kvCommand(['SET', DOCTORS_KV_KEY, JSON.stringify(doctors)]);
}

function validateDoctors(value: unknown): value is DoctorRecord[] {
  if (!Array.isArray(value)) return false;

  return value.every((item) => {
    if (!item || typeof item !== 'object') return false;
    const doctor = item as Partial<DoctorRecord>;
    return (
      typeof doctor.id === 'string' &&
      typeof doctor.code === 'string' &&
      typeof doctor.fullName === 'string' &&
      typeof doctor.dateOfBirth === 'string' &&
      typeof doctor.workplace === 'string' &&
      typeof doctor.title === 'string' &&
      doctorTitles.includes(doctor.title) &&
      (doctor.description === undefined || typeof doctor.description === 'string') &&
      (doctor.hidden === undefined || typeof doctor.hidden === 'boolean')
    );
  });
}

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: NextRequest) {
  const doctors = await readDoctors();
  const scope = request.nextUrl.searchParams.get('scope');

  if (scope === 'all') {
    if (!isAuthorized(request)) return errorResponse('Không có quyền truy cập.', 401);
    return NextResponse.json(doctors);
  }

  return NextResponse.json(doctors.filter((doctor) => !doctor.hidden));
}

export async function PUT(request: NextRequest) {
  if (!isAuthorized(request)) return errorResponse('Không có quyền cập nhật.', 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse('Dữ liệu gửi lên không hợp lệ.', 400);
  }

  const doctors = (body as { doctors?: unknown }).doctors;
  if (!validateDoctors(doctors)) {
    return errorResponse('Danh sách bác sĩ không hợp lệ.', 400);
  }

  try {
    await writeDoctors(doctors);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Không lưu được danh sách bác sĩ.';
    return errorResponse(message, 500);
  }
}
