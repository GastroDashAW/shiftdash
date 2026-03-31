import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Line, ComposedChart } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Percent, Save, Receipt } from 'lucide-react';
import { getEndOfMonthString } from '@/lib/date';

const WEEKDAY_LABELS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const DEFAULT_VAT_RATE = 8.1;

interface BudgetEmployee {
  id: string;
  first_name: string;
  last_name: string;
  employee_type: 'fixed' | 'hourly';
  hourly_rate: number | null;
  weekly_hours: number | null;
  vacation_surcharge_percent: number | null;
  holiday_surcharge_percent: number | null;
}

interface BudgetAssignment {
  id: string;
  employee_id: string;
  date: string;
  shift_type_id: string;
}

interface BudgetShiftType {
  id: string;
  name: string;
  short_code: string;
  color: string;
  start_time: string | null;
  end_time: string | null;
  cost_center: string;
}

interface BudgetBusinessSettings {
  closed_days: number[] | null;
  auto_sync_schedule: boolean | null;
  social_charges_percent: number | null;
}

export default function Budget() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [distributionMode, setDistributionMode] = useState<'linear' | 'weighted'>('linear');
  const [dayWeights, setDayWeights] = useState<Record<string, number>>({ Mo: 1, Di: 1, Mi: 1, Do: 1, Fr: 1.3, Sa: 1.5, So: 0.7 });
  const [budgetId, setBudgetId] = useState<string | null>(null);
  const [employees, setEmployees] = useState<BudgetEmployee[]>([]);
  const [assignments, setAssignments] = useState<BudgetAssignment[]>([]);
  const [shiftTypes, setShiftTypes] = useState<BudgetShiftType[]>([]);
  const [businessSettings, setBusinessSettings] = useState<BudgetBusinessSettings | null>(null);
  const [saving, setSaving] = useState(false);

  // Actual daily revenues
  const [actualRevenues, setActualRevenues] = useState<Record<string, { id?: string; revenue_gross: number; vat_rate: number }>>({});
  const [showNet, setShowNet] = useState(false);
  const [savingRevenues, setSavingRevenues] = useState(false);

  const daysInMonth = new Date(year, month, 0).getDate();

  // Load data
  // Map day index (0=So,1=Mo,...) to label
  const dayIndexToLabel: Record<number, string> = { 0: 'So', 1: 'Mo', 2: 'Di', 3: 'Mi', 4: 'Do', 5: 'Fr', 6: 'Sa' };

  useEffect(() => {
    const load = async () => {
      const [budgetRes, empRes, shiftRes, bizRes] = await Promise.all([
        supabase.from('monthly_budgets').select('*').eq('year', year).eq('month', month).maybeSingle(),
        supabase.from('employees').select('*').eq('is_active', true),
        supabase.from('shift_types').select('*'),
        supabase.from('business_settings').select('*').limit(1).maybeSingle(),
      ]);

      const biz = bizRes.data as BudgetBusinessSettings | null;
      setBusinessSettings(biz);

      // Build default weights from business closed_days
      const closedDays: number[] = Array.isArray(biz?.closed_days) ? (biz.closed_days as number[]).map(Number) : [];
      const defaultWeights: Record<string, number> = { Mo: 1, Di: 1, Mi: 1, Do: 1, Fr: 1.3, Sa: 1.5, So: 0.7 };
      for (const idx of closedDays) {
        const label = dayIndexToLabel[idx];
        if (label) defaultWeights[label] = 0;
      }

      if (budgetRes.data) {
        setTotalRevenue(budgetRes.data.total_revenue || 0);
        setDistributionMode((budgetRes.data.distribution_mode as 'linear' | 'weighted') || 'linear');
        if (budgetRes.data.day_weights && typeof budgetRes.data.day_weights === 'object') {
          const saved = budgetRes.data.day_weights as Record<string, number>;
          const merged = { ...defaultWeights, ...saved };
          for (const idx of closedDays) {
            const label = dayIndexToLabel[idx];
            if (label) merged[label] = 0;
          }
          setDayWeights(merged);
        } else {
          setDayWeights(defaultWeights);
        }
        setBudgetId(budgetRes.data.id);
      } else {
        setTotalRevenue(0);
        setBudgetId(null);
        setDayWeights(defaultWeights);
      }

      setEmployees((empRes.data || []) as BudgetEmployee[]);
      setShiftTypes((shiftRes.data || []) as BudgetShiftType[]);
    };
    load();

    // Load assignments
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = getEndOfMonthString(year, month);
    supabase.from('schedule_assignments').select('*').gte('date', startDate).lte('date', endDate)
      .then(({ data }) => setAssignments((data || []) as BudgetAssignment[]));

    // Load actual daily revenues
    supabase.from('daily_revenues').select('*')
      .gte('date', `${year}-${String(month).padStart(2, '0')}-01`)
      .lte('date', getEndOfMonthString(year, month))
      .then(({ data }) => {
        const map: Record<string, { id: string; revenue_gross: number; vat_rate: number }> = {};
        (data || []).forEach(r => {
          map[r.date] = { id: r.id, revenue_gross: r.revenue_gross, vat_rate: r.vat_rate };
        });
        setActualRevenues(map);
      });
  }, [year, month]);

  const socialChargesPercent = businessSettings?.social_charges_percent || 15;

  // Distribute budget revenue across days
  const dailyBudgetRevenue = useMemo(() => {
    const result: Record<number, number> = {};
    if (distributionMode === 'linear') {
      const daily = totalRevenue / daysInMonth;
      for (let d = 1; d <= daysInMonth; d++) result[d] = daily;
    } else {
      let totalWeight = 0;
      const dayWeightMap: Record<number, number> = {};
      for (let d = 1; d <= daysInMonth; d++) {
        const dow = new Date(year, month - 1, d).getDay();
        const w = dayWeights[WEEKDAY_LABELS[dow]] || 1;
        dayWeightMap[d] = w;
        totalWeight += w;
      }
      for (let d = 1; d <= daysInMonth; d++) {
        result[d] = totalWeight > 0 ? (totalRevenue * dayWeightMap[d]) / totalWeight : 0;
      }
    }
    return result;
  }, [totalRevenue, distributionMode, dayWeights, daysInMonth, year, month]);

  // Daily costs from schedule
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
          cost += hours * emp.hourly_rate * (1 + socialChargesPercent / 100);
        }
      }
      result[d] = cost;
    }
    return result;
  }, [assignments, shiftTypes, employees, daysInMonth, year, month, socialChargesPercent]);

  const grossToNet = (gross: number, vatRate: number) => gross / (1 + vatRate / 100);

  // Helper: get actual revenue for a day (net)
  const getActualNet = (day: number) => {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const entry = actualRevenues[dateStr];
    if (!entry || !entry.revenue_gross) return 0;
    return grossToNet(entry.revenue_gross, entry.vat_rate);
  };

  const getActualGross = (day: number) => {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return actualRevenues[dateStr]?.revenue_gross || 0;
  };

  // Chart data
  const chartData = useMemo(() => {
    const data = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const budgetRev = dailyBudgetRevenue[d] || 0;
      const cost = dailyCosts[d] || 0;
      const actualNet = getActualNet(d);
      const actualGross = getActualGross(d);
      data.push({
        day: d,
        budget: Math.round(budgetRev),
        effektiv_brutto: Math.round(actualGross),
        effektiv_netto: Math.round(actualNet),
        kosten: Math.round(cost),
        prozent_budget: budgetRev > 0 ? Math.round((cost / budgetRev) * 100) : 0,
        prozent_effektiv: actualNet > 0 ? Math.round((cost / actualNet) * 100) : 0,
      });
    }
    return data;
  }, [dailyBudgetRevenue, dailyCosts, daysInMonth, actualRevenues]);

  const totalCosts = Object.values(dailyCosts).reduce((a, b) => a + b, 0);
  const totalActualGross = Array.from({ length: daysInMonth }, (_, i) => getActualGross(i + 1)).reduce((a, b) => a + b, 0);
  const totalActualNet = Array.from({ length: daysInMonth }, (_, i) => getActualNet(i + 1)).reduce((a, b) => a + b, 0);
  const overallPercentBudget = totalRevenue > 0 ? (totalCosts / totalRevenue) * 100 : 0;
  const overallPercentActual = totalActualNet > 0 ? (totalCosts / totalActualNet) * 100 : 0;

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { year, month, total_revenue: totalRevenue, distribution_mode: distributionMode, day_weights: dayWeights };
      if (budgetId) {
        const { error } = await supabase.from('monthly_budgets').update(payload).eq('id', budgetId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('monthly_budgets').insert(payload).select().single();
        if (error) throw error;
        if (data) setBudgetId(data.id);
      }
      toast.success('Budget gespeichert');
    } catch (err: any) {
      console.error('[Budget] handleSave', err);
      toast.error('Fehler beim Speichern. Bitte erneut versuchen.');
    } finally {
      setSaving(false);
    }
  };

  const handleSetActualRevenue = (day: number, value: number, isNet: boolean) => {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const existing = actualRevenues[dateStr];
    const vatRate = existing?.vat_rate ?? DEFAULT_VAT_RATE;
    const gross = isNet ? value * (1 + vatRate / 100) : value;
    setActualRevenues(prev => ({
      ...prev,
      [dateStr]: { ...prev[dateStr], revenue_gross: Math.round(gross * 100) / 100, vat_rate: vatRate },
    }));
  };

  const handleSaveRevenues = async () => {
    setSavingRevenues(true);
    try {
      const entries = Object.entries(actualRevenues).filter(([, v]) => v.revenue_gross > 0);
      for (const [date, entry] of entries) {
        if (entry.id) {
          const { error } = await supabase.from('daily_revenues').update({ revenue_gross: entry.revenue_gross, vat_rate: entry.vat_rate }).eq('id', entry.id);
          if (error) throw error;
        } else {
          const { data, error } = await supabase.from('daily_revenues').insert({ date, revenue_gross: entry.revenue_gross, vat_rate: entry.vat_rate }).select().single();
          if (error) throw error;
          if (data) {
            setActualRevenues(prev => ({ ...prev, [date]: { ...prev[date], id: data.id } }));
          }
        }
      }
      toast.success('Tagesumsätze gespeichert');
    } catch (err: any) {
      console.error('[Budget] handleSaveRevenues', err);
      toast.error('Fehler beim Speichern der Umsätze. Bitte erneut versuchen.');
    } finally {
      setSavingRevenues(false);
    }
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
            <p className="text-xs text-muted-foreground">Budget</p>
            <p className="font-heading text-lg font-bold">CHF {totalRevenue.toLocaleString('de-CH')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Receipt className="mx-auto h-5 w-5 text-primary mb-1" />
            <p className="text-xs text-muted-foreground">Effektiv (netto)</p>
            <p className="font-heading text-lg font-bold">CHF {Math.round(totalActualNet).toLocaleString('de-CH')}</p>
            <p className="text-xs text-muted-foreground">brutto: {Math.round(totalActualGross).toLocaleString('de-CH')}</p>
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
            <p className="text-xs text-muted-foreground">Kostenanteil</p>
            <div className="flex items-center justify-center gap-2">
              <div>
                <p className="text-xs text-muted-foreground">Budget</p>
                <p className={`font-heading text-base font-bold ${overallPercentBudget > 40 ? 'text-destructive' : overallPercentBudget > 30 ? 'text-warning' : 'text-accent'}`}>
                  {overallPercentBudget.toFixed(1)}%
                </p>
              </div>
              {totalActualNet > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground">Effektiv</p>
                  <p className={`font-heading text-base font-bold ${overallPercentActual > 40 ? 'text-destructive' : overallPercentActual > 30 ? 'text-warning' : 'text-accent'}`}>
                    {overallPercentActual.toFixed(1)}%
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Budget config */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Monatsbudget konfigurieren</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Gesamtumsatz Budget (CHF)</Label>
              <Input type="number" value={totalRevenue || ''} onChange={e => setTotalRevenue(Number(e.target.value))} placeholder="z.B. 120000" />
            </div>
            <div className="space-y-2">
              <Label>Verteilung</Label>
              <Select value={distributionMode} onValueChange={v => setDistributionMode(v as 'linear' | 'weighted')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="linear">Linear (gleichmässig)</SelectItem>
                  <SelectItem value="weighted">Gewichtet (nach Wochentag)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {distributionMode === 'weighted' && (() => {
            const closedDays: number[] = Array.isArray(businessSettings?.closed_days) ? (businessSettings!.closed_days as number[]).map(Number) : [];
            const closedLabels = new Set(closedDays.map(idx => dayIndexToLabel[idx]).filter(Boolean));
            return (
            <div className="space-y-2">
              <Label className="text-sm">Gewichtung pro Wochentag <span className="text-muted-foreground font-normal">(Ruhetage aus Betrieb = 0)</span></Label>
              <div className="grid grid-cols-7 gap-2">
                {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(day => {
                  const isClosed = closedLabels.has(day);
                  return (
                  <div key={day} className="space-y-1">
                    <Label className={`text-xs text-center block ${isClosed ? 'text-destructive line-through' : ''}`}>{day}</Label>
                    <Input type="number" step="0.1" min="0" value={dayWeights[day] ?? 1}
                      onChange={e => setDayWeights(prev => ({ ...prev, [day]: Number(e.target.value) }))}
                      disabled={isClosed}
                      className={`text-center text-sm ${isClosed ? 'opacity-50' : ''}`} />
                  </div>
                  );
                })}
              </div>
            </div>
            );
          })()}
          <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
            {saving ? 'Speichern...' : 'Budget speichern'}
          </Button>
        </CardContent>
      </Card>

      {/* Actual daily revenues */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Effektive Tagesumsätze
            </CardTitle>
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Brutto</Label>
              <Switch checked={showNet} onCheckedChange={setShowNet} />
              <Label className="text-xs text-muted-foreground">Netto (exkl. MwSt)</Label>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            {showNet
              ? `Beträge ohne MwSt eingeben (${DEFAULT_VAT_RATE}% wird automatisch aufgerechnet)`
              : `Beträge inkl. MwSt eingeben (${DEFAULT_VAT_RATE}% wird automatisch abgezogen)`}
          </p>
          <div className="max-h-80 overflow-auto">
            <div className="grid gap-1">
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const date = new Date(year, month - 1, day);
                const dow = WEEKDAY_LABELS[date.getDay()];
                const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                const entry = actualRevenues[dateStr];
                const gross = entry?.revenue_gross || 0;
                const vatRate = entry?.vat_rate ?? DEFAULT_VAT_RATE;
                const net = gross > 0 ? grossToNet(gross, vatRate) : 0;
                const displayValue = showNet ? (net > 0 ? Math.round(net) : '') : (gross > 0 ? Math.round(gross) : '');

                return (
                  <div key={day} className={`flex items-center gap-2 rounded px-2 py-1 ${isWeekend ? 'bg-muted/50' : ''}`}>
                    <span className="w-14 text-xs font-medium">{dow} {day}.</span>
                    <Input
                      type="number"
                      className="h-8 text-sm flex-1"
                      placeholder="0"
                      value={displayValue}
                      onChange={e => handleSetActualRevenue(day, Number(e.target.value), showNet)}
                    />
                    <span className="text-xs text-muted-foreground w-24 text-right">
                      {gross > 0 && (
                        showNet
                          ? `brutto ${Math.round(gross).toLocaleString('de-CH')}`
                          : `netto ${Math.round(net).toLocaleString('de-CH')}`
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          <Button onClick={handleSaveRevenues} disabled={savingRevenues} className="w-full sm:w-auto gap-2">
            <Save className="h-4 w-4" />
            {savingRevenues ? 'Speichern...' : 'Tagesumsätze speichern'}
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
                  formatter={(value: number, name: string) => {
                    const labels: Record<string, string> = {
                      budget: 'Budget', effektiv_netto: 'Effektiv (netto)',
                      kosten: 'Kosten (inkl. NK)', prozent_effektiv: 'Kostenanteil %',
                    };
                    return [name.includes('prozent') ? `${value}%` : `CHF ${value.toLocaleString('de-CH')}`, labels[name] || name];
                  }}
                />
                <Legend formatter={v => {
                  const l: Record<string, string> = { budget: 'Budget', effektiv_netto: 'Effektiv (netto)', kosten: 'Kosten (inkl. NK)', prozent_effektiv: '% Effektiv' };
                  return l[v] || v;
                }} />
                <Bar dataKey="budget" fill="hsl(var(--accent))" opacity={0.4} radius={[3, 3, 0, 0]} />
                <Bar dataKey="effektiv_netto" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
                <Bar dataKey="kosten" fill="hsl(var(--destructive))" radius={[3, 3, 0, 0]} />
                <Line dataKey="prozent_effektiv" stroke="hsl(var(--warning))" strokeWidth={2} dot={false} />
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
                  <th className="py-2 px-2 text-right">Budget</th>
                  <th className="py-2 px-2 text-right">Effektiv brutto</th>
                  <th className="py-2 px-2 text-right">Effektiv netto</th>
                  <th className="py-2 px-2 text-right">Kosten</th>
                  <th className="py-2 px-2 text-right">% Budget</th>
                  <th className="py-2 px-2 text-right">% Effektiv</th>
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
                      <td className="py-1.5 px-2 text-right text-muted-foreground">{row.budget.toLocaleString('de-CH')}</td>
                      <td className="py-1.5 px-2 text-right">{row.effektiv_brutto > 0 ? row.effektiv_brutto.toLocaleString('de-CH') : '–'}</td>
                      <td className="py-1.5 px-2 text-right font-medium">{row.effektiv_netto > 0 ? row.effektiv_netto.toLocaleString('de-CH') : '–'}</td>
                      <td className="py-1.5 px-2 text-right">{row.kosten.toLocaleString('de-CH')}</td>
                      <td className="py-1.5 px-2 text-right">
                        <Badge variant={row.prozent_budget > 40 ? 'destructive' : row.prozent_budget > 30 ? 'secondary' : 'default'} className="text-xs">
                          {row.prozent_budget}%
                        </Badge>
                      </td>
                      <td className="py-1.5 px-2 text-right">
                        {row.effektiv_netto > 0 ? (
                          <Badge variant={row.prozent_effektiv > 40 ? 'destructive' : row.prozent_effektiv > 30 ? 'secondary' : 'default'} className="text-xs">
                            {row.prozent_effektiv}%
                          </Badge>
                        ) : '–'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t-2 font-semibold">
                <tr>
                  <td className="py-2 px-2">Total</td>
                  <td className="py-2 px-2 text-right text-muted-foreground">{totalRevenue.toLocaleString('de-CH')}</td>
                  <td className="py-2 px-2 text-right">{totalActualGross > 0 ? Math.round(totalActualGross).toLocaleString('de-CH') : '–'}</td>
                  <td className="py-2 px-2 text-right">{totalActualNet > 0 ? Math.round(totalActualNet).toLocaleString('de-CH') : '–'}</td>
                  <td className="py-2 px-2 text-right">{Math.round(totalCosts).toLocaleString('de-CH')}</td>
                  <td className="py-2 px-2 text-right">
                    <Badge variant={overallPercentBudget > 40 ? 'destructive' : 'default'}>{overallPercentBudget.toFixed(1)}%</Badge>
                  </td>
                  <td className="py-2 px-2 text-right">
                    {totalActualNet > 0 ? (
                      <Badge variant={overallPercentActual > 40 ? 'destructive' : 'default'}>{overallPercentActual.toFixed(1)}%</Badge>
                    ) : '–'}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
