import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Pencil, Trash2, Plus, Save, X, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';
import { ShiftPlanConfig } from '@/components/shifts/ShiftPlanConfig';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const COST_CENTERS = ['Geschäftsführung', 'Küche', 'Service', 'Office'];

interface ShiftType {
  id: string;
  name: string;
  short_code: string;
  color: string;
  start_time: string | null;
  end_time: string | null;
  sort_order: number;
  cost_center: string;
  break_minutes: number;
}

interface DayHours { open: string; close: string; }

function adjustTime(time: string, deltaHours: number): string {
  const [h, m] = time.split(':').map(Number);
  let total = h * 60 + m + deltaHours * 60;
  total = Math.max(0, Math.min(total, 23 * 60 + 59));
  const hh = Math.floor(total / 60);
  const mm = total % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

function timeToMin(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export default function ShiftTypes() {
  const [shifts, setShifts] = useState<ShiftType[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<ShiftType>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [newShift, setNewShift] = useState({ name: '', short_code: '', color: '#3b82f6', start_time: '', end_time: '', cost_center: '', break_minutes: '0' });
  const [businessSettings, setBusinessSettings] = useState<any>(null);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const loadShifts = async () => {
    const { data } = await supabase.from('shift_types').select('*').order('sort_order');
    setShifts((data as ShiftType[]) || []);
  };

  useEffect(() => {
    loadShifts();
    supabase.from('business_settings').select('*').limit(1).maybeSingle()
      .then(({ data }) => setBusinessSettings(data));
  }, []);

  // Initialize all sections as open
  useEffect(() => {
    const grouped = groupShiftsByCostCenter(shifts);
    const initial: Record<string, boolean> = {};
    grouped.forEach(g => { initial[g.costCenter] = true; });
    setOpenSections(prev => {
      const merged = { ...initial, ...prev };
      return merged;
    });
  }, [shifts]);

  const { earliestStart, latestEnd } = useMemo(() => {
    if (!businessSettings) return { earliestStart: null, latestEnd: null };

    let openingHours: Record<string, DayHours> = {};
    try {
      openingHours = businessSettings.opening_hours ? JSON.parse(businessSettings.opening_hours) : {};
    } catch { /* ignore */ }

    const closedDays: number[] = Array.isArray(businessSettings.closed_days)
      ? (businessSettings.closed_days as any[]).map(Number) : [];

    let globalEarliest: number | null = null;
    let globalLatest: number | null = null;

    for (let day = 0; day <= 6; day++) {
      if (closedDays.includes(day)) continue;
      const hours = openingHours[String(day)];
      if (!hours?.open || !hours?.close) continue;
      const openMin = timeToMin(hours.open);
      const closeMin = timeToMin(hours.close);
      if (globalEarliest === null || openMin < globalEarliest) globalEarliest = openMin;
      if (globalLatest === null || closeMin > globalLatest) globalLatest = closeMin;
    }

    if (globalEarliest === null || globalLatest === null) return { earliestStart: null, latestEnd: null };

    const earliest = Math.max(0, globalEarliest - 120);
    const latest = Math.min(23 * 60 + 59, globalLatest + 120);

    const toStr = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
    return { earliestStart: toStr(earliest), latestEnd: toStr(latest) };
  }, [businessSettings]);

  const validateShiftTime = (startTime: string | null, endTime: string | null): string | null => {
    if (!startTime || !endTime || !earliestStart || !latestEnd) return null;
    const start = timeToMin(startTime);
    const end = timeToMin(endTime);
    const earliest = timeToMin(earliestStart);
    const latest = timeToMin(latestEnd);

    const warnings: string[] = [];
    if (start < earliest) warnings.push(`Beginn vor ${earliestStart} (frühestens 2h vor Öffnung)`);
    if (end > latest) warnings.push(`Ende nach ${latestEnd} (max. 2h nach Schliessung)`);
    return warnings.length > 0 ? warnings.join('; ') : null;
  };

  const startEdit = (shift: ShiftType) => {
    setEditingId(shift.id);
    setEditForm({ ...shift });
  };

  const saveEdit = async () => {
    if (!editingId || !editForm.name || !editForm.short_code) return;
    const warning = validateShiftTime(editForm.start_time || null, editForm.end_time || null);
    if (warning) { toast.warning('Warnung: ' + warning); }
    const { error } = await supabase.from('shift_types').update({
      name: editForm.name,
      short_code: editForm.short_code,
      color: editForm.color,
      start_time: editForm.start_time || null,
      end_time: editForm.end_time || null,
      cost_center: editForm.cost_center || '',
      break_minutes: editForm.break_minutes ?? 0,
    }).eq('id', editingId);
    if (error) { toast.error('Fehler beim Speichern'); return; }
    toast.success('Dienst aktualisiert');
    setEditingId(null);
    loadShifts();
  };

  const deleteShift = async (id: string) => {
    const { error } = await supabase.from('shift_types').delete().eq('id', id);
    if (error) { toast.error('Fehler beim Löschen'); return; }
    toast.success('Dienst gelöscht');
    loadShifts();
  };

  const addShift = async () => {
    if (!newShift.name || !newShift.short_code) return;
    const warning = validateShiftTime(newShift.start_time || null, newShift.end_time || null);
    if (warning) { toast.warning('Warnung: ' + warning); }
    const maxOrder = shifts.reduce((max, s) => Math.max(max, s.sort_order), 0);
    const { error } = await supabase.from('shift_types').insert({
      name: newShift.name,
      short_code: newShift.short_code,
      color: newShift.color,
      start_time: newShift.start_time || null,
      end_time: newShift.end_time || null,
      sort_order: maxOrder + 1,
      cost_center: newShift.cost_center || '',
    });
    if (error) { toast.error('Fehler beim Erstellen'); return; }
    toast.success('Dienst erstellt');
    setNewShift({ name: '', short_code: '', color: '#3b82f6', start_time: '', end_time: '', cost_center: '' });
    setShowAdd(false);
    loadShifts();
  };

  const getShiftWarning = (shift: ShiftType): string | null => {
    return validateShiftTime(shift.start_time, shift.end_time);
  };

  function groupShiftsByCostCenter(allShifts: ShiftType[]) {
    const groups: { costCenter: string; shifts: ShiftType[] }[] = [];
    const map = new Map<string, ShiftType[]>();

    for (const s of allShifts) {
      const cc = s.cost_center || 'Allgemein';
      if (!map.has(cc)) map.set(cc, []);
      map.get(cc)!.push(s);
    }

    // Sort: known cost centers first, then "Allgemein"
    const order = [...COST_CENTERS, 'Allgemein'];
    for (const cc of order) {
      if (map.has(cc)) {
        groups.push({ costCenter: cc, shifts: map.get(cc)! });
        map.delete(cc);
      }
    }
    // Any remaining
    for (const [cc, s] of map) {
      groups.push({ costCenter: cc, shifts: s });
    }

    return groups;
  }

  const toggleSection = (cc: string) => {
    setOpenSections(prev => ({ ...prev, [cc]: !prev[cc] }));
  };

  const grouped = groupShiftsByCostCenter(shifts);

  const TimeConstraintInfo = () => {
    if (!earliestStart || !latestEnd) return null;
    return (
      <div className="rounded-lg border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Zeitrahmen gemäss Betriebsöffnungszeiten:</p>
        <p>Frühester Dienstbeginn: <span className="font-mono font-semibold text-foreground">{earliestStart}</span> (2h vor Öffnung)</p>
        <p>Spätestes Dienstende: <span className="font-mono font-semibold text-foreground">{latestEnd}</span> (2h nach Schliessung)</p>
      </div>
    );
  };

  const CostCenterSelect = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <div className="space-y-1">
      <Label className="text-xs">Kostenstelle</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue placeholder="Wählen" /></SelectTrigger>
        <SelectContent>
          {COST_CENTERS.map(cc => (
            <SelectItem key={cc} value={cc}>{cc}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <div className="space-y-4 pb-20 md:pb-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold">Dienste</h1>
        <Button onClick={() => setShowAdd(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Neuer Dienst
        </Button>
      </div>

      <TimeConstraintInfo />

      {showAdd && (
        <Card>
          <CardHeader><CardTitle className="text-base">Neuer Dienst</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Name</Label>
                <Input value={newShift.name} onChange={e => setNewShift(p => ({ ...p, name: e.target.value }))} placeholder="z.B. Frühdienst Küche" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Kürzel</Label>
                <Input value={newShift.short_code} onChange={e => setNewShift(p => ({ ...p, short_code: e.target.value }))} placeholder="z.B. F" maxLength={3} />
              </div>
              <CostCenterSelect value={newShift.cost_center} onChange={v => setNewShift(p => ({ ...p, cost_center: v }))} />
              <div className="space-y-1">
                <Label className="text-xs">Farbe</Label>
                <Input type="color" value={newShift.color} onChange={e => setNewShift(p => ({ ...p, color: e.target.value }))} className="h-10 p-1" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Von {earliestStart && <span className="text-muted-foreground">(ab {earliestStart})</span>}</Label>
                <Input type="time" value={newShift.start_time} onChange={e => setNewShift(p => ({ ...p, start_time: e.target.value }))}
                  min={earliestStart || undefined} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Bis {latestEnd && <span className="text-muted-foreground">(bis {latestEnd})</span>}</Label>
                <Input type="time" value={newShift.end_time} onChange={e => setNewShift(p => ({ ...p, end_time: e.target.value }))}
                  max={latestEnd || undefined} />
              </div>
            </div>
            {validateShiftTime(newShift.start_time || null, newShift.end_time || null) && (
              <div className="flex items-center gap-2 text-sm text-warning">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {validateShiftTime(newShift.start_time || null, newShift.end_time || null)}
              </div>
            )}
            <div className="flex gap-2">
              <Button onClick={addShift} className="gap-2"><Save className="h-4 w-4" /> Speichern</Button>
              <Button variant="outline" onClick={() => setShowAdd(false)}><X className="h-4 w-4" /></Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Grouped by Kostenstelle */}
      <div className="space-y-3">
        {grouped.map(group => (
          <Collapsible
            key={group.costCenter}
            open={openSections[group.costCenter] ?? true}
            onOpenChange={() => toggleSection(group.costCenter)}
          >
            <CollapsibleTrigger asChild>
              <button className="flex w-full items-center gap-2 rounded-lg border border-border bg-muted/50 px-4 py-2.5 text-left hover:bg-muted transition-colors">
                {openSections[group.costCenter] ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
                <span className="font-heading font-semibold text-sm">{group.costCenter}</span>
                <Badge variant="secondary" className="ml-auto text-xs">{group.shifts.length}</Badge>
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="grid gap-2 mt-2 pl-2">
                {group.shifts.map(shift => {
                  const warning = getShiftWarning(shift);
                  return (
                    <Card key={shift.id} className={warning ? 'border-warning/50' : ''}>
                      <CardContent className="flex items-center justify-between py-3 px-4">
                        {editingId === shift.id ? (
                          <div className="flex-1 space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <Label className="text-xs">Name</Label>
                                <Input value={editForm.name || ''} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Kürzel</Label>
                                <Input value={editForm.short_code || ''} onChange={e => setEditForm(p => ({ ...p, short_code: e.target.value }))} maxLength={3} />
                              </div>
                              <CostCenterSelect value={editForm.cost_center || ''} onChange={v => setEditForm(p => ({ ...p, cost_center: v }))} />
                              <div className="space-y-1">
                                <Label className="text-xs">Farbe</Label>
                                <Input type="color" value={editForm.color || '#3b82f6'} onChange={e => setEditForm(p => ({ ...p, color: e.target.value }))} className="h-10 p-1" />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Von {earliestStart && <span className="text-muted-foreground">(ab {earliestStart})</span>}</Label>
                                <Input type="time" value={editForm.start_time || ''} onChange={e => setEditForm(p => ({ ...p, start_time: e.target.value }))}
                                  min={earliestStart || undefined} />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Bis {latestEnd && <span className="text-muted-foreground">(bis {latestEnd})</span>}</Label>
                                <Input type="time" value={editForm.end_time || ''} onChange={e => setEditForm(p => ({ ...p, end_time: e.target.value }))}
                                  max={latestEnd || undefined} />
                              </div>
                            </div>
                            {validateShiftTime(editForm.start_time || null, editForm.end_time || null) && (
                              <div className="flex items-center gap-2 text-sm text-warning">
                                <AlertTriangle className="h-4 w-4 shrink-0" />
                                {validateShiftTime(editForm.start_time || null, editForm.end_time || null)}
                              </div>
                            )}
                            <div className="flex gap-2">
                              <Button size="sm" onClick={saveEdit} className="gap-1"><Save className="h-3 w-3" /> Speichern</Button>
                              <Button size="sm" variant="outline" onClick={() => setEditingId(null)}><X className="h-3 w-3" /></Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg font-heading font-bold text-white" style={{ backgroundColor: shift.color }}>
                                {shift.short_code}
                              </div>
                              <div>
                                <p className="font-medium">{shift.name}</p>
                                {shift.start_time && shift.end_time && (
                                  <p className="text-xs text-muted-foreground">{shift.start_time.slice(0, 5)} – {shift.end_time.slice(0, 5)}</p>
                                )}
                                {warning && (
                                  <div className="flex items-center gap-1 text-xs text-warning mt-0.5">
                                    <AlertTriangle className="h-3 w-3" />
                                    {warning}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <Button size="icon" variant="ghost" onClick={() => startEdit(shift)}><Pencil className="h-4 w-4" /></Button>
                              <Button size="icon" variant="ghost" onClick={() => deleteShift(shift.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>

      {/* Shift Plan Config Matrix */}
      <ShiftPlanConfig shifts={shifts} />
    </div>
  );
}
