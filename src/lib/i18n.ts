import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// ── pt-PT resources ──────────────────────────────────────────────────────────
import ptCommon       from '@/locales/pt-PT/common.json';
import ptDashboard    from '@/locales/pt-PT/dashboard.json';
import ptProperties   from '@/locales/pt-PT/properties.json';
import ptAgents       from '@/locales/pt-PT/agents.json';
import ptBilling      from '@/locales/pt-PT/billing.json';
import ptAppointments from '@/locales/pt-PT/appointments.json';
import ptSettings     from '@/locales/pt-PT/settings.json';
import ptPublic       from '@/locales/pt-PT/public.json';
import ptScreening    from '@/locales/pt-PT/screening.json';
import ptScoring      from '@/locales/pt-PT/scoring.json';
import ptAuth         from '@/locales/pt-PT/auth.json';
import ptOnboarding   from '@/locales/pt-PT/onboarding.json';
import ptLanding      from '@/locales/pt-PT/landing.json';

// ── pt-BR resources ───────────────────────────────────────────────────────────
import brCommon       from '@/locales/pt-BR/common.json';
import brDashboard    from '@/locales/pt-BR/dashboard.json';
import brProperties   from '@/locales/pt-BR/properties.json';
import brAgents       from '@/locales/pt-BR/agents.json';
import brBilling      from '@/locales/pt-BR/billing.json';
import brAppointments from '@/locales/pt-BR/appointments.json';
import brSettings     from '@/locales/pt-BR/settings.json';
import brPublic       from '@/locales/pt-BR/public.json';
import brScreening    from '@/locales/pt-BR/screening.json';
import brScoring      from '@/locales/pt-BR/scoring.json';
import brAuth         from '@/locales/pt-BR/auth.json';
import brOnboarding   from '@/locales/pt-BR/onboarding.json';
import brLanding      from '@/locales/pt-BR/landing.json';

// ── es-ES resources ───────────────────────────────────────────────────────────
import esCommon       from '@/locales/es-ES/common.json';
import esDashboard    from '@/locales/es-ES/dashboard.json';
import esProperties   from '@/locales/es-ES/properties.json';
import esAgents       from '@/locales/es-ES/agents.json';
import esBilling      from '@/locales/es-ES/billing.json';
import esAppointments from '@/locales/es-ES/appointments.json';
import esSettings     from '@/locales/es-ES/settings.json';
import esPublic       from '@/locales/es-ES/public.json';
import esScreening    from '@/locales/es-ES/screening.json';
import esScoring      from '@/locales/es-ES/scoring.json';
import esAuth         from '@/locales/es-ES/auth.json';
import esOnboarding   from '@/locales/es-ES/onboarding.json';
import esLanding      from '@/locales/es-ES/landing.json';

// ── en resources ─────────────────────────────────────────────────────────────
import enCommon       from '@/locales/en/common.json';
import enDashboard    from '@/locales/en/dashboard.json';
import enProperties   from '@/locales/en/properties.json';
import enAgents       from '@/locales/en/agents.json';
import enBilling      from '@/locales/en/billing.json';
import enAppointments from '@/locales/en/appointments.json';
import enSettings     from '@/locales/en/settings.json';
import enPublic       from '@/locales/en/public.json';
import enScreening    from '@/locales/en/screening.json';
import enScoring      from '@/locales/en/scoring.json';
import enAuth         from '@/locales/en/auth.json';
import enOnboarding   from '@/locales/en/onboarding.json';
import enLanding      from '@/locales/en/landing.json';

const NS = ['common', 'dashboard', 'properties', 'agents', 'billing', 'appointments', 'settings', 'public', 'screening', 'scoring', 'auth', 'onboarding', 'landing'] as const;

const resources = {
  'pt-PT': {
    common:       ptCommon,
    dashboard:    ptDashboard,
    properties:   ptProperties,
    agents:       ptAgents,
    billing:      ptBilling,
    appointments: ptAppointments,
    settings:     ptSettings,
    public:       ptPublic,
    screening:    ptScreening,
    scoring:      ptScoring,
    auth:         ptAuth,
    onboarding:   ptOnboarding,
    landing:      ptLanding,
  },
  'pt-BR': {
    common:       brCommon,
    dashboard:    brDashboard,
    properties:   brProperties,
    agents:       brAgents,
    billing:      brBilling,
    appointments: brAppointments,
    settings:     brSettings,
    public:       brPublic,
    screening:    brScreening,
    scoring:      brScoring,
    auth:         brAuth,
    onboarding:   brOnboarding,
    landing:      brLanding,
  },
  'es-ES': {
    common:       esCommon,
    dashboard:    esDashboard,
    properties:   esProperties,
    agents:       esAgents,
    billing:      esBilling,
    appointments: esAppointments,
    settings:     esSettings,
    public:       esPublic,
    screening:    esScreening,
    scoring:      esScoring,
    auth:         esAuth,
    onboarding:   esOnboarding,
    landing:      esLanding,
  },
  en: {
    common:       enCommon,
    dashboard:    enDashboard,
    properties:   enProperties,
    agents:       enAgents,
    billing:      enBilling,
    appointments: enAppointments,
    settings:     enSettings,
    public:       enPublic,
    screening:    enScreening,
    scoring:      enScoring,
    auth:         enAuth,
    onboarding:   enOnboarding,
    landing:      enLanding,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'pt-PT',
    defaultNS: 'common',
    ns: NS,
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'vyllad_lang',
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
