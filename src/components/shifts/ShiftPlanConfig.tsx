import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Save, CalendarCog } from 'lucide-react';

const ALL_DAYS = [
  { key: 1, short: 'Mo' },
  { key: 2, short: 'Di' },
  { key: 3, short: 'Mi' },
  { key: 4, short: 'Do' },
  { key: 5, short: 'Fr' },
  { key: 6, short: 'Sa' },
  { key: 0, short: 'So' },
];

interface ShiftType {
  id: string;
  name: string;
  short_code: string;
  color: string;
}

interface ConfigEntry {
  shift_type_id: string;
  day_of_week: number;
  required_count: number;
}

export function ShiftPlanConfig({ shifts }: { shifts: ShiftType[] }) {
  const [openDays, setOpenDays] = useState<number[]>([]);
  const [config, setConfig] = useState<Record<string, Record<number, number>>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Load business opening days
    supabase.from('business_settings').select('closed_days').limit(1).maybeSingle()
      .then(({ data }) => {
        const closed = Array.isArray(data?.closed_days) ? (data.closed_days as number[]) : [];
        const open = ALL_DAYS.filter(d => !closed.includes(d.key)).map(d => d.key);
        setOpenDays(open);
      });

    // Load existing config
    supabase.from('shift_plan_config').select('*')
      .then(({ data }) => {
        const map: Record<string, Record<number, number>> = {};
        (data || []).forEach((row: any) => {
          if (!map[row.shift_type_id]) map[row.shift_type_id] = {};
          map[row.shift_type_id][row.day_of_week] = row.required_count;
        });
        setConfig(map);
      });
  }, []);

  const getValue = (shiftId: string, day: number): number => {
    return config[shiftId]?.[day] ?? 0;
  };

  const setValue = (shiftId: string, day: number, value: number) => {
    setConfig(prev => ({
      ...prev,
      [shiftId]: {
        ...(prev[shiftId] || {}),
        [day]: Math.max(0, value),
      },
    }));
  };

  const handleSave = async () => {
    setSaving(true);

    // Build upsert rows
    const rows: { shift_type_id: string; day_of_week: number; required_count: number }[] = [];
    for (const shift of shifts) {
      for (const day of openDays) {
        rows.push({
          shift_type_id: shift.id,
          day_of_week: day,
          required_count: getValue(shift.id, day),
        });
      }
    }

    const { error } = await supabase
      .from('shift_plan_config')
      .upsert(rows, { onConflict: 'shift_type_id,day_of_week' });

    if (error) {
      toast.error('Fehler beim Speichern: ' + error.message);
    } else {
      toast.success('Shift Plan gespeichert');
    }
    setSaving(false);
  };

  // Filter to only show shifts with times (actual work shifts, not Frei/Ferien)
  const excludedCodes = ['X', 'V', 'K', 'U'];
  const workShifts = shifts.filter(s => !excludedCodes.includes(s.short_code));
  const visibleDays = ALL_DAYS.filter(d => openDays.includes(d.key));

  // Compute column totals
  const dayTotals = visibleDays.map(day =>
    workShifts.reduce((sum, s) => sum + getValue(s.id, day.key), 0)
  );

  if (visibleDays.length === 0 || workShifts.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarCog className="h-4 w-4" />
          Shift Plan
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Anzahl benötigter Dienste pro Wochentag festlegen (Basis für automatische Dienstplanerstellung)
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 pr-3 font-medium text-muted-foreground">Dienst</th>
                {visibleDays.map(day => (
                  <th key={day.key} className="text-center py-2 px-2 font-semibold min-w-[3.5rem]">
                    {day.short}
                  </th>
                ))}
                <th className="text-center py-2 px-2 font-medium text-muted-foreground">Total</th>
              </tr>
            </thead>
            <tbody>
              {workShifts.map(shift => {
                const rowTotal = visibleDays.reduce((sum, d) => sum + getValue(shift.id, d.key), 0);
                return (
                  <tr key={shift.id} className="border-b last:border-0">
                    <td className="py-2 pr-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-6 w-6 rounded text-[10px] font-bold flex items-center justify-center text-white shrink-0"
                          style={{ backgroundColor: shift.color }}
                        >
                          {shift.short_code}
                        </div>
                        <span className="font-medium truncate">{shift.name}</span>
                      </div>
                    </td>
                    {visibleDays.map(day => (
                      <td key={day.key} className="py-2 px-1 text-center">
                        <Input
                          type="number"
                          min={0}
                          className="h-8 w-14 text-center text-sm mx-auto"
                          value={getValue(shift.id, day.key)}
                          onChange={e => setValue(shift.id, day.key, parseInt(e.target.value) || 0)}
                        />
                      </td>
                    ))}
                    <td className="py-2 px-2 text-center font-semibold text-muted-foreground">
                      {rowTotal}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t">
                <td className="py-2 pr-3 font-semibold text-muted-foreground">Total</td>
                {dayTotals.map((total, i) => (
                  <td key={i} className="py-2 px-2 text-center font-bold">
                    {total}
                  </td>
                ))}
                <td className="py-2 px-2 text-center font-bold text-primary">
                  {dayTotals.reduce((a, b) => a + b, 0)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <Button onClick={handleSave} disabled={saving} className="gap-2 mt-4">
          <Save className="h-4 w-4" />
          {saving ? 'Speichern...' : 'Speichern'}
        </Button>
      </CardContent>
    </Card>
  );
}
