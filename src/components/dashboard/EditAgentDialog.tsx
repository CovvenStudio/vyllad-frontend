import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { monitoring } from '@/lib/monitoring/monitoring';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { AgentDto } from '@/lib/agents-api';

interface Props {
  agent: AgentDto;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (phone?: string, role?: string) => Promise<void>;
}

const ROLES = [
  { value: 'MANAGER', label: 'Manager' },
  { value: 'AGENT', label: 'Agente' },
];

const EditAgentDialog = ({ agent, open, onOpenChange, onSave }: Props) => {
  const { t } = useTranslation('common');
  const [phone, setPhone] = useState(agent.phone ?? '');
  const [role, setRole] = useState(agent.role === 'OWNER' ? 'AGENT' : agent.role);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      await onSave(phone.trim() || undefined, role);
      onOpenChange(false);
    } catch (e: unknown) {
      monitoring.captureException(e, { context: 'edit-agent' });
      setError((e as { message?: string })?.message ?? t('agents.errorSave'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!loading) onOpenChange(o); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display">{t('agents.editAgent')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <Label className="text-xs font-medium text-muted-foreground">Email</Label>
            <p className="text-sm mt-1 text-foreground">{agent.email}</p>
          </div>

          <div>
            <Label className="text-xs font-medium mb-2 block">Função</Label>
            <div className="grid grid-cols-2 gap-2">
              {ROLES.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRole(r.value)}
                  className={`text-left rounded-xl border px-3 py-2.5 transition-colors ${
                    role === r.value
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border hover:border-muted-foreground/40'
                  }`}
                >
                  <p className="text-sm font-semibold">{r.label}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs font-medium">{t('agents.phone')}</Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1.5"
              placeholder="+351 912 000 000"
            />
          </div>

          {error && (
            <p className="text-xs text-destructive rounded-lg bg-destructive/5 border border-destructive/20 px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={() => onOpenChange(false)} disabled={loading}>
              {t('actions.cancel')}
            </Button>
            <Button onClick={submit} disabled={loading} className="flex-1 rounded-xl">
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t('actions.saving')}</> : t('actions.save')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditAgentDialog;
