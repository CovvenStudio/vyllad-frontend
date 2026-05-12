import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CustomScreeningQuestionDto } from '@/lib/screening-api';

interface Props {
  open: boolean;
  question: CustomScreeningQuestionDto | null;
  onOpenChange: (open: boolean) => void;
  onSave: (q: CustomScreeningQuestionDto) => void;
  nextOrder: number;
}

const CATEGORIES = ['Disponibilidade', 'Agregado Familiar', 'Animais', 'Financeiro', 'Intenção', 'Outro'];

export default function AddCustomQuestionDialog({ open, question, onOpenChange, onSave, nextOrder }: Props) {
  const { t } = useTranslation(['settings', 'common']);
  const isEdit = !!question;

  const [label, setLabel] = useState(question?.label ?? '');
  const [category, setCategory] = useState(question?.category ?? 'Outro');
  const [description, setDescription] = useState(question?.description ?? '');
  const [type, setType] = useState<CustomScreeningQuestionDto['type']>(question?.type ?? 'single_choice');
  const [options, setOptions] = useState<string[]>(question?.options ?? []);
  const [optionInput, setOptionInput] = useState('');
  const [required, setRequired] = useState(question?.required ?? false);
  const [enabled, setEnabled] = useState(question?.enabled ?? true);

  useEffect(() => {
    if (!open) return;

    setLabel(question?.label ?? '');
    setCategory(question?.category ?? 'Outro');
    setDescription(question?.description ?? '');
    setType(question?.type ?? 'single_choice');
    setOptions(question?.options ?? []);
    setOptionInput('');
    setRequired(question?.required ?? false);
    setEnabled(question?.enabled ?? true);
  }, [open, question]);

  // Reset when dialog opens/closes
  const handleOpenChange = (val: boolean) => {
    if (!val) {
      setLabel(question?.label ?? '');
      setCategory(question?.category ?? 'Outro');
      setDescription(question?.description ?? '');
      setType(question?.type ?? 'single_choice');
      setOptions(question?.options ?? []);
      setOptionInput('');
      setRequired(question?.required ?? false);
      setEnabled(question?.enabled ?? true);
    }
    onOpenChange(val);
  };

  const addOption = () => {
    const trimmed = optionInput.trim();
    if (!trimmed || options.includes(trimmed)) return;
    setOptions(prev => [...prev, trimmed]);
    setOptionInput('');
  };

  const removeOption = (o: string) => setOptions(prev => prev.filter(x => x !== o));

  const needsOptions = type === 'single_choice' || type === 'multi_choice';
  const canSave = label.trim() && (!needsOptions || options.length >= 2);

  const handleSave = () => {
    onSave({
      id: question?.id ?? `_new_${Date.now()}`,
      label: label.trim(),
      category,
      description: description.trim() || undefined,
      type,
      options: needsOptions ? options : [],
      required,
      enabled,
      order: question?.order ?? nextOrder,
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md rounded-2xl overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="font-display text-lg font-700">
            {isEdit ? t('settings:leadForm.dialog.editTitle') : t('settings:leadForm.dialog.newTitle')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Label */}
          <div>
            <Label className="text-xs font-medium">{t('settings:leadForm.dialog.labelField')} *</Label>
            <Input
              className="mt-1 rounded-xl"
              placeholder={t('settings:leadForm.dialog.labelPlaceholder')}
              value={label}
              onChange={e => setLabel(e.target.value)}
              autoFocus
            />
          </div>

          {/* Category */}
          <div>
            <Label className="text-xs font-medium">{t('settings:leadForm.dialog.categoryField')}</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="mt-1 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Type */}
          <div>
            <Label className="text-xs font-medium">{t('settings:leadForm.dialog.typeField')}</Label>
            <Select value={type} onValueChange={v => { setType(v as typeof type); setOptions([]); }}>
              <SelectTrigger className="mt-1 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single_choice">{t('settings:leadForm.questionTypes.single_choice')}</SelectItem>
                <SelectItem value="multi_choice">{t('settings:leadForm.questionTypes.multi_choice')}</SelectItem>
                <SelectItem value="boolean">{t('settings:leadForm.questionTypes.boolean')}</SelectItem>
                <SelectItem value="text">{t('settings:leadForm.questionTypes.text')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Options (for choice types) */}
          <AnimatePresence>
            {needsOptions && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
              >
                <div className="space-y-2">
                  <Label className="text-xs font-medium">{t('settings:leadForm.dialog.optionsField')}</Label>
                  <div className="flex gap-2">
                    <Input
                      className="rounded-xl h-9 text-sm flex-1"
                      placeholder={t('settings:leadForm.dialog.addOptionPlaceholder')}
                      value={optionInput}
                      onChange={e => setOptionInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addOption())}
                    />
                    <Button type="button" size="sm" variant="outline" onClick={addOption} className="h-9 px-3 rounded-xl">
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  {options.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {options.map(o => (
                        <span key={o} className="inline-flex items-center gap-1 px-2.5 py-1 bg-muted rounded-full text-xs font-medium">
                          {o}
                          <button type="button" onClick={() => removeOption(o)} className="text-muted-foreground hover:text-foreground transition-colors">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Description */}
          <div>
            <Label className="text-xs font-medium text-muted-foreground">{t('settings:leadForm.dialog.descriptionField')}</Label>
            <Input
              className="mt-1 rounded-xl text-sm"
              placeholder={t('settings:leadForm.dialog.descriptionPlaceholder')}
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          {/* Enabled toggle */}
          <div className="flex items-center justify-between py-1">
            <div>
              <p className="text-sm font-medium">{t('settings:leadForm.dialog.enabledToggle')}</p>
              <p className="text-xs text-muted-foreground">{t('settings:leadForm.dialog.enabledHint')}</p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          {/* Required toggle */}
          <div className="flex items-center justify-between py-1">
            <div>
              <p className="text-sm font-medium">{t('settings:leadForm.dialog.requiredToggle')}</p>
              <p className="text-xs text-muted-foreground">{t('settings:leadForm.dialog.requiredHint')}</p>
            </div>
            <Switch checked={required} onCheckedChange={setRequired} />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={() => handleOpenChange(false)}>
              {t('common:actions.cancel')}
            </Button>
            <Button className="flex-1 rounded-xl" disabled={!canSave} onClick={handleSave}>
              {isEdit ? t('common:actions.save') : t('common:actions.add')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
