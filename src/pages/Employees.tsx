import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { toast } from 'sonner';
import { UserPlus, Edit, Users, KeyRound } from 'lucide-react';
import { EmployeeImportDropZone } from '@/components/EmployeeImportDropZone';
import { useIsMobile } from '@/hooks/use-mobile';
import { EmployeeFormPanel } from '@/components/employees/EmployeeFormPanel';

type EmployeeType = 'fixed' | 'hourly';

export interface EmployeeForm {
  first_name: string;
  last_name: string;
  employee_type: EmployeeType;
  weekly_hours: string;
  monthly_salary: string;
  hourly_rate: string;
  vacation_days_per_year: string;
  vacation_surcharge_percent: string;
  cost_center: string;
  position: string;
  login_email: string;
  login_password: string;
  pensum_percent: string;
  available_days: string[];
  allowed_shift_types: string[];
}

export const ALL_WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'] as const;

export const emptyForm: EmployeeForm = {
  first_name: '',
  last_name: '',
  employee_type: 'fixed',
  weekly_hours: '42',
  monthly_salary: '',
  hourly_rate: '',
  vacation_days_per_year: '20',
  vacation_surcharge_percent: '8.33',
  cost_center: '',
  position: '',
  login_email: '',
  login_password: '',
  pensum_percent: '100',
  available_days: ['Mo', 'Di', 'Mi', 'Do', 'Fr'],
};

// L-GAV: max monthly hours = weekly_hours × 4.33
export function calcHourlyRate(monthlySalary: number, weeklyHours: number): number {
  const monthlyHours = weeklyHours * 4.33;
  if (monthlyHours <= 0) return 0;
  return Math.round((monthlySalary / monthlyHours) * 100) / 100;
}

