import { apiFetch } from './api-client';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PropertyCriteriaDto {
  minIncome: number;
  maxPeople: number;
  petsAllowed: boolean;
  allowedPetTypes: string[];
  advanceMonths: number;
  depositMonths: number;
  guarantorRequired: boolean;
  advanceWithoutGuarantor: number | null;
  depositWithoutGuarantor: number | null;
  minContractMonths: number | null;
  smokingAllowed: boolean | null;
}

export interface PropertyDto {
  id: string;
  agencyId: string;
  agencySlug: string;
  agentIds: string[];
  slug: string;
  title: string;
  description: string | null;
  referenceId: string | null;
  announcementLink: string | null;
  rentalPrice: number;
  location: string | null;
  availableFrom: string | null;
  typology: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  area: number | null;
  floor: number | null;
  hasGarage: boolean;
  hasElevator: boolean;
  images: string[];
  criteria: PropertyCriteriaDto;
  status: 'ACTIVE' | 'PAUSED' | 'RENTED' | 'ARCHIVED';
  createdAt: string;
  updatedAt: string;
}

export interface PropertiesListResponse {
  properties: PropertyDto[];
  total: number;
}

export interface CreatePropertyCriteriaInput {
  minIncome: number;
  maxPeople: number;
  petsAllowed: boolean;
  allowedPetTypes: string[];
  advanceMonths: number;
  depositMonths: number;
  guarantorRequired: boolean;
  advanceWithoutGuarantor?: number | null;
  depositWithoutGuarantor?: number | null;
  minContractMonths?: number | null;
  smokingAllowed?: boolean | null;
}

export interface CreatePropertyInput {
  title: string;
  description?: string;
  referenceId?: string;
  announcementLink?: string;
  rentalPrice: number;
  location?: string;
  availableFrom?: string;
  criteria: CreatePropertyCriteriaInput;
  agentIds: string[];
}

export interface UpdatePropertyInput {
  title?: string;
  description?: string;
  referenceId?: string;
  announcementLink?: string;
  rentalPrice?: number;
  location?: string;
  availableFrom?: string;
  clearAvailableFrom?: boolean;
  typology?: string;
  bedrooms?: number;
  bathrooms?: number;
  area?: number;
  floor?: number;
  hasGarage?: boolean;
  hasElevator?: boolean;
  criteria?: CreatePropertyCriteriaInput;
  agentIds?: string[];
}

// ── API calls ─────────────────────────────────────────────────────────────────

export const listProperties = (agencyId: string) =>
  apiFetch<PropertiesListResponse>(`/agencies/${agencyId}/properties`);

export const getProperty = (agencyId: string, id: string) =>
  apiFetch<PropertyDto>(`/agencies/${agencyId}/properties/${id}`);

export const createProperty = (agencyId: string, data: CreatePropertyInput) =>
  apiFetch<PropertyDto>(`/agencies/${agencyId}/properties`, {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const updateProperty = (agencyId: string, id: string, data: UpdatePropertyInput) =>
  apiFetch<PropertyDto>(`/agencies/${agencyId}/properties/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

export const setPropertyStatus = (
  agencyId: string,
  id: string,
  status: 'ACTIVE' | 'PAUSED' | 'RENTED' | 'ARCHIVED',
) =>
  apiFetch<void>(`/agencies/${agencyId}/properties/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });

export const getPublicProperty = (slug: string) =>
  apiFetch<PropertyDto>(`/public/properties/${slug}`);

export const getPublicPropertyByAgency = (agencySlug: string, propertySlug: string) =>
  apiFetch<PropertyDto>(`/public/agencies/${agencySlug}/properties/${propertySlug}`);
