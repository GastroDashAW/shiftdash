import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Upload, FileSpreadsheet, X, CheckCircle2, AlertCircle, Brain, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';

interface EmployeeImportDropZoneProps {
  onImported: () => void;
}

interface ParsedEmployee {
  first_name: string;
  last_name: string;
  employee_type: 'fixed' | 'hourly';
  cost_center?: string;
  position?: string;
  weekly_hours?: number;
  hourly_rate?: number;
  monthly_salary?: number;
  pensum_percent?: number;
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
  kostenstelle: 'cost_center',
  cost_center: 'cost_center',
  abteilung: 'cost_center',
  position: 'position',
  monatslohn: 'monthly_salary',
  monthly_salary: 'monthly_salary',
  pensum: 'pensum_percent',
  pensum_percent: 'pensum_percent',
};

const EXCEL_EXTENSIONS = ['xlsx', 'xls', 'csv'];
const DOCUMENT_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'docx', 'doc'];
const ALL_EXTENSIONS = [...EXCEL_EXTENSIONS, ...DOCUMENT_EXTENSIONS];

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

  return {
    first_name: first_name || last_name,
    last_name: last_name || first_name,
    employee_type,
    cost_center: mapped.cost_center ? String(mapped.cost_center).trim() : undefined,
    position: mapped.position ? String(mapped.position).trim() : undefined,
    weekly_hours: parseFloat(mapped.weekly_hours) || 42,
    hourly_rate: mapped.hourly_rate ? parseFloat(mapped.hourly_rate) : undefined,
    monthly_salary: mapped.monthly_salary ? parseFloat(mapped.monthly_salary) : undefined,
    pensum_percent: mapped.pensum_percent ? parseFloat(mapped.pensum_percent) : undefined,
    vacation_days_per_year: parseInt(mapped.vacation_days_per_year) || 20,
    vacation_surcharge_percent: parseFloat(mapped.vacation_surcharge_percent) || 8.33,
    valid: true,
  };
}

function aiResultToEmployee(emp: any): ParsedEmployee {
  const first_name = String(emp.first_name || '').trim();
  const last_name = String(emp.last_name || '').trim();

  if (!first_name && !last_name) {
    return { first_name: '', last_name: '', employee_type: 'fixed', valid: false, error: 'Name fehlt' };
  }

  return {
    first_name: first_name || last_name,
    last_name: last_name || first_name,
    employee_type: emp.employee_type === 'hourly' ? 'hourly' : 'fixed',
    cost_center: emp.cost_center || undefined,
    position: emp.position || undefined,
    weekly_hours: emp.weekly_hours || 42,
    hourly_rate: emp.hourly_rate || undefined,
    monthly_salary: emp.monthly_salary || undefined,
    pensum_percent: emp.pensum_percent || undefined,
    vacation_days_per_year: emp.vacation_days_per_year || 20,
    valid: true,
  };
}

export function EmployeeImportDropZone({ onImported }: EmployeeImportDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [parsed, setParsed] = useState<ParsedEmployee[] | null>(null);
  const [importing, setImporting] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [fileName, setFileName] = useState('');
  const [isAiParsed, setIsAiParsed] = useState(false);

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
    const ext = file.name.split('.').pop()?.toLowerCase() || '';

    if (!ALL_EXTENSIONS.includes(ext)) {
      toast.error('Erlaubte Formate: Excel, CSV, PDF, Bilder, Word');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Datei darf max. 10MB gross sein');
      return;
    }

    setFileName(file.name);

    if (EXCEL_EXTENSIONS.includes(ext)) {
      processExcel(file);
    } else {
      await processDocument(file);
    }
  };

  const processExcel = async (file: File) => {
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
      setIsAiParsed(false);

      const validCount = employees.filter(e => e.valid).length;
      toast.info(`${validCount} von ${employees.length} Mitarbeitern erkannt`);
    } catch (err) {
      console.error('Parse error:', err);
      toast.error('Datei konnte nicht gelesen werden');
    }
  };

  const processDocument = async (file: File) => {
    setParsing(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const { data, error } = await supabase.functions.invoke('parse-employee-document', {
        body: formData,
      });

      if (error) {
        toast.error('Dokumentenanalyse fehlgeschlagen: ' + error.message);
        setParsing(false);
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        setParsing(false);
        return;
      }

      const employees: ParsedEmployee[] = (data?.employees || []).map(aiResultToEmployee);

      if (employees.length === 0) {
        toast.warning('Keine Mitarbeiterdaten im Dokument erkannt');
        setParsing(false);
        return;
      }

      setParsed(employees);
      setIsAiParsed(true);

      const validCount = employees.filter(e => e.valid).length;
      toast.success(`${validCount} Mitarbeiter per AI erkannt`);
    } catch (err: any) {
      console.error('Document parse error:', err);
      toast.error('Dokumentenanalyse fehlgeschlagen');
    }
    setParsing(false);
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
        cost_center: rest.cost_center || '',
        position: rest.position || '',
        weekly_hours: rest.weekly_hours ?? 42,
        monthly_salary: rest.monthly_salary ?? null,
        hourly_rate: rest.hourly_rate ?? null,
        pensum_percent: rest.pensum_percent ?? 100,
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
      setIsAiParsed(false);
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
    setIsAiParsed(false);
  };

  if (parsing) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-8">
          <Brain className="h-8 w-8 text-primary animate-pulse" />
          <p className="font-medium text-sm">Dokument wird per AI analysiert…</p>
          <p className="text-xs text-muted-foreground">Mitarbeiterdaten werden automatisch extrahiert</p>
        </CardContent>
      </Card>
    );
  }

  if (parsed) {
    const validCount = parsed.filter(e => e.valid).length;
    const invalidCount = parsed.length - validCount;

    return (
      <Card>
        <CardContent className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isAiParsed ? (
                <Brain className="h-5 w-5 text-primary" />
              ) : (
                <FileSpreadsheet className="h-5 w-5 text-primary" />
              )}
              <span className="font-medium text-sm">{fileName}</span>
              {isAiParsed && (
                <Badge variant="secondary" className="text-[10px] gap-1">
                  <Brain className="h-2.5 w-2.5" /> AI
                </Badge>
              )}
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
                  <th className="px-3 py-2 text-left font-medium">Kostenstelle</th>
                  <th className="px-3 py-2 text-left font-medium">Position</th>
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
                    <td className="px-3 py-2 text-xs text-muted-foreground">{emp.cost_center || '–'}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{emp.position || '–'}</td>
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
        accept=".xlsx,.xls,.csv,.pdf,.jpg,.jpeg,.png,.webp,.docx,.doc"
        className="hidden"
        onChange={handleFileSelect}
      />
      <div className="flex items-center gap-3">
        <Upload className={cn('h-7 w-7', isDragging ? 'text-primary' : 'text-muted-foreground')} />
        <Brain className={cn('h-6 w-6', isDragging ? 'text-primary' : 'text-muted-foreground/60')} />
      </div>
      <div className="text-center">
        <p className="font-medium text-sm">
          {isDragging ? 'Datei hier ablegen' : 'Dokument hierhin ziehen'}
        </p>
        <p className="text-xs text-muted-foreground">
          Excel, CSV, PDF, Bilder oder Word · AI erkennt Mitarbeiterdaten automatisch
        </p>
      </div>
    </div>
  );
}
