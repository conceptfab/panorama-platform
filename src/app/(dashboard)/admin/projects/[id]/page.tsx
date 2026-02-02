import { redirect, notFound } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { getProjectById, getProjectConfig } from '@/lib/db/projects';
import { ProjectEditForm } from '@/components/admin/ProjectEditForm';
import { FileUploader } from '@/components/admin/FileUploader';
import { PanoramaList } from '@/components/editor/PanoramaList';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectEditPage({ params }: PageProps) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    redirect('/');
  }

  const { id } = await params;
  const project = await getProjectById(id);
  if (!project) {
    notFound();
  }

  const config = await getProjectConfig(id);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <ProjectEditForm project={project} />

      <FileUploader projectId={id} />

      {config && config.panoramas.length > 0 && (
        <PanoramaList
          projectId={id}
          panoramas={config.panoramas}
        />
      )}
    </div>
  );
}
