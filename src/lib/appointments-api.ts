import { apiFetch } from './api-client';

const RAW_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

// ── DTOs ───────────────────────────────────────────────────────────────────────────────

export interface AppointmentDto {
  id: string;
  agencyId: string;
  propertyId: string;
  leadId: string;
  agentId: string;
  date: string;    // "YYYY-MM-DD"
  time: string;    // "HH:MM"
  status: 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
  cancelToken: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppointmentListResponse {
  items: AppointmentDto[];
  total: number;
}

export interface CreateAppointmentInput {
  propertyId: string;
  leadId: string;
  agentId: string;
  date: string;
  time: string;
  notes?: string;
}

export interface UpdateAppointmentStatusInput {
  status: 'confirmed' | 'completed' | 'cancelled';
}

export interface BlockVisitSlotInput {
  date: string;
  time: string;
  reason?: string;
}

export interface BlockedVisitSlotDto {
  id: string;
  agencyId: string;
  propertyId: string;
  date: string;
  time: string;
  blockedByUserId: string;
  reason?: string;
  createdAt: string;
}

// ── API functions ─────────────────────────────────────────────────────────────

export function listAppointments(
  agencyId: string,
  params?: {
    agentId?: string;
    propertyId?: string;
    leadId?: string;
    status?: string;
    skip?: number;
    take?: number;
  },
): Promise<AppointmentListResponse> {
  const qs = new URLSearchParams();
  if (params?.agentId)    qs.set('agentId',    params.agentId);
  if (params?.propertyId) qs.set('propertyId', params.propertyId);
  if (params?.leadId)     qs.set('leadId',     params.leadId);
  if (params?.status)     qs.set('status',     params.status);
  if (params?.skip != null) qs.set('skip', String(params.skip));
  if (params?.take != null) qs.set('take', String(params.take));

  const query = qs.toString() ? `?${qs.toString()}` : '';
  return apiFetch<AppointmentListResponse>(
    `/agencies/${agencyId}/appointments${query}`,
  );
}

export function createAppointment(
  agencyId: string,
  input: CreateAppointmentInput,
): Promise<AppointmentDto> {
  return apiFetch<AppointmentDto>(`/agencies/${agencyId}/appointments`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateAppointmentStatus(
  agencyId: string,
  id: string,
  input: UpdateAppointmentStatusInput,
): Promise<AppointmentDto> {
  return apiFetch<AppointmentDto>(`/agencies/${agencyId}/appointments/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function rescheduleAppointment(agencyId: string, id: string): Promise<void> {
  return apiFetch<void>(`/agencies/${agencyId}/appointments/${id}/reschedule`, {
    method: 'PATCH',
  });
}

export function cancelAppointment(agencyId: string, id: string): Promise<void> {
  return apiFetch<void>(`/agencies/${agencyId}/appointments/${id}/cancel`, {
    method: 'PATCH',
  });
}

export function deleteAppointment(agencyId: string, id: string): Promise<void> {
  return apiFetch<void>(`/agencies/${agencyId}/appointments/${id}`, {
    method: 'DELETE',
  });
}

export function listBlockedVisitSlots(
  agencyId: string,
  propertyId: string,
  date?: string,
): Promise<BlockedVisitSlotDto[]> {
  const qs = new URLSearchParams();
  if (date) qs.set('date', date);
  const query = qs.toString() ? `?${qs.toString()}` : '';

  return apiFetch<BlockedVisitSlotDto[]>(
    `/agencies/${agencyId}/properties/${propertyId}/blocked-visit-slots${query}`,
  );
}

export function blockVisitSlot(
  agencyId: string,
  propertyId: string,
  input: BlockVisitSlotInput,
): Promise<BlockedVisitSlotDto> {
  return apiFetch<BlockedVisitSlotDto>(
    `/agencies/${agencyId}/properties/${propertyId}/blocked-visit-slots`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  );
}

export function unblockVisitSlot(
  agencyId: string,
  propertyId: string,
  date: string,
  time: string,
): Promise<void> {
  const qs = new URLSearchParams({ date, time });
  return apiFetch<void>(
    `/agencies/${agencyId}/properties/${propertyId}/blocked-visit-slots?${qs.toString()}`,
    { method: 'DELETE' },
  );
}

// ── Public: cancel / reschedule via token ────────────────────────────────────────

const publicPost = (path: string): Promise<void> =>
  fetch(`${RAW_BASE}${path}`, { method: 'POST' }).then(async r => {
    if (!r.ok) throw new Error(String(r.status));
  });

export const cancelAppointmentPublic = (id: string, cancelToken: string): Promise<void> =>
  publicPost(`/public/appointments/${id}/cancel?cancelToken=${encodeURIComponent(cancelToken)}`);

export const rescheduleAppointmentPublic = (id: string, cancelToken: string): Promise<void> =>
  publicPost(`/public/appointments/${id}/reschedule?cancelToken=${encodeURIComponent(cancelToken)}`);
