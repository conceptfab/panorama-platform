import { getGroups, updateGroup } from './groups';
import { getProjects, updateProject } from './projects';

/**
 * Po zmianie project.groupIds – przelicza group.projectIds dla wszystkich grup
 * (źródło prawdy: project.groupIds).
 */
export async function syncGroupsProjectIdsFromProjects(): Promise<void> {
  const [projects, groups] = await Promise.all([getProjects(), getGroups()]);

  for (const group of groups) {
    const projectIds = projects
      .filter((p) => p.groupIds.includes(group.id))
      .map((p) => p.id);
    await updateGroup(group.id, { projectIds });
  }
}

/**
 * Po zmianie group.projectIds – aktualizuje groupIds we wszystkich projektach,
 * tak aby były zgrane z listą projektów grupy.
 */
export async function syncGroupProjectIdsToProjects(
  groupId: string,
  projectIds: string[]
): Promise<void> {
  const projects = await getProjects();

  for (const project of projects) {
    const hasGroup = project.groupIds.includes(groupId);
    const shouldHaveGroup = projectIds.includes(project.id);

    if (hasGroup && !shouldHaveGroup) {
      await updateProject(
        project.id,
        { groupIds: project.groupIds.filter((id) => id !== groupId) },
        { skipGroupSync: true }
      );
    } else if (!hasGroup && shouldHaveGroup) {
      await updateProject(
        project.id,
        { groupIds: [...project.groupIds, groupId] },
        { skipGroupSync: true }
      );
    }
  }
}

/**
 * Po usunięciu grupy – usuwa groupId z groupIds we wszystkich projektach.
 */
export async function removeGroupFromAllProjects(
  groupId: string
): Promise<void> {
  const projects = await getProjects();

  for (const project of projects) {
    if (project.groupIds.includes(groupId)) {
      await updateProject(
        project.id,
        { groupIds: project.groupIds.filter((id) => id !== groupId) },
        { skipGroupSync: true }
      );
    }
  }
}
