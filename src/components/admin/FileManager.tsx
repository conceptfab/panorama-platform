'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Project } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Archive,
  Upload,
  HardDrive,
  FolderOpen,
  Image as ImageIcon,
  Database,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatFileSize } from '@/utils/helpers';

interface ProjectWithSize extends Project {
  size?: number;
}

interface FileManagerProps {
  projects: ProjectWithSize[];
}

export function FileManager({ projects }: FileManagerProps) {
  const router = useRouter();
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Stats
  const totalSize = projects.reduce((sum, p) => sum + (p.size ?? 0), 0);
  const totalPanoramas = projects.reduce((sum, p) => sum + p.panoramaCount, 0);
  const projectCount = projects.length;

  const handleBackupAll = () => {
    window.open('/api/files/backup', '_blank', 'noopener,noreferrer');
    toast.success('Pobieranie kopii zapasowej wszystkich projektów…');
  };

  const handleUploadProject = async () => {
    if (!uploadFile) {
      toast.error('Wybierz plik ZIP');
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      const res = await fetch('/api/files/upload-project', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Błąd importu');
      }
      toast.success(
        `Projekt „${data.project?.name ?? '?'}" został zaimportowany`
      );
      setUploadDialogOpen(false);
      setUploadFile(null);
      router.refresh();
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : 'Nie udało się zaimportować projektu'
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      {/* Storage Stats – 3 kolumny: Projekty | Całkowity rozmiar | Panoramy */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projekty</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projectCount}</div>
            <p className="text-xs text-muted-foreground">
              Łączna liczba projektów
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Całkowity rozmiar
            </CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatFileSize(totalSize)}
            </div>
            <p className="text-xs text-muted-foreground">
              Wszystkie projekty i pliki
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Panoramy</CardTitle>
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPanoramas}</div>
            <p className="text-xs text-muted-foreground">
              Łączna liczba panoram
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Operacje na danych
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Backup All */}
            <div className="flex-1 p-4 border rounded-lg">
              <div className="flex items-start gap-3">
                <Archive className="h-8 w-8 text-blue-500 shrink-0" />
                <div className="flex-1">
                  <h3 className="font-medium">Backup wszystkich projektów</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Pobierz archiwum ZIP zawierające wszystkie projekty,
                    konfiguracje i pliki.
                  </p>
                  <Button
                    variant="outline"
                    className="mt-3 gap-2"
                    onClick={handleBackupAll}
                    disabled={projectCount === 0}
                  >
                    <Archive className="h-4 w-4" />
                    Pobierz backup ({formatFileSize(totalSize)})
                  </Button>
                </div>
              </div>
            </div>

            {/* Import Project */}
            <div className="flex-1 p-4 border rounded-lg">
              <div className="flex items-start gap-3">
                <Upload className="h-8 w-8 text-green-500 shrink-0" />
                <div className="flex-1">
                  <h3 className="font-medium">Importuj projekt z ZIP</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Wgraj archiwum ZIP z gotowym projektem (config.json,
                    panoramas/, thumbnails/).
                  </p>
                  <Button
                    variant="outline"
                    className="mt-3 gap-2"
                    onClick={() => setUploadDialogOpen(true)}
                  >
                    <Upload className="h-4 w-4" />
                    Wgraj projekt
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {projectCount === 0 && (
            <div className="text-center py-8 border-2 border-dashed rounded-lg text-muted-foreground">
              <FolderOpen className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Brak projektów</p>
              <p className="text-sm mt-1">
                Utwórz projekt w zakładce Projekty lub wgraj gotowy projekt
                (ZIP).
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog: Import ZIP */}
      <Dialog
        open={uploadDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setUploadDialogOpen(false);
            setUploadFile(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Wgraj gotowy projekt (ZIP)</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Archiwum ZIP musi zawierać w głównym katalogu:{' '}
            <code className="text-xs bg-muted px-1 rounded">config.json</code>,
            folder{' '}
            <code className="text-xs bg-muted px-1 rounded">panoramas</code>,
            folder{' '}
            <code className="text-xs bg-muted px-1 rounded">thumbnails</code>.
          </p>
          <div className="space-y-2">
            <Label>Plik ZIP</Label>
            <input
              type="file"
              accept=".zip"
              className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-secondary file:text-secondary-foreground"
              onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setUploadDialogOpen(false);
                setUploadFile(null);
              }}
              disabled={uploading}
            >
              Anuluj
            </Button>
            <Button
              onClick={handleUploadProject}
              disabled={!uploadFile || uploading}
            >
              {uploading ? 'Importowanie…' : 'Importuj'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
