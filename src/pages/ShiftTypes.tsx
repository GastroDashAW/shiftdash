import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Pencil, Trash2, Plus, Save, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface ShiftType {
  id: string;
  name: string;
  short_code: string;
  color: string;
  start_time: string | null;
  end_time: string | null;
  sort_order: number;
}

export default function ShiftTypes() {
  const [shifts, setShifts] = useState<ShiftType[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<ShiftType>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [newShift, setNewShift] = useState({ name: '', short_code: '', color: '#3b82f6', start_time: '', end_time: '' });

  const loadShifts = async () => {
    const { data } = await supabase.from('shift_types').select('*').order('sort_order');
    setShifts(data || []);
  };

  useEffect(() => { loadShifts(); }, []);

  const startEdit = (shift: ShiftType) => {
    setEditingId(shift.id);
    setEditForm({ ...shift });
  };

  const saveEdit = async () => {
    if (!editingId || !editForm.name || !editForm.short_code) return;
    const { error } = await supabase.from('shift_types').update({
      name: editForm.name,
      short_code: editForm.short_code,
      color: editForm.color,
      start_time: editForm.start_time || null,
      end_time: editForm.end_time || null,
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
    const maxOrder = shifts.reduce((max, s) => Math.max(max, s.sort_order), 0);
    const { error } = await supabase.from('shift_types').insert({
      name: newShift.name,
      short_code: newShift.short_code,
      color: newShift.color,
      start_time: newShift.start_time || null,
      end_time: newShift.end_time || null,
      sort_order: maxOrder + 1,
    });
    if (error) { toast.error('Fehler beim Erstellen'); return; }
    toast.success('Dienst erstellt');
    setNewShift({ name: '', short_code: '', color: '#3b82f6', start_time: '', end_time: '' });
    setShowAdd(false);
    loadShifts();
  };

  return (
    <div className="space-y-4 pb-20 md:pb-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold">Dienste</h1>
        <Button onClick={() => setShowAdd(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Neuer Dienst
        </Button>
      </div>

      {showAdd && (
        <Card>
          <CardHeader><CardTitle className="text-base">Neuer Dienst</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Name</Label>
                <Input value={newShift.name} onChange={e => setNewShift(p => ({ ...p, name: e.target.value }))} placeholder="z.B. Frühdienst" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Kürzel</Label>
                <Input value={newShift.short_code} onChange={e => setNewShift(p => ({ ...p, short_code: e.target.value }))} placeholder="z.B. F" maxLength={3} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Von</Label>
                <Input type="time" value={newShift.start_time} onChange={e => setNewShift(p => ({ ...p, start_time: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Bis</Label>
                <Input type="time" value={newShift.end_time} onChange={e => setNewShift(p => ({ ...p, end_time: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Farbe</Label>
                <Input type="color" value={newShift.color} onChange={e => setNewShift(p => ({ ...p, color: e.target.value }))} className="h-10 p-1" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={addShift} className="gap-2"><Save className="h-4 w-4" /> Speichern</Button>
              <Button variant="outline" onClick={() => setShowAdd(false)}><X className="h-4 w-4" /></Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3">
        {shifts.map(shift => (
          <Card key={shift.id}>
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
                    <div className="space-y-1">
                      <Label className="text-xs">Von</Label>
                      <Input type="time" value={editForm.start_time || ''} onChange={e => setEditForm(p => ({ ...p, start_time: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Bis</Label>
                      <Input type="time" value={editForm.end_time || ''} onChange={e => setEditForm(p => ({ ...p, end_time: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Farbe</Label>
                      <Input type="color" value={editForm.color || '#3b82f6'} onChange={e => setEditForm(p => ({ ...p, color: e.target.value }))} className="h-10 p-1" />
                    </div>
                  </div>
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
        ))}
      </div>
    </div>
  );
}
