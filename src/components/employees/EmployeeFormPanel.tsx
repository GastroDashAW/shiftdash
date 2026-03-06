import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { KeyRound } from 'lucide-react';
import { EmployeeForm, calcHourlyRate, ALL_WEEKDAYS } from '@/pages/Employees';

type EmployeeType = 'fixed' | 'hourly';

interface EmployeeFormPanelProps {
  form: EmployeeForm;
  setForm: React.Dispatch<React.SetStateAction<EmployeeForm>>;
  editingId: string | null;
  employees: any[];
  creatingLogin: boolean;
  onSave: () => void;
}

export function EmployeeFormPanel({ form, setForm, editingId, employees, creatingLogin, onSave }: EmployeeFormPanelProps) {
  const currentEmp = editingId ? employees.find(e => e.id === editingId) : null;
  const hasLogin = !!currentEmp?.user_id;

  const [openDays, setOpenDays] = useState<string[]>([...ALL_WEEKDAYS]);

  useEffect(() => {
    supabase.from('business_settings').select('opening_days').limit(1).single().then(({ data }) => {
      if (data?.opening_days) {
        const days = (data.opening_days as string).split(',').map(d => d.trim()).filter(Boolean);
        if (days.length > 0) setOpenDays(days);
      }
    });
  }, []);

  const toggleDay = (day: string) => {
    setForm(f => ({
      ...f,
      available_days: f.available_days.includes(day)
        ? f.available_days.filter(d => d !== day)
        : [...f.available_days, day],
    }));
  };

  return (
    <div className="space-y-4 pt-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Vorname *</Label>
          <Input value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Nachname *</Label>
          <Input value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Kostenstelle *</Label>
          <Select value={form.cost_center} onValueChange={(v) => setForm(f => ({ ...f, cost_center: v }))}>
            <SelectTrigger><SelectValue placeholder="Wählen" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Geschäftsführung">Geschäftsführung</SelectItem>
              <SelectItem value="Küche">Küche</SelectItem>
              <SelectItem value="Service">Service</SelectItem>
              <SelectItem value="Office">Office</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Position *</Label>
          <Select value={form.position} onValueChange={(v) => setForm(f => ({ ...f, position: v }))}>
            <SelectTrigger><SelectValue placeholder="Wählen" /></SelectTrigger>
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

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Anstellungstyp</Label>
          <Select value={form.employee_type} onValueChange={(v) => setForm(f => ({ ...f, employee_type: v as EmployeeType }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="fixed">Fixangestellt (Monatslohn)</SelectItem>
              <SelectItem value="hourly">Stundenlohn</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Pensum %</Label>
          <Input
            type="number"
            min="0"
            max="100"
            value={form.pensum_percent}
            onChange={e => setForm(f => ({ ...f, pensum_percent: e.target.value }))}
          />
        </div>
      </div>

      {/* Verfügbare Wochentage */}
      <div className="space-y-1.5">
        <Label className="text-xs">Verfügbare Arbeitstage</Label>
        <div className="flex gap-1.5">
          {ALL_WEEKDAYS.map(day => (
            <button
              key={day}
              type="button"
              onClick={() => toggleDay(day)}
              className={`flex-1 py-1.5 rounded text-xs font-medium transition-colors ${
                form.available_days.includes(day)
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {day}
            </button>
          ))}
        </div>
      </div>

      {form.employee_type === 'fixed' ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Soll-Std/Woche</Label>
              <Input type="number" value={form.weekly_hours} onChange={e => setForm(f => ({ ...f, weekly_hours: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Ferientage/Jahr</Label>
              <Input type="number" value={form.vacation_days_per_year} onChange={e => setForm(f => ({ ...f, vacation_days_per_year: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Monatslohn (CHF)</Label>
              <Input type="number" value={form.monthly_salary} onChange={e => setForm(f => ({ ...f, monthly_salary: e.target.value }))} step="1" placeholder="z.B. 4500" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Stundenlohn (auto)</Label>
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
          <div className="space-y-1.5">
            <Label className="text-xs">Stundenlohn (CHF)</Label>
            <Input type="number" value={form.hourly_rate} onChange={e => setForm(f => ({ ...f, hourly_rate: e.target.value }))} step="0.05" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Ferienzuschlag %</Label>
            <Input type="number" value={form.vacation_surcharge_percent} onChange={e => setForm(f => ({ ...f, vacation_surcharge_percent: e.target.value }))} step="0.01" />
          </div>
        </div>
      )}

      {/* Login section */}
      <div className="border-t pt-4 space-y-3">
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-muted-foreground" />
          <Label className="font-heading font-semibold text-xs">Login-Zugang</Label>
          {hasLogin && (
            <Badge variant="default" className="text-[10px]">Login aktiv</Badge>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-[10px]">E-Mail</Label>
            <Input
              type="email"
              value={form.login_email}
              onChange={e => setForm(f => ({ ...f, login_email: e.target.value }))}
              placeholder={hasLogin ? 'Neue E-Mail eingeben' : 'max@restaurant.ch'}
            />
            {hasLogin && form.login_email && (
              <p className="text-[10px] text-muted-foreground">Aktuell: {form.login_email}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px]">Passwort</Label>
            <Input
              type="text"
              value={form.login_password}
              onChange={e => setForm(f => ({ ...f, login_password: e.target.value }))}
              placeholder={hasLogin ? 'Neues PW' : 'Min. 6 Zeichen'}
            />
          </div>
        </div>
        {hasLogin && (
          <p className="text-[10px] text-muted-foreground">Leer lassen = bestehende Daten behalten.</p>
        )}
      </div>

      <Button onClick={onSave} className="w-full" disabled={creatingLogin}>
        {creatingLogin ? 'Login wird erstellt...' : editingId ? 'Aktualisieren' : 'Erstellen'}
      </Button>
    </div>
  );
}
