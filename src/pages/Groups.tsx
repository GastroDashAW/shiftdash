import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  ShieldCheck, Plus, Edit, Trash2, Users, AlertTriangle,
  Clock, Calendar, TrendingUp, Moon, Sun, ChevronDown, ChevronRight,
} from 'lucide-react';

interface EmployeeGroup {
  id: string;
  name: string;
  description: string | null;
  color: string;
}

interface GavRule {
  id?: string;
  group_id: string;
  weekly_hours: number;
  max_daily_hours: number;
  max_weekly_hours: number;
  vacation_weeks: number;
  holidays_per_year: number;
  overtime_threshold: number | null;
  night_surcharge_pct: number;
  sunday_surcharge_pct: number;
  notes: string;
}

interface Warning {
  employee_name: string;
  group_name: string;
  type: 'daily' | 'weekly' | 'overtime';
  value: number;
  limit: number;
}

const DEFAULT_COLORS = [
  '#6366f1', '#f59e0b', '#10b981', '#ef4444',
  '#8b5cf6', '#06b6d4', '#f97316', '#84cc16',
];

const emptyGroup: Omit<EmployeeGroup, 'id'> = {
  name: '',
  description: '',
  color: '#6366f1',
};

const defaultGavRules = (groupId: string): GavRule => ({
  group_id: groupId,
  weekly_hours: 42,
  max_daily_hours: 11,
  max_weekly_hours: 50,
  vacation_weeks: 5,
  holidays_per_year: 6,
  overtime_threshold: 200,
  night_surcharge_pct: 25,
  sunday_surcharge_pct: 50,
  notes: '',
});

