'use client';

import { useCallback, useEffect, useState } from 'react';
import { RegistrationModal } from '@/components/registration/RegistrationModal';
import { PersonalInfoStep } from '@/components/registration/steps/PersonalInfoStep';
import { MedicalHistoryStep } from '@/components/registration/steps/MedicalHistoryStep';
import { PackageStep } from '@/components/registration/steps/PackageStep';
import { DoctorStep } from '@/components/registration/steps/DoctorStep';
import { PaymentStep } from '@/components/registration/steps/PaymentStep';
import { Button } from '@/components/ui/Button';
import {
  recommendPackage,
  resolveDefaultPlanCode,
  type PackageRecommendation,
} from '@/lib/recommendPackage';
import { submitRegistration } from '@/lib/submitRegistration';
import {
  validateDoctorSelection,
  validateMedicalHistory,
  validatePersonalInfo,
  validatePlanSelection,
  type StepErrors,
} from '@/lib/validateRegistration';
import {
  initialDoctorSelection,
  initialMedicalHistory,
  initialPersonalInfo,
  type DoctorSelection,
  type MedicalHistory,
  type PersonalInfo,
} from '@/types/registration';

interface RegistrationWizardProps {
  open: boolean;
  preselectedPlanCode?: string;
  onClose: () => void;
}

const emptyRecommendation: PackageRecommendation = {
  mode: 'all-four',
  visiblePlanCodes: [],
  recommendedPlanCodes: [],
  primaryPlanCode: '',
  reason: '',
};

export function RegistrationWizard({
  open,
  preselectedPlanCode,
  onClose,
}: RegistrationWizardProps) {
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState<StepErrors>({});
  const [personal, setPersonal] = useState<PersonalInfo>(initialPersonalInfo);
  const [medical, setMedical] = useState<MedicalHistory>(initialMedicalHistory);
  const [selectedPlanCode, setSelectedPlanCode] = useState('');
  const [recommendation, setRecommendation] = useState<PackageRecommendation>(emptyRecommendation);
  const [doctor, setDoctor] = useState<DoctorSelection>(initialDoctorSelection);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [submitError, setSubmitError] = useState<string>();

  const reset = useCallback(() => {
    setStep(1);
    setErrors({});
    setPersonal(initialPersonalInfo);
    setMedical(initialMedicalHistory);
    setSelectedPlanCode(preselectedPlanCode ?? '');
    setRecommendation(emptyRecommendation);
    setDoctor(initialDoctorSelection);
    setSubmitStatus('idle');
    setSubmitError(undefined);
  }, [preselectedPlanCode]);

  useEffect(() => {
    if (open) {
      reset();
    }
  }, [open, reset]);

  const applyRecommendation = (nextMedical: MedicalHistory, currentPlan?: string) => {
    const nextRecommendation = recommendPackage(nextMedical);
    setRecommendation(nextRecommendation);
    setSelectedPlanCode(
      resolveDefaultPlanCode(nextRecommendation, preselectedPlanCode, currentPlan),
    );
    return nextRecommendation;
  };

  const handleNext = async () => {
    let stepErrors: StepErrors = {};

    if (step === 1) {
      stepErrors = validatePersonalInfo(personal);
    } else if (step === 2) {
      stepErrors = validateMedicalHistory(medical);
      if (Object.keys(stepErrors).length === 0) {
        applyRecommendation(medical, selectedPlanCode);
      }
    } else if (step === 3) {
      stepErrors = validatePlanSelection(selectedPlanCode);
      if (
        selectedPlanCode &&
        recommendation.visiblePlanCodes.length > 0 &&
        !recommendation.visiblePlanCodes.includes(selectedPlanCode)
      ) {
        stepErrors.selectedPlanCode = 'Vui lòng chọn một trong các gói được đề xuất';
      }
    } else if (step === 4) {
      stepErrors = validateDoctorSelection(doctor);
      if (Object.keys(stepErrors).length === 0) {
        const latestRecommendation = recommendPackage(medical);
        const planCode =
          selectedPlanCode ||
          resolveDefaultPlanCode(latestRecommendation, preselectedPlanCode);

        setSubmitStatus('sending');
        const result = await submitRegistration({
          personal,
          medical,
          selectedPlanCode: planCode,
          recommendedPlanCodes: latestRecommendation.recommendedPlanCodes,
          recommendedPlanCode: latestRecommendation.recommendedPlanCodes.join(', '),
          recommendationReason: latestRecommendation.reason,
          doctor,
        });

        if (result.ok) {
          setSubmitStatus('sent');
        } else {
          setSubmitStatus('error');
          setSubmitError(result.error);
        }

        setStep(5);
        return;
      }
    }

    setErrors(stepErrors);
    if (Object.keys(stepErrors).length === 0) {
      setStep((s) => s + 1);
    }
  };

  const handleBack = () => {
    setErrors({});
    setStep((s) => Math.max(1, s - 1));
  };

  const handleClose = () => {
    onClose();
    reset();
  };

  return (
    <RegistrationModal
      open={open}
      currentStep={step}
      onClose={handleClose}
      footer={
        <div className="flex gap-3">
          {step > 1 && (
            <Button variant="outline" className="flex-1" onClick={handleBack}>
              Quay lại
            </Button>
          )}
          {step < 5 ? (
            <Button className="flex-1" onClick={handleNext}>
              Tiếp tục
            </Button>
          ) : (
            <Button className="flex-1" onClick={handleClose}>
              Hoàn tất
            </Button>
          )}
        </div>
      }
    >
      {step === 1 && (
        <PersonalInfoStep data={personal} errors={errors} onChange={setPersonal} />
      )}
      {step === 2 && (
        <MedicalHistoryStep data={medical} errors={errors} onChange={setMedical} />
      )}
      {step === 3 && (
        <PackageStep
          selectedPlanCode={selectedPlanCode}
          recommendedPlanCodes={recommendation.recommendedPlanCodes}
          visiblePlanCodes={recommendation.visiblePlanCodes}
          recommendationReason={recommendation.reason}
          errors={errors}
          onChange={setSelectedPlanCode}
        />
      )}
      {step === 4 && (
        <DoctorStep data={doctor} errors={errors} onChange={setDoctor} />
      )}
      {step === 5 && (
        <PaymentStep
          personal={personal}
          selectedPlanCode={selectedPlanCode}
          submitStatus={submitStatus}
          submitError={submitError}
        />
      )}
    </RegistrationModal>
  );
}
