export interface Property {
  id: string;
  slug: string;
  title: string;
  description: string;
  agencyId: string;
  agentIds: string[];
  criteria: PropertyCriteria;
  availableSlots: TimeSlot[];
  createdAt: string;
  // Campos do cadastro
  referenceId?: string;
  announcementLink?: string;
  rentalPrice?: number;
  // Campos legados / opcionais
  price?: number;
  images?: string[];
  location?: string;
  bedrooms?: number;
  bathrooms?: number;
  area?: number;
  sourceUrl?: string;
  floor?: number;
  hasGarage?: boolean;
  hasElevator?: boolean;
}

export interface PropertyCriteria {
  minIncome: number;
  maxPeople: number;
  petsAllowed: boolean;
  advanceMonths: number;
  depositMonths: number;
  guarantorRequired: boolean;
  advanceWithoutGuarantor?: number;
  depositWithoutGuarantor?: number;
}

export interface Candidate {
  id: string;
  propertyId: string;
  name: string;
  email: string;
  phone: string;
  monthlyIncome: number;
  numberOfPeople: number;
  hasPets: boolean;
  petDetails?: string;
  hasGuarantor: boolean;
  employmentType: 'permanent' | 'contract' | 'freelancer' | 'student' | 'retired' | 'other';
  employmentDuration: number;
  score: number;
  /** Per-factor raw scores (0-100). Keys: incomeRatio, commitments, jobType, employmentDuration, guarantor, household, pets, urgency, stayDuration, hasVisited, motivation */
  factorScores: Record<string, number>;
  classification: 'excellent' | 'potential' | 'low';
  status: 'new' | 'approved' | 'rejected' | 'visit_scheduled' | 'visit_cancelled' | 'visit_finished' | 'contracted';
  scheduledVisit?: string;
  createdAt: string;
  notes?: string;
  urgency?: 'immediate' | 'soon' | 'flexible';
  moveInTimeline?: string;
  proposedVisit?: string; // ISO datetime proposed by the candidate (awaiting agent confirmation)
  // Raw screening answers (carried via spread from LeadDto)
  stayDuration?: string;
  hasVisited?: string;
  motivation?: string;
  nationality?: string;
  residencyDuration?: string;
  customAnswers?: Record<string, string>;
  visitToken?: string;
  visitLinkSentAt?: string;
  contractedAt?: string;
}

export interface TimeSlot {
  id: string;
  date: string;
  time: string;
  available: boolean;
}

export interface Agent {
  id: string;
  agencyId: string;
  name: string;
  email: string;
  phone: string;
  picture: string;
  specialty: string;
  activeListings: number;
  conversionRate: number;
  joinedAt: string;
}

export interface Appointment {
  id: string;
  propertyId: string;
  candidateId: string;
  agentId: string;
  date: string;
  time: string;
  status: 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
}

export interface Agency {
  id: string;
  name: string;
  email: string;
  logo?: string;
}

export function calculateScore(candidate: Omit<Candidate, 'score' | 'classification' | 'id' | 'status' | 'createdAt'>, criteria: PropertyCriteria, price: number): { score: number; classification: Candidate['classification'] } {
  let score = 0;
  const incomeRatio = candidate.monthlyIncome / price;
  if (incomeRatio >= 3) score += 40;
  else if (incomeRatio >= 2.5) score += 32;
  else if (incomeRatio >= 2) score += 24;
  else if (incomeRatio >= 1.5) score += 12;

  if (candidate.numberOfPeople <= criteria.maxPeople) score += 15;
  else if (candidate.numberOfPeople === criteria.maxPeople + 1) score += 5;

  if (!candidate.hasPets || criteria.petsAllowed) score += 10;

  if (criteria.guarantorRequired && candidate.hasGuarantor) score += 15;
  else if (!criteria.guarantorRequired) score += 15;

  const empScores: Record<string, number> = {
    permanent: 20, retired: 18, contract: 14, freelancer: 10, student: 6, other: 4,
  };
  score += empScores[candidate.employmentType] || 4;

  if (candidate.employmentDuration >= 24) score += 0;
  else if (candidate.employmentDuration >= 12) score -= 2;
  else score -= 5;

  score = Math.max(0, Math.min(100, score));

  let classification: Candidate['classification'];
  if (score >= 70) classification = 'excellent';
  else if (score >= 45) classification = 'potential';
  else classification = 'low';

  return { score, classification };
}

export interface ScoreBreakdown {
  financial: number;  // 0-100
  fit: number;        // 0-100
  stability: number;  // 0-100
  urgency: number;    // 0-100
}

export function getScoreBreakdown(candidate: Candidate, criteria: PropertyCriteria, rentalPrice: number): ScoreBreakdown {
  const ratio = candidate.monthlyIncome / rentalPrice;

  let financial = 0;
  if (ratio >= 3) financial = 100;
  else if (ratio >= 2.5) financial = 80;
  else if (ratio >= 2) financial = 55;
  else if (ratio >= 1.5) financial = 30;
  else financial = 10;

  let fit = 0;
  if (candidate.numberOfPeople <= criteria.maxPeople) fit += 40;
  if (!candidate.hasPets || criteria.petsAllowed) fit += 30;
  if (!criteria.guarantorRequired || candidate.hasGuarantor) fit += 30;

  const empMap: Record<string, number> = {
    permanent: 100, retired: 90, contract: 70, freelancer: 50, student: 30, other: 20,
  };
  const stability = empMap[candidate.employmentType] ?? 20;

  const urgencyMap: Record<string, number> = { immediate: 100, soon: 60, flexible: 20 };
  const urgency = urgencyMap[candidate.urgency ?? 'flexible'] ?? 20;

  return { financial, fit, stability, urgency };
}

export function generateInsight(candidate: Candidate, criteria: PropertyCriteria, rentalPrice: number): string {
  const ratio = candidate.monthlyIncome / rentalPrice;
  const urgency = candidate.urgency ?? 'flexible';

  if (candidate.hasPets && !criteria.petsAllowed) return 'Animais não permitidos neste imóvel';
  if (ratio < 1.5) return 'Rendimento abaixo do mínimo recomendado';
  if (criteria.guarantorRequired && !candidate.hasGuarantor) {
    return ratio >= 2.5 ? 'Rendimento forte · sem fiador' : 'Sem fiador · rendimento insuficiente';
  }
  if (candidate.score >= 80 && urgency === 'immediate') return 'Perfil excelente · pronto para fechar';
  if (candidate.score >= 80 && urgency === 'soon') return 'Rendimento forte · disponível em breve';
  if (candidate.score >= 80) return 'Excelente perfil financeiro e laboral';
  if (candidate.score >= 60 && urgency === 'immediate') return 'Bom perfil · alta urgência de mudança';
  if (candidate.score >= 60) return 'Perfil razoável · sem urgência imediata';
  return 'Baixa compatibilidade com os critérios';
}
