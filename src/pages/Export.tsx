import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { FileDown, FileText, FileSpreadsheet, Trash2, Download } from 'lucide-react';
import { formatHoursMinutes, formatTime, calculateMonthlyTargetHours, calculateHourlySurcharges } from '@/lib/lgav';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const monthNames = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

const absenceLabels: Record<string, string> = {
  vacation: 'Ferien', sick: 'Krankheit', accident: 'Unfall',
  holiday: 'Feiertag', military: 'Militär', other: 'Andere',
};

import { FileDropZone } from '@/components/FileDropZone';

export default function ExportPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [templates, setTemplates] = useState<any[]>([]);

  const loadTemplates = async () => {
    const { data } = await supabase
      .from('form_templates')
      .select('*')
      .order('created_at', { ascending: false });
    setTemplates(data || []);
  };

  useEffect(() => {
    supabase.from('employees').select('*').eq('is_active', true)
      .then(({ data }) => {
        setEmployees(data || []);
        if (data?.[0]) setSelectedEmployee(data[0].id);
      });
    loadTemplates();
  }, []);

  const exportCSV = async () => {
    const emp = employees.find(e => e.id === selectedEmployee);
    if (!emp) return;

    const startDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
    const endDate = new Date(selectedYear, selectedMonth, 0).toISOString().split('T')[0];

    const { data: entries } = await supabase
      .from('time_entries')
      .select('*')
      .eq('employee_id', selectedEmployee)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date');

    if (!entries || entries.length === 0) {
      toast.error('Keine Einträge für diesen Monat');
      return;
    }

    const totalWorked = entries.reduce((s, e) => s + (e.effective_hours || 0), 0);

    let csvContent = 'Datum;Typ;Von;Bis;Pause (Min);Effektiv (h);Status\n';
    entries.forEach(e => {
      if (e.absence_type) {
        csvContent += `${e.date};${absenceLabels[e.absence_type] || e.absence_type};;;;${e.absence_hours};${e.status}\n`;
      } else {
        csvContent += `${e.date};Arbeit;${e.clock_in ? formatTime(e.clock_in) : ''};${e.clock_out ? formatTime(e.clock_out) : ''};${e.break_minutes || 0};${e.effective_hours || 0};${e.status}\n`;
      }
    });

    csvContent += `\nTotal gearbeitet;;;;;;${totalWorked}\n`;

    if (emp.employee_type === 'fixed') {
      const target = calculateMonthlyTargetHours(emp.weekly_hours || 42, selectedYear, selectedMonth);
      csvContent += `Soll-Stunden;;;;;;${target}\n`;
      csvContent += `Überstunden;;;;;;${totalWorked - target}\n`;
    } else {
      const surcharges = calculateHourlySurcharges(totalWorked, emp.vacation_surcharge_percent, emp.holiday_surcharge_percent);
      csvContent += `Ferienzuschlag (${emp.vacation_surcharge_percent}%);;;;;;${surcharges.vacationSurcharge}\n`;
      csvContent += `Feiertagszuschlag (${emp.holiday_surcharge_percent}%);;;;;;${surcharges.holidaySurcharge}\n`;
      csvContent += `Total inkl. Zuschläge;;;;;;${surcharges.totalCompensation}\n`;
    }

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${emp.last_name}_${emp.first_name}_${selectedYear}-${String(selectedMonth).padStart(2, '0')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exportiert');
  };

  const exportPDF = async () => {
    const emp = employees.find(e => e.id === selectedEmployee);
    if (!emp) return;

    const startDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
    const endDate = new Date(selectedYear, selectedMonth, 0).toISOString().split('T')[0];

    const { data: entries } = await supabase
      .from('time_entries')
      .select('*')
      .eq('employee_id', selectedEmployee)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date');

    if (!entries || entries.length === 0) {
      toast.error('Keine Einträge');
      return;
    }

    const doc = new jsPDF();
    const totalWorked = entries.reduce((s, e) => s + (e.effective_hours || 0), 0);

    // Header
    doc.setFontSize(16);
    doc.text('Tages-/Stundenkontrolle', 14, 20);
    doc.setFontSize(10);
    doc.text(`${emp.first_name} ${emp.last_name}`, 14, 28);
    doc.text(`${monthNames[selectedMonth - 1]} ${selectedYear}`, 14, 34);
    doc.text(`Typ: ${emp.employee_type === 'fixed' ? 'Monatslohn' : 'Stundenlohn'}`, 14, 40);
    if (emp.employee_type === 'fixed') {
      doc.text(`Soll: ${emp.weekly_hours}h/Woche`, 120, 34);
    }

    // Table
    const rows = entries.map(e => {
      const dateStr = new Date(e.date).toLocaleDateString('de-CH', { weekday: 'short', day: '2-digit', month: '2-digit' });
      if (e.absence_type) {
        return [dateStr, absenceLabels[e.absence_type] || '', '', '', '', String(e.absence_hours || 0), e.status === 'approved' ? '✓' : '○'];
      }
      return [
        dateStr,
        'Arbeit',
        e.clock_in ? formatTime(e.clock_in) : '',
        e.clock_out ? formatTime(e.clock_out) : '',
        String(e.break_minutes || 0),
        String(e.effective_hours || 0),
        e.status === 'approved' ? '✓' : '○',
      ];
    });

    autoTable(doc, {
      startY: 46,
      head: [['Datum', 'Typ', 'Von', 'Bis', 'Pause', 'Stunden', 'Status']],
      body: rows,
      theme: 'grid',
      headStyles: { fillColor: [220, 38, 38] },
      styles: { fontSize: 8 },
    });

    // Summary
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(10);
    doc.text(`Total gearbeitet: ${formatHoursMinutes(totalWorked)}`, 14, finalY);

    if (emp.employee_type === 'fixed') {
      const target = calculateMonthlyTargetHours(emp.weekly_hours || 42, selectedYear, selectedMonth);
      const ot = totalWorked - target;
      doc.text(`Soll-Stunden: ${formatHoursMinutes(target)}`, 14, finalY + 6);
      doc.text(`Überstunden: ${ot > 0 ? '+' : ''}${formatHoursMinutes(ot)}`, 14, finalY + 12);
      doc.text(`Saldo-Übertrag: ${formatHoursMinutes((emp.overtime_balance_hours || 0) + ot)}`, 14, finalY + 18);
    } else {
      const s = calculateHourlySurcharges(totalWorked, emp.vacation_surcharge_percent, emp.holiday_surcharge_percent);
      doc.text(`Ferienzuschlag (${emp.vacation_surcharge_percent}%): ${formatHoursMinutes(s.vacationSurcharge)}`, 14, finalY + 6);
      doc.text(`Feiertagszuschlag (${emp.holiday_surcharge_percent}%): ${formatHoursMinutes(s.holidaySurcharge)}`, 14, finalY + 12);
      doc.text(`Total inkl. Zuschläge: ${formatHoursMinutes(s.totalCompensation)}`, 14, finalY + 18);
    }

    // Signature lines
    const sigY = finalY + 34;
    doc.text('Unterschrift Mitarbeiter:', 14, sigY);
    doc.line(14, sigY + 8, 90, sigY + 8);
    doc.text('Unterschrift Arbeitgeber:', 110, sigY);
    doc.line(110, sigY + 8, 196, sigY + 8);

    doc.save(`${emp.last_name}_${emp.first_name}_${selectedYear}-${String(selectedMonth).padStart(2, '0')}.pdf`);
    toast.success('PDF exportiert');
  };

  return (
    <div className="space-y-4 pb-20 md:pb-4">
      <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
        <FileDown className="h-6 w-6" />
        Export
      </h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Monatsexport erstellen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
            <SelectTrigger><SelectValue placeholder="Mitarbeiter wählen" /></SelectTrigger>
            <SelectContent>
              {employees.map(e => (
                <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex gap-3">
            <Select value={String(selectedMonth)} onValueChange={v => setSelectedMonth(parseInt(v))}>
              <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {monthNames.map((m, i) => (
                  <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(selectedYear)} onValueChange={v => setSelectedYear(parseInt(v))}>
              <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[2025, 2026, 2027].map(y => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button onClick={exportPDF} className="gap-2">
              <FileText className="h-4 w-4" />
              PDF
            </Button>
            <Button onClick={exportCSV} variant="outline" className="gap-2">
              <FileDown className="h-4 w-4" />
              CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Template Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">L-GAV Formular-Vorlagen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FileDropZone onUploaded={loadTemplates} />

          {/* Uploaded templates list */}
          {templates.length > 0 && (
            <div className="space-y-2 pt-2">
              <p className="text-sm font-medium text-muted-foreground">Hochgeladene Vorlagen</p>
              {templates.map(t => (
                <div key={t.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="h-5 w-5 text-success" />
                    <div>
                      <p className="text-sm font-medium">{t.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant={t.employee_type === 'fixed' ? 'default' : 'secondary'} className="text-xs">
                          {t.employee_type === 'fixed' ? 'Monatslohn' : 'Stundenlohn'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(t.created_at).toLocaleDateString('de-CH')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={async () => {
                        const { data } = await supabase.storage
                          .from('form-templates')
                          .createSignedUrl(t.file_path, 60);
                        if (data?.signedUrl) window.open(data.signedUrl, '_blank');
                      }}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={async () => {
                        await supabase.storage.from('form-templates').remove([t.file_path]);
                        await supabase.from('form_templates').delete().eq('id', t.id);
                        toast.success('Vorlage gelöscht');
                        loadTemplates();
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
