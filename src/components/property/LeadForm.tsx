import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
import { submitLead } from '@/lib/leads-api';

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
  petCount: string;
  petTypes: string[];
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
  'Imediatamente': 15,
  'Em 15 dias': 12,
  'Em 1 mês': 8,
  'Só a explorar': 2,
};

const JOB_SCORE: Record<string, number> = {
  'Contrato sem termo': 12,
  'Contrato a prazo': 9,
  'Independente': 7,
  'Estudante': 3,
  'Entre empregos': 2,
  'Outro': 4,
};

// Returns whether the candidate needs to be asked about guarantor
function needsGuarantorStep(job: string, criteria: Property['criteria']): boolean {
  if (!criteria.guarantorRequired) return false;
  return job !== 'Contrato sem termo' && job !== 'Contrato a prazo';
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
  const peopleMap: Record<string, number> = { 'Só eu': 1, '2 pessoas': 2, '3 pessoas': 3, '4 ou mais': 4 };
  const people = peopleMap[data.household] || 1;
  if (people <= criteria.maxPeople) score += 15;
  else if (people === criteria.maxPeople + 1) score += 5;
  else score = Math.max(0, score - 10);

  if (!data.hasPets) score += 10;
  else if (criteria.petsAllowed) score += 10;
  else score = Math.max(0, score - 15);

  // ── Guarantor fit ────────────────────────────────────────────────────────
  if (criteria.guarantorRequired) {
    if (data.hasGuarantor === 'Sim') score += 8;
    else if (data.hasGuarantor === 'Não' && criteria.advanceWithoutGuarantor) score += 3;
    else if (data.hasGuarantor === 'Não') score = Math.max(0, score - 5);
  }

  // ── Urgency (0–15) ───────────────────────────────────────────────────────
  score += URGENCY_SCORE[data.urgency] || 0;

  // ── Intent & quality (0–20) ──────────────────────────────────────────────
  score += JOB_SCORE[data.job] || 4;
  if (data.hasVisited === 'Sim') score += 5;
  if (data.motivation === 'Relocalização por trabalho' || data.motivation === 'Melhor preço') score += 3;

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
          Passo {idx + 1} de {steps.length}
        </p>
      )}
    </div>
  );
};

// ─── Lead Form ────────────────────────────────────────────────────────────────

