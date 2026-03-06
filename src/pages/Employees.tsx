import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { UserPlus, Edit, Users } from 'lucide-react';
import { formatHoursMinutes } from '@/lib/lgav';
import { EmployeeImportDropZone } from '@/components/EmployeeImportDropZone';

type EmployeeType = 'fixed' | 'hourly';

interface EmployeeForm {
  first_name: string;
  last_name: string;
  employee_type: EmployeeType;
  weekly_hours: string;
  hourly_rate: string;
  vacation_days_per_year: string;
  vacation_surcharge_percent: string;
  cost_center: string;
  position: string;
}

const emptyForm: EmployeeForm = {
  first_name: '',
  last_name: '',
  employee_type: 'fixed',
  weekly_hours: '42',
  hourly_rate: '',
  vacation_days_per_year: '20',
  vacation_surcharge_percent: '8.33',
  cost_center: '',
  position: '',
};

export default function Employees() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [form, setForm] = useState<EmployeeForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

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

    const payload = {
      first_name: form.first_name,
      last_name: form.last_name,
      employee_type: form.employee_type as EmployeeType,
      weekly_hours: parseFloat(form.weekly_hours) || 42,
      hourly_rate: form.hourly_rate ? parseFloat(form.hourly_rate) : null,
      vacation_days_per_year: parseInt(form.vacation_days_per_year) || 20,
      vacation_surcharge_percent: parseFloat(form.vacation_surcharge_percent) || 8.33,
      cost_center: form.cost_center.trim(),
      position: form.position.trim(),
    };

    if (editingId) {
      const { error } = await supabase.from('employees').update(payload).eq('id', editingId);
      if (error) { toast.error('Fehler beim Aktualisieren'); return; }
      toast.success('Mitarbeiter aktualisiert');
    } else {
      const { error } = await supabase.from('employees').insert(payload);
      if (error) { toast.error('Fehler beim Erstellen'); return; }
      toast.success('Mitarbeiter erstellt');
    }

    setDialogOpen(false);
    setForm(emptyForm);
    setEditingId(null);
    loadEmployees();
  };

  const openEdit = (emp: any) => {
    setForm({
      first_name: emp.first_name,
      last_name: emp.last_name,
      employee_type: emp.employee_type,
      weekly_hours: String(emp.weekly_hours || 42),
      hourly_rate: emp.hourly_rate ? String(emp.hourly_rate) : '',
      vacation_days_per_year: String(emp.vacation_days_per_year || 20),
      vacation_surcharge_percent: String(emp.vacation_surcharge_percent || 8.33),
      cost_center: emp.cost_center || '',
      position: emp.position || '',
    });
    setEditingId(emp.id);
    setDialogOpen(true);
  };

  // Group employees by cost center
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
          <DialogContent>
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
              <Button onClick={handleSave} className="w-full">
                {editingId ? 'Aktualisieren' : 'Erstellen'}
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
                <Card key={emp.id} className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => openEdit(emp)}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <p className="font-heading font-semibold">
                        {emp.first_name} {emp.last_name}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="text-xs">{emp.position}</Badge>
                        <Badge variant={emp.employee_type === 'fixed' ? 'default' : 'secondary'}>
                          {emp.employee_type === 'fixed' ? 'Monatslohn' : 'Stundenlohn'}
                        </Badge>
                        {emp.employee_type === 'fixed' && (
                          <span className="text-xs text-muted-foreground">
                            {emp.weekly_hours}h/Wo
                          </span>
                        )}
                        {emp.employee_type === 'hourly' && emp.hourly_rate && (
                          <span className="text-xs text-muted-foreground">
                            CHF {emp.hourly_rate}/h
                          </span>
                        )}
                      </div>
                    </div>
                    <Edit className="h-4 w-4 text-muted-foreground" />
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
