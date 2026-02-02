'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Project } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Download,
  Trash2,
  Archive,
  Upload,
  FolderOpen,
  Image as ImageIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatFileSize } from '@/utils/helpers';

interface ProjectWithSize extends Project {
  size?: number;
}

interface FileManagerProps {
  projects: ProjectWithSize[];
}

export function FileManager({ projects: initialProjects }: FileManagerProps) {
  const router = useRouter();
  const [projects, setProjects] = useState(initialProjects);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);

  useEffect(() => {
    setProjects(initialProjects);
  }, [initialProjects]);

  const visibleProjects = projects.filter((p) => !deletedIds.includes(p.id));
  const [deleting, setDeleting] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadFilesDialogOpen, setUploadFilesDialogOpen] = useState(false);
  const [uploadFilesProjectId, setUploadFilesProjectId] = useState<string>('');
  const [uploadFilesList, setUploadFilesList] = useState<FileList | null>(null);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  const handleDelete = async (project: Project) => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Błąd usuwania');
      }
      setDeletedIds((prev) => [...prev, project.id]);
      setDeleteTarget(null);
      toast.success(`Projekt „${project.name}” został usunięty`);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : 'Nie udało się usunąć projektu'
      );
    } finally {
      setDeleting(false);
    }
  };

  const handleBackup = () => {
    window.open('/api/files/backup', '_blank', 'noopener,noreferrer');
    toast.success('Pobieranie kopii zapasowej…');
  };

  const handleDownload = (project: ProjectWithSize) => {
    window.open(
      `/api/files/projects/${project.id}/download`,
      '_blank',
      'noopener,noreferrer'
    );
    toast.success(`Pobieranie „${project.name}”…`);
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
        `Projekt „${data.project?.name ?? '?'}” został zaimportowany`
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

  const handleUploadFilesToProject = async () => {
    if (!uploadFilesProjectId || !uploadFilesList?.length) {
      toast.error('Wybierz projekt i pliki');
      return;
    }
    setUploadingFiles(true);
    try {
      const formData = new FormData();
      formData.append('projectId', uploadFilesProjectId);
      for (let i = 0; i < uploadFilesList.length; i++) {
        formData.append('files', uploadFilesList[i]);
      }
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Błąd wgrywania');
      }
      toast.success(`Dodano ${data.uploadedFiles?.length ?? 0} panoram`);
      setUploadFilesDialogOpen(false);
      setUploadFilesProjectId('');
      setUploadFilesList(null);
      router.refresh();
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : 'Nie udało się wgrać plików'
      );
    } finally {
      setUploadingFiles(false);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={handleBackup} className="gap-2">
            <Archive className="h-4 w-4" />
            Backup projektów
          </Button>
          <Button
            variant="outline"
            onClick={() => setUploadDialogOpen(true)}
            className="gap-2"
          >
            <Upload className="h-4 w-4" />
            Wgraj gotowy projekt (ZIP)
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setUploadFilesProjectId(visibleProjects[0]?.id ?? '');
              setUploadFilesList(null);
              setUploadFilesDialogOpen(true);
            }}
            className="gap-2"
            disabled={visibleProjects.length === 0}
          >
            <ImageIcon className="h-4 w-4" />
            Wgraj panoramy do projektu
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Projekty ({visibleProjects.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {visibleProjects.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed rounded-lg text-muted-foreground">
                <FolderOpen className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Brak projektów</p>
                <p className="text-sm mt-1">
                  Utwórz projekt w zakładce Projekty lub wgraj gotowy projekt
                  (ZIP).
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nazwa</TableHead>
                    <TableHead>Panoramy</TableHead>
                    <TableHead>Rozmiar</TableHead>
                    <TableHead>Zaktualizowano</TableHead>
                    <TableHead className="w-[180px]">Akcje</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleProjects.map((project) => (
                    <TableRow key={project.id}>
                      <TableCell className="font-medium">
                        {project.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {project.panoramaCount}
                      </TableCell>
                      <TableCell className="text-muted-foreground tabular-nums">
                        {formatFileSize(project.size ?? 0)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(project.updatedAt).toLocaleDateString(
                          'pl-PL'
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1 h-8"
                            onClick={() => handleDownload(project)}
                          >
                            <Download className="h-4 w-4" />
                            Pobierz
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1 h-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(project)}
                          >
                            <Trash2 className="h-4 w-4" />
                            Usuń
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog: potwierdzenie usunięcia */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Usunąć projekt?</DialogTitle>
          </DialogHeader>
          {deleteTarget && (
            <p className="text-sm text-muted-foreground">
              Projekt „{deleteTarget.name}” i wszystkie powiązane pliki zostaną
              trwale usunięte.
            </p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              Anuluj
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
              disabled={deleting}
            >
              {deleting ? 'Usuwanie…' : 'Usuń'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: wgraj gotowy projekt (ZIP) */}
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

      {/* Dialog: wgraj panoramy do projektu */}
      <Dialog
        open={uploadFilesDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setUploadFilesDialogOpen(false);
            setUploadFilesProjectId('');
            setUploadFilesList(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Wgraj panoramy do projektu</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Wybierz projekt i pliki obrazów (panoramy ~2:1, np.
            equirectangular). Dozwolone: JPEG, PNG, WebP (max 50 MB).
          </p>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Projekt</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={uploadFilesProjectId}
                onChange={(e) => setUploadFilesProjectId(e.target.value)}
              >
                <option value="">— wybierz —</option>
                {visibleProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Pliki</Label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-secondary file:text-secondary-foreground"
                onChange={(e) => setUploadFilesList(e.target.files ?? null)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setUploadFilesDialogOpen(false);
                setUploadFilesProjectId('');
                setUploadFilesList(null);
              }}
              disabled={uploadingFiles}
            >
              Anuluj
            </Button>
            <Button
              onClick={handleUploadFilesToProject}
              disabled={
                !uploadFilesProjectId ||
                !uploadFilesList?.length ||
                uploadingFiles
              }
            >
              {uploadingFiles ? 'Wgrywanie…' : 'Wgraj'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