export default function Employees() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [form, setForm] = useState<EmployeeForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [creatingLogin, setCreatingLogin] = useState(false);
  const isMobile = useIsMobile();

  const loadEmployees = async () => {
    const { data } = await supabase
      .from('employees')
      .select('*')
      .order('cost_center')
      .order('position')
      .order('last_name');
    const emps: any[] = data || [];
    
    // Fetch login emails from profiles for employees with user_id
    const userIds = emps.filter(e => e.user_id).map(e => e.user_id);
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, email')
        .in('user_id', userIds);
      if (profiles) {
        const emailMap = Object.fromEntries(profiles.map(p => [p.user_id, p.email]));
        emps.forEach(e => {
          if (e.user_id) e.login_email = emailMap[e.user_id] || null;
        });
      }
    }
    setEmployees(emps);
  };

  useEffect(() => { loadEmployees(); }, []);

  const handleSave = async () => {
    if (!form.cost_center.trim()) { toast.error('Kostenstelle ist erforderlich'); return; }
    if (!form.position.trim()) { toast.error('Position ist erforderlich'); return; }

    const weeklyHours = parseFloat(form.weekly_hours) || 42;
    const monthlySalary = form.monthly_salary ? parseFloat(form.monthly_salary) : null;
    const computedHourlyRate = form.employee_type === 'fixed' && monthlySalary
      ? calcHourlyRate(monthlySalary, weeklyHours)
      : (form.hourly_rate ? parseFloat(form.hourly_rate) : null);

    const payload = {
      first_name: form.first_name,
      last_name: form.last_name,
      employee_type: form.employee_type as EmployeeType,
      weekly_hours: weeklyHours,
      monthly_salary: monthlySalary,
      hourly_rate: computedHourlyRate,
      vacation_days_per_year: parseInt(form.vacation_days_per_year) || 20,
      vacation_surcharge_percent: parseFloat(form.vacation_surcharge_percent) || 8.33,
      cost_center: form.cost_center.trim(),
      position: form.position.trim(),
      pensum_percent: parseFloat(form.pensum_percent) || 100,
      available_days: form.available_days,
    };

    let savedId = editingId;

    if (editingId) {
      const { error } = await supabase.from('employees').update(payload).eq('id', editingId);
      if (error) { toast.error('Fehler beim Aktualisieren'); return; }
      toast.success('Mitarbeiter aktualisiert');
    } else {
      const { data, error } = await supabase.from('employees').insert(payload).select().single();
      if (error) { toast.error('Fehler beim Erstellen'); return; }
      toast.success('Mitarbeiter erstellt');
      savedId = data.id;
    }

    // Create or update login
    if (savedId && (form.login_email || form.login_password)) {
      const emp = employees.find(e => e.id === savedId);
      if (emp?.user_id) {
        await updateEmployeeLogin(emp.user_id, form.login_email, form.login_password);
      } else if (form.login_email && form.login_password) {
        await createEmployeeLogin(savedId, form.login_email, form.login_password);
      }
    }

    setSheetOpen(false);
    setForm(emptyForm);
    setEditingId(null);
    loadEmployees();
  };

  const createEmployeeLogin = async (employeeId: string, email: string, password: string) => {
    setCreatingLogin(true);
    try {
      const res = await supabase.functions.invoke('create-employee-user', {
        body: {
          email,
          password,
          full_name: `${form.first_name} ${form.last_name}`,
          employee_id: employeeId,
        },
      });
      if (res.error) {
        toast.error('Login-Erstellung fehlgeschlagen: ' + (res.error.message || 'Unbekannter Fehler'));
      } else if (res.data?.error) {
        toast.error('Login-Erstellung fehlgeschlagen: ' + res.data.error);
      } else {
        toast.success(`Login für ${email} erstellt`);
      }
    } catch (err: any) {
      toast.error('Fehler: ' + err.message);
    }
    setCreatingLogin(false);
  };

  const updateEmployeeLogin = async (userId: string, email: string, password: string) => {
    setCreatingLogin(true);
    try {
      const res = await supabase.functions.invoke('create-employee-user', {
        body: {
          action: 'update',
          user_id: userId,
          email: email || undefined,
          password: password || undefined,
        },
      });
      if (res.error) {
        toast.error('Login-Update fehlgeschlagen: ' + (res.error.message || 'Unbekannter Fehler'));
      } else if (res.data?.error) {
        toast.error('Login-Update fehlgeschlagen: ' + res.data.error);
      } else {
        toast.success('Login-Daten aktualisiert');
      }
    } catch (err: any) {
      toast.error('Fehler: ' + err.message);
    }
    setCreatingLogin(false);
  };

  const openEdit = (emp: any) => {
    setForm({
      first_name: emp.first_name,
      last_name: emp.last_name,
      employee_type: emp.employee_type,
      weekly_hours: String(emp.weekly_hours || 42),
      monthly_salary: emp.monthly_salary ? String(emp.monthly_salary) : '',
      hourly_rate: emp.hourly_rate ? String(emp.hourly_rate) : '',
      vacation_days_per_year: String(emp.vacation_days_per_year || 20),
      vacation_surcharge_percent: String(emp.vacation_surcharge_percent || 8.33),
      cost_center: emp.cost_center || '',
      position: emp.position || '',
      login_email: emp.login_email || '',
      login_password: '',
      pensum_percent: String(emp.pensum_percent ?? 100),
      available_days: emp.available_days || ['Mo', 'Di', 'Mi', 'Do', 'Fr'],
    });
    setEditingId(emp.id);
    setSheetOpen(true);
  };

  const grouped = employees.reduce((acc: Record<string, any[]>, emp) => {
    const key = emp.cost_center || 'Ohne Kostenstelle';
    if (!acc[key]) acc[key] = [];
    acc[key].push(emp);
    return acc;
  }, {});

  return (
    <div className="space-y-4 pb-20 md:pb-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-xl md:text-2xl font-bold flex items-center gap-2">
          <Users className="h-5 w-5 md:h-6 md:w-6" />
          Mitarbeiter
        </h1>
        <Button className="gap-2" size={isMobile ? 'sm' : 'default'} onClick={() => {
          setForm(emptyForm);
          setEditingId(null);
          setSheetOpen(true);
        }}>
          <UserPlus className="h-4 w-4" />
          Neu
        </Button>
      </div>

      {/* Form Sheet – slides from right on mobile, wider on desktop */}
      <Sheet open={sheetOpen} onOpenChange={(open) => {
        setSheetOpen(open);
        if (!open) { setForm(emptyForm); setEditingId(null); }
      }}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingId ? 'Bearbeiten' : 'Neuer Mitarbeiter'}</SheetTitle>
          </SheetHeader>
          <EmployeeFormPanel
            form={form}
            setForm={setForm}
            editingId={editingId}
            employees={employees}
            creatingLogin={creatingLogin}
            onSave={handleSave}
          />
        </SheetContent>
      </Sheet>

      <EmployeeImportDropZone onImported={loadEmployees} />

      {employees.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Noch keine Mitarbeiter erfasst
          </CardContent>
        </Card>
      ) : (
        Object.entries(grouped).map(([costCenter, emps]: [string, any[]]) => (
          <div key={costCenter} className="space-y-2">
            <h2 className="font-heading text-xs md:text-sm font-semibold text-muted-foreground uppercase tracking-wide">{costCenter}</h2>
            <div className="grid gap-2 md:gap-3 sm:grid-cols-2">
              {emps.map((emp: any) => (
                <Card
                  key={emp.id}
                  className={`transition-shadow hover:shadow-md active:scale-[0.99] ${emp.is_active === false ? 'opacity-50' : ''}`}
                >
                  <CardContent className="flex items-center justify-between p-3 md:p-4">
                    <div className="flex items-start gap-2 md:gap-3 flex-1 min-w-0">
                      <Checkbox
                        checked={emp.is_active !== false}
                        onCheckedChange={async (checked) => {
                          await supabase.from('employees').update({ is_active: !!checked }).eq('id', emp.id);
                          toast.success(checked ? 'Mitarbeiter aktiviert' : 'Mitarbeiter als ausgetreten markiert');
                          loadEmployees();
                        }}
                        className="mt-0.5"
                        title={emp.is_active !== false ? 'Aktiv – klicken für Austritt' : 'Ausgetreten – klicken zum Aktivieren'}
                      />
                      <div className="cursor-pointer flex-1 min-w-0" onClick={() => openEdit(emp)}>
                        <p className="font-heading font-semibold text-sm md:text-base truncate">
                          {emp.first_name} {emp.last_name}
                          {emp.is_active === false && (
                            <Badge variant="destructive" className="ml-2 text-[10px] md:text-xs">ausgetreten</Badge>
                          )}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-1 md:gap-2">
                          <Badge variant="outline" className="text-[10px] md:text-xs">{emp.position}</Badge>
                          <Badge variant="outline" className="text-[10px] md:text-xs">
                            {emp.pensum_percent ?? 100}%
                          </Badge>
                          <Badge variant={emp.employee_type === 'fixed' ? 'default' : 'secondary'} className="text-[10px] md:text-xs">
                            {emp.employee_type === 'fixed' ? 'Fix' : 'Std'}
                          </Badge>
                          {emp.user_id && (
                             <Badge variant="default" className="text-[10px] md:text-xs gap-0.5" title={emp.login_email || ''}>
                               <KeyRound className="h-2.5 w-2.5 md:h-3 md:w-3" /> {emp.login_email || 'Login'}
                             </Badge>
                           )}
                          {emp.employee_type === 'fixed' && emp.monthly_salary && (
                            <span className="text-[10px] md:text-xs text-muted-foreground hidden sm:inline">CHF {Number(emp.monthly_salary).toLocaleString('de-CH')}/Mt</span>
                          )}
                          {emp.employee_type === 'fixed' && (
                            <span className="text-[10px] md:text-xs text-muted-foreground">{emp.weekly_hours}h</span>
                          )}
                          {emp.hourly_rate && (
                            <span className="text-[10px] md:text-xs text-muted-foreground">CHF {Number(emp.hourly_rate).toFixed(2)}/h</span>
                          )}
                        </div>
                        <div className="mt-1 flex gap-0.5">
                          {(['Mo','Di','Mi','Do','Fr','Sa','So'] as const).map(day => (
                            <span
                              key={day}
                              className={`text-[9px] md:text-[10px] px-1 py-0.5 rounded ${
                                (emp.available_days || ['Mo','Di','Mi','Do','Fr']).includes(day)
                                  ? 'bg-primary/10 text-primary font-medium'
                                  : 'text-muted-foreground/40'
                              }`}
                            >
                              {day}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <Edit className="h-4 w-4 text-muted-foreground cursor-pointer shrink-0 ml-1" onClick={() => openEdit(emp)} />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
