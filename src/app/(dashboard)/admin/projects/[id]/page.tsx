import { redirect, notFound } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { getProjectById, getProjectConfig, getProjectSize } from '@/lib/db/projects';
import { getGroups } from '@/lib/db/groups';
import { ProjectEditForm } from '@/components/admin/ProjectEditForm';
import { FileUploader } from '@/components/admin/FileUploader';
import { PanoramaList } from '@/components/editor/PanoramaList';
import { ProjectDownloadCard } from '@/components/admin/ProjectDownloadCard';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectEditPage({ params }: PageProps) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    redirect('/');
  }

  const { id } = await params;
  const [project, config, groups, size] = await Promise.all([
    getProjectById(id),
    getProjectConfig(id),
    getGroups(),
    getProjectSize(id),
  ]);

  if (!project) {
    notFound();
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <ProjectEditForm project={project} groups={groups} />

      <FileUploader projectId={id} />

      {config && config.panoramas.length > 0 && (
        <PanoramaList projectId={id} panoramas={config.panoramas} />
      )}

      <ProjectDownloadCard project={project} size={size} />
    </div>
  );
}
