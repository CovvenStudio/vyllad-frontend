import { apiFetch } from './api-client';

export interface SchedulingPeriodDto {
  label: string;
  start: string;
  end: string;
}

export interface SchedulingConfigDto {
  periods: SchedulingPeriodDto[];
  availableWeekdays: number[];
  maxClientChoices: number;
  agentSlotIntervalMinutes: number;
  maxVisitsPerTime: number;
}

export interface UpdateSchedulingConfigDto {
  periods?: SchedulingPeriodDto[];
  availableWeekdays?: number[];
  maxClientChoices?: number;
  agentSlotIntervalMinutes?: number;
  maxVisitsPerTime?: number;
}

export const getSchedulingConfig = (agencyId: string) =>
  apiFetch<SchedulingConfigDto>(`/agencies/${agencyId}/settings/scheduling`);

export const updateSchedulingConfig = (agencyId: string, dto: UpdateSchedulingConfigDto) =>
  apiFetch<SchedulingConfigDto>(`/agencies/${agencyId}/settings/scheduling`, {
    method: 'PATCH',
    body: JSON.stringify(dto),
  });

// Public — used by the lead's visit page
export const getPublicSchedulingConfig = (slug: string): Promise<SchedulingConfigDto> =>
  fetch(`${import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'}/public/agencies/${slug}/scheduling-config`)
    .then(r => r.json());
