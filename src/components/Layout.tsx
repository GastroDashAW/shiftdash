import { ReactNode, useState } from 'react';
import { Button } from '@/components/ui/button';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from 'react-router-dom';
import { Users, CalendarCheck, FileDown, Menu, X, Layers, CalendarDays, LogOut, ClipboardCheck, LayoutDashboard, DollarSign, Building2, CalendarPlus, Clock, Settings, ShieldCheck, ChevronDown } from 'lucide-react';
import shiftDashLogo from '@/assets/shiftdash-logo.png';
import { BRANDING } from '@/config/branding';

import { DashChatWidget } from '@/components/dash/DashChatWidget';

export function Layout({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { isAdmin, user, signOut } = useAuth();
  const location = useLocation();

  const navGroups = [
    {
      label: null,
      items: [
        { to: '/', label: 'Dashboard', icon: LayoutDashboard, adminOnly: false },
      ],
    },
    {
      label: 'Mein Bereich',
      items: [
        { to: '/clock', label: 'Stempeln', icon: Clock, adminOnly: false },
        { to: '/schedule', label: 'Dienstplan', icon: CalendarDays, adminOnly: false },
        { to: '/leave', label: 'Abwesenheit', icon: CalendarPlus, adminOnly: false },
      ],
    },
    {
      label: 'Personal',
      items: [
        { to: '/employees', label: 'Mitarbeiter', icon: Users, adminOnly: true },
        { to: '/groups', label: 'Gruppen & GAV', icon: ShieldCheck, adminOnly: true },
        { to: '/shifts', label: 'Dienste', icon: Layers, adminOnly: true },
      ],
    },
    {
      label: 'Kontrolle',
      items: [
        { to: '/time-control', label: 'Tageskontrolle', icon: ClipboardCheck, adminOnly: true },
        { to: '/validation', label: 'Validierung', icon: CalendarCheck, adminOnly: true },
      ],
    },
    {
      label: 'Auswertung',
      items: [
        { to: '/export', label: 'Export', icon: FileDown, adminOnly: true },
        { to: '/budget', label: 'Budget', icon: DollarSign, adminOnly: true },
      ],
    },
    {
      label: 'Verwaltung',
      items: [
        { to: '/business', label: 'Betrieb', icon: Building2, adminOnly: true },
        { to: '/settings', label: 'Einstellungen', icon: Settings, adminOnly: true },
      ],
    },
  ];

  const [openGroups, setOpenGroups] = useState<Set<string>>(() => {
    const openSet = new Set<string>();
    navGroups.forEach(g => {
      if (g.label && g.items.some(i => location.pathname === i.to)) {
        openSet.add(g.label);
      }
    });
    return openSet;
  });

  const toggleGroup = (label: string) => {
    setOpenGroups(prev => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  const visibleGroups = navGroups
    .map(group => ({
      ...group,
      items: group.items.filter(item => !item.adminOnly || isAdmin),
    }))
    .filter(group => group.items.length > 0);

  const allVisibleItems = visibleGroups.flatMap(g => g.items);

  return (
    <div className="min-h-screen bg-background">
      <StagingBanner />
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={shiftDashLogo} alt="ShiftDash" className="h-8 w-8 object-contain" />
            <span className="font-heading text-lg font-semibold tracking-tight">{BRANDING.appName}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-muted-foreground sm:block">
              {user?.email}
            </span>
            <Button variant="ghost" size="icon" onClick={signOut} title="Abmelden">
              <LogOut className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        <nav className="hidden w-56 border-r bg-card md:block">
          <div className="flex h-[calc(100vh-3.5rem)] flex-col justify-between overflow-y-auto p-3">
            <div className="space-y-1">
              {visibleGroups.map((group, gi) => (
                <div key={gi}>
                  {group.label ? (
                    <>
                      <button
                        onClick={() => toggleGroup(group.label!)}
                        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:bg-accent/50"
                      >
                        {group.label}
                        <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${openGroups.has(group.label!) ? 'rotate-180' : ''}`} />
                      </button>
                      {openGroups.has(group.label!) && (
                        <div className="ml-2 space-y-0.5 border-l border-border/50 pl-2">
                          {group.items.map((item) => (
                            <NavLink key={item.to} to={item.to} className="flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm transition-colors hover:bg-accent">
                              <item.icon className="h-4 w-4" />
                              {item.label}
                            </NavLink>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="space-y-0.5">
                      {group.items.map((item) => (
                        <NavLink key={item.to} to={item.to} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent">
                          <item.icon className="h-4 w-4" />
                          {item.label}
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <Button variant="ghost" className="justify-start gap-3 text-sm text-muted-foreground" onClick={signOut}>
              <LogOut className="h-4 w-4" />
              Abmelden
            </Button>
          </div>
        </nav>

        {menuOpen && (
          <div className="fixed inset-0 top-14 z-40 overflow-y-auto bg-card md:hidden">
            <nav className="flex flex-col gap-2 p-4">
              {visibleGroups.map((group, gi) => (
                <div key={gi}>
                  {group.label ? (
                    <>
                      <button
                        onClick={() => toggleGroup(group.label!)}
                        className="flex w-full items-center justify-between rounded-lg px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:bg-accent/50"
                      >
                        {group.label}
                        <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${openGroups.has(group.label!) ? 'rotate-180' : ''}`} />
                      </button>
                      {openGroups.has(group.label!) && (
                        <div className="ml-3 space-y-0.5 border-l border-border/50 pl-3">
                          {group.items.map((item) => (
                            <NavLink
                              key={item.to}
                              to={item.to}
                              onClick={() => setMenuOpen(false)}
                              className="flex items-center gap-3 rounded-lg px-4 py-2.5 text-base transition-colors hover:bg-accent"
                            >
                              <item.icon className="h-5 w-5" />
                              {item.label}
                            </NavLink>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="space-y-0.5">
                      {group.items.map((item) => (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-3 rounded-lg px-4 py-3 text-base transition-colors hover:bg-accent"
                        >
                          <item.icon className="h-5 w-5" />
                          {item.label}
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <Button variant="ghost" className="justify-start gap-3 mt-2 text-muted-foreground" onClick={signOut}>
                <LogOut className="h-5 w-5" />
                Abmelden
              </Button>
            </nav>
          </div>
        )}

        <main className="flex-1 overflow-auto">
          <div className="container py-4 md:py-6">
            {children}
          </div>
        </main>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card/95 backdrop-blur md:hidden">
        <div className="flex justify-around py-2">
          {allVisibleItems.slice(0, 5).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMenuOpen(false)}
              className="flex flex-col items-center gap-1 px-2 py-1 text-[10px] text-muted-foreground transition-colors hover:text-foreground"
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>

      <DashChatWidget />
    </div>
  );
}
