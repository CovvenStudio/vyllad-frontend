import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { monitoring } from '@/lib/monitoring/monitoring';
import { PublicScreeningDto, CustomScreeningQuestionDto } from '@/lib/screening-api';
import {
  CheckCircle2, Loader2, X, ChevronLeft,
  Zap, CalendarDays, Calendar, Eye,
  User, Users, UserPlus, Home,
  Ban, PawPrint,
  Banknote, Wallet, CreditCard, Gem,
  FileCheck2, FileText, Briefcase, HelpCircle,
  UserCheck, UserX,
  GraduationCap, Search,
  ThumbsUp, ThumbsDown,
  Tag, Plane, MessageCircle,
  MapPin, Globe,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Property } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { submitLead, submitLeadByAgency } from '@/lib/leads-api';

// ─── Scoring Engine ──────────────────────────────────────────────────────────

// ── Country list (ISO-2 code → Portuguese name) ───────────────────────────────
const COUNTRIES: { code: string; name: string }[] = [
  { code: 'PT', name: 'Portugal' },
  { code: 'BR', name: 'Brasil' },
  { code: 'AO', name: 'Angola' },
  { code: 'MZ', name: 'Moçambique' },
  { code: 'CV', name: 'Cabo Verde' },
  { code: 'GW', name: 'Guiné-Bissau' },
  { code: 'ST', name: 'São Tomé e Príncipe' },
  { code: 'GB', name: 'Reino Unido' },
  { code: 'FR', name: 'França' },
  { code: 'DE', name: 'Alemanha' },
  { code: 'ES', name: 'Espanha' },
  { code: 'IT', name: 'Itália' },
  { code: 'NL', name: 'Países Baixos' },
  { code: 'BE', name: 'Bélgica' },
  { code: 'CH', name: 'Suíça' },
  { code: 'AT', name: 'Áustria' },
  { code: 'LU', name: 'Luxemburgo' },
  { code: 'IE', name: 'Irlanda' },
  { code: 'SE', name: 'Suécia' },
  { code: 'NO', name: 'Noruega' },
  { code: 'DK', name: 'Dinamarca' },
  { code: 'FI', name: 'Finlândia' },
  { code: 'IS', name: 'Islândia' },
  { code: 'PL', name: 'Polónia' },
  { code: 'RO', name: 'Roménia' },
  { code: 'UA', name: 'Ucrânia' },
  { code: 'RU', name: 'Rússia' },
  { code: 'BY', name: 'Bielorrússia' },
  { code: 'MD', name: 'Moldávia' },
  { code: 'CZ', name: 'República Checa' },
  { code: 'SK', name: 'Eslováquia' },
  { code: 'HU', name: 'Hungria' },
  { code: 'HR', name: 'Croácia' },
  { code: 'RS', name: 'Sérvia' },
  { code: 'BG', name: 'Bulgária' },
  { code: 'GR', name: 'Grécia' },
  { code: 'TR', name: 'Turquia' },
  { code: 'LT', name: 'Lituânia' },
  { code: 'LV', name: 'Letónia' },
  { code: 'EE', name: 'Estónia' },
  { code: 'AL', name: 'Albânia' },
  { code: 'BA', name: 'Bósnia e Herzegovina' },
  { code: 'MK', name: 'Macedónia do Norte' },
  { code: 'MT', name: 'Malta' },
  { code: 'CY', name: 'Chipre' },
  { code: 'US', name: 'Estados Unidos' },
  { code: 'CA', name: 'Canadá' },
  { code: 'MX', name: 'México' },
  { code: 'AR', name: 'Argentina' },
  { code: 'CO', name: 'Colômbia' },
  { code: 'VE', name: 'Venezuela' },
  { code: 'CL', name: 'Chile' },
  { code: 'PE', name: 'Peru' },
  { code: 'EC', name: 'Equador' },
  { code: 'UY', name: 'Uruguai' },
  { code: 'BO', name: 'Bolívia' },
  { code: 'PY', name: 'Paraguai' },
  { code: 'CU', name: 'Cuba' },
  { code: 'DO', name: 'República Dominicana' },
  { code: 'NG', name: 'Nigéria' },
  { code: 'GH', name: 'Gana' },
  { code: 'SN', name: 'Senegal' },
  { code: 'CI', name: 'Costa do Marfim' },
  { code: 'CM', name: 'Camarões' },
  { code: 'MA', name: 'Marrocos' },
  { code: 'DZ', name: 'Argélia' },
  { code: 'TN', name: 'Tunísia' },
  { code: 'EG', name: 'Egipto' },
  { code: 'ZA', name: 'África do Sul' },
  { code: 'KE', name: 'Quénia' },
  { code: 'ET', name: 'Etiópia' },
  { code: 'TZ', name: 'Tanzânia' },
  { code: 'UG', name: 'Uganda' },
  { code: 'IN', name: 'Índia' },
  { code: 'PK', name: 'Paquistão' },
  { code: 'BD', name: 'Bangladesh' },
  { code: 'NP', name: 'Nepal' },
  { code: 'LK', name: 'Sri Lanka' },
  { code: 'CN', name: 'China' },
  { code: 'JP', name: 'Japão' },
  { code: 'KR', name: 'Coreia do Sul' },
  { code: 'TH', name: 'Tailândia' },
  { code: 'VN', name: 'Vietname' },
  { code: 'PH', name: 'Filipinas' },
  { code: 'ID', name: 'Indonésia' },
  { code: 'MY', name: 'Malásia' },
  { code: 'SG', name: 'Singapura' },
  { code: 'AU', name: 'Austrália' },
  { code: 'NZ', name: 'Nova Zelândia' },
  { code: 'IL', name: 'Israel' },
  { code: 'SA', name: 'Arábia Saudita' },
  { code: 'AE', name: 'Emirados Árabes Unidos' },
  { code: 'IR', name: 'Irão' },
  { code: 'GE', name: 'Geórgia' },
  { code: 'AM', name: 'Arménia' },
  { code: 'AZ', name: 'Azerbaijão' },
  { code: 'KZ', name: 'Cazaquistão' },
  { code: 'MU', name: 'Maurícias' },
];

