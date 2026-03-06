import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Building2, Save, CalendarOff } from 'lucide-react';

const ALL_DAYS = [
  { key: 0, label: 'Sonntag', short: 'So' },
  { key: 1, label: 'Montag', short: 'Mo' },
  { key: 2, label: 'Dienstag', short: 'Di' },
  { key: 3, label: 'Mittwoch', short: 'Mi' },
  { key: 4, label: 'Donnerstag', short: 'Do' },
  { key: 5, label: 'Freitag', short: 'Fr' },
  { key: 6, label: 'Samstag', short: 'Sa' },
];

type DayHours = { open: string; close: string };
type DayHoursMap = Record<number, DayHours>;
type ShiftsPerDay = Record<number, number>;

interface BusinessData {
  id?: string;
  name: string;
  address: string;
  phone: string;
  url: string;
  contact_person: string;
  vat_number: string;
  opening_days: string;
  opening_hours: string;
  social_charges_percent: number;
  closed_days: number[];
  auto_sync_schedule: boolean;
  day_opening_hours: DayHoursMap;
  shifts_per_day: ShiftsPerDay;
}

const defaultDayHours: DayHoursMap = {
  0: { open: '', close: '' },
  1: { open: '11:00', close: '23:00' },
  2: { open: '11:00', close: '23:00' },
  3: { open: '11:00', close: '23:00' },
  4: { open: '11:00', close: '23:00' },
  5: { open: '11:00', close: '23:00' },
  6: { open: '11:00', close: '23:00' },
};

const defaultShiftsPerDay: ShiftsPerDay = {
  0: 0, 1: 2, 2: 2, 3: 2, 4: 2, 5: 2, 6: 2,
};

const empty: BusinessData = {
  name: '', address: '', phone: '', url: '',
  contact_person: '', vat_number: '',
  opening_days: '', opening_hours: '',
  social_charges_percent: 15,
  closed_days: [0],
  auto_sync_schedule: false,
  day_opening_hours: defaultDayHours,
  shifts_per_day: defaultShiftsPerDay,
};

