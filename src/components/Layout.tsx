import { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { NavLink } from '@/components/NavLink';
import { Clock, Users, CalendarCheck, FileDown, LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';

export function Layout({ children }: { children: ReactNode }) {
  const { user, isAdmin, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const navItems = [
    { to: '/', label: 'Stempeln', icon: Clock },
    ...(isAdmin ? [
      { to: '/employees', label: 'Mitarbeiter', icon: Users },
      { to: '/validation', label: 'Validierung', icon: CalendarCheck },
      { to: '/export', label: 'Export', icon: FileDown },
    ] : []),
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile header */}
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Clock className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-heading font-semibold">GastroTime</span>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-muted-foreground sm:block">
              {user?.email}
            </span>
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
        {/* Desktop sidebar */}
        <nav className="hidden w-56 border-r bg-card md:block">
          <div className="flex h-[calc(100vh-3.5rem)] flex-col justify-between p-4">
            <div className="space-y-1">
              {navItems.map((item) => (
                <NavLink key={item.to} to={item.to} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent">
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              ))}
            </div>
            <Button variant="ghost" size="sm" onClick={signOut} className="justify-start gap-2">
              <LogOut className="h-4 w-4" />
              Abmelden
            </Button>
          </div>
        </nav>

        {/* Mobile nav */}
        {menuOpen && (
          <div className="fixed inset-0 top-14 z-40 bg-card md:hidden">
            <nav className="flex flex-col gap-1 p-4">
              {navItems.map((item) => (
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
              <hr className="my-2" />
              <Button variant="ghost" onClick={signOut} className="justify-start gap-3 px-4 py-3">
                <LogOut className="h-5 w-5" />
                Abmelden
              </Button>
            </nav>
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 overflow-auto">
          <div className="container py-4 md:py-6">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card/95 backdrop-blur md:hidden">
        <div className="flex justify-around py-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMenuOpen(false)}
              className="flex flex-col items-center gap-1 px-3 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
