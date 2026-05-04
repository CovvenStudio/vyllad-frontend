import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const LANGUAGES = [
  { code: 'pt-PT', label: 'PT — Português (Portugal)' },
  { code: 'pt-BR', label: 'BR — Português (Brasil)' },
  { code: 'es-ES', label: 'ES — Español' },
  { code: 'en',    label: 'EN — English' },
];

const SUPPORTED = LANGUAGES.map((l) => l.code);

function normalise(lang: string): string {
  if (lang.startsWith('en')) return 'en';
  if (lang === 'pt-BR' || lang.startsWith('pt-BR')) return 'pt-BR';
  if (lang.startsWith('es')) return 'es-ES';
  return 'pt-PT';
}

export function LanguageSwitcher({ className }: { className?: string }) {
  const { i18n } = useTranslation();

  const currentLang = i18n.resolvedLanguage ?? i18n.language ?? 'pt-PT';
  const active = SUPPORTED.includes(currentLang) ? currentLang : normalise(currentLang);

  return (
    <Select value={active} onValueChange={(code) => i18n.changeLanguage(code)}>
      <SelectTrigger className={cn('h-8 w-auto gap-1.5 rounded-lg border-border/60 bg-muted/40 text-xs font-semibold pr-2', className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {LANGUAGES.map(({ code, label }) => (
          <SelectItem key={code} value={code} className="text-xs">
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
