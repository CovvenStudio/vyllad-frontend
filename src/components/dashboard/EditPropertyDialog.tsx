import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CheckCircle2, Loader2, CalendarIcon, X, Ban, PawPrint } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAgents } from '@/hooks/useAgents';
import { useProperties } from '@/hooks/useProperties';
import { useToast } from '@/hooks/use-toast';
import { PropertyDto } from '@/lib/properties-api';

type Step = 'info' | 'criteria' | 'agents';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property: PropertyDto;
  onSaved?: (updated: PropertyDto) => void;
}

export default function EditPropertyDialog({ open, onOpenChange, property, onSaved }: Props) {
  const { agents } = useAgents();
  const { update } = useProperties();
  const { toast } = useToast();
  const { t } = useTranslation(['properties', 'common']);

  const [step, setStep] = useState<Step>('info');
  const [submitting, setSubmitting] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const [availableFrom, setAvailableFrom] = useState<Date | undefined>(undefined);
  const [info, setInfo] = useState({
    title: '',
    referenceId: '',
    announcementLink: '',
    rentalPrice: '',
    location: '',
    description: '',
  });
  const [criteria, setCriteria] = useState({
    minIncome: '',
    maxPeople: '',
    petsAllowed: false,
    allowedPetTypes: [] as string[],
    advanceMonths: '2',
    depositMonths: '2',
    guarantorRequired: true,
    advanceWithoutGuarantor: '4',
    depositWithoutGuarantor: '3',
  });
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);

  // Pre-fill fields whenever the property changes or the dialog opens
  useEffect(() => {
    if (!open) return;
    setStep('info');
    setInfo({
      title: property.title,
      referenceId: property.referenceId ?? '',
      announcementLink: property.announcementLink ?? '',
      rentalPrice: String(property.rentalPrice),
      location: property.location ?? '',
      description: property.description ?? '',
    });
    setAvailableFrom(property.availableFrom ? parseISO(property.availableFrom) : undefined);
    setCriteria({
      minIncome: String(property.criteria.minIncome),
      maxPeople: String(property.criteria.maxPeople),
      petsAllowed: property.criteria.petsAllowed,
      allowedPetTypes: property.criteria.allowedPetTypes ?? [],
      advanceMonths: String(property.criteria.advanceMonths),
      depositMonths: String(property.criteria.depositMonths),
      guarantorRequired: property.criteria.guarantorRequired,
      advanceWithoutGuarantor: String(property.criteria.advanceWithoutGuarantor ?? 4),
      depositWithoutGuarantor: String(property.criteria.depositWithoutGuarantor ?? 3),
    });
    setSelectedAgents(property.agentIds ?? []);
  }, [open, property]);

  const handleSave = async () => {
    setSubmitting(true);
    try {
      const saved = await update(property.id, {
        title: info.title,
        referenceId: info.referenceId || undefined,
        announcementLink: info.announcementLink || undefined,
        rentalPrice: parseFloat(info.rentalPrice),
        location: info.location || undefined,
        availableFrom: availableFrom ? format(availableFrom, 'yyyy-MM-dd') : undefined,
        clearAvailableFrom: !availableFrom,
        description: info.description || undefined,
        agentIds: selectedAgents,
        criteria: {
          minIncome: parseFloat(criteria.minIncome) || 0,
          maxPeople: parseInt(criteria.maxPeople) || 1,
          petsAllowed: criteria.petsAllowed,
          allowedPetTypes: criteria.allowedPetTypes,
          advanceMonths: parseInt(criteria.advanceMonths) || 2,
          depositMonths: parseInt(criteria.depositMonths) || 2,
          guarantorRequired: criteria.guarantorRequired,
          advanceWithoutGuarantor: criteria.guarantorRequired
            ? parseInt(criteria.advanceWithoutGuarantor) || null
            : null,
          depositWithoutGuarantor: criteria.guarantorRequired
            ? parseInt(criteria.depositWithoutGuarantor) || null
            : null,
        },
      });
      toast({ title: t('properties:dialog.edit.success') });
      onSaved?.(saved);
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('properties:dialog.edit.error');
      toast({ title: t('common:errors.generic'), description: msg, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const toggleAgent = (id: string) =>
    setSelectedAgents(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id],
    );

  const canSaveInfo =
    info.title && info.rentalPrice;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader className="sticky top-0 bg-background z-10 pb-2 border-b pr-10">
          <DialogTitle className="font-display">
            {step === 'info' && t('properties:dialog.edit.title')}
            {step === 'criteria' && t('properties:criteria.title')}
            {step === 'agents' && t('properties:dialog.fields.agents')}
          </DialogTitle>
          {/* step pills */}
          <div className="flex gap-1.5 pt-1">
            {(['info', 'criteria', 'agents'] as Step[]).map((s, i) => (
              <div
                key={s}
                className={cn(
                  'h-1 flex-1 rounded-full transition-colors',
                  step === s
                    ? 'bg-primary'
                    : i < (['info', 'criteria', 'agents'] as Step[]).indexOf(step)
                    ? 'bg-primary/40'
                    : 'bg-muted',
                )}
              />
            ))}
          </div>
        </DialogHeader>

        {/* ── Step 1: info ─────────────────────────────────────────────────── */}
        {step === 'info' && (
          <div className="space-y-4 pt-2 pb-4">
            <div>
              <Label className="text-sm font-medium">{t('properties:dialog.fields.title')} *</Label>
              <Input
                placeholder={t('properties:dialog.fields.titlePlaceholder')}
                value={info.title}
                onChange={e => setInfo(p => ({ ...p, title: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">
                {t('properties:dialog.fields.reference')} <span className="text-muted-foreground font-normal">({t('common:optional')})</span>
              </Label>
              <Input
                placeholder={t('properties:dialog.fields.referencePlaceholder')}
                value={info.referenceId}
                onChange={e => setInfo(p => ({ ...p, referenceId: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">
                {t('properties:dialog.fields.announcementLink')} <span className="text-muted-foreground font-normal">({t('common:optional')})</span>
              </Label>
              <Input
                placeholder={t('properties:dialog.fields.announcementLinkPlaceholder')}
                value={info.announcementLink}
                onChange={e => setInfo(p => ({ ...p, announcementLink: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">{t('properties:dialog.fields.rentalValue')} *</Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span>
                <Input
                  type="number"
                  placeholder="1200"
                  value={info.rentalPrice}
                  onChange={e => setInfo(p => ({ ...p, rentalPrice: e.target.value }))}
                  className="pl-7"
                />
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium">
                {t('properties:dialog.fields.location')} <span className="text-muted-foreground font-normal">({t('common:optional')})</span>
              </Label>
              <Input
                placeholder={t('properties:dialog.fields.locationPlaceholder')}
                value={info.location}
                onChange={e => setInfo(p => ({ ...p, location: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">
                {t('properties:dialog.fields.availableFrom')} <span className="text-muted-foreground font-normal">({t('common:optional')})</span>
              </Label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      'mt-1 w-full flex items-center gap-2 px-3 h-9 rounded-lg border border-input bg-transparent text-sm transition-colors hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-ring/20',
                      !availableFrom && 'text-muted-foreground',
                    )}
                  >
                    <CalendarIcon className="w-3.5 h-3.5 shrink-0" />
                    <span className="flex-1 text-left">
                      {availableFrom
                        ? format(availableFrom, "d 'de' MMMM 'de' yyyy", { locale: pt })
                        : t('properties:dialog.fields.selectDate')}
                    </span>
                    {availableFrom && (
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={e => { e.stopPropagation(); setAvailableFrom(undefined); }}
                        onKeyDown={e => e.key === 'Enter' && setAvailableFrom(undefined)}
                        className="p-0.5 rounded hover:bg-muted transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </span>
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 rounded-xl border shadow-lg" align="start">
                  <Calendar
                    mode="single"
                    selected={availableFrom}
                    onSelect={d => { setAvailableFrom(d); setCalendarOpen(false); }}
                    initialFocus
                    locale={pt}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label className="text-sm font-medium">
                {t('properties:dialog.fields.description')} <span className="text-muted-foreground font-normal">({t('common:optional')})</span>
              </Label>
              <textarea
                placeholder={t('properties:dialog.fields.descriptionPlaceholder')}
                value={info.description}
                onChange={e => setInfo(p => ({ ...p, description: e.target.value }))}
                rows={3}
                className="mt-1 w-full px-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 resize-none"
              />
            </div>
            <Button
              onClick={() => setStep('criteria')}
              disabled={!canSaveInfo}
              className="w-full rounded-lg font-semibold"
            >
              Continuar
            </Button>
          </div>
        )}

        {/* ── Step 2: criteria ─────────────────────────────────────────────── */}
        {step === 'criteria' && (
          <div className="space-y-4 pt-2 pb-4">
            <div className="p-3 rounded-lg bg-muted/50 border text-sm">
              <p className="font-medium">{info.title}</p>
              {info.referenceId && <p className="text-muted-foreground text-xs mt-0.5">Ref: {info.referenceId}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium">Renda mínima (€)</Label>
                <Input type="number" placeholder="2400" value={criteria.minIncome} onChange={e => setCriteria(p => ({ ...p, minIncome: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-medium">Máx. pessoas</Label>
                <Input type="number" placeholder="3" value={criteria.maxPeople} onChange={e => setCriteria(p => ({ ...p, maxPeople: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-medium">Adiantamento (meses)</Label>
                <Input type="number" value={criteria.advanceMonths} onChange={e => setCriteria(p => ({ ...p, advanceMonths: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-medium">Caução (meses)</Label>
                <Input type="number" value={criteria.depositMonths} onChange={e => setCriteria(p => ({ ...p, depositMonths: e.target.value }))} className="mt-1" />
              </div>
            </div>

            <div>
              <Label className="text-xs font-medium mb-2 block">Animais de estimação</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: false, label: 'Não permitido', Icon: Ban },
                  { value: true, label: 'Permitido', Icon: PawPrint },
                ].map(({ value, label, Icon }) => {
                  const sel = criteria.petsAllowed === value;
                  return (
                    <button
                      key={String(value)}
                      type="button"
                      onClick={() => setCriteria(p => ({ ...p, petsAllowed: value, allowedPetTypes: value ? p.allowedPetTypes : [] }))}
                      className={`flex items-center gap-2.5 px-3 py-3 rounded-xl border text-sm font-medium transition-all ${
                        sel ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/40 hover:bg-muted/50'
                      }`}
                    >
                      <Icon className={`w-4 h-4 flex-shrink-0 ${sel ? 'text-primary' : 'text-muted-foreground'}`} />
                      <span>{label}</span>
                      {sel && <CheckCircle2 className="w-3.5 h-3.5 ml-auto text-primary" />}
                    </button>
                  );
                })}
              </div>
              <AnimatePresence>
                {criteria.petsAllowed && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                  >
                    <div className="pt-3">
                      <p className="text-xs text-muted-foreground mb-2">
                        Que tipos são permitidos? <span className="text-muted-foreground/60">(opcional)</span>
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { label: 'Cão', icon: '🐕' },
                          { label: 'Gato', icon: '🐈' },
                          { label: 'Pássaro', icon: '🦜' },
                          { label: 'Coelho', icon: '🐇' },
                          { label: 'Peixe', icon: '🐟' },
                          { label: 'Réptil', icon: '🦎' },
                          { label: 'Hamster', icon: '🐹' },
                        ].map(({ label, icon }) => {
                          const active = criteria.allowedPetTypes.includes(label);
                          return (
                            <button
                              key={label}
                              type="button"
                              onClick={() =>
                                setCriteria(p => ({
                                  ...p,
                                  allowedPetTypes: active
                                    ? p.allowedPetTypes.filter(t => t !== label)
                                    : [...p.allowedPetTypes, label],
                                }))
                              }
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                                active ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:bg-muted/50'
                              }`}
                            >
                              <span>{icon}</span>{label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex items-center justify-between py-2">
              <Label className="text-xs font-medium">Fiador necessário</Label>
              <Switch checked={criteria.guarantorRequired} onCheckedChange={v => setCriteria(p => ({ ...p, guarantorRequired: v }))} />
            </div>

            {criteria.guarantorRequired && (
              <div className="p-3 rounded-lg bg-muted/50 border space-y-3">
                <p className="text-xs font-medium text-muted-foreground">Valores sem fiador</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Adiantamento s/ fiador (meses)</Label>
                    <Input type="number" value={criteria.advanceWithoutGuarantor} onChange={e => setCriteria(p => ({ ...p, advanceWithoutGuarantor: e.target.value }))} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Caução s/ fiador (meses)</Label>
                    <Input type="number" value={criteria.depositWithoutGuarantor} onChange={e => setCriteria(p => ({ ...p, depositWithoutGuarantor: e.target.value }))} className="mt-1" />
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 pt-2">
              <Button onClick={() => setStep('info')} variant="outline" className="rounded-lg font-semibold">Voltar</Button>
              <Button onClick={() => setStep('agents')} className="rounded-lg font-semibold">Continuar</Button>
            </div>
          </div>
        )}

        {/* ── Step 3: agents ───────────────────────────────────────────────── */}
        {step === 'agents' && (
          <div className="space-y-4 pt-2 pb-4">
            <div className="p-3 rounded-lg bg-muted/50 border text-sm">
              <p className="font-medium">{info.title}</p>
              {info.referenceId && <p className="text-muted-foreground text-xs mt-0.5">Ref: {info.referenceId}</p>}
            </div>

            <div className="space-y-2">
              {agents.filter(a => a.role !== 'OWNER').map(agent => {
                const checked = selectedAgents.includes(agent.id);
                return (
                  <button
                    key={agent.id}
                    type="button"
                    onClick={() => toggleAgent(agent.id)}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-lg border text-left transition-all ${
                      checked ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/40'
                    }`}
                  >
                    <img
                      src={agent.avatarUrl ?? `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(agent.name)}`}
                      alt={agent.name}
                      referrerPolicy="no-referrer"
                      className="w-8 h-8 rounded-full bg-muted shrink-0 object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{agent.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{agent.email}</p>
                    </div>
                    {checked && <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />}
                  </button>
                );
              })}
              {agents.filter(a => a.role !== 'OWNER').length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum agente disponível.</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <Button onClick={() => setStep('criteria')} variant="outline" className="rounded-lg font-semibold">
                Voltar
              </Button>
              <Button onClick={handleSave} disabled={submitting} className="rounded-lg font-semibold gap-2">
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Guardar alterações
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
