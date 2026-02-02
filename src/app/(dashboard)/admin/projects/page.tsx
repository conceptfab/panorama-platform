import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { getProjectsWithExistingFolders, getProjectSize } from '@/lib/db/projects';
import { Button } from '@/components/ui/button';
import { ProjectCard } from '@/components/admin/ProjectCard';
import { FileManager } from '@/components/admin/FileManager';
import { Project } from '@/types';
import { Plus } from 'lucide-react';

export default async function AdminProjectsPage() {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    redirect('/');
  }

  const projects = await getProjectsWithExistingFolders();
  const projectsWithSize: (Project & { size?: number })[] = await Promise.all(
    projects.map(async (p) => ({
      ...p,
      size: await getProjectSize(p.id),
    }))
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Projekty</h1>
          <p className="text-muted-foreground mt-1">
            Zarządzaj projektami panoram
          </p>
        </div>
        <Link href="/admin/projects/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nowy projekt
          </Button>
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground">Brak projektów</p>
          <Link href="/admin/projects/new">
            <Button variant="outline" className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Utwórz pierwszy projekt
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}

      {/* Statystyki i operacje na danych – na dole strony Projekty */}
      <FileManager projects={projectsWithSize} />
    </div>
  );
}
