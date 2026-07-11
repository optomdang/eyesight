import { pricingPlans } from '@/content/pricing';
import type { MedicalHistory } from '@/types/registration';

export const PLAN_CODES = {
  STANDARD: 'AMBLYOPIA_STANDARD',
  PRO: 'AMBLYOPIA_PRO',
  ULTRA: 'AMBLYOPIA_ULTRA',
  ULTIMATE: 'AMBLYOPIA_ULTIMATE',
} as const;

export type RecommendationMode = 'ultimate-only' | 'ultra-ultimate' | 'all-four';

export interface PackageRecommendation {
  mode: RecommendationMode;
  visiblePlanCodes: string[];
  recommendedPlanCodes: string[];
  primaryPlanCode: string;
  reason: string;
}

const REFUND_PLAN_CODES = [PLAN_CODES.ULTRA, PLAN_CODES.ULTIMATE];

function isAgeOver9(currentAge: string): boolean {
  return currentAge === '9-under-13' || currentAge === 'over-13';
}

function isHighRefractiveError(refractiveError: string): boolean {
  return refractiveError === 'over-5';
}

function isTreatmentOver1Year(treatmentDuration: string): boolean {
  return ['1-2', '3-5', '5-10', 'over-10'].includes(treatmentDuration);
}

interface RiskFactor {
  key: string;
  explanation: string;
  active: boolean;
}

function getRiskFactors(medical: MedicalHistory): RiskFactor[] {
  const hasComorbidity = medical.strabismus === 'yes' || medical.cataract === 'yes';

  return [
    {
      key: 'age',
      explanation: 'đã quá độ tuổi điều trị',
      active: isAgeOver9(medical.currentAge),
    },
    {
      key: 'refractive',
      explanation: 'mức độ tật khúc xạ cao',
      active: isHighRefractiveError(medical.refractiveError),
    },
    {
      key: 'treatment',
      explanation: 'đã điều trị dài nhưng hiệu quả kém',
      active: isTreatmentOver1Year(medical.treatmentDuration),
    },
    {
      key: 'comorbidity',
      explanation: 'đi kèm nguyên nhân gây nhược thị nặng (lác/đục thể thủy tinh)',
      active: hasComorbidity,
    },
    {
      key: 'nystagmus',
      explanation: 'đi kèm rung giật nhãn cầu',
      active: medical.nystagmus === 'yes',
    },
  ];
}

function joinExplanations(clauses: string[]): string {
  if (clauses.length === 0) return '';
  if (clauses.length === 1) return clauses[0];

  return clauses.reduce((acc, clause, index) => {
    if (index === 0) return clause;
    const connector = clause.startsWith('mức') ? 'và với' : 'và';
    return `${acc} ${connector} ${clause}`;
  });
}

function buildReason(activeExplanations: string[], mode: RecommendationMode): string {
  if (mode === 'ultimate-only') {
    const context = joinExplanations(activeExplanations);
    return `Bệnh nhi ${context}, nên cần sử dụng gói ${planName(PLAN_CODES.ULTIMATE)} để đạt hiệu quả và tránh mất thời gian điều trị.`;
  }

  if (mode === 'ultra-ultimate') {
    const context = activeExplanations[0] ?? '';
    return `Bệnh nhi có ${context} nên cần sử dụng gói ${planName(PLAN_CODES.ULTRA)} hoặc ${planName(PLAN_CODES.ULTIMATE)} để tránh mất thời gian điều trị mà không hiệu quả.`;
  }

  return 'Gói cao cấp giúp tăng hiệu quả điều trị chắc chắn hơn, tránh mất thời gian vàng điều trị và đảm bảo hoàn tiền nếu không có cải thiện.';
}

function planName(code: string): string {
  return pricingPlans.find((p) => p.code === code)?.name ?? code;
}

export function hasRefundGuarantee(planCode: string): boolean {
  return REFUND_PLAN_CODES.includes(planCode as (typeof REFUND_PLAN_CODES)[number]);
}

export function recommendPackage(medical: MedicalHistory): PackageRecommendation {
  const factors = getRiskFactors(medical);
  const activeExplanations = factors.filter((f) => f.active).map((f) => f.explanation);
  const count = activeExplanations.length;

  if (count >= 2) {
    return {
      mode: 'ultimate-only',
      visiblePlanCodes: [PLAN_CODES.ULTIMATE],
      recommendedPlanCodes: [PLAN_CODES.ULTIMATE],
      primaryPlanCode: PLAN_CODES.ULTIMATE,
      reason: buildReason(activeExplanations, 'ultimate-only'),
    };
  }

  if (count === 1) {
    return {
      mode: 'ultra-ultimate',
      visiblePlanCodes: [PLAN_CODES.ULTRA, PLAN_CODES.ULTIMATE],
      recommendedPlanCodes: [PLAN_CODES.ULTRA, PLAN_CODES.ULTIMATE],
      primaryPlanCode: PLAN_CODES.ULTIMATE,
      reason: buildReason(activeExplanations, 'ultra-ultimate'),
    };
  }

  return {
    mode: 'all-four',
    visiblePlanCodes: pricingPlans.map((p) => p.code),
    recommendedPlanCodes: [PLAN_CODES.ULTRA],
    primaryPlanCode: PLAN_CODES.ULTRA,
    reason: buildReason(activeExplanations, 'all-four'),
  };
}

export function resolveDefaultPlanCode(
  recommendation: PackageRecommendation,
  preselectedPlanCode?: string,
  currentSelection?: string,
): string {
  const { visiblePlanCodes, primaryPlanCode } = recommendation;

  if (currentSelection && visiblePlanCodes.includes(currentSelection)) {
    return currentSelection;
  }

  if (preselectedPlanCode && visiblePlanCodes.includes(preselectedPlanCode)) {
    return preselectedPlanCode;
  }

  return primaryPlanCode;
}
