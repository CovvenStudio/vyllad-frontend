import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Plus, Mail, Phone, Clock, Trash2, Pencil, AlertTriangle, TrendingUp, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import AddAgentDialog from '@/components/dashboard/AddAgentDialog';
import EditAgentDialog from '@/components/dashboard/EditAgentDialog';
import { useAgents } from '@/hooks/useAgents';
import { useAuth } from '@/contexts/AuthContext';
import { usePlans } from '@/plans';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { apiFetch } from '@/lib/api-client';
import { monitoring } from '@/lib/monitoring/monitoring';
import type { AgentDto, PendingInviteDto } from '@/lib/agents-api';
import { cn } from '@/lib/utils';

function getAvatar(agent: AgentDto) {
  return agent.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(agent.email)}`;
}

const Agents = () => {
  const { agents, pending, ownerPlanId, loading, error, invite, update, remove, removeInvite } = useAgents();
  const { user, memberships, currentAgencyId } = useAuth();
  const { t } = useTranslation(['agents', 'common']);
  const { plans } = usePlans();

  // Derive agency country code from the current membership
  const currentMembership = memberships.find((m) => m.agencyId === currentAgencyId) ?? null;
  const agencyCountryCode = currentMembership?.agencyCountryCode ?? null;
  const currentRole = currentMembership?.role ?? null;
  const canManage = currentRole === 'OWNER' || currentRole === 'MANAGER';

  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AgentDto | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);
  const [confirmDeleteInvite, setConfirmDeleteInvite] = useState<PendingInviteDto | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [upgrading, setUpgrading] = useState(false);

  // ── Plan limit — based on owner's plan, not the logged-in user's plan ──────
  const currentPlan = plans.find((p) => p.backendPlanId === ownerPlanId) ?? null;
  const { subStatus } = useSubscriptionStatus();
  const agentLimit = subStatus?.effectiveMaxAgents ?? currentPlan?.limits.agents ?? null;
  const hasAgentGrant = subStatus?.hasAgentGrant ?? false;
  // OWNER does not count toward the limit — only non-owner members + pending invites
  const totalUsed = agents.filter((a) => a.role !== 'OWNER').length + pending.length;
  const isAtLimit = agentLimit !== null && totalUsed >= agentLimit;
  const slotsLeft = agentLimit !== null ? Math.max(0, agentLimit - totalUsed) : null;

  const handleUpgrade = async () => {
    setUpgrading(true);
    try {
      const { url } = await apiFetch<{ url: string }>('/subscriptions/manage', { method: 'POST' });
      window.location.href = url;
    } catch (err) {
      monitoring.captureException(err, { context: 'open-upgrade-portal' });
      setActionError(t('agents:upgradePortalError'));
    } finally {
      setUpgrading(false);
    }
  };

  const handleInvite = async (email: string, role: string, phone?: string) => {
    setActionError(null);
    try {
      await invite(email, role, phone);
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message ?? t('agents:inviteError');
      setActionError(msg);
      throw e;
    }
  };

  const handleUpdate = async (membershipId: string, phone?: string) => {
    await update(membershipId, phone);
    setEditTarget(null);
  };

  const handleRemove = async () => {
    if (!confirmDelete) return;
    try {
      await remove(confirmDelete.id);
    } catch (e: unknown) {
      monitoring.captureException(e, { context: 'remove-agent' });
      setActionError((e as { message?: string })?.message ?? t('agents:removeError'));
    } finally {
      setConfirmDelete(null);
    }
  };

  const handleRemoveInvite = async () => {
    if (!confirmDeleteInvite) return;
    try {
      await removeInvite(confirmDeleteInvite.id);
    } catch (err) {
      monitoring.captureException(err, { context: 'cancel-invite' });
      setActionError(t('agents:cancelError'));
    } finally {
      setConfirmDeleteInvite(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-10 max-w-6xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
          <div>
            <h1 className="font-display text-2xl font-700 tracking-tight">{t('agents:title')}</h1>
            <p className="text-sm text-muted-foreground mt-1">{t('agents:subtitle')}</p>
          </div>
          <Button
            onClick={() => { setActionError(null); setAddOpen(true); }}
            disabled={isAtLimit || !canManage}
            className="rounded-xl font-semibold text-sm h-10 px-5"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('agents:invite')}
          </Button>
        </div>

        {/* Action error banner */}
        {actionError && (
          <div className="mb-6 flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {actionError}
          </div>
        )}

        {/* Plan limit banner */}
        {agentLimit !== null && (
          <div className={cn(
            'mb-8 rounded-2xl border px-5 py-4',
            isAtLimit
              ? 'border-amber-300/50 bg-amber-50/50 dark:bg-amber-950/20'
              : 'border-border bg-card',
          )}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold">
                    {totalUsed} / {agentLimit} agentes
                  </span>
                  {hasAgentGrant && (
                    <span className="text-[10px] font-bold uppercase tracking-wide bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded-full">
                      ✦ Grant
                    </span>
                  )}
                  {isAtLimit && (
                    <span className="text-[10px] font-semibold uppercase tracking-wide bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 px-2 py-0.5 rounded-full">
                      {t('agents:limitReached')}
                    </span>
                  )}
                </div>
                <div className="w-full sm:w-48 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      isAtLimit ? 'bg-amber-400' : 'bg-primary',
                    )}
                    style={{ width: `${Math.min(100, (totalUsed / agentLimit) * 100)}%` }}
                  />
                </div>
                {isAtLimit ? (
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {t('agents:atLimit', { plan: currentPlan?.name, max: agentLimit })}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {t('agents:slotsLeft', { count: slotsLeft ?? 0 })}
                    <span className="font-medium">{currentPlan?.name}</span>
                    <span className="ml-1 opacity-60">{t('agents:ownerExcluded')}</span>
                  </p>
                )}
              </div>
              {isAtLimit && currentRole === 'OWNER' && (
                <Button
                  size="sm"
                  onClick={handleUpgrade}
                  disabled={upgrading}
                  className="rounded-xl font-semibold shrink-0 gap-2"
                >
                  {upgrading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <TrendingUp className="w-3.5 h-3.5" />}
                  {t('agents:upgrade')}
                </Button>
              )}
              {isAtLimit && currentRole !== 'OWNER' && (
                <p className="text-xs text-amber-600 dark:text-amber-400 shrink-0">
                  {t('agents:contactOwnerUpgrade')}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className={`grid grid-cols-2 ${canManage ? 'md:grid-cols-3' : ''} gap-4 mb-10`}>
          <Stat label={t('agents:stats.agents')} value={agents.filter((a) => a.role !== 'OWNER').length} />
          {canManage && <Stat label={t('agents:stats.pending')} value={pending.length} />}
          <Stat label={t('agents:stats.total')} value={agents.length + pending.length} />
        </div>

        {loading && (
          <div className="text-sm text-muted-foreground animate-pulse">{t('agents:loading')}</div>
        )}
        {error && !loading && (
          <div className="text-sm text-destructive">{error}</div>
        )}

        {/* Agents grid */}
        {!loading && agents.length > 0 && (
          <div className="grid md:grid-cols-2 gap-4 mb-8">
            {agents.map((agent, i) => (
              <motion.div
                key={agent.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="p-6 rounded-2xl border bg-card hover:shadow-lg hover:shadow-primary/[0.04] transition-all duration-300"
              >
                <div className="flex items-start gap-4 mb-5">
                  <img
                    src={getAvatar(agent)}
                    alt={agent.name}
                    referrerPolicy="no-referrer"
                    className="w-14 h-14 rounded-full bg-muted shrink-0"
                    onError={(e) => {
                      const fb = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(agent.name)}&backgroundColor=1a2341&textColor=ffffff`;
                      if (e.currentTarget.src !== fb) e.currentTarget.src = fb;
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-display font-600 text-base truncate">{agent.name}</h3>
                        <span className={cn(
                          'inline-block mt-1 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full',
                          agent.role === 'OWNER'
                            ? 'bg-foreground/10 text-foreground'
                            : 'bg-muted text-muted-foreground',
                        )}>
                          {t(`common:roles.${agent.role.toLowerCase()}`)}
                        </span>
                      </div>
                      {agent.role !== 'OWNER' && (
                        <div className="flex gap-1 shrink-0">
                          <button
                            onClick={() => { setActionError(null); setEditTarget(agent); }}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            title="Editar"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => { setActionError(null); setConfirmDelete({ id: agent.id, name: agent.name }); }}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            title="Remover"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{agent.email}</span>
                  </div>
                  {agent.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 shrink-0" />
                      {agent.phone}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Pending invites */}
        {!loading && canManage && pending.length > 0 && (
          <div>
            <h2 className="font-display text-sm font-600 tracking-tight text-muted-foreground mb-3 uppercase tracking-widest">
              {t('agents:pendingInvites')}
            </h2>
            <div className="space-y-2">
              {pending.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between gap-4 px-5 py-4 rounded-xl border border-dashed bg-card"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{inv.email}</p>
                      <p className="text-xs text-muted-foreground">
                        {t('agents:pendingExpires', { role: t(`common:roles.${inv.role.toLowerCase()}`), date: new Date(inv.expiresAt).toLocaleDateString() })}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setActionError(null); setConfirmDeleteInvite(inv); }}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                    title="Cancelar convite"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && agents.length === 0 && pending.length === 0 && !error && (
          <div className="text-center py-16 text-muted-foreground text-sm">
            <p className="mb-4">{t('agents:empty')}</p>
            <Button variant="outline" onClick={() => setAddOpen(true)} className="rounded-xl" disabled={isAtLimit}>
              <Plus className="w-4 h-4 mr-2" />
              {t('agents:inviteFirst')}
            </Button>
          </div>
        )}
      </div>

      <AddAgentDialog open={addOpen} onOpenChange={setAddOpen} onAdd={handleInvite} agencyCountryCode={agencyCountryCode} />

      {editTarget && (
        <EditAgentDialog
          agent={editTarget}
          open={!!editTarget}
          onOpenChange={(o) => { if (!o) setEditTarget(null); }}
          onSave={(phone) => handleUpdate(editTarget.id, phone)}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          title={t('agents:dialog.removeAgent.title')}
          description={t('agents:dialog.removeAgent.description', { name: confirmDelete.name })}
          confirmLabel={t('agents:dialog.removeAgent.confirm')}
          onConfirm={handleRemove}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {confirmDeleteInvite && (
        <ConfirmDialog
          title={t('agents:dialog.cancelInvite.title')}
          description={t('agents:dialog.cancelInvite.description', { email: confirmDeleteInvite.email })}
          confirmLabel={t('common:actions.cancel')}
          onConfirm={handleRemoveInvite}
          onCancel={() => setConfirmDeleteInvite(null)}
        />
      )}
    </DashboardLayout>
  );
};

const Stat = ({ label, value }: { label: string; value: string | number }) => (
  <div className="p-5 rounded-xl border bg-card">
    <div className="text-2xl font-display font-700 tracking-tight">{value}</div>
    <div className="text-xs text-muted-foreground mt-1">{label}</div>
  </div>
);

function ConfirmDialog({
  title,
  description,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation('common');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-xl space-y-4">
        <h3 className="font-display font-600 text-base">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
        <div className="flex gap-3 pt-1">
          <Button variant="outline" className="flex-1 rounded-xl" onClick={onCancel}>
            {t('actions.cancel')}
          </Button>
          <Button variant="destructive" className="flex-1 rounded-xl" onClick={onConfirm}>
            {confirmLabel ?? t('actions.delete')}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default Agents;
