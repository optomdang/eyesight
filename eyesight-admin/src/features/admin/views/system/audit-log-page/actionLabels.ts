import { TFunction } from 'i18next';

const SPECIAL_ACTION_KEYS: Record<string, string> = {
  'auth.login': 'login',
  'auth.logout': 'logout',
  'auth.passwordReset.request': 'passwordResetRequest',
  'auth.passwordReset.confirm': 'passwordResetConfirm',
  'auth.emailVerification.send': 'emailVerificationSend',
  'auth.emailVerification.confirm': 'emailVerificationConfirm',
  'notification.manualSend': 'notificationManualSend',
  'exerciseConfig.assignTemplate': 'exerciseConfigAssignTemplate',
};

const ENTITY_KEYS: Record<string, string> = {
  user: 'user',
  role: 'role',
  notificationTemplate: 'notificationTemplate',
  notification: 'notification',
  clinic: 'clinic',
  center: 'center',
  exerciseConfig: 'exerciseConfig',
  exercise: 'exercise',
  exerciseAssignment: 'exerciseAssignment',
  patient: 'patient',
  'patient.medicalRecord': 'medicalRecord',
  doctor: 'doctor',
  examAssignment: 'examAssignment',
  examMetric: 'examMetric',
  'system.job': 'systemJob',
};

const VERB_KEYS: Record<string, string> = {
  create: 'create',
  update: 'update',
  delete: 'delete',
  bulkDelete: 'bulkDelete',
  assign: 'assign',
  pause: 'pause',
  resume: 'resume',
  run: 'run',
};

const humanizeToken = (value: string) => {
  return value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

export const getAuditActionLabel = (action: string | null | undefined, t: TFunction) => {
  if (!action) {
    return '-';
  }

  const specialActionKey = SPECIAL_ACTION_KEYS[action];
  if (specialActionKey) {
    return t(`auditLog.actions.${specialActionKey}`);
  }

  const segments = action.split('.');
  if (segments.length < 2) {
    return humanizeToken(action);
  }

  const verbSegment = segments[segments.length - 1];
  const entitySegment = segments.slice(0, -1).join('.');
  const entityKey = ENTITY_KEYS[entitySegment];
  const verbKey = VERB_KEYS[verbSegment];

  if (entityKey && verbKey) {
    return t('auditLog.actionPattern', {
      verb: t(`auditLog.verbs.${verbKey}`),
      entity: t(`auditLog.entities.${entityKey}`),
    });
  }

  return humanizeToken(action);
};
