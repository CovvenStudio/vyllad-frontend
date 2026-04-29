import { apiFetch } from './api-client';

export interface SystemScreeningQuestionDto {
  id: string;
  key: string;
  category: string;
  label: string;
  description?: string;
  defaultOrder: number;
  alwaysEnabled: boolean;
  enabled: boolean;
  order: number;
  type: string;
  options: string[];
}

export interface CustomScreeningQuestionDto {
  id: string;
  category: string;
  label: string;
  description?: string;
  type: 'single_choice' | 'multi_choice' | 'text' | 'boolean';
  options: string[];
  required: boolean;
  order: number;
}

export interface AgencyScreeningConfigDto {
  agencyId: string;
  systemQuestions: SystemScreeningQuestionDto[];
  customQuestions: CustomScreeningQuestionDto[];
}

export interface ActiveSystemQuestionDto {
  key: string;
  enabled: boolean;
  order: number;
  label: string;
  type: string;
  options: string[];
}

export interface PublicScreeningDto {
  systemQuestions: ActiveSystemQuestionDto[];
  customQuestions: CustomScreeningQuestionDto[];
  agencyCountryCode?: string;
}

export interface SaveScreeningConfigDto {
  overrides: { questionKey: string; enabled: boolean; customOrder?: number }[];
  customQuestions: (Omit<CustomScreeningQuestionDto, 'id'> & { id?: string })[];
}

export const getAgencyScreeningConfig = (agencyId: string) =>
  apiFetch<AgencyScreeningConfigDto>(`/agencies/${agencyId}/screening-config`);

export const saveAgencyScreeningConfig = (agencyId: string, dto: SaveScreeningConfigDto) =>
  apiFetch<AgencyScreeningConfigDto>(`/agencies/${agencyId}/screening-config`, {
    method: 'PUT',
    body: JSON.stringify(dto),
  });

export const getPublicScreening = (slug: string) =>
  apiFetch<PublicScreeningDto>(`/public/properties/${slug}/screening`);
