import type { RegistrationFormData } from '@/types/registration';
import { pricingPlans } from '@/content/pricing';

export interface RegistrationPayload extends RegistrationFormData {
  selectedPlanName: string;
  selectedPlanPrice: number;
  submittedAt: string;
  source: 'landing';
}

export function buildRegistrationPayload(data: RegistrationFormData): RegistrationPayload {
  const plan = pricingPlans.find((p) => p.code === data.selectedPlanCode);

  return {
    ...data,
    selectedPlanName: plan?.name ?? data.selectedPlanCode,
    selectedPlanPrice: plan?.pricePerYear ?? 0,
    submittedAt: new Date().toISOString(),
    source: 'landing',
  };
}

export async function submitRegistration(
  data: RegistrationFormData,
): Promise<{ ok: boolean; error?: string }> {
  const webhookUrl = process.env.NEXT_PUBLIC_GOOGLE_SHEETS_WEBHOOK_URL;

  if (!webhookUrl) {
    return { ok: false, error: 'Chưa cấu hình webhook Google Sheets' };
  }

  const payload = buildRegistrationPayload(data);

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    // no-cors returns opaque response — treat as sent
    if (response.type === 'opaque' || response.ok) {
      return { ok: true };
    }

    return { ok: false, error: 'Không lưu được dữ liệu đăng ký' };
  } catch {
    return { ok: false, error: 'Không kết nối được máy chủ lưu trữ' };
  }
}
