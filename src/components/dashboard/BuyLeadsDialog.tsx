import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Minus, Plus, Loader2, Gauge, CheckCircle2, Crown, ArrowRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';

interface SubStatusExtra {
  extraLeads: number;
  extraLeadsPerUnit: number | null;
  extraLeadPricePerUnit: number | null;
  extraLeadCurrency: string | null;
  supportsExtraLeads: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: () => void;
}

const CURRENCY_SYMBOL: Record<string, string> = {
  eur: '€', usd: '$', brl: 'R$',
};

const BuyLeadsDialog = ({ open, onOpenChange, onUpdated }: Props) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [status, setStatus] = useState<SubStatusExtra | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [quantity, setQuantity] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoadingStatus(true);
    apiFetch<SubStatusExtra>('/subscriptions/status')
      .then(d => {
        setStatus(d);
        setQuantity(d.extraLeads);
      })
      .catch(() => setStatus(null))
      .finally(() => setLoadingStatus(false));
  }, [open]);

  const leadsPerUnit = status?.extraLeadsPerUnit ?? 1;
  const pricePerUnit = status?.extraLeadPricePerUnit ?? 0;
  const currency = status?.extraLeadCurrency ?? 'eur';
  const sym = CURRENCY_SYMBOL[currency] ?? currency.toUpperCase() + ' ';
  const currentLeads = (status?.extraLeads ?? 0) * leadsPerUnit;
  const newLeads = quantity * leadsPerUnit;
  const diff = quantity - (status?.extraLeads ?? 0);
  const monthlyDelta = diff * pricePerUnit;
  const totalMonthly = quantity * pricePerUnit;
  const unchanged = quantity === (status?.extraLeads ?? 0);

  async function handleSave() {
    setSaving(true);
    try {
      await apiFetch('/subscriptions/extra-leads', {
        method: 'PATCH',
        body: JSON.stringify({ quantity }),
      });
      toast({
        title: diff > 0 ? 'Leads extra adicionados' : 'Leads extra reduzidos',
        description: `O teu limite passa a ${newLeads} leads extra por imóvel.`,
      });
      onOpenChange(false);
      onUpdated?.();
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: err instanceof Error ? err.message : 'Não foi possível atualizar os leads extra.',
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm p-0 overflow-hidden gap-0">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-xl bg-accent/15 flex items-center justify-center">
              <Gauge className="w-4 h-4 text-accent-foreground" />
            </div>
            <DialogTitle className="text-base font-semibold">Leads extra por imóvel</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground pl-[2.625rem]">
            Aumenta o limite de candidatos mensais sem mudar de plano.
          </DialogDescription>
        </div>

        <div className="px-6 py-5">
          {loadingStatus ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : !status?.supportsExtraLeads ? (
            <div className="py-2 space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                O teu plano não inclui leads extra. Faz upgrade para desbloquear esta funcionalidade.
              </p>
              <Button
                className="w-full gap-2 bg-accent text-accent-foreground hover:bg-accent/85"
                onClick={() => { onOpenChange(false); navigate('/onboarding/upgrade'); }}
              >
                <Crown className="w-4 h-4" />
                Ver planos
              </Button>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Current state badge */}
              {currentLeads > 0 && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/60 rounded-xl px-3.5 py-2.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-accent-foreground shrink-0" />
                  <span>Atualmente: <span className="font-semibold text-foreground">{currentLeads} leads extra</span> · {status!.extraLeads} pacote{status!.extraLeads !== 1 ? 's' : ''}/mês</span>
                </div>
              )}

              {/* Stepper */}
              <div className="flex items-center justify-between rounded-2xl border bg-muted/30 px-5 py-4">
                <button
                  type="button"
                  onClick={() => setQuantity(q => Math.max(0, q - 1))}
                  disabled={quantity <= 0}
                  className="w-9 h-9 rounded-xl border bg-background flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>

                <div className="text-center">
                  <p className="text-3xl font-bold tracking-tight">{quantity}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {quantity === 0
                      ? 'sem leads extra'
                      : `${quantity * leadsPerUnit} leads · ${sym}${totalMonthly.toFixed(2)}/mês`}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setQuantity(q => Math.min(50, q + 1))}
                  disabled={quantity >= 50}
                  className="w-9 h-9 rounded-xl border bg-background flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Delta summary */}
              {!unchanged && (
                <div className={`flex items-center justify-between rounded-xl px-4 py-2.5 text-sm ${
                  diff > 0 ? 'bg-accent/8 border border-accent/20' : 'bg-destructive/5 border border-destructive/15'
                }`}>
                  <span className="text-muted-foreground text-xs">Variação na fatura</span>
                  <span className={`font-semibold text-sm ${diff > 0 ? 'text-accent-foreground' : 'text-destructive'}`}>
                    {diff > 0 ? '+' : ''}{sym}{Math.abs(monthlyDelta).toFixed(2)}/mês
                  </span>
                </div>
              )}

              {/* CTA */}
              <Button
                className="w-full gap-2 bg-accent text-accent-foreground hover:bg-accent/85 h-11 text-sm font-semibold"
                onClick={handleSave}
                disabled={saving || unchanged}
              >
                {saving
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> A guardar...</>
                  : unchanged
                  ? 'Sem alterações'
                  : diff > 0
                  ? `Adicionar ${diff} pacote${diff !== 1 ? 's' : ''}`
                  : `Remover ${Math.abs(diff)} pacote${Math.abs(diff) !== 1 ? 's' : ''}`}
              </Button>

              <p className="text-[11px] text-muted-foreground text-center">
                O valor é ajustado ao tempo restante do mês atual.
              </p>
            </div>
          )}
        </div>

        {/* Upgrade footer */}
        <div className="border-t bg-muted/30 px-6 py-4">
          <button
            onClick={() => { onOpenChange(false); navigate('/onboarding/upgrade'); }}
            className="w-full flex items-center justify-between text-sm text-muted-foreground hover:text-foreground transition-colors group"
          >
            <div className="flex items-center gap-2">
              <Crown className="w-3.5 h-3.5 text-accent-foreground" />
              <span>Quer mais leads incluídos?</span>
              <span className="font-medium text-foreground">Ver planos superiores</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BuyLeadsDialog;
