/**
 * Map Amblyopia package name/code → short tier label (Standard | Pro | Ultra | Ultimate).
 */

export type TreatmentPackageTier = 'standard' | 'pro' | 'ultra' | 'ultimate';

export const TREATMENT_PACKAGE_TIER_LABEL: Record<TreatmentPackageTier, string> = {
  standard: 'Standard',
  pro: 'Pro',
  ultra: 'Ultra',
  ultimate: 'Ultimate',
};

const TIER_ORDER: TreatmentPackageTier[] = ['ultimate', 'ultra', 'pro', 'standard'];

/** Resolve tier from package code or display name (e.g. Amblyopia Ultimate / AMBLYOPIA_PRO). */
export function resolveTreatmentPackageTier(
  nameOrCode?: string | null
): TreatmentPackageTier | null {
  if (!nameOrCode) return null;
  const key = nameOrCode.trim().toUpperCase().replace(/[\s-]+/g, '_');
  for (const tier of TIER_ORDER) {
    const token = tier.toUpperCase();
    if (key === token || key.endsWith(`_${token}`) || key.includes(`_${token}_`) || key.startsWith(`${token}_`)) {
      return tier;
    }
    // Plain name contains the tier word as a whole token
    if (new RegExp(`(?:^|[^A-Z0-9])${token}(?:[^A-Z0-9]|$)`).test(key)) {
      return tier;
    }
  }
  return null;
}

export function resolveTreatmentPackageTierLabel(
  name?: string | null,
  code?: string | null
): { tier: TreatmentPackageTier; label: string } | null {
  const tier = resolveTreatmentPackageTier(code) || resolveTreatmentPackageTier(name);
  if (!tier) return null;
  return { tier, label: TREATMENT_PACKAGE_TIER_LABEL[tier] };
}
