import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { monitoring } from '@/lib/monitoring/monitoring';
import { AnimatePresence, motion } from 'framer-motion';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CheckCircle2, Check, Loader2, CalendarIcon, X } from 'lucide-react';
import { Ban, PawPrint } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAgents } from '@/hooks/useAgents';
import { useProperties } from '@/hooks/useProperties';
import { useToast } from '@/hooks/use-toast';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

type Step = 'info' | 'criteria' | 'agents' | 'done';


const AddPropertyDialog = ({ open, onOpenChange, onCreated }: Props) => {
  const { agents } = useAgents();
  const { create } = useProperties();
  const { toast } = useToast();
  const { t } = useTranslation(['properties', 'common']);

  const [step, setStep] = useState<Step>('info');
  const [submitting, setSubmitting] = useState(false);
  const [availableFrom, setAvailableFrom] = useState<Date | undefined>(undefined);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [propertyInfo, setPropertyInfo] = useState({
    title: '',
    referenceId: '',
    announcementLink: '',
    rentalPrice: '',
    location: '',
    description: '',
  });
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
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

  const handleNext = () => {
    if (propertyInfo.title && propertyInfo.referenceId && propertyInfo.announcementLink && propertyInfo.rentalPrice) {
      setStep('criteria');
    }
  };

  const handleCreate = async () => {
    setSubmitting(true);
    try {
      await create({
        title: propertyInfo.title,
        referenceId: propertyInfo.referenceId || undefined,
        announcementLink: propertyInfo.announcementLink || undefined,
        rentalPrice: parseFloat(propertyInfo.rentalPrice),
        location: propertyInfo.location || undefined,
        availableFrom: availableFrom ? format(availableFrom, 'yyyy-MM-dd') : undefined,
        description: propertyInfo.description || undefined,
        agentIds: selectedAgents,
        criteria: {
          minIncome: parseFloat(criteria.minIncome) || 0,
          maxPeople: parseInt(criteria.maxPeople) || 1,
          petsAllowed: criteria.petsAllowed,
          allowedPetTypes: criteria.allowedPetTypes,
          advanceMonths: parseInt(criteria.advanceMonths) || 2,
          depositMonths: parseInt(criteria.depositMonths) || 2,
          guarantorRequired: criteria.guarantorRequired,
          advanceWithoutGuarantor: criteria.guarantorRequired ? parseInt(criteria.advanceWithoutGuarantor) || null : null,
          depositWithoutGuarantor: criteria.guarantorRequired ? parseInt(criteria.depositWithoutGuarantor) || null : null,
        },
      });
      setStep('done');
    } catch (err: unknown) {
      monitoring.captureException(err, { context: 'add-property' });
      const msg = err instanceof Error ? err.message : t('properties:dialog.add.error');
      toast({ title: t('common:errors.generic'), description: msg, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    const wasCreated = step === 'done';
    setStep('info');
    setPropertyInfo({ title: '', referenceId: '', announcementLink: '', rentalPrice: '', location: '', description: '' });
    setAvailableFrom(undefined);
    setSelectedAgents([]);
    setCriteria({ minIncome: '', maxPeople: '', petsAllowed: false, allowedPetTypes: [], advanceMonths: '2', depositMonths: '2', guarantorRequired: true, advanceWithoutGuarantor: '4', depositWithoutGuarantor: '3' });
    onOpenChange(false);
    if (wasCreated) onCreated?.();
  };

  const toggleAgent = (id: string) => {
    setSelectedAgents((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader className="sticky top-0 bg-background z-10 pb-2 border-b pr-10">
          <DialogTitle className="font-display">
            {step === 'info' && t('properties:dialog.add.title')}
            {step === 'criteria' && t('properties:criteria.title')}
            {step === 'agents' && t('properties:dialog.fields.agents')}
            {step === 'done' && t('properties:dialog.add.success')}
          </DialogTitle>
        </DialogHeader>

        {step === 'info' && (
          <div className="space-y-4 pt-2 pb-4">
            <div>
              <Label className="text-sm font-medium">{t('properties:dialog.fields.title')} *</Label>
              <Input
                placeholder={t('properties:dialog.fields.titlePlaceholder')}
                value={propertyInfo.title}
                onChange={(e) => setPropertyInfo(p => ({ ...p, title: e.target.value }))}
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-sm font-medium">{t('properties:dialog.fields.reference')} *</Label>
              <Input
                placeholder={t('properties:dialog.fields.referencePlaceholder')}
                value={propertyInfo.referenceId}
                onChange={(e) => setPropertyInfo(p => ({ ...p, referenceId: e.target.value }))}
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-sm font-medium">{t('properties:dialog.fields.announcementLink')} *</Label>
              <Input
                placeholder={t('properties:dialog.fields.announcementLinkPlaceholder')}
                value={propertyInfo.announcementLink}
                onChange={(e) => setPropertyInfo(p => ({ ...p, announcementLink: e.target.value }))}
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
                  value={propertyInfo.rentalPrice}
                  onChange={(e) => setPropertyInfo(p => ({ ...p, rentalPrice: e.target.value }))}
                  className="pl-7"
                />
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">{t('properties:dialog.fields.rentalHint')}</p>
            </div>

            <div>
              <Label className="text-sm font-medium">{t('properties:dialog.fields.location')} <span className="text-muted-foreground font-normal">{t('common:optional')}</span></Label>
              <Input
                placeholder={t('properties:dialog.fields.locationPlaceholder')}
                value={propertyInfo.location}
                onChange={(e) => setPropertyInfo(p => ({ ...p, location: e.target.value }))}
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-sm font-medium">{t('properties:dialog.fields.availableFrom')} <span className="text-muted-foreground font-normal">{t('common:optional')}</span></Label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      'mt-1 w-full flex items-center gap-2 px-3 h-9 rounded-lg border border-input bg-transparent text-sm transition-colors hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-ring/20',
                      !availableFrom && 'text-muted-foreground'
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
                        onClick={(e) => { e.stopPropagation(); setAvailableFrom(undefined); }}
                        onKeyDown={(e) => e.key === 'Enter' && setAvailableFrom(undefined)}
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
                    onSelect={(d) => { setAvailableFrom(d); setCalendarOpen(false); }}
                    disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                    initialFocus
                    locale={pt}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label className="text-sm font-medium">{t('properties:dialog.fields.description')} <span className="text-muted-foreground font-normal">{t('common:optional')}</span></Label>
              <textarea
                placeholder={t('properties:dialog.fields.descriptionPlaceholder')}
                value={propertyInfo.description}
                onChange={(e) => setPropertyInfo(p => ({ ...p, description: e.target.value }))}
                rows={3}
                className="mt-1 w-full px-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 resize-none"
              />
            </div>

            <Button
              onClick={handleNext}
              disabled={!propertyInfo.title || !propertyInfo.referenceId || !propertyInfo.announcementLink || !propertyInfo.rentalPrice}
              className="w-full rounded-lg font-semibold"
            >
              {t('common:actions.continue')}
            </Button>
          </div>
        )}

        {step === 'criteria' && (
          <div className="space-y-4 pt-2 pb-4">
            <div className="p-3 rounded-lg bg-muted/50 border text-sm">
              <p className="font-medium">{propertyInfo.title}</p>
              <p className="text-muted-foreground text-xs mt-0.5">Ref: {propertyInfo.referenceId}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium">{t('properties:criteria.minIncome')}</Label>
                <Input type="number" placeholder="2400" value={criteria.minIncome} onChange={(e) => setCriteria(p => ({ ...p, minIncome: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-medium">{t('properties:criteria.maxPeople')}</Label>
                <Input type="number" placeholder="3" value={criteria.maxPeople} onChange={(e) => setCriteria(p => ({ ...p, maxPeople: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-medium">{t('properties:criteria.advance')}</Label>
                <Input type="number" value={criteria.advanceMonths} onChange={(e) => setCriteria(p => ({ ...p, advanceMonths: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-medium">{t('properties:criteria.deposit')}</Label>
                <Input type="number" value={criteria.depositMonths} onChange={(e) => setCriteria(p => ({ ...p, depositMonths: e.target.value }))} className="mt-1" />
              </div>
            </div>

            <div>
              <Label className="text-xs font-medium mb-2 block">{t('properties:criteria.pets')}</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: false, label: t('properties:dialog.fields.petsNotAllowed'), Icon: Ban },
                  { value: true, label: t('properties:dialog.fields.petsAllowed'), Icon: PawPrint },
                ].map(({ value, label, Icon }) => {
                  const sel = criteria.petsAllowed === value;
                  return (
                    <button
                      key={String(value)}
                      type="button"
                      onClick={() => setCriteria(p => ({ ...p, petsAllowed: value, allowedPetTypes: value ? p.allowedPetTypes : [] }))}
                      className={`flex items-center gap-2.5 px-3 py-3 rounded-xl border text-sm font-medium transition-all ${
                        sel
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-border hover:border-primary/40 hover:bg-muted/50'
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
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-3">
                      <p className="text-xs text-muted-foreground mb-2">
                        {t('properties:criteria.petTypesLabel')} <span className="text-muted-foreground/60">{t('common:optional')}</span>
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
                              onClick={() => setCriteria(p => ({
                                ...p,
                                allowedPetTypes: active
                                  ? p.allowedPetTypes.filter(t => t !== label)
                                  : [...p.allowedPetTypes, label],
                              }))}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                                active ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:bg-muted/50'
                              }`}
                            >
                              <span>{icon}</span>{label}
                            </button>
                          );
                        })}
                      </div>
                      {criteria.allowedPetTypes.length === 0 && (
                        <p className="text-xs text-muted-foreground/60 mt-2">{t('properties:criteria.petTypesNone')}</p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex items-center justify-between py-2">
              <Label className="text-xs font-medium">{t('properties:criteria.guarantorRequired')}</Label>
              <Switch checked={criteria.guarantorRequired} onCheckedChange={(v) => setCriteria(p => ({ ...p, guarantorRequired: v }))} />
            </div>

            {criteria.guarantorRequired && (
              <div className="p-3 rounded-lg bg-muted/50 border space-y-3">
                <p className="text-xs font-medium text-muted-foreground">{t('properties:criteria.noGuarantorValues')}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">{t('properties:criteria.advanceNoGuarantor')}</Label>
                    <Input type="number" value={criteria.advanceWithoutGuarantor} onChange={(e) => setCriteria(p => ({ ...p, advanceWithoutGuarantor: e.target.value }))} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">{t('properties:criteria.depositNoGuarantor')}</Label>
                    <Input type="number" value={criteria.depositWithoutGuarantor} onChange={(e) => setCriteria(p => ({ ...p, depositWithoutGuarantor: e.target.value }))} className="mt-1" />
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 pt-2">
              <Button onClick={() => setStep('info')} variant="outline" className="rounded-lg font-semibold">
                {t('common:actions.back')}
              </Button>
              <Button onClick={() => setStep('agents')} className="rounded-lg font-semibold">
                {t('common:actions.continue')}
              </Button>
            </div>
          </div>
        )}

        {step === 'agents' && (
          <div className="space-y-4 pt-2 pb-4">
            <div className="p-3 rounded-lg bg-muted/50 border text-sm">
              <p className="font-medium">{propertyInfo.title}</p>
              <p className="text-muted-foreground text-xs mt-0.5">Ref: {propertyInfo.referenceId}</p>
            </div>

            <div className="space-y-2">
              {agents.filter(a => a.role !== 'OWNER').map((agent) => {
                const checked = selectedAgents.includes(agent.id);
                return (
                  <button
                    key={agent.id}
                    type="button"
                    onClick={() => toggleAgent(agent.id)}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-lg border text-left transition-all ${
                      checked ? 'border-accent bg-accent/5' : 'border-border hover:bg-muted/40'
                    }`}
                  >
                    <img
                      src={agent.avatarUrl ?? `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(agent.name)}`}
                      alt={agent.name}
                      referrerPolicy="no-referrer"
                      className="w-8 h-8 rounded-full bg-muted shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{agent.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{agent.email}</div>
                    </div>
                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                      checked ? 'bg-accent border-accent' : 'border-border'
                    }`}>
                      {checked && <Check className="w-3 h-3 text-accent-foreground" />}
                    </div>
                  </button>
                );
              })}
              {agents.filter(a => a.role !== 'OWNER').length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">{t('properties:criteria.noAgents')}</p>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{t('properties:criteria.agentsHint')}</p>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <Button onClick={() => setStep('criteria')} variant="outline" className="rounded-lg font-semibold">
                {t('common:actions.back')}
              </Button>
              <Button
                onClick={handleCreate}
                disabled={submitting}
                className="rounded-lg font-semibold"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : t('properties:dialog.add.submit')}
              </Button>
            </div>
          </div>
        )}

        {step === 'done' && (
          <div className="py-8 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
            <h3 className="font-display text-lg font-bold mb-2">{t('properties:dialog.add.successTitle')}</h3>
            <p className="text-sm text-muted-foreground mb-6">{t('properties:dialog.add.successDesc')}</p>
            <Button onClick={handleClose} className="rounded-lg font-semibold">{t('common:actions.close')}</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AddPropertyDialog;
