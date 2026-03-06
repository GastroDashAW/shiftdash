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
}

const empty: BusinessData = {
  name: '', address: '', phone: '', url: '',
  contact_person: '', vat_number: '',
  opening_days: '', opening_hours: '',
  social_charges_percent: 15,
  closed_days: [],
  auto_sync_schedule: false,
};

export default function Business() {
  const [data, setData] = useState<BusinessData>(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from('business_settings').select('*').limit(1).maybeSingle()
      .then(({ data: row }) => {
        if (row) {
          const closed = Array.isArray(row.closed_days) ? (row.closed_days as number[]) : [];
          setData({ ...(row as any), closed_days: closed, auto_sync_schedule: row.auto_sync_schedule ?? false });
        }
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const { id, ...payload } = data;
    // Build opening_days string from closed_days
    const openDays = ALL_DAYS.filter(d => !data.closed_days.includes(d.key)).map(d => d.short);
    const finalPayload = { ...payload, opening_days: openDays.join(', ') };

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
          <div className="space-y-2">
            <Label>Öffnungszeiten</Label>
            <Input value={data.opening_hours} onChange={e => update('opening_hours', e.target.value)} placeholder="11:00–23:00" />
          </div>

          <div className="space-y-2">
            <Label>Ruhetage (geschlossen)</Label>
            <p className="text-xs text-muted-foreground">Wähle die Tage, an denen der Betrieb geschlossen ist</p>
            <div className="grid grid-cols-7 gap-2">
              {ALL_DAYS.map(day => (
                <div
                  key={day.key}
                  className={`flex flex-col items-center gap-1 rounded-lg border p-2 cursor-pointer transition-colors ${
                    data.closed_days.includes(day.key) ? 'bg-destructive/10 border-destructive/50' : 'hover:bg-muted'
                  }`}
                  onClick={() => toggleClosedDay(day.key)}
                >
                  <Checkbox
                    checked={data.closed_days.includes(day.key)}
                    onCheckedChange={() => toggleClosedDay(day.key)}
                  />
                  <span className="text-xs font-medium">{day.short}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Öffnungstage: {ALL_DAYS.filter(d => !data.closed_days.includes(d.key)).map(d => d.short).join(', ') || '–'}
            </p>
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
                  Wenn aktiviert, werden an den Ruhetagen automatisch alle Mitarbeiter auf «Frei» gesetzt,
                  sobald der Dienstplan geladen wird. Bestehende Zuweisungen an Ruhetagen werden nicht überschrieben.
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
