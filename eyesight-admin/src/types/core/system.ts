/**
 * SYSTEM TYPES
 * Center, Clinic, and other system-level entities
 */

/**
 * Vision therapy center
 */
export interface Center {
  id?: number;
  name: string;
  nameEng?: string;
  code: string;
  phoneNumber?: string;
  address?: string;
  logo?: string;
  option?: Record<string, string>;
  updatedBy?: number;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

/**
 * Clinic within a center
 */
export interface Clinic {
  id?: number;
  name: string;
  nameEng?: string;
  code: string;
  centerId?: number;
  phoneNumber?: string;
  address?: string;
  updatedBy?: number;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface AuditLogActorUser {
  id: number;
  name?: string;
  email?: string;
  userType?: 'admin' | 'doctor' | 'patient';
}

export interface AuditLog {
  id: number;
  centerId?: number | null;
  actorUserId?: number | null;
  actorUserType?: 'admin' | 'doctor' | 'patient' | null;
  action: string;
  status: 'success' | 'failed' | 'partial';
  entityType?: string | null;
  entityId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  requestMethod?: string | null;
  requestPath?: string | null;
  metadata?: Record<string, unknown> | null;
  occurredAt: Date | string;
  actorUser?: AuditLogActorUser | null;
}
