import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Building2, Calendar, UserCog, LogOut, Menu, ChevronsUpDown, ClipboardList, SlidersHorizontal, Settings2, CreditCard, Crown, Clock, LayoutDashboard, Home } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useAuth } from '@/contexts/AuthContext';
import { useFeatureFlags } from '@/contexts/FeatureFlagsContext';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';

const ROLE_LABEL: Record<string, string> = { OWNER: 'Proprietário', MANAGER: 'Gerente', AGENT: 'Colaborador' };

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, labelKey: 'nav.dashboard', end: true, featureKey: 'dashboard.module_enabled' },
  { to: '/properties', icon: Home, labelKey: 'nav.properties', featureKey: 'properties.module_enabled' },
  { to: '/agents', icon: UserCog, labelKey: 'nav.agents', featureKey: 'agents.management_enabled' },
  { to: '/appointments', icon: Calendar, labelKey: 'nav.appointments', featureKey: 'appointments.module_enabled' },
  { to: '/screening', icon: ClipboardList, labelKey: 'nav.screening', featureKey: 'screening.module_enabled' },
];

const managerNavItems = [
  { to: '/scoring', icon: SlidersHorizontal, labelKey: 'nav.scoring', featureKey: 'scoring.module_enabled' },
  { to: '/settings', icon: Settings2, labelKey: 'nav.settings', featureKey: 'settings.module_enabled' },
];

const ownerNavItems = [
  { to: '/billing', icon: CreditCard, labelKey: 'nav.billing', featureKey: 'billing.module_enabled' },
];

