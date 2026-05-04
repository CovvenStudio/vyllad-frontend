import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Plus, Trash2, Edit2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import AddCustomQuestionDialog from '@/components/screening/AddCustomQuestionDialog';
import { useAuth } from '@/contexts/AuthContext';
import { useFeatureFlags } from '@/contexts/FeatureFlagsContext';
import {
  getAgencyScreeningConfig,
  saveAgencyScreeningConfig,
  AgencyScreeningConfigDto,
  CustomScreeningQuestionDto,
} from '@/lib/screening-api';
import { tScreeningCategory, tQuestionLabel, tQuestionDescription, tScreeningOption } from '@/lib/screening-i18n';
import { toast } from 'sonner';

export default function LeadFormSettings() {
  const { currentAgencyId, memberships } = useAuth();
  const { isEnabled } = useFeatureFlags();
  const { t } = useTranslation(['settings', 'common']);
  const [config, setConfig] = useState<AgencyScreeningConfigDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editQuestion, setEditQuestion] = useState<CustomScreeningQuestionDto | null>(null);

  const currentMembership = memberships.find(m => m.agencyId === currentAgencyId) ?? null;
  const screeningEditEnabled = isEnabled('screening.edit_enabled');
  const isReadOnly = currentMembership?.role === 'AGENT' || !screeningEditEnabled;

  useEffect(() => {
    if (!currentAgencyId) return;
    setLoading(true);
    getAgencyScreeningConfig(currentAgencyId)
      .then(setConfig)
      .catch(() => toast.error(t('settings:leadForm.errorLoad')))
      .finally(() => setLoading(false));
  }, [currentAgencyId]);

  const toggleSystem = (key: string) => {
    setConfig(prev =>
      prev
        ? { ...prev, systemQuestions: prev.systemQuestions.map(q => q.key === key ? { ...q, enabled: !q.enabled } : q) }
        : prev
    );
  };

  const deleteCustom = (id: string) => {
    setConfig(prev =>
      prev ? { ...prev, customQuestions: prev.customQuestions.filter(q => q.id !== id) } : prev
    );
  };

  const upsertCustom = (q: CustomScreeningQuestionDto) => {
    setConfig(prev => {
      if (!prev) return prev;
      const idx = prev.customQuestions.findIndex(c => c.id === q.id);
      if (idx >= 0) {
        const updated = [...prev.customQuestions];
        updated[idx] = q;
        return { ...prev, customQuestions: updated };
      }
      return { ...prev, customQuestions: [...prev.customQuestions, q] };
    });
    setAddOpen(false);
    setEditQuestion(null);
  };

  const handleSave = async () => {
    if (!config || !currentAgencyId) return;
    setSaving(true);
    try {
      await saveAgencyScreeningConfig(currentAgencyId, {
        overrides: config.systemQuestions.map(q => ({
          questionKey: q.key,
          enabled: q.enabled,
          customOrder: q.order,
        })),
        customQuestions: config.customQuestions.map(q => ({
          id: q.id.startsWith('_new_') ? undefined : q.id,
          category: q.category,
          label: q.label,
          description: q.description,
          type: q.type,
          options: q.options,
          required: q.required,
          order: q.order,
        })),
      });
      toast.success(t('settings:leadForm.saved'));
    } catch {
      toast.error(t('settings:leadForm.errorSave'));
    } finally {
      setSaving(false);
    }
  };

  const categories = config ? [...new Set(config.systemQuestions.map(q => q.category))] : [];
  const nextOrder = (config?.customQuestions.length ?? 0) + 1;

  return (
    <DashboardLayout>
      <div className="p-6 md:p-8 max-w-3xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="font-display text-2xl font-700 tracking-tight">{t('settings:leadForm.title')}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {t('settings:leadForm.subtitle')}
          </p>
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : config ? (
          <div className="space-y-10">

            {/* System questions */}
            <section>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-4">
                {t('settings:leadForm.systemSection')}
              </p>
              <div className="space-y-3">
                {categories.map(cat => (
                  <div key={cat} className="rounded-2xl border bg-card overflow-hidden">
                    <div className="px-5 py-2.5 border-b bg-muted/30">
                      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{tScreeningCategory(cat)}</span>
                    </div>
                    <div className="divide-y">
                      {config.systemQuestions.filter(q => q.category === cat).map(q => (
                        <div key={q.key} className="flex items-center gap-4 px-5 py-4">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{tQuestionLabel(q.key, q.label)}</p>
                            {q.description && (
                              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{tQuestionDescription(q.key, q.description)}</p>
                            )}
                            {q.options.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {q.options.map(opt => (
                                  <span key={opt} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground border">
                                    {tScreeningOption(opt)}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          {q.alwaysEnabled ? (
                            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide px-2 py-1 bg-muted rounded-full">
                              {t('settings:leadForm.alwaysActive')}
                            </span>
                          ) : (
                            <Switch checked={q.enabled} onCheckedChange={() => !isReadOnly && toggleSystem(q.key)} disabled={isReadOnly} />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Custom questions */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                  {t('settings:leadForm.customSection')}
                </p>
                {!isReadOnly && (
                  <Button size="sm" variant="outline" className="gap-2 rounded-xl h-8" onClick={() => setAddOpen(true)}>
                    <Plus className="w-3.5 h-3.5" />
                    {t('common:actions.add')}
                  </Button>
                )}
              </div>

              {config.customQuestions.length === 0 ? (
                <div className="rounded-2xl border bg-card p-10 text-center">
                  <p className="text-sm text-muted-foreground">{t('settings:leadForm.noCustom')}</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">{t('settings:leadForm.noCustomHint')}</p>
                </div>
              ) : (
                <div className="rounded-2xl border bg-card divide-y overflow-hidden">
                  {config.customQuestions.map(q => (
                    <div key={q.id} className="flex items-center gap-4 px-5 py-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium">{q.label}</p>
                          <span className="text-[10px] font-medium px-2 py-0.5 bg-muted rounded-full text-muted-foreground">
                            {t(`settings:leadForm.questionTypes.${q.type}`, q.type)}
                          </span>
                          {q.required && (
                            <span className="text-[10px] font-medium px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                              {t('settings:leadForm.required')}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{q.category}</p>
                        {q.options.length > 0 && (
                          <p className="text-xs text-muted-foreground/60 mt-0.5 truncate">
                            {q.options.join(' · ')}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {!isReadOnly && (
                          <>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground" onClick={() => setEditQuestion(q)}>
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive/60 hover:text-destructive" onClick={() => deleteCustom(q.id)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Save — hidden for agents */}
            {!isReadOnly && (
              <div className="flex justify-end pt-2 border-t">
                <Button onClick={handleSave} disabled={saving} className="gap-2 rounded-xl px-6">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {t('settings:leadForm.saveChanges')}
                </Button>
              </div>
            )}
          </div>
        ) : null}

        <AddCustomQuestionDialog
          open={addOpen || !!editQuestion}
          question={editQuestion}
          nextOrder={nextOrder}
          onOpenChange={open => { if (!open) { setAddOpen(false); setEditQuestion(null); } }}
          onSave={upsertCustom}
        />
      </div>
    </DashboardLayout>
  );
}
