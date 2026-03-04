import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Upload, FileSpreadsheet, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';

interface EmployeeImportDropZoneProps {
  onImported: () => void;
}

interface ParsedEmployee {
  first_name: string;
  last_name: string;
  employee_type: 'fixed' | 'hourly';
  weekly_hours?: number;
  hourly_rate?: number;
  vacation_days_per_year?: number;
  vacation_surcharge_percent?: number;
  valid: boolean;
  error?: string;
}

// Map common German/English column headers to our fields
const COLUMN_MAP: Record<string, string> = {
  vorname: 'first_name',
  'first name': 'first_name',
  firstname: 'first_name',
  first_name: 'first_name',
  nachname: 'last_name',
  'last name': 'last_name',
  lastname: 'last_name',
  last_name: 'last_name',
  name: 'last_name',
  typ: 'employee_type',
  type: 'employee_type',
  anstellungstyp: 'employee_type',
  employee_type: 'employee_type',
  'stunden/woche': 'weekly_hours',
  'stunden pro woche': 'weekly_hours',
  weekly_hours: 'weekly_hours',
  wochenstunden: 'weekly_hours',
  stundenlohn: 'hourly_rate',
  hourly_rate: 'hourly_rate',
  'lohn/h': 'hourly_rate',
  ferientage: 'vacation_days_per_year',
  vacation_days: 'vacation_days_per_year',
  vacation_days_per_year: 'vacation_days_per_year',
  ferienzuschlag: 'vacation_surcharge_percent',
  vacation_surcharge: 'vacation_surcharge_percent',
  vacation_surcharge_percent: 'vacation_surcharge_percent',
};

function normalizeHeader(header: string): string {
  return COLUMN_MAP[header.toLowerCase().trim()] || header.toLowerCase().trim();
}

function parseEmployeeType(val: any): 'fixed' | 'hourly' {
  const s = String(val).toLowerCase().trim();
  if (['hourly', 'stundenlohn', 'stunde', 'h'].includes(s)) return 'hourly';
  return 'fixed';
}

function parseRow(row: Record<string, any>): ParsedEmployee {
  const mapped: Record<string, any> = {};
  for (const [key, value] of Object.entries(row)) {
    mapped[normalizeHeader(key)] = value;
  }

  const first_name = String(mapped.first_name || '').trim();
  const last_name = String(mapped.last_name || '').trim();

  if (!first_name && !last_name) {
    return { first_name: '', last_name: '', employee_type: 'fixed', valid: false, error: 'Name fehlt' };
  }

  const employee_type = parseEmployeeType(mapped.employee_type || 'fixed');
  const weekly_hours = parseFloat(mapped.weekly_hours) || 42;
  const hourly_rate = mapped.hourly_rate ? parseFloat(mapped.hourly_rate) : undefined;
  const vacation_days_per_year = parseInt(mapped.vacation_days_per_year) || 20;
  const vacation_surcharge_percent = parseFloat(mapped.vacation_surcharge_percent) || 8.33;

  return {
    first_name: first_name || last_name,
    last_name: last_name || first_name,
    employee_type,
    weekly_hours,
    hourly_rate,
    vacation_days_per_year,
    vacation_surcharge_percent,
    valid: true,
  };
}

