import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Upload, FileSpreadsheet, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileDropZoneProps {
  onUploaded: () => void;
}

export function FileDropZone({ onUploaded }: FileDropZoneProps) {
  const { user } = useAuth();
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [employeeType, setEmployeeType] = useState<'fixed' | 'hourly'>('fixed');
  const [templateName, setTemplateName] = useState('');
  const [uploading, setUploading] = useState(false);

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

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      validateAndSetFile(droppedFile);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) validateAndSetFile(selected);
  };

  const validateAndSetFile = (f: File) => {
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
      'application/pdf',
    ];
    const ext = f.name.split('.').pop()?.toLowerCase();
    if (!validTypes.includes(f.type) && !['xlsx', 'xls', 'csv', 'pdf'].includes(ext || '')) {
      toast.error('Nur Excel (.xlsx, .xls), CSV oder PDF Dateien erlaubt');
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      toast.error('Datei darf max. 10MB gross sein');
      return;
    }
    setFile(f);
    if (!templateName) {
      setTemplateName(f.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const handleUpload = async () => {
    if (!file || !user) return;
    setUploading(true);

    try {
      const filePath = `${user.id}/${Date.now()}_${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from('form-templates')
        .upload(filePath, file);

      if (uploadError) {
        toast.error('Upload fehlgeschlagen. Bitte erneut versuchen.');
        return;
      }

      const { error: dbError } = await supabase
        .from('form_templates')
        .insert({
          name: templateName || file.name,
          file_path: filePath,
          employee_type: employeeType,
          uploaded_by: user.id,
        });

      if (dbError) {
        toast.error('Fehler beim Speichern. Bitte erneut versuchen.');
        return;
      }

      toast.success('Vorlage erfolgreich hochgeladen!');
      setFile(null);
      setTemplateName('');
      onUploaded();
    } catch (err) {
      toast.error('Unerwarteter Fehler');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 transition-all cursor-pointer',
          isDragging
            ? 'border-primary bg-primary/5 scale-[1.02]'
            : 'border-border hover:border-primary/50 hover:bg-muted/50',
          file && 'border-success bg-success/5'
        )}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <input
          id="file-input"
          type="file"
          accept=".xlsx,.xls,.csv,.pdf"
          className="hidden"
          onChange={handleFileSelect}
        />

        {file ? (
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="h-8 w-8 text-success" />
            <div>
              <p className="font-medium">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={(e) => { e.stopPropagation(); setFile(null); setTemplateName(''); }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <>
            <Upload className={cn('h-10 w-10', isDragging ? 'text-primary' : 'text-muted-foreground')} />
            <div className="text-center">
              <p className="font-medium">
                {isDragging ? 'Datei hier ablegen' : 'L-GAV Formular hierhin ziehen'}
              </p>
              <p className="text-sm text-muted-foreground">
                oder klicken zum Auswählen · Excel, CSV, PDF
              </p>
            </div>
          </>
        )}
      </div>

      {/* Metadata form */}
      {file && (
        <Card>
          <CardContent className="space-y-3 pt-4">
            <div className="space-y-2">
              <Label>Vorlagenname</Label>
              <Input
                value={templateName}
                onChange={e => setTemplateName(e.target.value)}
                placeholder="z.B. Stundenkontrolle 2026"
              />
            </div>
            <div className="space-y-2">
              <Label>Anstellungstyp</Label>
              <Select value={employeeType} onValueChange={(v) => setEmployeeType(v as 'fixed' | 'hourly')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixangestellt (Monatslohn)</SelectItem>
                  <SelectItem value="hourly">Stundenlohn</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleUpload} disabled={uploading} className="w-full gap-2">
              <Upload className="h-4 w-4" />
              {uploading ? 'Wird hochgeladen...' : 'Vorlage speichern'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