interface LeadData {
  urgency: string;
  household: string;
  hasPets: boolean;
  petTypes: Record<string, number>; // { "dog": 1, "cat": 2 }
  income: string;
  monthlyCommitments: string;  // new D1
  job: string;
  employmentDuration: string;  // new D2
  hasGuarantor: string;
  hasVisited: string;
  stayDuration: string;        // new D4
  motivation: string;
  nationality: string;
  residencyDuration: string;
  name: string;
  phone: string;
  email: string;
  notes: string;
}

const INCOME_MIDPOINTS: Record<string, number> = {
  '< €1000': 700,
  '€1000–€2000': 1500,
  '€2000–€4000': 3000,
  '€4000+': 5500,
};

const URGENCY_SCORE: Record<string, number> = {
  'immediately':    15,
  'within_15_days': 12,
  'within_1_month': 8,
  'just_browsing':  2,
};

const JOB_SCORE: Record<string, number> = {
  'permanent_contract':  12,
  'fixed_term_contract': 9,
  'self_employed':       7,
  'student':             3,
  'between_jobs':        2,
  'other':               4,
};

// Returns whether the candidate needs to be asked about guarantor
function needsGuarantorStep(job: string, criteria: Property['criteria']): boolean {
  if (!criteria.guarantorRequired) return false;
  return job !== 'permanent_contract' && job !== 'fixed_term_contract';
}

function calcScore(data: LeadData, property: Property): number {
  let score = 0;
  const { criteria, price } = property;

  // ── Financial capacity (0–40) ────────────────────────────────────────────
  const income = INCOME_MIDPOINTS[data.income] || 0;
  if (income >= criteria.minIncome * 3.5) score += 40;
  else if (income >= criteria.minIncome * 3) score += 32;
  else if (income >= criteria.minIncome * 2.5) score += 24;
  else if (income >= criteria.minIncome * 2) score += 16;
  else if (income >= criteria.minIncome) score += 8;
  if (income < criteria.minIncome) score = Math.max(0, score - 15);

  // ── Property fit (0–25) ──────────────────────────────────────────────────
  const peopleMap: Record<string, number> = { 'only_me': 1, '2_people': 2, '3_people': 3, '4_or_more': 4 };
  const people = peopleMap[data.household] || 1;
  if (people <= criteria.maxPeople) score += 15;
  else if (people === criteria.maxPeople + 1) score += 5;
  else score = Math.max(0, score - 10);

  if (!data.hasPets) score += 10;
  else if (criteria.petsAllowed) score += 10;
  else score = Math.max(0, score - 15);

  // ── Guarantor fit ────────────────────────────────────────────────────────
  if (criteria.guarantorRequired) {
    if (data.hasGuarantor === 'yes') score += 8;
    else if (data.hasGuarantor === 'no' && criteria.advanceWithoutGuarantor) score += 3;
    else if (data.hasGuarantor === 'no') score = Math.max(0, score - 5);
  }

  // ── Urgency (0–15) ───────────────────────────────────────────────────────
  score += URGENCY_SCORE[data.urgency] || 0;

  // ── Intent & quality (0–20) ──────────────────────────────────────────────
  score += JOB_SCORE[data.job] || 4;
  if (data.hasVisited === 'yes') score += 5;
  if (data.motivation === 'work_relocation' || data.motivation === 'better_price') score += 3;

  // suppress unused variable warning
  void price;

  return Math.max(0, Math.min(100, score));
}

function getClassification(score: number) {
  if (score >= 70) return 'excellent';
  if (score >= 45) return 'potential';
  return 'low';
}

// ─── Option Button ────────────────────────────────────────────────────────────