export function EmployeeImportDropZone({ onImported }: EmployeeImportDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [parsed, setParsed] = useState<ParsedEmployee[] | null>(null);
  const [importing, setImporting] = useState(false);
  const [fileName, setFileName] = useState('');

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const processFile = async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext || '')) {
      toast.error('Nur Excel (.xlsx, .xls) oder CSV Dateien erlaubt');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Datei darf max. 5MB gross sein');
      return;
    }

    setFileName(file.name);

    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(ws);

      if (rows.length === 0) {
        toast.error('Keine Daten in der Datei gefunden');
        return;
      }

      const employees = rows.map(parseRow).filter(e => e.first_name || e.last_name);
      setParsed(employees);

      const validCount = employees.filter(e => e.valid).length;
      toast.info(`${validCount} von ${employees.length} Mitarbeitern erkannt`);
    } catch (err) {
      console.error('Parse error:', err);
      toast.error('Datei konnte nicht gelesen werden');
    }
  };

  const handleImport = async () => {
    if (!parsed) return;
    const valid = parsed.filter(e => e.valid);
    if (valid.length === 0) {
      toast.error('Keine gültigen Einträge zum Importieren');
      return;
    }

    setImporting(true);
    try {
      const payload = valid.map(({ valid: _, error: __, ...rest }) => ({
        first_name: rest.first_name,
        last_name: rest.last_name,
        employee_type: rest.employee_type,
        weekly_hours: rest.weekly_hours ?? 42,
        hourly_rate: rest.hourly_rate ?? null,
        vacation_days_per_year: rest.vacation_days_per_year ?? 20,
        vacation_surcharge_percent: rest.vacation_surcharge_percent ?? 8.33,
      }));

      const { error } = await supabase.from('employees').insert(payload);

      if (error) {
        toast.error('Import fehlgeschlagen: ' + error.message);
        return;
      }

      toast.success(`${valid.length} Mitarbeiter importiert!`);
      setParsed(null);
      setFileName('');
      onImported();
    } catch (err) {
      toast.error('Unerwarteter Fehler beim Import');
    } finally {
      setImporting(false);
    }
  };

  const reset = () => {
    setParsed(null);
    setFileName('');
  };

  if (parsed) {
    const validCount = parsed.filter(e => e.valid).length;
    const invalidCount = parsed.length - validCount;

    return (
      <Card>
        <CardContent className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              <span className="font-medium text-sm">{fileName}</span>
            </div>
            <Button size="icon" variant="ghost" onClick={reset}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex gap-2">
            <Badge variant="default" className="gap-1">
              <CheckCircle2 className="h-3 w-3" />
              {validCount} gültig
            </Badge>
            {invalidCount > 0 && (
              <Badge variant="destructive" className="gap-1">
                <AlertCircle className="h-3 w-3" />
                {invalidCount} fehlerhaft
              </Badge>
            )}
          </div>

          <div className="max-h-48 overflow-y-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Name</th>
                  <th className="px-3 py-2 text-left font-medium">Typ</th>
                  <th className="px-3 py-2 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {parsed.map((emp, i) => (
                  <tr key={i} className={cn('border-t', !emp.valid && 'bg-destructive/5')}>
                    <td className="px-3 py-2">{emp.first_name} {emp.last_name}</td>
                    <td className="px-3 py-2">
                      <Badge variant="outline" className="text-xs">
                        {emp.employee_type === 'fixed' ? 'Fix' : 'Stunde'}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">
                      {emp.valid ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <span className="text-xs text-destructive">{emp.error}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleImport} disabled={importing || validCount === 0} className="flex-1 gap-2">
              <Upload className="h-4 w-4" />
              {importing ? 'Importiere...' : `${validCount} Mitarbeiter importieren`}
            </Button>
            <Button variant="outline" onClick={reset}>Abbrechen</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => document.getElementById('emp-import-input')?.click()}
      className={cn(
        'relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 transition-all cursor-pointer',
        isDragging
          ? 'border-primary bg-primary/5 scale-[1.02]'
          : 'border-border hover:border-primary/50 hover:bg-muted/50'
      )}
    >
      <input
        id="emp-import-input"
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={handleFileSelect}
      />
      <Upload className={cn('h-8 w-8', isDragging ? 'text-primary' : 'text-muted-foreground')} />
      <div className="text-center">
        <p className="font-medium text-sm">
          {isDragging ? 'Datei hier ablegen' : 'Excel-Datei hierhin ziehen'}
        </p>
        <p className="text-xs text-muted-foreground">
          .xlsx, .xls oder .csv · Spalten: Vorname, Nachname, Typ, Stunden/Woche
        </p>
      </div>
    </div>
  );
}
