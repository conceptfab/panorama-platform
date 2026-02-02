import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { getProjects, getProjectSize } from '@/lib/db/projects';
import { FileManager } from '@/components/admin/FileManager';
import { Project } from '@/types';

export default async function AdminFilesPage() {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    redirect('/');
  }

  const projects = await getProjects();
  const projectsWithSize: (Project & { size?: number })[] = await Promise.all(
    projects.map(async (p) => ({
      ...p,
      size: await getProjectSize(p.id),
    }))
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Pliki</h1>
        <p className="text-muted-foreground mt-1">
          Zarządzanie plikami, backup i import projektów
        </p>
      </div>

      <FileManager projects={projectsWithSize} />
    </div>
  );
}