export default function Groups() {
  const [groups, setGroups] = useState<EmployeeGroup[]>([]);
  const [rules, setRules] = useState<Record<string, GavRule>>({});
  const [employeeCounts, setEmployeeCounts] = useState<Record<string, number>>({});
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [groupForm, setGroupForm] = useState(emptyGroup);
  const [ruleForm, setRuleForm] = useState<GavRule>(defaultGavRules(''));
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [{ data: grps }, { data: rvs }, { data: emps }] = await Promise.all([
      supabase.from('employee_groups').select('*').order('name'),
      supabase.from('gav_rules').select('*'),
      supabase.from('employees').select('id, group_id, first_name, last_name').eq('is_active', true),
    ]);

    const groupList: EmployeeGroup[] = grps || [];
    setGroups(groupList);

    const rulesMap: Record<string, GavRule> = {};
    (rvs || []).forEach((r: any) => { rulesMap[r.group_id] = r; });
    setRules(rulesMap);

    const counts: Record<string, number> = {};
    (emps || []).forEach((e: any) => {
      if (e.group_id) counts[e.group_id] = (counts[e.group_id] || 0) + 1;
    });
    setEmployeeCounts(counts);

    // Load warnings: check current week's time_entries against limits
    await loadWarnings(groupList, rulesMap, emps || []);
  };

  const loadWarnings = async (
    groupList: EmployeeGroup[],
    rulesMap: Record<string, GavRule>,
    employees: any[],
  ) => {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay() + 1);
    const weekStartStr = weekStart.toISOString().split('T')[0];
    const todayStr = today.toISOString().split('T')[0];

    const empIds = employees.map((e: any) => e.id);
    if (empIds.length === 0) return;

    const { data: entries } = await supabase
      .from('time_entries')
      .select('employee_id, work_date, effective_hours')
      .in('employee_id', empIds)
      .gte('work_date', weekStartStr)
      .lte('work_date', todayStr);

    if (!entries) return;

    const warns: Warning[] = [];

    // Group entries by employee
    const byEmployee: Record<string, { daily: Record<string, number>; weeklyTotal: number }> = {};
    entries.forEach((e: any) => {
      if (!byEmployee[e.employee_id]) byEmployee[e.employee_id] = { daily: {}, weeklyTotal: 0 };
      byEmployee[e.employee_id].daily[e.work_date] = (byEmployee[e.employee_id].daily[e.work_date] || 0) + (e.effective_hours || 0);
      byEmployee[e.employee_id].weeklyTotal += e.effective_hours || 0;
    });

    employees.forEach((emp: any) => {
      if (!emp.group_id) return;
      const rule = rulesMap[emp.group_id];
      if (!rule) return;
      const group = groupList.find(g => g.id === emp.group_id);
      const empData = byEmployee[emp.id];
      if (!empData) return;
      const name = `${emp.first_name} ${emp.last_name}`;

      // Daily violations
      Object.entries(empData.daily).forEach(([_date, hours]) => {
        if (hours > rule.max_daily_hours) {
          warns.push({ employee_name: name, group_name: group?.name || '', type: 'daily', value: hours, limit: rule.max_daily_hours });
        }
      });

      // Weekly violations
      if (empData.weeklyTotal > rule.max_weekly_hours) {
        warns.push({ employee_name: name, group_name: group?.name || '', type: 'weekly', value: empData.weeklyTotal, limit: rule.max_weekly_hours });
      }
    });

    // Overtime threshold — check monthly_summaries
    const { data: summaries } = await supabase
      .from('monthly_summaries')
      .select('employee_id, overtime_hours')
      .in('employee_id', empIds);

    if (summaries) {
      const overtimeByEmp: Record<string, number> = {};
      summaries.forEach((s: any) => {
        overtimeByEmp[s.employee_id] = (overtimeByEmp[s.employee_id] || 0) + (s.overtime_hours || 0);
      });

      employees.forEach((emp: any) => {
        if (!emp.group_id) return;
        const rule = rulesMap[emp.group_id];
        if (!rule?.overtime_threshold) return;
        const total = overtimeByEmp[emp.id] || 0;
        if (total >= rule.overtime_threshold) {
          const group = groupList.find(g => g.id === emp.group_id);
          warns.push({
            employee_name: `${emp.first_name} ${emp.last_name}`,
            group_name: group?.name || '',
            type: 'overtime',
            value: total,
            limit: rule.overtime_threshold,
          });
        }
      });
    }

    setWarnings(warns);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditingId(null);
    setGroupForm(emptyGroup);
    setRuleForm(defaultGavRules(''));
    setSheetOpen(true);
  };

  const openEdit = (group: EmployeeGroup) => {
    setEditingId(group.id);
    setGroupForm({ name: group.name, description: group.description || '', color: group.color });
    setRuleForm(rules[group.id] ? { ...rules[group.id] } : defaultGavRules(group.id));
    setSheetOpen(true);
  };

  const handleSave = async () => {
    if (!groupForm.name.trim()) { toast.error('Gruppenname erforderlich'); return; }
    setSaving(true);

    let groupId = editingId;

    if (editingId) {
      const { error } = await supabase.from('employee_groups').update({
        name: groupForm.name.trim(),
        description: groupForm.description || null,
        color: groupForm.color,
        updated_at: new Date().toISOString(),
      }).eq('id', editingId);
      if (error) { toast.error('Fehler beim Speichern'); setSaving(false); return; }
    } else {
      const { data, error } = await supabase.from('employee_groups').insert({
        name: groupForm.name.trim(),
        description: groupForm.description || null,
        color: groupForm.color,
      }).select().single();
      if (error || !data) { toast.error('Fehler beim Erstellen'); setSaving(false); return; }
      groupId = data.id;
    }

    // Save GAV rules (upsert)
    const rulePayload = {
      group_id: groupId!,
      weekly_hours: ruleForm.weekly_hours,
      max_daily_hours: ruleForm.max_daily_hours,
      max_weekly_hours: ruleForm.max_weekly_hours,
      vacation_weeks: ruleForm.vacation_weeks,
      holidays_per_year: ruleForm.holidays_per_year,
      overtime_threshold: ruleForm.overtime_threshold,
      night_surcharge_pct: ruleForm.night_surcharge_pct,
      sunday_surcharge_pct: ruleForm.sunday_surcharge_pct,
      notes: ruleForm.notes || null,
      updated_at: new Date().toISOString(),
    };

    const existingRule = rules[groupId!];
    if (existingRule?.id) {
      await supabase.from('gav_rules').update(rulePayload).eq('id', existingRule.id);
    } else {
      await supabase.from('gav_rules').insert(rulePayload);
    }

    toast.success(editingId ? 'Gruppe aktualisiert' : 'Gruppe erstellt');
    setSaving(false);
    setSheetOpen(false);
    load();
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Gruppe «${name}» wirklich löschen? Alle Mitarbeiter verlieren die Gruppenzuweisung.`)) return;
    await supabase.from('employee_groups').delete().eq('id', id);
    toast.success('Gruppe gelöscht');
    load();
  };

  const toggleExpand = (id: string) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  const updateRule = (key: keyof GavRule, value: any) =>
    setRuleForm(prev => ({ ...prev, [key]: value }));

  const warningIcon = (type: Warning['type']) => {
    if (type === 'daily') return <Clock className="h-3.5 w-3.5" />;
    if (type === 'weekly') return <Calendar className="h-3.5 w-3.5" />;
    return <TrendingUp className="h-3.5 w-3.5" />;
  };

  const warningLabel = (w: Warning) => {
    if (w.type === 'daily') return `${w.value.toFixed(1)}h/Tag (Max: ${w.limit}h)`;
    if (w.type === 'weekly') return `${w.value.toFixed(1)}h/Woche (Max: ${w.limit}h)`;
    return `${w.value.toFixed(0)}h Überstunden (Schwelle: ${w.limit}h)`;
  };

  return (
    <div className="space-y-6 pb-20 md:pb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <h1 className="font-heading text-2xl font-bold">Mitarbeitergruppen & GAV</h1>
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus className="h-4 w-4" />
          Neue Gruppe
        </Button>
      </div>

      {/* Warnings panel */}
      {warnings.length > 0 && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-4 w-4" />
              {warnings.length} aktive Warnung{warnings.length !== 1 ? 'en' : ''} diese Woche
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {warnings.map((w, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="text-amber-500">{warningIcon(w.type)}</span>
                  <span className="font-medium">{w.employee_name}</span>
                  <Badge variant="outline" className="text-[10px]">{w.group_name}</Badge>
                  <span className="text-muted-foreground">{warningLabel(w)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Groups list */}
      {groups.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <ShieldCheck className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Noch keine Gruppen</p>
            <p className="text-sm mt-1">Erstelle Mitarbeitergruppen und hinterlege die GAV-Regeln.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {groups.map(group => {
            const rule = rules[group.id];
            const count = employeeCounts[group.id] || 0;
            const isOpen = expanded[group.id];
            const groupWarnings = warnings.filter(w => w.group_name === group.name);

            return (
              <Card key={group.id} className="overflow-hidden">
                <div
                  className="flex items-center gap-3 p-4 cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => toggleExpand(group.id)}
                >
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: group.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-heading font-semibold">{group.name}</span>
                      <Badge variant="secondary" className="text-[10px] gap-1">
                        <Users className="h-2.5 w-2.5" />{count} MA
                      </Badge>
                      {groupWarnings.length > 0 && (
                        <Badge variant="destructive" className="text-[10px] gap-1">
                          <AlertTriangle className="h-2.5 w-2.5" />{groupWarnings.length}
                        </Badge>
                      )}
                    </div>
                    {group.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{group.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="ghost" size="icon"
                      className="h-8 w-8"
                      onClick={e => { e.stopPropagation(); openEdit(group); }}
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost" size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={e => { e.stopPropagation(); handleDelete(group.id, group.name); }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                    {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </div>

                {isOpen && rule && (
                  <div className="border-t bg-muted/20 px-4 py-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Wochenstunden</p>
                        <p className="font-semibold">{rule.weekly_hours}h</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Max. Tag / Woche</p>
                        <p className="font-semibold">{rule.max_daily_hours}h / {rule.max_weekly_hours}h</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Ferien / Feiertage</p>
                        <p className="font-semibold">{rule.vacation_weeks} Wo / {rule.holidays_per_year} Tage</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">ÜZ-Schwelle</p>
                        <p className="font-semibold">{rule.overtime_threshold ? `${rule.overtime_threshold}h` : '–'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide flex items-center gap-1"><Moon className="h-3 w-3" />Nachtzuschlag</p>
                        <p className="font-semibold">{rule.night_surcharge_pct}%</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide flex items-center gap-1"><Sun className="h-3 w-3" />Sonntagszuschlag</p>
                        <p className="font-semibold">{rule.sunday_surcharge_pct}%</p>
                      </div>
                      {rule.notes && (
                        <div className="col-span-2 sm:col-span-4">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Notizen</p>
                          <p className="text-xs text-muted-foreground">{rule.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {isOpen && !rule && (
                  <div className="border-t bg-amber-500/5 px-4 py-3">
                    <p className="text-xs text-amber-600 flex items-center gap-2">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Noch keine GAV-Regeln definiert – Gruppe bearbeiten um Regeln hinzuzufügen.
                    </p>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Sheet: Create / Edit */}
      <Sheet open={sheetOpen} onOpenChange={open => { setSheetOpen(open); }}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingId ? 'Gruppe bearbeiten' : 'Neue Gruppe'}</SheetTitle>
          </SheetHeader>

          <div className="space-y-5 pt-4">
            {/* Group basics */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Gruppenname *</Label>
                <Input
                  value={groupForm.name}
                  onChange={e => setGroupForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="z.B. Gastronomie L-GAV"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Beschreibung</Label>
                <Input
                  value={groupForm.description || ''}
                  onChange={e => setGroupForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Kurze Beschreibung (optional)"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Farbe</Label>
                <div className="flex items-center gap-2 flex-wrap">
                  {DEFAULT_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      className={`w-7 h-7 rounded-full transition-all ${groupForm.color === c ? 'ring-2 ring-offset-2 ring-primary scale-110' : ''}`}
                      style={{ backgroundColor: c }}
                      onClick={() => setGroupForm(p => ({ ...p, color: c }))}
                    />
                  ))}
                  <input
                    type="color"
                    value={groupForm.color}
                    onChange={e => setGroupForm(p => ({ ...p, color: e.target.value }))}
                    className="w-7 h-7 rounded cursor-pointer border-0 p-0"
                    title="Benutzerdefinierte Farbe"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* GAV Rules */}
            <div className="space-y-1">
              <h3 className="font-heading font-semibold text-sm flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                GAV-Regeln
              </h3>
              <p className="text-xs text-muted-foreground">Arbeitszeit- und Zuschlagsregeln für diese Gruppe</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Wochenstunden</Label>
                <Input type="number" value={ruleForm.weekly_hours} min="0" step="0.5"
                  onChange={e => updateRule('weekly_hours', parseFloat(e.target.value) || 0)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Max. Stunden/Tag</Label>
                <Input type="number" value={ruleForm.max_daily_hours} min="0" step="0.5"
                  onChange={e => updateRule('max_daily_hours', parseFloat(e.target.value) || 0)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Max. Stunden/Woche</Label>
                <Input type="number" value={ruleForm.max_weekly_hours} min="0" step="0.5"
                  onChange={e => updateRule('max_weekly_hours', parseFloat(e.target.value) || 0)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Ferienanspruch (Wochen)</Label>
                <Input type="number" value={ruleForm.vacation_weeks} min="0" step="0.5"
                  onChange={e => updateRule('vacation_weeks', parseFloat(e.target.value) || 0)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Feiertage/Jahr</Label>
                <Input type="number" value={ruleForm.holidays_per_year} min="0"
                  onChange={e => updateRule('holidays_per_year', parseInt(e.target.value) || 0)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">ÜZ-Schwellenwert (h)</Label>
                <Input type="number" value={ruleForm.overtime_threshold ?? ''} min="0" step="1"
                  placeholder="z.B. 200"
                  onChange={e => updateRule('overtime_threshold', e.target.value ? parseFloat(e.target.value) : null)} />
                <p className="text-[10px] text-muted-foreground">Ab dieser Grenze Warnung</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5"><Moon className="h-3 w-3" />Nachtzuschlag %</Label>
                <Input type="number" value={ruleForm.night_surcharge_pct} min="0" step="1"
                  onChange={e => updateRule('night_surcharge_pct', parseFloat(e.target.value) || 0)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5"><Sun className="h-3 w-3" />Sonntagszuschlag %</Label>
                <Input type="number" value={ruleForm.sunday_surcharge_pct} min="0" step="1"
                  onChange={e => updateRule('sunday_surcharge_pct', parseFloat(e.target.value) || 0)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Notizen / Spezialregelungen</Label>
              <Textarea
                value={ruleForm.notes}
                onChange={e => updateRule('notes', e.target.value)}
                placeholder="z.B. Nachtschicht gilt ab 23:00 Uhr, Sonntagszuschlag ab 00:00 Uhr..."
                rows={3}
              />
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? 'Speichern...' : editingId ? 'Aktualisieren' : 'Gruppe erstellen'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
