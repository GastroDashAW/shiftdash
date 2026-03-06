import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { UserPlus, Edit, Users, KeyRound } from 'lucide-react';
import { EmployeeImportDropZone } from '@/components/EmployeeImportDropZone';

type EmployeeType = 'fixed' | 'hourly';

interface EmployeeForm {
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
}

const emptyForm: EmployeeForm = {
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
};

// L-GAV: max monthly hours = weekly_hours × 4.33
function calcHourlyRate(monthlySalary: number, weeklyHours: number): number {
  const monthlyHours = weeklyHours * 4.33;
  if (monthlyHours <= 0) return 0;
  return Math.round((monthlySalary / monthlyHours) * 100) / 100;
}

export default function Employees() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [form, setForm] = useState<EmployeeForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creatingLogin, setCreatingLogin] = useState(false);

  const loadEmployees = async () => {
    const { data } = await supabase
      .from('employees')
      .select('*')
      .order('cost_center')
      .order('position')
      .order('last_name');
    setEmployees(data || []);
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

    // Create login if email & password provided and employee has no user_id yet
    if (form.login_email && form.login_password && savedId) {
      const emp = employees.find(e => e.id === savedId);
      if (!emp?.user_id || !editingId) {
        await createEmployeeLogin(savedId, form.login_email, form.login_password);
      }
    }

    setDialogOpen(false);
    setForm(emptyForm);
    setEditingId(null);
    loadEmployees();
  };

  const createEmployeeLogin = async (employeeId: string, email: string, password: string) => {
    setCreatingLogin(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
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
      login_email: '',
      login_password: '',
    });
    setEditingId(emp.id);
    setDialogOpen(true);
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
        <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6" />
          Mitarbeiter
        </h1>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) { setForm(emptyForm); setEditingId(null); }
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserPlus className="h-4 w-4" />
              Neu
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Bearbeiten' : 'Neuer Mitarbeiter'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Vorname *</Label>
                  <Input value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Nachname *</Label>
                  <Input value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Kostenstelle *</Label>
                  <Select value={form.cost_center} onValueChange={(v) => setForm(f => ({ ...f, cost_center: v }))}>
                    <SelectTrigger><SelectValue placeholder="Kostenstelle wählen" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Geschäftsführung">Geschäftsführung</SelectItem>
                      <SelectItem value="Küche">Küche</SelectItem>
                      <SelectItem value="Service">Service</SelectItem>
                      <SelectItem value="Office">Office</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Position *</Label>
                  <Select value={form.position} onValueChange={(v) => setForm(f => ({ ...f, position: v }))}>
                    <SelectTrigger><SelectValue placeholder="Position wählen" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GF">GF</SelectItem>
                      <SelectItem value="GF-Stv">GF-Stv</SelectItem>
                      <SelectItem value="Küchenchef">Küchenchef</SelectItem>
                      <SelectItem value="Koch">Koch</SelectItem>
                      <SelectItem value="Service">Service</SelectItem>
                      <SelectItem value="Office">Office</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Anstellungstyp</Label>
                <Select value={form.employee_type} onValueChange={(v) => setForm(f => ({ ...f, employee_type: v as EmployeeType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixangestellt (Monatslohn)</SelectItem>
                    <SelectItem value="hourly">Stundenlohn</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.employee_type === 'fixed' ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Soll-Stunden/Woche</Label>
                      <Input type="number" value={form.weekly_hours} onChange={e => setForm(f => ({ ...f, weekly_hours: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Ferientage/Jahr</Label>
                      <Input type="number" value={form.vacation_days_per_year} onChange={e => setForm(f => ({ ...f, vacation_days_per_year: e.target.value }))} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Monatslohn (CHF)</Label>
                      <Input type="number" value={form.monthly_salary} onChange={e => setForm(f => ({ ...f, monthly_salary: e.target.value }))} step="1" placeholder="z.B. 4500" />
                    </div>
                    <div className="space-y-2">
                      <Label>Stundenlohn (auto)</Label>
                      <Input
                        type="text"
                        readOnly
                        className="bg-muted text-muted-foreground"
                        value={
                          form.monthly_salary && parseFloat(form.monthly_salary) > 0
                            ? `CHF ${calcHourlyRate(parseFloat(form.monthly_salary), parseFloat(form.weekly_hours) || 42).toFixed(2)}`
                            : '–'
                        }
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Stundenlohn (CHF)</Label>
                    <Input type="number" value={form.hourly_rate} onChange={e => setForm(f => ({ ...f, hourly_rate: e.target.value }))} step="0.05" />
                  </div>
                  <div className="space-y-2">
                    <Label>Ferienzuschlag %</Label>
                    <Input type="number" value={form.vacation_surcharge_percent} onChange={e => setForm(f => ({ ...f, vacation_surcharge_percent: e.target.value }))} step="0.01" />
                  </div>
                </div>
              )}

              {/* Login section */}
              <div className="border-t pt-4 space-y-3">
                <div className="flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-muted-foreground" />
                  <Label className="font-heading font-semibold">Login-Zugang</Label>
                  {editingId && employees.find(e => e.id === editingId)?.user_id && (
                    <Badge variant="default" className="text-xs">Login aktiv</Badge>
                  )}
                </div>
                {(!editingId || !employees.find(e => e.id === editingId)?.user_id) && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs">E-Mail</Label>
                      <Input
                        type="email"
                        value={form.login_email}
                        onChange={e => setForm(f => ({ ...f, login_email: e.target.value }))}
                        placeholder="max@restaurant.ch"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Passwort</Label>
                      <Input
                        type="text"
                        value={form.login_password}
                        onChange={e => setForm(f => ({ ...f, login_password: e.target.value }))}
                        placeholder="Min. 6 Zeichen"
                      />
                    </div>
                  </div>
                )}
              </div>

              <Button onClick={handleSave} className="w-full" disabled={creatingLogin}>
                {creatingLogin ? 'Login wird erstellt...' : editingId ? 'Aktualisieren' : 'Erstellen'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

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
            <h2 className="font-heading text-sm font-semibold text-muted-foreground uppercase tracking-wide">{costCenter}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {emps.map((emp: any) => (
                <Card
                  key={emp.id}
                  className={`transition-shadow hover:shadow-md ${emp.is_active === false ? 'opacity-50' : ''}`}
                >
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <Checkbox
                        checked={emp.is_active !== false}
                        onCheckedChange={async (checked) => {
                          await supabase.from('employees').update({ is_active: !!checked }).eq('id', emp.id);
                          toast.success(checked ? 'Mitarbeiter aktiviert' : 'Mitarbeiter deaktiviert');
                          loadEmployees();
                        }}
                        className="mt-1"
                        title={emp.is_active !== false ? 'Aktiv – klicken zum Deaktivieren' : 'Inaktiv – klicken zum Aktivieren'}
                      />
                      <div className="cursor-pointer flex-1 min-w-0" onClick={() => openEdit(emp)}>
                        <p className="font-heading font-semibold">
                          {emp.first_name} {emp.last_name}
                          {emp.is_active === false && (
                            <Badge variant="secondary" className="ml-2 text-xs">inaktiv</Badge>
                          )}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="text-xs">{emp.position}</Badge>
                          <Badge variant={emp.employee_type === 'fixed' ? 'default' : 'secondary'}>
                            {emp.employee_type === 'fixed' ? 'Monatslohn' : 'Stundenlohn'}
                          </Badge>
                          {emp.user_id && (
                            <Badge variant="default" className="text-xs gap-1">
                              <KeyRound className="h-3 w-3" /> Login
                            </Badge>
                          )}
                          {emp.employee_type === 'fixed' && emp.monthly_salary && (
                            <span className="text-xs text-muted-foreground">CHF {Number(emp.monthly_salary).toLocaleString('de-CH')}/Mt</span>
                          )}
                          {emp.employee_type === 'fixed' && (
                            <span className="text-xs text-muted-foreground">{emp.weekly_hours}h/Wo</span>
                          )}
                          {emp.hourly_rate && (
                            <span className="text-xs text-muted-foreground">CHF {Number(emp.hourly_rate).toFixed(2)}/h</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Edit className="h-4 w-4 text-muted-foreground cursor-pointer shrink-0" onClick={() => openEdit(emp)} />
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