const PET_TYPES = [
  { label: 'Cão', icon: '🐕' },
  { label: 'Gato', icon: '🐈' },
  { label: 'Pássaro', icon: '🦜' },
  { label: 'Coelho', icon: '🐇' },
  { label: 'Peixe', icon: '🐟' },
  { label: 'Réptil', icon: '🦎' },
  { label: 'Hamster', icon: '🐹' },
];

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
  const [step, setStep] = useState<string>('disclaimer');
  const [stepHistory, setStepHistory] = useState<string[]>([]);
  const [data, setData] = useState<LeadData>({
    urgency: '', household: '', hasPets: false, petCount: '', petTypes: [],
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

  const togglePetType = (type: string) => {
    setData(prev => ({
      ...prev,
      petTypes: prev.petTypes.includes(type)
        ? prev.petTypes.filter(t => t !== type)
        : [...prev.petTypes, type],
    }));
  };

  const next = (nextStep: string) => {
    setStepHistory(h => [...h, step]);
    setStep(nextStep);
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      const res = await submitLead(property.slug, {
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
        petTypes: data.petTypes,
        urgency: data.urgency,
        stayDuration: data.stayDuration,
        hasVisited: data.hasVisited,
        motivation: data.motivation,
        nationality: data.nationality,
        residencyDuration: data.residencyDuration,
        customAnswers: Object.fromEntries(
          Object.entries(customAnswers).map(([k, v]) => [k, Array.isArray(v) ? v.join(', ') : v])
        ),
      });
      setResult({ score: res.score, classification: res.classification });
      setStep('result');
    } catch {
      toast({ title: 'Erro ao enviar candidatura. Tente novamente.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitting) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">A analisar o seu perfil…</p>
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
          <h3 className="font-display text-xl font-bold mb-2">Candidatura recebida!</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            A sua candidatura foi submetida com sucesso. Receberá um email assim que os nossos agentes analisarem a sua candidatura.
          </p>
        </div>
        <div className="p-4 rounded-xl bg-muted/50 border text-sm text-left space-y-3">
          <div className="flex gap-3">
            <Home className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
            <p className="text-muted-foreground">Assim que a candidatura for <strong className="text-foreground">aprovada</strong>, poderá marcar a visita ao imóvel diretamente pelo link.</p>
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
            <h3 className="font-display text-xl font-bold">Antes de começar</h3>
            <p className="text-sm text-muted-foreground mt-1">Leia com atenção antes de preencher a sua candidatura.</p>
          </div>
        </div>
        <div className="rounded-xl border bg-amber-50/60 p-4 space-y-3 text-sm text-amber-900">
          <p className="font-semibold">Responsabilidade pela veracidade dos dados</p>
          <p className="leading-relaxed text-amber-800">
            Ao preencher este formulário, declara que todas as informações fornecidas são verdadeiras e atualizadas.
            Qualquer inconsistência ou falsidade nos dados indicados poderá prejudicar a sua candidatura ou resultar na sua eliminação do processo.
          </p>
          <p className="leading-relaxed text-amber-800">
            Se tiver informações adicionais que considere relevantes para a sua candidatura, poderá partilhá-las no último passo do formulário.
          </p>
        </div>
        <Button
          onClick={() => next(nextAfter('disclaimer'))}
          className="w-full h-12 rounded-xl font-semibold text-sm"
        >
          Compreendo, continuar
        </Button>
      </div>
    ),
    urgency: (
      <div className="space-y-3">
        <h3 className="font-display text-xl font-bold mb-1">Quando planeia mudar-se?</h3>
        <p className="text-sm text-muted-foreground mb-4">Ajuda-nos a perceber a urgência da sua procura.</p>
        {[
          { label: 'Imediatamente', icon: <Zap className="w-4 h-4" /> },
          { label: 'Em 15 dias', icon: <CalendarDays className="w-4 h-4" /> },
          { label: 'Em 1 mês', icon: <Calendar className="w-4 h-4" /> },
          { label: 'Só a explorar', icon: <Eye className="w-4 h-4" /> },
        ].map(o => (
          <OptionBtn key={o.label} label={o.label} icon={o.icon}
            selected={data.urgency === o.label}
            onClick={() => { set('urgency', o.label); setTimeout(() => next(nextAfter('urgency')), 200); }}
          />
        ))}
      </div>
    ),

    household: (
      <div className="space-y-3">
        <h3 className="font-display text-xl font-bold mb-1">Quem vai viver no imóvel?</h3>
        <p className="text-sm text-muted-foreground mb-4">Inclua todas as pessoas que vão residir.</p>
        {[
          { label: 'Só eu', icon: <User className="w-4 h-4" /> },
          { label: '2 pessoas', icon: <Users className="w-4 h-4" /> },
          { label: '3 pessoas', icon: <UserPlus className="w-4 h-4" /> },
          { label: '4 ou mais', icon: <Home className="w-4 h-4" /> },
        ].map(o => (
          <OptionBtn key={o.label} label={o.label} icon={o.icon}
            selected={data.household === o.label}
            onClick={() => { set('household', o.label); setTimeout(() => next(nextAfter('household')), 200); }}
          />
        ))}
      </div>
    ),

    pets: (
      <div className="space-y-4">
        <h3 className="font-display text-xl font-bold mb-1">Vai trazer animais de estimação?</h3>
        <p className="text-sm text-muted-foreground mb-2">Seja honesto — ajuda a encontrar o imóvel certo.</p>
        <div className="grid grid-cols-2 gap-3">
          <OptionBtn label="Não" icon={<Ban className="w-4 h-4" />}
            selected={data.hasPets === false && data.urgency !== ''}
            onClick={() => { set('hasPets', false); setTimeout(() => next(nextAfter('pets')), 200); }}
          />
          <OptionBtn label="Sim" icon={<PawPrint className="w-4 h-4" />}
            selected={data.hasPets === true}
            onClick={() => set('hasPets', true)}
          />
        </div>

        <AnimatePresence>
          {data.hasPets && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="pt-2 space-y-4">
                <div>
                  <Label className="text-xs font-medium mb-2 block">Quantos animais?</Label>
                  <div className="flex gap-2">
                    {['1', '2', '3+'].map(n => (
                      <button key={n} type="button" onClick={() => set('petCount', n)}
                        className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all ${data.petCount === n ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:bg-muted/50'}`}>
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-medium mb-2 block">Que tipo(s) de animais?</Label>
                  <div className="flex flex-wrap gap-2">
                    {PET_TYPES.map(({ label, icon }) => (
                      <button key={label} type="button" onClick={() => togglePetType(label)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${data.petTypes.includes(label) ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:bg-muted/50'}`}>
                        <span>{icon}</span> {label}
                        {data.petTypes.includes(label) && <X className="w-2.5 h-2.5 ml-0.5" />}
                      </button>
                    ))}
                  </div>
                </div>
                <Button onClick={() => next(nextAfter('pets'))} disabled={!data.petCount || data.petTypes.length === 0} className="w-full rounded-xl">
                  Continuar
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    ),

    income: (
      <div className="space-y-4">
        <h3 className="font-display text-xl font-bold mb-1">Qual o rendimento mensal líquido do agregado?</h3>
        <p className="text-sm text-muted-foreground mb-2">Valor líquido total de todos os membros do agregado que vão residir no imóvel.</p>
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
          Continuar
        </Button>
      </div>
    ),

    commitments: (
      <div className="space-y-4">
        <h3 className="font-display text-xl font-bold mb-1">Tem prestações ou encargos mensais fixos?</h3>
        <p className="text-sm text-muted-foreground mb-2">Indique o valor total mensal (crédito automóvel, habitação, outros). Coloque 0 se não tiver nenhum.</p>
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
          Continuar
        </Button>
      </div>
    ),

    job: (
      <div className="space-y-3">
        <h3 className="font-display text-xl font-bold mb-1">Qual é a sua situação profissional?</h3>
        <p className="text-sm text-muted-foreground mb-4">Esta informação é confidencial e serve apenas para qualificação.</p>
        {[
          { label: 'Contrato sem termo', icon: <FileCheck2 className="w-4 h-4" /> },
          { label: 'Contrato a prazo', icon: <FileText className="w-4 h-4" /> },
          { label: 'Independente', icon: <Briefcase className="w-4 h-4" /> },
          { label: 'Estudante', icon: <GraduationCap className="w-4 h-4" /> },
          { label: 'Entre empregos', icon: <Search className="w-4 h-4" /> },
          { label: 'Outro', icon: <HelpCircle className="w-4 h-4" /> },
        ].map(o => (
          <OptionBtn key={o.label} label={o.label} icon={o.icon}
            selected={o.label === 'Outro' ? jobIsOther : (!jobIsOther && data.job === o.label)}
            onClick={() => {
              if (o.label === 'Outro') {
                setJobIsOther(true);
                set('job', '');
              } else {
                setJobIsOther(false);
                set('job', o.label);
                setTimeout(() => next(destAfterJob(o.label)), 200);
              }
            }}
          />
        ))}
        <AnimatePresence>
          {jobIsOther && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="space-y-3 pt-1 pb-1 px-1">
                <Input
                  placeholder="Descreva a sua situação profissional..."
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
                  Continuar
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    ),

    employmentDuration: (
      <div className="space-y-3">
        <h3 className="font-display text-xl font-bold mb-1">Há quanto tempo está na situação profissional actual?</h3>
        <p className="text-sm text-muted-foreground mb-4">Ajuda-nos a perceber a estabilidade do seu rendimento.</p>
        {[
          { label: 'Menos de 6 meses', value: '< 6 meses' },
          { label: '6 a 12 meses', value: '6–12 meses' },
          { label: '1 a 3 anos', value: '1–3 anos' },
          { label: 'Mais de 3 anos', value: 'Mais de 3 anos' },
        ].map(o => (
          <OptionBtn key={o.value} label={o.label}
            selected={data.employmentDuration === o.value}
            onClick={() => { set('employmentDuration', o.value); setTimeout(() => next(destAfterEmploymentDuration()), 200); }}
          />
        ))}
      </div>
    ),

    guarantor: (() => {
      const hasGuarantorData = data.hasGuarantor;
      const advance = hasGuarantorData === 'Não' && property.criteria.advanceWithoutGuarantor
        ? property.criteria.advanceWithoutGuarantor
        : property.criteria.advanceMonths;
      const deposit = hasGuarantorData === 'Não' && property.criteria.depositWithoutGuarantor
        ? property.criteria.depositWithoutGuarantor
        : property.criteria.depositMonths;
      const rent = property.rentalPrice || property.price;

      return (
        <div className="space-y-4">
          <h3 className="font-display text-xl font-bold mb-1">Tem fiador disponível?</h3>
          <p className="text-sm text-muted-foreground mb-2">
            Como não tem contrato de trabalho em Portugal, um fiador pode facilitar a aprovação da candidatura.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: 'Sim', label: 'Sim, tenho', sub: 'Fiador disponível', Icon: UserCheck },
              { value: 'Não', label: 'Não tenho', sub: 'Sem fiador', Icon: UserX },
            ].map(({ value, label, sub, Icon }) => {
              const sel = data.hasGuarantor === value;
              return (
                <button key={value} type="button" onClick={() => set('hasGuarantor', value)}
                  className={`relative flex flex-col items-center justify-center gap-2 py-6 px-3 rounded-2xl border text-center transition-all ${
                    sel ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/40 hover:bg-muted/50'
                  }`}>
                  <span className={`p-2.5 rounded-full transition-colors ${sel ? 'bg-primary/10' : 'bg-muted'}`}>
                    <Icon className={`w-5 h-5 transition-colors ${sel ? 'text-primary' : 'text-muted-foreground'}`} />
                  </span>
                  <span className="text-sm font-semibold leading-tight">{label}</span>
                  <span className={`text-xs transition-colors ${sel ? 'text-primary/70' : 'text-muted-foreground'}`}>{sub}</span>
                  {sel && <CheckCircle2 className="absolute top-2.5 right-2.5 w-4 h-4 text-primary" />}
                </button>
              );
            })}
          </div>

          <AnimatePresence>
            {hasGuarantorData !== '' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="p-4 rounded-xl bg-muted/50 border space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Valores estimados de entrada</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Adiantamento ({advance} meses)</span>
                      <span className="font-bold">€{(advance * (rent ?? 0)).toLocaleString('pt-PT')}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Caução ({deposit} meses)</span>
                      <span className="font-bold">€{(deposit * (rent ?? 0)).toLocaleString('pt-PT')}</span>
                    </div>
                    <div className="border-t pt-2 flex items-center justify-between text-sm font-bold">
                      <span>Total estimado</span>
                      <span>€{((advance + deposit) * (rent ?? 0)).toLocaleString('pt-PT')}</span>
                    </div>
                  </div>
                  {hasGuarantorData === 'Não' && property.criteria.advanceWithoutGuarantor && (
                    <p className="text-xs text-amber-600">Sem fiador os valores de entrada são ajustados conforme critérios do imóvel.</p>
                  )}
                </div>
                <Button onClick={() => next(nextAfter('guarantor'))} className="w-full rounded-xl mt-3">
                  Continuar
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      );
    })(),

    intent: (
      <div className="space-y-3">
        <h3 className="font-display text-xl font-bold mb-1">Visitou algum imóvel recentemente?</h3>
        <p className="text-sm text-muted-foreground mb-4">Ajuda-nos a perceber em que fase da procura está.</p>
        <div className="grid grid-cols-2 gap-3">
          <OptionBtn label="Sim" icon={<ThumbsUp className="w-4 h-4" />}
            selected={data.hasVisited === 'Sim'}
            onClick={() => { set('hasVisited', 'Sim'); setTimeout(() => next(nextAfter('intent')), 200); }}
          />
          <OptionBtn label="Não" icon={<ThumbsDown className="w-4 h-4" />}
            selected={data.hasVisited === 'Não'}
            onClick={() => { set('hasVisited', 'Não'); setTimeout(() => next(nextAfter('intent')), 200); }}
          />
        </div>
      </div>
    ),

    stayDuration: (
      <div className="space-y-3">
        <h3 className="font-display text-xl font-bold mb-1">Quanto tempo pretende ficar no imóvel?</h3>
        <p className="text-sm text-muted-foreground mb-4">Uma ideia aproximada ajuda-nos a perceber os seus planos.</p>
        {[
          { label: 'Menos de 1 ano', value: '< 1 ano' },
          { label: '1 a 2 anos', value: '1–2 anos' },
          { label: '2 a 3 anos', value: '2–3 anos' },
          { label: 'Mais de 3 anos', value: '3+ anos' },
        ].map(o => (
          <OptionBtn key={o.value} label={o.label}
            selected={data.stayDuration === o.value}
            onClick={() => { set('stayDuration', o.value); setTimeout(() => next(nextAfter('stayDuration')), 200); }}
          />
        ))}
        <button type="button" onClick={() => next(nextAfter('stayDuration'))} className="w-full text-xs text-muted-foreground hover:text-foreground py-2 transition-colors">
          Saltar esta pergunta →
        </button>
      </div>
    ),

    motivation: (
      <div className="space-y-3">
        <h3 className="font-display text-xl font-bold mb-1">O que procura principalmente? <span className="text-muted-foreground text-sm font-normal">(opcional)</span></h3>
        {[
          { label: 'Melhor localização', icon: <MapPin className="w-4 h-4" /> },
          { label: 'Melhor preço', icon: <Tag className="w-4 h-4" /> },
          { label: 'Relocalização por trabalho', icon: <Plane className="w-4 h-4" /> },
          { label: 'Outro motivo', icon: <MessageCircle className="w-4 h-4" /> },
        ].map(o => (
          <OptionBtn key={o.label} label={o.label} icon={o.icon}
            selected={o.label === 'Outro motivo' ? motivationIsOther : (!motivationIsOther && data.motivation === o.label)}
            onClick={() => {
              if (o.label === 'Outro motivo') {
                setMotivationIsOther(true);
                set('motivation', '');
              } else {
                setMotivationIsOther(false);
                set('motivation', o.label);
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
                  placeholder="Qual é o seu principal motivo?"
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
                  Continuar
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {!motivationIsOther && (
          <button type="button" onClick={() => next(nextAfter('motivation'))} className="w-full text-xs text-muted-foreground hover:text-foreground py-2 transition-colors">
            Saltar esta pergunta →
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
          <h3 className="font-display text-xl font-bold mb-1">Qual é a sua nacionalidade?</h3>
          <p className="text-sm text-muted-foreground mb-3">Esta informação é confidencial e apenas utilizada para a qualificação da candidatura.</p>
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar país..."
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
          <p className="text-sm text-muted-foreground mb-4">Ajuda-nos a avaliar a estabilidade da sua situação de residência.</p>
          {[
            { label: 'Menos de 1 ano', value: 'under_1_year' },
            { label: '1 a 3 anos', value: '1_to_3_years' },
            { label: '3 a 5 anos', value: '3_to_5_years' },
            { label: 'Mais de 5 anos', value: 'over_5_years' },
          ].map(o => (
            <OptionBtn key={o.value} label={o.label}
              selected={data.residencyDuration === o.value}
              onClick={() => { set('residencyDuration', o.value); setTimeout(() => next(nextAfter('residencyDuration')), 200); }}
            />
          ))}
        </div>
      );
    })(),

    contact: (
      <div className="space-y-4">
        <h3 className="font-display text-xl font-bold mb-1">Quase lá! Deixe os seus contactos.</h3>
        <p className="text-sm text-muted-foreground mb-2">O agente responsável irá contactá-lo para confirmar os próximos passos.</p>
        <div className="rounded-xl border bg-muted/40 px-4 py-3 text-xs text-muted-foreground leading-relaxed mb-2">
          Tem alguma informação adicional relevante para a sua candidatura? Pode partilhá-la com o agente através do campo de notas abaixo.
        </div>
        <div>
          <Label className="text-xs font-medium">Nome completo</Label>
          <Input placeholder="Maria Silva" value={data.name} onChange={e => set('name', e.target.value)} className="mt-1 h-11 rounded-xl" />
        </div>
        <div>
          <Label className="text-xs font-medium">Telefone</Label>
          <Input type="tel" placeholder="+351 912 345 678" value={data.phone} onChange={e => set('phone', e.target.value)} className="mt-1 h-11 rounded-xl" />
        </div>
        <div>
          <Label className="text-xs font-medium">Email</Label>
          <Input type="email" placeholder="maria@email.com" value={data.email} onChange={e => set('email', e.target.value)} className="mt-1 h-11 rounded-xl" />
        </div>
        <div>
          <Label className="text-xs font-medium text-muted-foreground">Notas adicionais (opcional)</Label>
          <textarea
            placeholder="Ex: Estou disponível para visita aos fins-de-semana. Tenho carta de recomendação do anterior senhorio..."
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
          Enviar candidatura
        </Button>
        <p className="text-[11px] text-muted-foreground text-center">
          Receberá um email assim que os nossos agentes analisarem a sua candidatura.
        </p>
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
          <ChevronLeft className="w-3 h-3" /> Voltar
        </button>
      )}
    </div>
  );
};

export default LeadForm;
