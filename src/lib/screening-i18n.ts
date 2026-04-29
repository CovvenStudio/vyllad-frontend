/**
 * screening-i18n.ts
 *
 * Translates English strings stored in MongoDB (SystemScreeningQuestion)
 * to Portuguese for display in the admin settings and public form.
 *
 * Keys = canonical English values stored in DB.
 * Values = Portuguese display text.
 */

// ── Category names ────────────────────────────────────────────────────────────

const CATEGORIES: Record<string, string> = {
  availability: 'Disponibilidade',
  household:    'Agregado Familiar',
  pets:         'Animais',
  financial:    'Financeiro',
  guarantees:   'Garantias',
  intention:    'Intenção',
  profile:      'Perfil de Residência',
};

export function tScreeningCategory(key: string): string {
  return CATEGORIES[key.toLowerCase()] ?? key;
}

// ── Question labels (by question key) ────────────────────────────────────────

const QUESTION_LABELS: Record<string, string> = {
  urgency:            'Quando planeia mudar-se?',
  household:          'Quem vai viver no imóvel?',
  pets:               'Vai trazer animais de estimação?',
  income:             'Rendimento mensal líquido do agregado (€)?',
  commitments:        'Soma das prestações mensais fixas (€)?',
  job:                'Situação profissional?',
  employmentDuration: 'Há quanto tempo está na situação profissional actual?',
  guarantor:          'Tem fiador disponível?',
  intent:             'Já visitou algum imóvel recentemente?',
  stayDuration:       'Quanto tempo pretende ficar no imóvel?',
  motivation:         'O que procura principalmente?',
  nationality:        'Qual é a sua nacionalidade?',
  residencyDuration:  'Há quanto tempo reside em Portugal?',
};

export function tQuestionLabel(key: string, fallback: string): string {
  return QUESTION_LABELS[key] ?? fallback;
}

// ── Question descriptions (by question key) ───────────────────────────────────

const QUESTION_DESCRIPTIONS: Record<string, string> = {
  urgency:            'Mede a urgência da procura. Candidatos com necessidade imediata têm maior pontuação.',
  household:          'Verifica se o número de pessoas está dentro dos critérios definidos para o imóvel.',
  pets:               'Relevante para imóveis com restrições a animais. Inclui tipo e quantidade.',
  income:             'Avalia a capacidade financeira do candidato face ao valor da renda. O candidato insere o valor exacto em euros.',
  commitments:        'Valor total de créditos, rendas ou outros encargos mensais fixos. Penaliza a capacidade financeira quando elevado.',
  job:                'Contrato sem termo tem maior pontuação. Determina também se é necessário apresentar fiador.',
  employmentDuration: 'Indica a estabilidade do rendimento. Maior duração contribui positivamente para o perfil de risco.',
  guarantor:          'Apresentar fiador pode desbloquear condições mais favoráveis e compensar outros factores.',
  intent:             'Indica se o candidato está numa fase avançada de tomada de decisão.',
  stayDuration:       'Candidatos com intenção de permanência mais longa são geralmente preferidos.',
  motivation:         'Contexto sobre a principal motivação da procura.',
  nationality:        'Permite avaliar a estabilidade de residência do candidato. Maiores períodos de residência estão associados a menor risco.',
  residencyDuration:  'Apenas perguntado quando a nacionalidade do candidato difere do país da agência. Maior duração resulta em pontução mais elevada.',
};

export function tQuestionDescription(key: string, fallback?: string): string {
  return QUESTION_DESCRIPTIONS[key] ?? fallback ?? '';
}

// ── Option display values (by English key) ────────────────────────────────────
// Mirrors the option keys defined in ScreeningRepository.cs.

const OPTION_VALUES: Record<string, string> = {
  // urgency
  immediately:     'Imediatamente',
  within_15_days:  'Em 15 dias',
  within_1_month:  'Em 1 mês',
  just_browsing:   'Só a explorar',
  // household
  only_me:     'Só eu',
  '2_people':  '2 pessoas',
  '3_people':  '3 pessoas',
  '4_or_more': '4 ou mais',
  // boolean (pets, guarantor, intent)
  yes: 'Sim',
  no:  'Não',
  // job
  permanent_contract:  'Contrato sem termo',
  fixed_term_contract: 'Contrato a prazo',
  self_employed:       'Independente',
  student:             'Estudante',
  between_jobs:        'Entre empregos',
  other:               'Outro',
  // employment duration
  under_6_months:  '< 6 meses',
  '6_to_12_months': '6–12 meses',
  '1_to_3_years':  '1–3 anos',
  over_3_years:    'Mais de 3 anos',
  // stay duration
  under_1_year:  '< 1 ano',
  '1_to_2_years': '1–2 anos',
  '2_to_3_years': '2–3 anos',
  '3_plus_years': '3+ anos',
  // motivation
  work_relocation:  'Relocalização por trabalho',
  better_price:     'Melhor preço',
  better_location:  'Melhor localização',
  // residencyDuration
  over_5_years:   'Há mais de 5 anos',
  '3_to_5_years': '3 a 5 anos',
  // '1_to_3_years' already defined above under employment duration
  // 'under_1_year' already defined above under stay duration
};

export function tScreeningOption(value: string): string {
  return OPTION_VALUES[value] ?? value;
}