const OptionBtn = ({
  label, icon, selected, onClick,
}: { label: string; icon?: React.ReactNode; selected: boolean; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border text-left text-sm font-medium transition-all ${
      selected
        ? 'border-primary bg-primary/5 text-primary'
        : 'border-border hover:border-primary/40 hover:bg-muted/50'
    }`}
  >
    {icon && (
      <span className={`flex-shrink-0 transition-colors ${selected ? 'text-primary' : 'text-muted-foreground'}`}>
        {icon}
      </span>
    )}
    <span>{label}</span>
    {selected && <CheckCircle2 className="w-4 h-4 ml-auto text-primary" />}
  </button>
);

// ─── Progress Bar ─────────────────────────────────────────────────────────────

const BASE_STEPS = ['disclaimer', 'urgency', 'nationality', 'residencyDuration', 'household', 'pets', 'income', 'commitments', 'job', 'employmentDuration', 'intent', 'stayDuration', 'motivation', 'contact'];
const STEPS_WITH_GUARANTOR = ['disclaimer', 'urgency', 'nationality', 'residencyDuration', 'household', 'pets', 'income', 'commitments', 'job', 'employmentDuration', 'guarantor', 'intent', 'stayDuration', 'motivation', 'contact'];

function computeSteps(
  screeningConfig: PublicScreeningDto | null,
  includeGuarantor: boolean,
): string[] {
  if (!screeningConfig) {
    return includeGuarantor ? STEPS_WITH_GUARANTOR : BASE_STEPS;
  }
  const ordered = screeningConfig.systemQuestions
    .filter(q => q.enabled)
    .sort((a, b) => a.order - b.order)
    .map(q => q.key);

  const result: string[] = [];
  for (const key of ordered) {
    // guarantor is conditional on employment type — skip if not applicable
    if (key === 'guarantor' && !includeGuarantor) continue;
    // residencyDuration is always inserted right after nationality (handled below)
    if (key === 'residencyDuration') continue;
    result.push(key);
    // always pair residencyDuration immediately after nationality
    if (key === 'nationality') result.push('residencyDuration');
  }
  // if nationality wasn't in system questions at all, still ensure both are absent (no half-pair)

  const customSteps = screeningConfig.customQuestions
    .sort((a, b) => a.order - b.order)
    .map(q => `custom_${q.id}`);

  return ['disclaimer', ...result, ...customSteps, 'contact'];
}

// ─── Custom Question Step ────────────────────────────────────────────────────

function CustomQuestionStep({
  question,
  value,
  onChange,
  onNext,
}: {
  question: CustomScreeningQuestionDto;
  value: string | string[];
  onChange: (v: string | string[]) => void;
  onNext: () => void;
}) {
  const strVal = typeof value === 'string' ? value : '';
  const arrVal = Array.isArray(value) ? value : [];

  const toggleMulti = (opt: string) =>
    onChange(arrVal.includes(opt) ? arrVal.filter(x => x !== opt) : [...arrVal, opt]);

  return (
    <div className="space-y-3">
      <h3 className="font-display text-xl font-bold mb-1">
        {question.label}
        {!question.required && (
          <span className="text-muted-foreground text-sm font-normal ml-2">(opcional)</span>
        )}
      </h3>
      {question.description && (
        <p className="text-sm text-muted-foreground mb-4">{question.description}</p>
      )}

      {question.type === 'single_choice' && question.options.map(opt => (
        <OptionBtn
          key={opt}
          label={opt}
          selected={strVal === opt}
          onClick={() => { onChange(opt); setTimeout(onNext, 200); }}
        />
      ))}

      {question.type === 'multi_choice' && (
        <>
          {question.options.map(opt => (
            <OptionBtn
              key={opt}
              label={opt}
              selected={arrVal.includes(opt)}
              onClick={() => toggleMulti(opt)}
            />
          ))}
          <Button
            onClick={onNext}
            disabled={question.required && arrVal.length === 0}
            className="w-full rounded-xl mt-2"
          >
            Continuar
          </Button>
        </>
      )}

      {question.type === 'boolean' && (
        <div className="grid grid-cols-2 gap-3">
          <OptionBtn label="Sim" selected={strVal === 'Sim'} onClick={() => { onChange('Sim'); setTimeout(onNext, 200); }} />
          <OptionBtn label="Não" selected={strVal === 'Não'} onClick={() => { onChange('Não'); setTimeout(onNext, 200); }} />
        </div>
      )}

      {question.type === 'text' && (
        <>
          <Input
            className="h-11 rounded-xl"
            placeholder="A sua resposta..."
            value={strVal}
            onChange={e => onChange(e.target.value)}
            autoFocus
          />
          <Button
            onClick={onNext}
            disabled={question.required && !strVal.trim()}
            className="w-full rounded-xl"
          >
            Continuar
          </Button>
        </>
      )}

      {!question.required && question.type !== 'single_choice' && question.type !== 'boolean' && (
        <button
          type="button"
          onClick={onNext}
          className="w-full text-xs text-muted-foreground hover:text-foreground py-2 transition-colors"
        >
          Saltar esta pergunta →
        </button>
      )}
    </div>
  );
}

const ProgressBar = ({ current, steps }: { current: string; steps: string[] }) => {
  const idx = steps.indexOf(current);
  const pct = idx < 0 ? 100 : ((idx + 1) / steps.length) * 100;
  return (
    <div className="w-full">
      <div className="h-1 bg-muted rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-primary rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>
      {idx >= 0 && (
        <p className="text-[11px] text-muted-foreground mt-1.5 text-right">
          Step {idx + 1} / {steps.length}
        </p>
      )}
    </div>
  );
};

// ─── Lead Form ────────────────────────────────────────────────────────────────

const slideVariants = {
  enter: { opacity: 0, x: 30 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -30 },
};

const LeadForm = ({
  property,
  onClose,
  screeningConfig,
}: {
  property: Property;
  onClose: () => void;
  screeningConfig: PublicScreeningDto | null;
}) => {
  const { toast } = useToast();
  const { t } = useTranslation(['public', 'screening', 'common']);
  const PET_TYPES = [
    { label: t('public:form.pets.dog'), icon: '🐕' },
    { label: t('public:form.pets.cat'), icon: '🐈' },
    { label: t('public:form.pets.bird'), icon: '🦜' },
    { label: t('public:form.pets.rabbit'), icon: '🐇' },
    { label: t('public:form.pets.fish'), icon: '🐟' },
    { label: t('public:form.pets.reptile'), icon: '🦎' },
    { label: t('public:form.pets.hamster'), icon: '🐹' },
  ];
  const [step, setStep] = useState<string>('disclaimer');
  const [stepHistory, setStepHistory] = useState<string[]>([]);
  const [data, setData] = useState<LeadData>({
    urgency: '', household: '', hasPets: false, petTypes: {},
    income: '', monthlyCommitments: '',
    job: '', employmentDuration: '',
    hasGuarantor: '', hasVisited: '', stayDuration: '', motivation: '',
    nationality: '', residencyDuration: '',
    name: '', phone: '', email: '', notes: '',
  });
  const [nationalitySearch, setNationalitySearch] = useState('');
  const [customAnswers, setCustomAnswers] = useState<Record<string, string | string[]>>({});

  // Freeze step list at mount so the total never changes mid-flow.
  // Whether guarantor is included depends solely on the property criteria,
  // not on the live value of data.job (which caused the counter to jump).
  const steps = useMemo(
    () => computeSteps(screeningConfig, property.criteria.guarantorRequired ?? false),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [screeningConfig, property.criteria.guarantorRequired],
  );

  function nextAfter(key: string): string {
    const idx = steps.indexOf(key);
    if (idx < 0 || idx >= steps.length - 1) return 'contact';
    return steps[idx + 1];
  }

  // After job → always go to employmentDuration first.
  function destAfterJob(_jobValue: string): string {
    return nextAfter('job'); // → 'employmentDuration'
  }

  // After employmentDuration → conditionally skip guarantor step.
  function destAfterEmploymentDuration(): string {
    if (!property.criteria.guarantorRequired) return nextAfter('employmentDuration');
    return needsGuarantorStep(data.job, property.criteria)
      ? nextAfter('employmentDuration') // → 'guarantor'
      : nextAfter('guarantor');          // skip to 'intent'
  }

  // After nationality → skip residencyDuration if candidate is a national.
  function destAfterNationality(nationalityCode: string): string {
    const agencyCountry = screeningConfig?.agencyCountryCode ?? '';
    const isNational = agencyCountry && nationalityCode.toUpperCase() === agencyCountry.toUpperCase();
    return isNational
      ? nextAfter('residencyDuration') // skip residencyDuration → contact
      : nextAfter('nationality');       // → residencyDuration
  }
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; classification: string } | null>(null);
  const [jobIsOther, setJobIsOther] = useState(false);
  const [motivationIsOther, setMotivationIsOther] = useState(false);

  const set = (field: keyof LeadData, value: string | boolean | string[]) =>
    setData(prev => ({ ...prev, [field]: value }));

  const togglePetType = (type: string, quantity: number) => {
    setData(prev => {
      const updated = { ...prev.petTypes };
      if (quantity <= 0) {
        delete updated[type];
      } else {
        updated[type] = quantity;
      }
      return { ...prev, petTypes: updated };
    });
  };

  const next = (nextStep: string) => {
    setStepHistory(h => [...h, step]);
    setStep(nextStep);
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      const payload = {
        name: data.name,
        email: data.email,
        phone: data.phone,
        notes: data.notes || undefined,
        income: data.income,
        monthlyCommitments: data.monthlyCommitments,
        job: data.job,
        employmentDuration: data.employmentDuration,
        hasGuarantor: data.hasGuarantor,
        household: data.household,
        hasPets: data.hasPets,
        petTypes: Object.entries(data.petTypes).map(([type, qty]) => `${type}:${qty}`),
        urgency: data.urgency,
        stayDuration: data.stayDuration,
        hasVisited: data.hasVisited,
        motivation: data.motivation,
        nationality: data.nationality,
        residencyDuration: data.residencyDuration,
        customAnswers: Object.fromEntries(
          Object.entries(customAnswers).map(([k, v]) => [k, Array.isArray(v) ? v.join(', ') : v])
        ),
      };
      const res = property.agencySlug
        ? await submitLeadByAgency(property.agencySlug, property.slug, payload)
        : await submitLead(property.slug, payload);
      setResult({ score: res.score, classification: res.classification });
      setStep('result');
    } catch (err) {
      monitoring.captureException(err, { context: 'lead-form-submit' });
      toast({ title: 'Erro ao enviar candidatura. Tente novamente.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitting) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">{t('common:loading')}</p>
      </div>
    );
  }

  if (step === 'result' && result) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-6 space-y-6">
        <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8 text-emerald-600" />
        </div>
        <div>
          <h3 className="font-display text-xl font-bold mb-2">{t('public:visit.submitSuccess')}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t('public:visit.submitSubtitle')}
          </p>
        </div>
        <div className="p-4 rounded-xl bg-muted/50 border text-sm text-left space-y-3">
          <div className="flex gap-3">
            <Home className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
            <p className="text-muted-foreground">{t('public:form.disclaimer.description')}</p>
          </div>
        </div>
      </motion.div>
    );
  }

  // Custom question step renderers (generated from screeningConfig)
  const customStepContent: Record<string, React.ReactNode> = Object.fromEntries(
    (screeningConfig?.customQuestions ?? []).map(q => [
      `custom_${q.id}`,
      <CustomQuestionStep
        key={q.id}
        question={q}
        value={customAnswers[q.id] ?? (q.type === 'multi_choice' ? [] : '')}
        onChange={v => setCustomAnswers(prev => ({ ...prev, [q.id]: v }))}
        onNext={() => next(nextAfter(`custom_${q.id}`))}
      />,
    ])
  );

  const stepContent: Record<string, React.ReactNode> = {
    disclaimer: (
      <div className="space-y-5">
        <div className="flex flex-col items-center text-center gap-3 pb-2">
          <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center">
            <FileCheck2 className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h3 className="font-display text-xl font-bold">{t('public:form.disclaimer.title')}</h3>
            <p className="text-sm text-muted-foreground mt-1">{t('public:form.disclaimer.description')}</p>
          </div>
        </div>
        <div className="rounded-xl border bg-amber-50/60 p-4 space-y-3 text-sm text-amber-900">
          <p className="font-semibold">{t('public:form.disclaimer.responsibilityTitle')}</p>
          <p className="leading-relaxed text-amber-800">
            {t('public:form.disclaimer.body1')}
          </p>
          <p className="leading-relaxed text-amber-800">
            {t('public:form.disclaimer.body2')}
          </p>
        </div>
        <Button
          onClick={() => next(nextAfter('disclaimer'))}
          className="w-full h-12 rounded-xl font-semibold text-sm"
        >
          {t('public:form.steps.next')}
        </Button>
      </div>
    ),
    urgency: (
      <div className="space-y-3">
        <h3 className="font-display text-xl font-bold mb-1">{t('screening:questions.urgency')}</h3>
        <p className="text-sm text-muted-foreground mb-4">{t('screening:descriptions.urgency')}</p>
        {[
          { key: 'immediately',    icon: <Zap className="w-4 h-4" /> },
          { key: 'within_15_days', icon: <CalendarDays className="w-4 h-4" /> },
          { key: 'within_1_month', icon: <Calendar className="w-4 h-4" /> },
          { key: 'just_browsing',  icon: <Eye className="w-4 h-4" /> },
        ].map(o => (
          <OptionBtn key={o.key} label={t(`screening:options.${o.key}`)} icon={o.icon}
            selected={data.urgency === o.key}
            onClick={() => { set('urgency', o.key); setTimeout(() => next(nextAfter('urgency')), 200); }}
          />
        ))}
      </div>
    ),

    household: (
      <div className="space-y-3">
        <h3 className="font-display text-xl font-bold mb-1">{t('screening:questions.household')}</h3>
        <p className="text-sm text-muted-foreground mb-4">{t('screening:descriptions.household')}</p>
        {[
          { key: 'only_me',   icon: <User className="w-4 h-4" /> },
          { key: '2_people',  icon: <Users className="w-4 h-4" /> },
          { key: '3_people',  icon: <UserPlus className="w-4 h-4" /> },
          { key: '4_or_more', icon: <Home className="w-4 h-4" /> },
        ].map(o => (
          <OptionBtn key={o.key} label={t(`screening:options.${o.key}`)} icon={o.icon}
            selected={data.household === o.key}
            onClick={() => { set('household', o.key); setTimeout(() => next(nextAfter('household')), 200); }}
          />
        ))}
      </div>
    ),

    pets: (
      <div className="space-y-4">
        <h3 className="font-display text-xl font-bold mb-1">{t('screening:questions.pets')}</h3>
        <p className="text-sm text-muted-foreground mb-2">{t('screening:descriptions.pets')}</p>
        <div className="grid grid-cols-2 gap-3">
          <OptionBtn label={t('screening:options.no')} icon={<Ban className="w-4 h-4" />}
            selected={data.hasPets === false && data.urgency !== ''}
            onClick={() => { set('hasPets', false); setTimeout(() => next(nextAfter('pets')), 200); }}
          />
          <OptionBtn label={t('screening:options.yes')} icon={<PawPrint className="w-4 h-4" />}
            selected={data.hasPets === true}
            onClick={() => set('hasPets', true)}
          />
        </div>

        <AnimatePresence>
          {data.hasPets && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="pt-2 space-y-4">
                <div>
                  <Label className="text-xs font-medium mb-3 block">{t('public:form.steps.pets.types')}</Label>
                  <div className="flex flex-wrap gap-2">
                    {PET_TYPES.map(({ label, icon }) => {
                      const qty = data.petTypes[label] || 0;
                      return (
                        <div key={label} className={`flex items-center gap-2 px-3 py-2 rounded-full border transition-all ${qty > 0 ? 'border-primary bg-primary/5' : 'border-border bg-muted/30'}`}>
                          <span>{icon}</span>
                          <span className="text-xs font-medium">{label}</span>
                          <div className="flex items-center gap-1 ml-1">
                            <button type="button" onClick={() => togglePetType(label, qty - 1)} disabled={qty === 0}
                              className="w-5 h-5 rounded flex items-center justify-center text-xs hover:bg-muted disabled:opacity-40">−</button>
                            <span className="w-6 text-center text-xs font-semibold">{qty}</span>
                            <button type="button" onClick={() => togglePetType(label, qty + 1)}
                              className="w-5 h-5 rounded flex items-center justify-center text-xs hover:bg-muted">+</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <Button onClick={() => next(nextAfter('pets'))} disabled={Object.values(data.petTypes).every(q => q === 0)} className="w-full rounded-xl">
                  {t('public:form.steps.next')}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    ),

    income: (
      <div className="space-y-4">
        <h3 className="font-display text-xl font-bold mb-1">{t('screening:questions.income')}</h3>
        <p className="text-sm text-muted-foreground mb-2">{t('screening:descriptions.income')}</p>
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground font-medium text-sm">€</span>
          <Input
            type="number"
            min={0}
            step={50}
            placeholder="ex: 2500"
            value={data.income}
            onChange={e => set('income', e.target.value)}
            className="h-12 rounded-xl pl-8 text-base font-mono"
            autoFocus
          />
        </div>
        <Button
          disabled={!data.income || Number(data.income) <= 0}
          onClick={() => next(nextAfter('income'))}
          className="w-full rounded-xl"
        >
          {t('public:form.steps.next')}
        </Button>
      </div>
    ),

    commitments: (
      <div className="space-y-4">
        <h3 className="font-display text-xl font-bold mb-1">{t('screening:questions.commitments')}</h3>
        <p className="text-sm text-muted-foreground mb-2">{t('screening:descriptions.commitments')}</p>
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground font-medium text-sm">€</span>
          <Input
            type="number"
            min={0}
            step={50}
            placeholder="ex: 350"
            value={data.monthlyCommitments}
            onChange={e => set('monthlyCommitments', e.target.value)}
            className="h-12 rounded-xl pl-8 text-base font-mono"
            autoFocus
          />
        </div>
        <Button
          disabled={data.monthlyCommitments === ''}
          onClick={() => next(nextAfter('commitments'))}
          className="w-full rounded-xl"
        >
          {t('public:form.steps.next')}
        </Button>
      </div>
    ),

    job: (
      <div className="space-y-3">
        <h3 className="font-display text-xl font-bold mb-1">{t('screening:questions.job')}</h3>
        <p className="text-sm text-muted-foreground mb-4">{t('screening:descriptions.job')}</p>
        {[
          { key: 'permanent_contract',  icon: <FileCheck2 className="w-4 h-4" /> },
          { key: 'fixed_term_contract', icon: <FileText className="w-4 h-4" /> },
          { key: 'self_employed',       icon: <Briefcase className="w-4 h-4" /> },
          { key: 'student',             icon: <GraduationCap className="w-4 h-4" /> },
          { key: 'between_jobs',        icon: <Search className="w-4 h-4" /> },
          { key: 'other',               icon: <HelpCircle className="w-4 h-4" /> },
        ].map(o => (
          <OptionBtn key={o.key} label={t(`screening:options.${o.key}`)} icon={o.icon}
            selected={o.key === 'other' ? jobIsOther : (!jobIsOther && data.job === o.key)}
            onClick={() => {
              if (o.key === 'other') {
                setJobIsOther(true);
                set('job', '');
              } else {
                setJobIsOther(false);
                set('job', o.key);
                setTimeout(() => next(destAfterJob(o.key)), 200);
              }
            }}
          />
        ))}
        <AnimatePresence>
          {jobIsOther && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="space-y-3 pt-1 pb-1 px-1">
                <Input
                  placeholder={t('public:form.steps.job.descPlaceholder')}
                  value={data.job}
                  onChange={e => set('job', e.target.value)}
                  className="h-11 rounded-xl"
                  autoFocus
                />
                <Button
                  disabled={!data.job.trim()}
                  onClick={() => next(destAfterJob(data.job))}
                  className="w-full rounded-xl"
                >
                  {t('public:form.steps.next')}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    ),

    employmentDuration: (
      <div className="space-y-3">
        <h3 className="font-display text-xl font-bold mb-1">{t('screening:questions.employmentDuration')}</h3>
        <p className="text-sm text-muted-foreground mb-4">{t('screening:descriptions.employmentDuration')}</p>
        {[
          { key: 'under_6_months' },
          { key: '6_to_12_months' },
          { key: '1_to_3_years' },
          { key: 'over_3_years' },
        ].map(o => (
          <OptionBtn key={o.key} label={t(`screening:options.${o.key}`)}
            selected={data.employmentDuration === o.key}
            onClick={() => { set('employmentDuration', o.key); setTimeout(() => next(destAfterEmploymentDuration()), 200); }}
          />
        ))}
      </div>
    ),

    guarantor: (() => {
      const hasGuarantorData = data.hasGuarantor;
      const advance = hasGuarantorData === 'no' && property.criteria.advanceWithoutGuarantor
        ? property.criteria.advanceWithoutGuarantor
        : property.criteria.advanceMonths;
      const deposit = hasGuarantorData === 'no' && property.criteria.depositWithoutGuarantor
        ? property.criteria.depositWithoutGuarantor
        : property.criteria.depositMonths;
      const rent = property.rentalPrice || property.price;

      return (
        <div className="space-y-4">
          <h3 className="font-display text-xl font-bold mb-1">{t('screening:questions.guarantor')}</h3>
          <p className="text-sm text-muted-foreground mb-2">
            {t('screening:descriptions.guarantor')}
          </p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: 'yes', Icon: UserCheck },
              { value: 'no',  Icon: UserX },
            ].map(({ value, Icon }) => {
              const sel = data.hasGuarantor === value;
              const label = t(`screening:options.${value}`);
              return (
                <button key={value} type="button" onClick={() => set('hasGuarantor', value)}
                  className={`relative flex flex-col items-center justify-center gap-2 py-6 px-3 rounded-2xl border text-center transition-all ${
                    sel ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/40 hover:bg-muted/50'
                  }`}>
                  <span className={`p-2.5 rounded-full transition-colors ${sel ? 'bg-primary/10' : 'bg-muted'}`}>
                    <Icon className={`w-5 h-5 transition-colors ${sel ? 'text-primary' : 'text-muted-foreground'}`} />
                  </span>
                  <span className="text-sm font-semibold leading-tight">{label}</span>
                  {sel && <CheckCircle2 className="absolute top-2.5 right-2.5 w-4 h-4 text-primary" />}
                </button>
              );
            })}
          </div>

          <AnimatePresence>
            {hasGuarantorData !== '' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="p-4 rounded-xl bg-muted/50 border space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('public:form.guarantorSection.title')}</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{t('public:form.guarantorSection.advance', { count: advance })}</span>
                      <span className="font-bold">€{(advance * (rent ?? 0)).toLocaleString('pt-PT')}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{t('public:form.guarantorSection.deposit', { count: deposit })}</span>
                      <span className="font-bold">€{(deposit * (rent ?? 0)).toLocaleString('pt-PT')}</span>
                    </div>
                    <div className="border-t pt-2 flex items-center justify-between text-sm font-bold">
                      <span>{t('public:form.guarantorSection.total')}</span>
                      <span>€{((advance + deposit) * (rent ?? 0)).toLocaleString('pt-PT')}</span>
                    </div>
                  </div>
                  {hasGuarantorData === 'no' && property.criteria.advanceWithoutGuarantor && (
                    <p className="text-xs text-amber-600">{t('public:form.disclaimer.guarantorNote')}</p>
                  )}
                </div>
                <Button onClick={() => next(nextAfter('guarantor'))} className="w-full rounded-xl mt-3">
                  {t('public:form.steps.next')}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      );
    })(),

    intent: (
      <div className="space-y-3">
        <h3 className="font-display text-xl font-bold mb-1">{t('screening:questions.intent')}</h3>
        <p className="text-sm text-muted-foreground mb-4">{t('screening:descriptions.intent')}</p>
        <div className="grid grid-cols-2 gap-3">
          <OptionBtn label={t('screening:options.yes')} icon={<ThumbsUp className="w-4 h-4" />}
            selected={data.hasVisited === 'yes'}
            onClick={() => { set('hasVisited', 'yes'); setTimeout(() => next(nextAfter('intent')), 200); }}
          />
          <OptionBtn label={t('screening:options.no')} icon={<ThumbsDown className="w-4 h-4" />}
            selected={data.hasVisited === 'no'}
            onClick={() => { set('hasVisited', 'no'); setTimeout(() => next(nextAfter('intent')), 200); }}
          />
        </div>
      </div>
    ),

    stayDuration: (
      <div className="space-y-3">
        <h3 className="font-display text-xl font-bold mb-1">{t('screening:questions.stayDuration')}</h3>
        <p className="text-sm text-muted-foreground mb-4">{t('screening:descriptions.stayDuration')}</p>
        {[
          { key: 'under_1_year' },
          { key: '1_to_2_years' },
          { key: '2_to_3_years' },
          { key: '3_plus_years' },
        ].map(o => (
          <OptionBtn key={o.key} label={t(`screening:options.${o.key}`)}
            selected={data.stayDuration === o.key}
            onClick={() => { set('stayDuration', o.key); setTimeout(() => next(nextAfter('stayDuration')), 200); }}
          />
        ))}
        <button type="button" onClick={() => next(nextAfter('stayDuration'))} className="w-full text-xs text-muted-foreground hover:text-foreground py-2 transition-colors">
          {t('public:form.steps.skip')}
        </button>
      </div>
    ),

    motivation: (
      <div className="space-y-3">
        <h3 className="font-display text-xl font-bold mb-1">{t('screening:questions.motivation')} <span className="text-muted-foreground text-sm font-normal">({t('public:form.steps.skip').replace(' →', '')})</span></h3>
        {[
          { key: 'better_location',  icon: <MapPin className="w-4 h-4" /> },
          { key: 'better_price',     icon: <Tag className="w-4 h-4" /> },
          { key: 'work_relocation',  icon: <Plane className="w-4 h-4" /> },
          { key: 'other',            icon: <MessageCircle className="w-4 h-4" /> },
        ].map(o => (
          <OptionBtn key={o.key} label={t(`screening:options.${o.key}`)} icon={o.icon}
            selected={o.key === 'other' ? motivationIsOther : (!motivationIsOther && data.motivation === o.key)}
            onClick={() => {
              if (o.key === 'other') {
                setMotivationIsOther(true);
                set('motivation', '');
              } else {
                setMotivationIsOther(false);
                set('motivation', o.key);
                setTimeout(() => next(nextAfter('motivation')), 200);
              }
            }}
          />
        ))}
        <AnimatePresence>
          {motivationIsOther && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="space-y-3 pt-1 pb-1 px-1">
                <Input
                  placeholder={t('public:form.steps.motivation.placeholder')}
                  value={data.motivation}
                  onChange={e => set('motivation', e.target.value)}
                  className="h-11 rounded-xl"
                  autoFocus
                />
                <Button
                  disabled={!data.motivation.trim()}
                  onClick={() => next(nextAfter('motivation'))}
                  className="w-full rounded-xl"
                >
                  {t('public:form.steps.next')}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {!motivationIsOther && (
          <button type="button" onClick={() => next(nextAfter('motivation'))} className="w-full text-xs text-muted-foreground hover:text-foreground py-2 transition-colors">
            {t('public:form.steps.skip')}
          </button>
        )}
      </div>
    ),

    nationality: (() => {
      const filtered = nationalitySearch.trim()
        ? COUNTRIES.filter(c =>
            c.name.toLowerCase().includes(nationalitySearch.toLowerCase()) ||
            c.code.toLowerCase().includes(nationalitySearch.toLowerCase())
          )
        : COUNTRIES;
      return (
        <div className="space-y-3">
          <h3 className="font-display text-xl font-bold mb-1">{t('screening:questions.nationality')}</h3>
          <p className="text-sm text-muted-foreground mb-3">{t('screening:descriptions.nationality')}</p>
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t('public:form.steps.nationality.search')}
              value={nationalitySearch}
              onChange={e => setNationalitySearch(e.target.value)}
              className="h-11 rounded-xl pl-9"
              autoFocus
            />
          </div>
          <div className="max-h-52 overflow-y-auto space-y-1 pr-1">
            {filtered.map(c => (
              <button
                key={c.code}
                type="button"
                onClick={() => {
                  set('nationality', c.code);
                  setNationalitySearch(c.name);
                  setTimeout(() => next(destAfterNationality(c.code)), 200);
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border text-left text-sm font-medium transition-all ${
                  data.nationality === c.code
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border hover:border-primary/40 hover:bg-muted/50'
                }`}
              >
                <span className="flex-1">{c.name}</span>
                {data.nationality === c.code && <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      );
    })(),

    residencyDuration: (() => {
      const agencyCountryCode = screeningConfig?.agencyCountryCode ?? '';
      const agencyCountryName = COUNTRIES.find(c => c.code === agencyCountryCode)?.name ?? 'Portugal';
      return (
        <div className="space-y-3">
          <h3 className="font-display text-xl font-bold mb-1">Há quanto tempo reside em {agencyCountryName}?</h3>
          <p className="text-sm text-muted-foreground mb-4">{t('screening:descriptions.residencyDuration')}</p>
          {[
            { key: 'under_1_year' },
            { key: '1_to_3_years' },
            { key: '3_to_5_years' },
            { key: 'over_5_years' },
          ].map(o => (
            <OptionBtn key={o.key} label={t(`screening:options.${o.key}`)}
              selected={data.residencyDuration === o.key}
              onClick={() => { set('residencyDuration', o.key); setTimeout(() => next(nextAfter('residencyDuration')), 200); }}
            />
          ))}
        </div>
      );
    })(),

    contact: (
      <div className="space-y-4">
        <h3 className="font-display text-xl font-bold mb-1">{t('public:form.contact.title')}</h3>
        <p className="text-sm text-muted-foreground mb-2">{t('public:form.disclaimer.description')}</p>
        <div className="rounded-xl border bg-muted/40 px-4 py-3 text-xs text-muted-foreground leading-relaxed mb-2">
          {t('public:form.contact.notes')}
        </div>
        <div>
          <Label className="text-xs font-medium">{t('public:form.contact.name')}</Label>
          <Input placeholder={t('public:form.contact.namePlaceholder')} value={data.name} onChange={e => set('name', e.target.value)} className="mt-1 h-11 rounded-xl" />
        </div>
        <div>
          <Label className="text-xs font-medium">{t('public:form.contact.phone')}</Label>
          <Input type="tel" placeholder="+351 912 345 678" value={data.phone} onChange={e => set('phone', e.target.value)} className="mt-1 h-11 rounded-xl" />
        </div>
        <div>
          <Label className="text-xs font-medium">{t('public:form.contact.email')}</Label>
          <Input type="email" placeholder="maria@email.com" value={data.email} onChange={e => set('email', e.target.value)} className="mt-1 h-11 rounded-xl" />
        </div>
        <div>
          <Label className="text-xs font-medium text-muted-foreground">{t('public:form.contact.notes')}</Label>
          <textarea
            placeholder={t('public:form.contact.notesPlaceholder')}
            value={data.notes ?? ''}
            onChange={e => set('notes', e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
          />
        </div>
        <Button
          onClick={submit}
          disabled={!data.name || !data.phone || !data.email}
          className="w-full h-12 rounded-xl font-semibold text-sm"
        >
          {t('public:form.contact.submit')}
        </Button>
      </div>
    ),
  };

  const currentContent = stepContent[step] ?? customStepContent[step];

  return (
    <div className="space-y-4">
      <ProgressBar current={step} steps={steps} />

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          {currentContent}
        </motion.div>
      </AnimatePresence>

      {step !== 'urgency' && step !== 'result' && step !== 'contact' && (
        <button
          type="button"
          onClick={() => {
            if (stepHistory.length > 0) {
              const prev = stepHistory[stepHistory.length - 1];
              setStepHistory(h => h.slice(0, -1));
              setStep(prev);
            }
          }}
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors pt-1"
        >
          <ChevronLeft className="w-3 h-3" /> {t('public:form.steps.back')}
        </button>
      )}
    </div>
  );
};

export default LeadForm;
