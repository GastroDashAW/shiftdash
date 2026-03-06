import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { formatHoursMinutes } from '@/lib/lgav';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Line, ComposedChart } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Percent } from 'lucide-react';

const WEEKDAY_LABELS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

export default function Budget() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [distributionMode, setDistributionMode] = useState<'linear' | 'weighted'>('linear');
  const [dayWeights, setDayWeights] = useState<Record<string, number>>({ Mo: 1, Di: 1, Mi: 1, Do: 1, Fr: 1.3, Sa: 1.5, So: 0.7 });
  const [budgetId, setBudgetId] = useState<string | null>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [shiftTypes, setShiftTypes] = useState<any[]>([]);
  const [businessSettings, setBusinessSettings] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  // Load data
  useEffect(() => {
    const load = async () => {
      const [budgetRes, empRes, shiftRes, bizRes] = await Promise.all([
        supabase.from('monthly_budgets').select('*').eq('year', year).eq('month', month).maybeSingle(),
        supabase.from('employees').select('*').eq('is_active', true),
        supabase.from('shift_types').select('*'),
        supabase.from('business_settings').select('*').limit(1).maybeSingle(),
      ]);

      if (budgetRes.data) {
        setTotalRevenue(budgetRes.data.total_revenue || 0);
        setDistributionMode(budgetRes.data.distribution_mode as any || 'linear');
        if (budgetRes.data.day_weights && typeof budgetRes.data.day_weights === 'object') {
          setDayWeights({ ...dayWeights, ...(budgetRes.data.day_weights as Record<string, number>) });
        }
        setBudgetId(budgetRes.data.id);
      } else {
        setTotalRevenue(0);
        setBudgetId(null);
      }

      setEmployees(empRes.data || []);
      setShiftTypes(shiftRes.data || []);
      setBusinessSettings(bizRes.data || null);
    };
    load();

    // Load assignments for this month
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];
    supabase.from('schedule_assignments').select('*').gte('date', startDate).lte('date', endDate)
      .then(({ data }) => setAssignments(data || []));
  }, [year, month]);

  const socialChargesPercent = businessSettings?.social_charges_percent || 15;

  // Calculate days in month
  const daysInMonth = new Date(year, month, 0).getDate();

  // Distribute revenue across days
  const dailyRevenue = useMemo(() => {
    const result: Record<number, number> = {};

    if (distributionMode === 'linear') {
      const daily = totalRevenue / daysInMonth;
      for (let d = 1; d <= daysInMonth; d++) result[d] = daily;
    } else {
      // Weighted by day of week
      let totalWeight = 0;
      const dayWeightMap: Record<number, number> = {};
      for (let d = 1; d <= daysInMonth; d++) {
        const dow = new Date(year, month - 1, d).getDay();
        const label = WEEKDAY_LABELS[dow];
        const w = dayWeights[label] || 1;
        dayWeightMap[d] = w;
        totalWeight += w;
      }
      for (let d = 1; d <= daysInMonth; d++) {
        result[d] = totalWeight > 0 ? (totalRevenue * dayWeightMap[d]) / totalWeight : 0;
      }
    }
    return result;
  }, [totalRevenue, distributionMode, dayWeights, daysInMonth, year, month]);

  // Calculate daily costs from schedule
  const dailyCosts = useMemo(() => {
    const result: Record<number, number> = {};
    const shiftMap = Object.fromEntries(shiftTypes.map(s => [s.id, s]));
    const empMap = Object.fromEntries(employees.map(e => [e.id, e]));

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayAssignments = assignments.filter(a => a.date === dateStr);
      let cost = 0;
      for (const a of dayAssignments) {
        const shift = shiftMap[a.shift_type_id];
        const emp = empMap[a.employee_id];
        if (!shift || !emp || !emp.hourly_rate) continue;
        if (shift.start_time && shift.end_time) {
          const [sh, sm] = shift.start_time.split(':').map(Number);
          const [eh, em] = shift.end_time.split(':').map(Number);
          const hours = (eh + em / 60) - (sh + sm / 60);
          const baseCost = hours * emp.hourly_rate;
          cost += baseCost * (1 + socialChargesPercent / 100);
        }
      }
      result[d] = cost;
    }
    return result;
  }, [assignments, shiftTypes, employees, daysInMonth, year, month, socialChargesPercent]);

  // Chart data
  const chartData = useMemo(() => {
    const data = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const rev = dailyRevenue[d] || 0;
      const cost = dailyCosts[d] || 0;
      data.push({
        day: d,
        umsatz: Math.round(rev),
        kosten: Math.round(cost),
        differenz: Math.round(rev - cost),
        prozent: rev > 0 ? Math.round((cost / rev) * 100) : 0,
      });
    }
    return data;
  }, [dailyRevenue, dailyCosts, daysInMonth]);

  const totalCosts = Object.values(dailyCosts).reduce((a, b) => a + b, 0);
  const overallPercent = totalRevenue > 0 ? (totalCosts / totalRevenue) * 100 : 0;

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      year, month,
      total_revenue: totalRevenue,
      distribution_mode: distributionMode,
      day_weights: dayWeights,
    };

    if (budgetId) {
      await supabase.from('monthly_budgets').update(payload).eq('id', budgetId);
    } else {
      const { data } = await supabase.from('monthly_budgets').insert(payload).select().single();
      if (data) setBudgetId(data.id);
    }
    setSaving(false);
    toast.success('Budget gespeichert');
  };

  const monthNames = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

  return (
    <div className="space-y-6 pb-20 md:pb-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-heading text-2xl font-bold">Budget</h1>
        <div className="flex gap-2">
          <Select value={String(month)} onValueChange={v => setMonth(Number(v))}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              {monthNames.map((name, i) => (
                <SelectItem key={i + 1} value={String(i + 1)}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input type="number" value={year} onChange={e => setYear(Number(e.target.value))} className="w-24" />
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4 text-center">
            <DollarSign className="mx-auto h-5 w-5 text-muted-foreground mb-1" />
            <p className="text-xs text-muted-foreground">Budget Umsatz</p>
            <p className="font-heading text-lg font-bold">CHF {totalRevenue.toLocaleString('de-CH')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingDown className="mx-auto h-5 w-5 text-destructive mb-1" />
            <p className="text-xs text-muted-foreground">Personalkosten</p>
            <p className="font-heading text-lg font-bold">CHF {Math.round(totalCosts).toLocaleString('de-CH')}</p>
            <p className="text-xs text-muted-foreground">inkl. {socialChargesPercent}% NK</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Percent className="mx-auto h-5 w-5 text-warning mb-1" />
            <p className="text-xs text-muted-foreground">Personalkostenanteil</p>
            <p className={`font-heading text-lg font-bold ${overallPercent > 40 ? 'text-destructive' : overallPercent > 30 ? 'text-warning' : 'text-accent'}`}>
              {overallPercent.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="mx-auto h-5 w-5 text-accent mb-1" />
            <p className="text-xs text-muted-foreground">Differenz</p>
            <p className="font-heading text-lg font-bold">CHF {Math.round(totalRevenue - totalCosts).toLocaleString('de-CH')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Budget input */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Monatsbudget konfigurieren</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Gesamtumsatz (CHF)</Label>
              <Input
                type="number"
                value={totalRevenue || ''}
                onChange={e => setTotalRevenue(Number(e.target.value))}
                placeholder="z.B. 120000"
              />
            </div>
            <div className="space-y-2">
              <Label>Verteilung</Label>
              <Select value={distributionMode} onValueChange={v => setDistributionMode(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="linear">Linear (gleichmässig)</SelectItem>
                  <SelectItem value="weighted">Gewichtet (nach Wochentag)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {distributionMode === 'weighted' && (
            <div className="space-y-2">
              <Label className="text-sm">Gewichtung pro Wochentag</Label>
              <div className="grid grid-cols-7 gap-2">
                {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(day => (
                  <div key={day} className="space-y-1">
                    <Label className="text-xs text-center block">{day}</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      value={dayWeights[day] || 1}
                      onChange={e => setDayWeights(prev => ({ ...prev, [day]: Number(e.target.value) }))}
                      className="text-center text-sm"
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Höherer Wert = mehr Umsatz an diesem Tag. Standard = 1.0</p>
            </div>
          )}

          <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
            {saving ? 'Speichern...' : 'Budget speichern'}
          </Button>
        </CardContent>
      </Card>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tagesvergleich: Umsatz vs. Personalkosten</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    `CHF ${value.toLocaleString('de-CH')}`,
                    name === 'umsatz' ? 'Umsatz' : name === 'kosten' ? 'Kosten' : 'Differenz'
                  ]}
                />
                <Legend formatter={v => v === 'umsatz' ? 'Umsatz' : v === 'kosten' ? 'Kosten (inkl. NK)' : 'Kostenanteil %'} />
                <Bar dataKey="umsatz" fill="hsl(var(--accent))" radius={[3, 3, 0, 0]} />
                <Bar dataKey="kosten" fill="hsl(var(--destructive))" radius={[3, 3, 0, 0]} />
                <Line dataKey="prozent" stroke="hsl(var(--warning))" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Daily breakdown table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tagesaufstellung</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-h-96 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b text-left">
                  <th className="py-2 px-2">Tag</th>
                  <th className="py-2 px-2 text-right">Umsatz</th>
                  <th className="py-2 px-2 text-right">Kosten</th>
                  <th className="py-2 px-2 text-right">%</th>
                  <th className="py-2 px-2 text-right">Differenz</th>
                </tr>
              </thead>
              <tbody>
                {chartData.map(row => {
                  const date = new Date(year, month - 1, row.day);
                  const dow = WEEKDAY_LABELS[date.getDay()];
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                  return (
                    <tr key={row.day} className={`border-b ${isWeekend ? 'bg-muted/50' : ''}`}>
                      <td className="py-1.5 px-2">{dow} {row.day}.</td>
                      <td className="py-1.5 px-2 text-right">CHF {row.umsatz.toLocaleString('de-CH')}</td>
                      <td className="py-1.5 px-2 text-right">CHF {row.kosten.toLocaleString('de-CH')}</td>
                      <td className="py-1.5 px-2 text-right">
                        <Badge variant={row.prozent > 40 ? 'destructive' : row.prozent > 30 ? 'secondary' : 'default'} className="text-xs">
                          {row.prozent}%
                        </Badge>
                      </td>
                      <td className={`py-1.5 px-2 text-right font-medium ${row.differenz < 0 ? 'text-destructive' : 'text-accent'}`}>
                        CHF {row.differenz.toLocaleString('de-CH')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t-2 font-semibold">
                <tr>
                  <td className="py-2 px-2">Total</td>
                  <td className="py-2 px-2 text-right">CHF {totalRevenue.toLocaleString('de-CH')}</td>
                  <td className="py-2 px-2 text-right">CHF {Math.round(totalCosts).toLocaleString('de-CH')}</td>
                  <td className="py-2 px-2 text-right">
                    <Badge variant={overallPercent > 40 ? 'destructive' : 'default'}>{overallPercent.toFixed(1)}%</Badge>
                  </td>
                  <td className="py-2 px-2 text-right">CHF {Math.round(totalRevenue - totalCosts).toLocaleString('de-CH')}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
