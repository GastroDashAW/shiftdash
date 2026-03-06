import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Building2, Save } from 'lucide-react';

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
}

const empty: BusinessData = {
  name: '', address: '', phone: '', url: '',
  contact_person: '', vat_number: '',
  opening_days: '', opening_hours: '',
  social_charges_percent: 15,
};

export default function Business() {
  const [data, setData] = useState<BusinessData>(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from('business_settings').select('*').limit(1).maybeSingle()
      .then(({ data: row }) => {
        if (row) setData(row as any);
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const { id, ...payload } = data;
    if (id) {
      await supabase.from('business_settings').update(payload).eq('id', id);
    } else {
      const { data: created } = await supabase.from('business_settings').insert(payload).select().single();
      if (created) setData(prev => ({ ...prev, id: created.id }));
    }
    setSaving(false);
    toast.success('Betriebsdaten gespeichert');
  };

  const update = (field: keyof BusinessData, value: string | number) =>
    setData(prev => ({ ...prev, [field]: value }));

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
          <CardTitle className="text-base">Öffnungszeiten</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Öffnungstage</Label>
            <Input value={data.opening_days} onChange={e => update('opening_days', e.target.value)} placeholder="Mo–Sa" />
          </div>
          <div className="space-y-2">
            <Label>Öffnungszeiten</Label>
            <Input value={data.opening_hours} onChange={e => update('opening_hours', e.target.value)} placeholder="11:00–23:00" />
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