function NavContent({ onNav }: { onNav?: () => void }) {
  const navigate = useNavigate();
  const { user, memberships, currentAgencyId, subscription, signOut } = useAuth();
  const { isEnabled } = useFeatureFlags();
  const { t } = useTranslation('dashboard');
  const [avatarError, setAvatarError] = useState(false);

  const currentAgency = memberships.find((m) => m.agencyId === currentAgencyId) ?? null;
  const hasMultipleAgencies = memberships.length > 1;
  const isOwner = currentAgency?.role === 'OWNER';
  const isTrial = subscription?.status === 'trialing';

  // Days remaining in trial
  const trialDaysLeft = (() => {
    if (!subscription?.trialEndsAt) return null;
    const diff = new Date(subscription.trialEndsAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  })();

  const handleUpgrade = () => {
    onNav?.();
    navigate('/onboarding/upgrade');
  };

  const handleSignOut = () => {
    signOut();
    navigate('/login');
  };

  const handleSwitchAgency = () => {
    onNav?.();
    navigate('/select-agency');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-5 border-b flex justify-center">
        <Link to="/" className="flex items-center gap-1" onClick={onNav}>
          <span className="font-display text-2xl font-700 tracking-tight">vyllad</span>
          <span className="text-accent text-2xl">.</span>
        </Link>
      </div>

      {currentAgency && (
        <div className="px-3 pt-3">
          <button
            onClick={hasMultipleAgencies ? handleSwitchAgency : undefined}
            disabled={!hasMultipleAgencies}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border bg-muted/40 text-left transition-colors ${
              hasMultipleAgencies ? 'hover:bg-muted cursor-pointer' : 'cursor-default'
            }`}
          >
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Building2 className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate">{currentAgency.agencyName}</p>
            <p className="text-[10px] text-muted-foreground">{ROLE_LABEL[currentAgency.role] ?? currentAgency.role}</p>
            </div>
            {hasMultipleAgencies && <ChevronsUpDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
          </button>
        </div>
      )}

      <nav className="flex-1 p-3 space-y-0.5">
        {[...navItems, ...(currentAgency && ['OWNER', 'MANAGER'].includes(currentAgency.role) ? managerNavItems : []), ...(currentAgency?.role === 'OWNER' ? ownerNavItems : [])]
          .filter((item) => !('featureKey' in item) || !item.featureKey || isEnabled(item.featureKey))
          .map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={('end' in item ? item.end : false) as boolean}
            onClick={onNav}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm w-full transition-all duration-200 ${
                isActive
                  ? 'bg-primary/[0.05] text-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
              }`
            }
          >
            <item.icon className="w-[18px] h-[18px]" />
            {t(item.labelKey)}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t space-y-3">
        {/* Trial banner — only shown to owner while trialing */}
        {isOwner && isTrial && trialDaysLeft !== null && (
          <div className={`rounded-xl px-3 py-2.5 space-y-2 border ${
            trialDaysLeft <= 2
              ? 'bg-red-50 border-red-200'
              : trialDaysLeft <= 5
              ? 'bg-amber-50 border-amber-200'
              : 'bg-primary/[0.04] border-primary/20'
          }`}>
            <div className="flex items-center gap-2">
              <Clock className={`w-3.5 h-3.5 shrink-0 ${
                trialDaysLeft <= 2 ? 'text-red-500' : trialDaysLeft <= 5 ? 'text-amber-500' : 'text-primary'
              }`} />
              <p className={`text-[11px] font-semibold ${
                trialDaysLeft <= 2 ? 'text-red-700' : trialDaysLeft <= 5 ? 'text-amber-700' : 'text-foreground'
              }`}>
                {trialDaysLeft === 0
                  ? t('trialBanner.expired')
                  : t('trialBanner.daysLeft', { count: trialDaysLeft })}
              </p>
            </div>
            <button
              onClick={handleUpgrade}
              className={`w-full flex items-center justify-center gap-1.5 text-[11px] font-semibold py-1.5 rounded-lg transition-colors ${
                trialDaysLeft <= 2
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : trialDaysLeft <= 5
                  ? 'bg-amber-500 hover:bg-amber-600 text-white'
                  : 'bg-primary hover:bg-primary/90 text-primary-foreground'
              }`}
            >
            <Crown className="w-3 h-3" />
              {t('trialBanner.upgrade')}
            </button>
          </div>
        )}

        {user && (
          <div className="flex items-center gap-3 px-1">
            {user.avatarUrl && !avatarError ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                referrerPolicy="no-referrer"
                className="w-9 h-9 rounded-full object-cover ring-2 ring-[#1a2341] ring-offset-1"
                onError={() => setAvatarError(true)}
              />
            ) : null}
            <div
              className="w-9 h-9 rounded-full bg-[#1a2341]/10 items-center justify-center text-sm font-semibold text-[#1a2341] ring-2 ring-[#1a2341] ring-offset-1"
              style={{ display: user.avatarUrl && !avatarError ? 'none' : 'flex' }}
            >
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold truncate">{user.name}</div>
              <div className="text-[11px] text-muted-foreground truncate">{user.email}</div>
            </div>
          </div>
        )}
        <div className="px-3 pb-1">
          <LanguageSwitcher className="w-full justify-center" />
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-full px-3 py-2"
        >
          <LogOut className="w-4 h-4" />
          {t('nav.signOut')}
        </button>
      </div>
    </div>
  );
}

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen flex">
      {/* Desktop sidebar */}
      <aside className="w-60 border-r bg-card hidden lg:flex flex-col fixed h-screen z-30">
        <NavContent />
      </aside>

      {/* Mobile top bar */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 h-14 border-b bg-card flex items-center justify-between px-4">
        <div className="flex items-center gap-1">
          <span className="font-display text-xl font-700 tracking-tight">vyllad</span>
          <span className="text-accent text-xl">.</span>
        </div>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button className="p-2 rounded-lg hover:bg-muted transition-colors" aria-label="Abrir menu">
              <Menu className="w-5 h-5" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64">
            <NavContent onNav={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
      </header>

      <main className="flex-1 lg:ml-60 pt-14 lg:pt-0 overflow-x-hidden">{children}</main>
    </div>
  );
};

export default DashboardLayout;
