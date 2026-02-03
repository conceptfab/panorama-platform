import { getSession } from '@/lib/auth/session';
import { getProjects, getProjectsForUser } from '@/lib/db/projects';
import { getUserById } from '@/lib/db/users';
import { ProjectGrid } from '@/components/gallery/ProjectGrid';

export default async function GalleryPage() {
  const session = await getSession();
  if (!session) return null;

  let projects;
  if (session.role === 'admin') {
    projects = await getProjects();
  } else {
    const user = await getUserById(session.userId);
    if (!user) return null;
    projects = await getProjectsForUser(user.groupIds);
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-extralight">Galeria projektów</h1>
        <p className="text-muted-foreground mt-1">
          Wybierz projekt, aby rozpocząć przeglądanie panoram
        </p>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p>Brak dostępnych projektów</p>
          <p className="text-sm mt-2">
            Skontaktuj się z administratorem, aby uzyskać dostęp
          </p>
        </div>
      ) : (
        <ProjectGrid projects={projects} />
      )}
    </div>
  );
}