export default function Business() {
  const [data, setData] = useState<BusinessData>(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from('business_settings').select('*').limit(1).maybeSingle()
      .then(({ data: row }) => {
        if (row) {
          const closed = Array.isArray(row.closed_days) ? (row.closed_days as number[]) : [];
          // Parse day_opening_hours from opening_hours field (JSON string) or fallback
          let dayHours = defaultDayHours;
          try {
            const parsed = JSON.parse(row.opening_hours || '{}');
            if (typeof parsed === 'object' && !Array.isArray(parsed) && parsed['1']) {
              dayHours = { ...defaultDayHours, ...parsed };
            }
          } catch { /* keep defaults */ }
          let shiftsDay = defaultShiftsPerDay;
          try {
            const spd = (row as any).shifts_per_day;
            if (spd && typeof spd === 'object') {
              shiftsDay = { ...defaultShiftsPerDay, ...spd };
            }
          } catch { /* keep defaults */ }
          setData({
            ...(row as any),
            closed_days: closed,
            auto_sync_schedule: row.auto_sync_schedule ?? false,
            day_opening_hours: dayHours,
            shifts_per_day: shiftsDay,
          });
        }
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const { id, day_opening_hours, ...payload } = data;
    // Build opening_days string from closed_days
    const openDays = ALL_DAYS.filter(d => !data.closed_days.includes(d.key)).map(d => d.short);
    // Store day_opening_hours as JSON in opening_hours field
    const finalPayload = {
      ...payload,
      opening_days: openDays.join(', '),
      opening_hours: JSON.stringify(day_opening_hours),
    };

    if (id) {
      await supabase.from('business_settings').update(finalPayload).eq('id', id);
    } else {
      const { data: created } = await supabase.from('business_settings').insert(finalPayload).select().single();
      if (created) setData(prev => ({ ...prev, id: created.id }));
    }
    setSaving(false);
    toast.success('Betriebsdaten gespeichert');
  };

  const update = (field: keyof BusinessData, value: any) =>
    setData(prev => ({ ...prev, [field]: value }));

  const toggleClosedDay = (dayKey: number) => {
    setData(prev => {
      const closed = prev.closed_days.includes(dayKey)
        ? prev.closed_days.filter(d => d !== dayKey)
        : [...prev.closed_days, dayKey];
      return { ...prev, closed_days: closed };
    });
  };

  const updateDayHours = (dayKey: number, field: 'open' | 'close', value: string) => {
    setData(prev => ({
      ...prev,
      day_opening_hours: {
        ...prev.day_opening_hours,
        [dayKey]: { ...prev.day_opening_hours[dayKey], [field]: value },
      },
    }));
  };

  return (
    <div className="space-y-6 pb-20 md:pb-4">
      <div className="flex items-center gap-3">
        <Building2 className="h-6 w-6 text-primary" />
        <h1 className="font-heading text-2xl font-bold">Betrieb</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Betriebsinformationen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Name des Betriebs</Label>
              <Input value={data.name} onChange={e => update('name', e.target.value)} placeholder="Restaurant Muster" />
            </div>
            <div className="space-y-2">
              <Label>Ansprechpartner</Label>
              <Input value={data.contact_person} onChange={e => update('contact_person', e.target.value)} placeholder="Max Muster" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Adresse</Label>
            <Textarea value={data.address} onChange={e => update('address', e.target.value)} placeholder="Musterstrasse 1, 8000 Zürich" rows={2} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Telefon</Label>
              <Input value={data.phone} onChange={e => update('phone', e.target.value)} placeholder="+41 44 123 45 67" />
            </div>
            <div className="space-y-2">
              <Label>Webseite</Label>
              <Input value={data.url} onChange={e => update('url', e.target.value)} placeholder="https://www.muster.ch" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>MwSt-Nummer</Label>
            <Input value={data.vat_number} onChange={e => update('vat_number', e.target.value)} placeholder="CHE-123.456.789 MWST" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Öffnungszeiten & Ruhetage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Definiere pro Wochentag die Öffnungszeiten. Geschlossene Tage abhaken.
          </p>

          <div className="space-y-2">
            {ALL_DAYS.map(day => {
              const isClosed = data.closed_days.includes(day.key);
              const hours = data.day_opening_hours[day.key] || { open: '', close: '' };
              return (
                <div
                  key={day.key}
                  className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                    isClosed ? 'bg-destructive/5 border-destructive/30' : 'bg-card'
                  }`}
                >
                  <Checkbox
                    checked={isClosed}
                    onCheckedChange={() => toggleClosedDay(day.key)}
                  />
                  <span className={`w-10 text-sm font-semibold ${isClosed ? 'text-destructive line-through' : ''}`}>
                    {day.short}
                  </span>
                  {isClosed ? (
                    <span className="text-sm text-destructive italic">Geschlossen</span>
                  ) : (
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        type="time"
                        className="h-8 w-28 text-sm"
                        value={hours.open}
                        onChange={e => updateDayHours(day.key, 'open', e.target.value)}
                      />
                      <span className="text-muted-foreground text-sm">–</span>
                      <Input
                        type="time"
                        className="h-8 w-28 text-sm"
                        value={hours.close}
                        onChange={e => updateDayHours(day.key, 'close', e.target.value)}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="rounded-lg border p-4 space-y-2 bg-muted/30">
            <div className="flex items-start gap-3">
              <Checkbox
                id="auto-sync"
                checked={data.auto_sync_schedule}
                onCheckedChange={(checked) => update('auto_sync_schedule', !!checked)}
              />
              <div className="space-y-1">
                <Label htmlFor="auto-sync" className="text-sm font-medium flex items-center gap-2 cursor-pointer">
                  <CalendarOff className="h-4 w-4 text-muted-foreground" />
                  Ruhetage automatisch im Dienstplan als «Frei» setzen
                </Label>
                <p className="text-xs text-muted-foreground">
                  Wenn aktiviert, werden an den Ruhetagen automatisch alle Mitarbeiter auf «Frei» gesetzt.
                  Bestehende Zuweisungen werden nicht überschrieben.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Finanzen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Lohnnebenkosten (%)</Label>
            <Input
              type="number"
              value={data.social_charges_percent}
              onChange={e => update('social_charges_percent', Number(e.target.value))}
              step="0.5"
              min="0"
            />
            <p className="text-xs text-muted-foreground">
              AHV/IV/EO, ALV, BVG, UVG etc. — wird bei Kostenberechnung zum Bruttolohn hinzugerechnet
            </p>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="gap-2">
        <Save className="h-4 w-4" />
        {saving ? 'Speichern...' : 'Speichern'}
      </Button>
    </div>
  );
}
