import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function getPhonePrefix(countryCode: string | null): string {
  if (countryCode === 'BR') return '+55 ';
  return '+351 ';
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (email: string, role: string, phone?: string) => Promise<void>;
  agencyCountryCode: string | null;
}

const AddAgentDialog = ({ open, onOpenChange, onAdd, agencyCountryCode }: Props) => {
  const { t } = useTranslation('common');
  const ROLES = [
    { value: 'MANAGER', label: t('agents.roles.MANAGER'), description: t('agents.roles.managerDesc') },
    { value: 'AGENT', label: t('agents.roles.AGENT'), description: t('agents.roles.agentDesc') },
  ];
  const [form, setForm] = useState({ email: '', phone: getPhonePrefix(agencyCountryCode), role: 'AGENT' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isGmail = form.email.toLowerCase().endsWith('@gmail.com');
  const canSubmit = isGmail && !loading;

  const submit = async () => {
    if (!canSubmit) return;
    setError(null);
    setLoading(true);
    try {
      await onAdd(form.email.trim(), form.role, form.phone.trim() || undefined);
      setForm({ email: '', phone: getPhonePrefix(agencyCountryCode), role: 'AGENT' });
      onOpenChange(false);
    } catch (e: unknown) {
      setError((e as { message?: string })?.message ?? t('agents.errorInvite'));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (o: boolean) => {
    if (!loading) {
      setError(null);
      onOpenChange(o);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">{t('agents.invite')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <Label className="text-xs font-medium">{t('agents.emailGmail')} <span className="text-destructive">*</span></Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              className="mt-1.5"
              placeholder="agente@gmail.com"
              autoFocus
            />
            {form.email && !isGmail && (
              <p className="text-xs text-destructive mt-1">{t('agents.gmailOnly')}</p>
            )}
          </div>

          <div>
            <Label className="text-xs font-medium mb-2 block">{t('agents.role')} <span className="text-destructive">*</span></Label>
            <div className="grid grid-cols-2 gap-2">
              {ROLES.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, role: r.value }))}
                  className={`text-left rounded-xl border px-3 py-2.5 transition-colors ${
                    form.role === r.value
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border hover:border-muted-foreground/40'
                  }`}
                >
                  <p className="text-sm font-semibold">{r.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{r.description}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs font-medium">{t('agents.phone')} <span className="text-muted-foreground">{t('common:optional')}</span></Label>
            <Input
              value={form.phone}
              onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              onFocus={(e) => {
                const end = e.target.value.length;
                e.target.setSelectionRange(end, end);
              }}
              onClick={(e) => {
                const prefix = getPhonePrefix(agencyCountryCode);
                const pos = (e.target as HTMLInputElement).selectionStart ?? 0;
                if (pos < prefix.length) {
                  (e.target as HTMLInputElement).setSelectionRange(prefix.length, prefix.length);
                }
              }}
              className="mt-1.5"
              placeholder="+351 912 000 000"
            />
          </div>

          {error && (
            <p className="text-xs text-destructive rounded-lg bg-destructive/5 border border-destructive/20 px-3 py-2">
              {error}
            </p>
          )}

          <Button onClick={submit} disabled={!canSubmit} className="w-full rounded-lg font-semibold">
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t('agents.sendingInvite')}</> : t('agents.sendInvite')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddAgentDialog;
