import { promises as fs } from 'fs';
import { existsSync } from 'fs';
import path from 'path';
import {
  readJsonFileWithDefault,
  writeJsonFile,
  ensureDir,
  deleteDir,
} from './json-store';
import { getDataRoot } from '@/lib/data-root';
import { Project, ProjectsData, ProjectConfig } from '@/types';
import { generateId, formatDate, projectSlugFromName } from '@/utils/helpers';
import { projectsDataSchema, projectConfigSchema } from '@/utils/validation';
import { syncGroupsProjectIdsFromProjects } from './sync-groups-projects';

const PROJECTS_FILE = 'projects.json';
const UPLOADS_DIR = path.join(getDataRoot(), 'uploads', 'projects');

export async function getProjects(): Promise<Project[]> {
  const data = await readJsonFileWithDefault<ProjectsData>(PROJECTS_FILE, {
    projects: [],
  });
  const validated = projectsDataSchema.parse(data);
  return validated.projects;
}

/**
 * Lista projektów budowana z dysku przy każdym odświeżeniu.
 * Czyta katalog uploads/projects/, dla każdego podkatalogu szuka wpisu w projects.json.
 */
export async function getProjectsWithExistingFolders(): Promise<Project[]> {
  let dirIds: string[];
  try {
    const entries = await fs.readdir(UPLOADS_DIR, { withFileTypes: true });
    dirIds = entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    dirIds = [];
  }
  const projects = await getProjects();
  const byId = new Map(projects.map((p) => [p.id, p]));
  return dirIds
    .map((id) => byId.get(id))
    .filter((p): p is Project => p != null);
}

export async function getProjectById(id: string): Promise<Project | null> {
  const projects = await getProjects();
  const project = projects.find((p) => p.id === id) || null;
  if (!project) return null;
  if (!existsSync(path.join(UPLOADS_DIR, id))) return null;
  return project;
}

export async function getProjectsByGroupId(
  groupId: string
): Promise<Project[]> {
  const projects = await getProjects();
  return projects.filter((p) => p.groupIds.includes(groupId));
}

export async function getProjectsForUser(
  userGroupIds: string[]
): Promise<Project[]> {
  const projects = await getProjects();
  return projects.filter(
    (p) => p.isPublished && p.groupIds.some((gid) => userGroupIds.includes(gid))
  );
}

function ensureUniqueProjectSlug(
  existingIds: string[],
  baseSlug: string
): string {
  if (!existingIds.includes(baseSlug)) return baseSlug;
  let n = 2;
  while (existingIds.includes(`${baseSlug}-${n}`)) n++;
  return `${baseSlug}-${n}`;
}

export async function createProject(
  name: string,
  description: string,
  createdBy: string,
  groupIds: string[] = []
): Promise<Project> {
  const projects = await getProjects();
  const existingIds = projects.map((p) => p.id);
  const baseSlug = projectSlugFromName(name, description) || generateId('proj');
  const id = ensureUniqueProjectSlug(existingIds, baseSlug);
  const now = formatDate(new Date());

  const projectDir = path.join(UPLOADS_DIR, id);
  await ensureDir(projectDir);
  await ensureDir(path.join(projectDir, 'panoramas'));
  await ensureDir(path.join(projectDir, 'thumbnails'));

  const defaultConfig: ProjectConfig = {
    version: '1.0',
    projectName: name,
    description,
    createdAt: now,
    updatedAt: now,
    settings: {
      autoRotate: true,
      autoRotateSpeed: 0.5,
      autoRotateDelay: 30000,
      cameraFov: 55,
      controlBar: false,
      splashDuration: 3000,
      fadeDuration: 2000,
    },
    panoramas: [],
    metadata: {
      author: 'CONCEPTFAB',
      client: '',
      tags: [],
    },
  };

  const configPath = path.join(projectDir, 'config.json');
  await fs.writeFile(configPath, JSON.stringify(defaultConfig, null, 2));

  const newProject: Project = {
    id,
    name,
    description,
    thumbnailUrl: '',
    configPath: `/uploads/projects/${id}/config.json`,
    createdAt: now,
    updatedAt: now,
    createdBy,
    groupIds,
    isPublished: false,
    panoramaCount: 0,
  };

  projects.push(newProject);
  await writeJsonFile<ProjectsData>(PROJECTS_FILE, { projects });

  await syncGroupsProjectIdsFromProjects();
  return newProject;
}

export async function updateProject(
  id: string,
  updates: Partial<Omit<Project, 'id' | 'createdAt' | 'createdBy'>>,
  options?: { skipGroupSync?: boolean }
): Promise<Project | null> {
  const projects = await getProjects();
  const index = projects.findIndex((p) => p.id === id);

  if (index === -1) return null;

  projects[index] = {
    ...projects[index],
    ...updates,
    updatedAt: formatDate(new Date()),
  };

  await writeJsonFile<ProjectsData>(PROJECTS_FILE, { projects });

  if (updates.groupIds !== undefined && !options?.skipGroupSync) {
    await syncGroupsProjectIdsFromProjects();
  }
  return projects[index];
}

export async function deleteProject(id: string): Promise<boolean> {
  const projects = await getProjects();
  const index = projects.findIndex((p) => p.id === id);

  if (index === -1) return false;

  const projectDir = path.join(UPLOADS_DIR, id);
  if (existsSync(projectDir)) {
    await deleteDir(projectDir);
  }

  projects.splice(index, 1);
  await writeJsonFile<ProjectsData>(PROJECTS_FILE, { projects });

  await syncGroupsProjectIdsFromProjects();
  return true;
}

export async function getProjectConfig(
  id: string
): Promise<ProjectConfig | null> {
  const configPath = path.join(UPLOADS_DIR, id, 'config.json');
  try {
    const content = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(content);
    return projectConfigSchema.parse(config);
  } catch {
    return null;
  }
}

export async function updateProjectConfig(
  id: string,
  config: ProjectConfig
): Promise<boolean> {
  const configPath = path.join(UPLOADS_DIR, id, 'config.json');
  try {
    const validated = projectConfigSchema.parse(config);
    validated.updatedAt = formatDate(new Date());
    await fs.writeFile(configPath, JSON.stringify(validated, null, 2));

    // Set project thumbnail to first panorama's thumbnail
    let thumbnailUrl = '';
    if (validated.panoramas.length > 0 && validated.panoramas[0].thumbnail) {
      thumbnailUrl = `/uploads/projects/${id}/thumbnails/${validated.panoramas[0].thumbnail}`;
    }

    await updateProject(id, {
      name: validated.projectName,
      description: validated.description,
      panoramaCount: validated.panoramas.length,
      thumbnailUrl,
    });

    return true;
  } catch {
    return false;
  }
}

/**
 * Zwraca rozmiar katalogu projektu na dysku (w bajtach).
 * Zwraca 0, jeśli katalog nie istnieje lub wystąpi błąd.
 */
export async function getProjectSize(id: string): Promise<number> {
  const projectDir = path.join(UPLOADS_DIR, id);
  try {
    const entries = await fs.readdir(projectDir, { withFileTypes: true });
    let total = 0;
    for (const entry of entries) {
      const fullPath = path.join(projectDir, entry.name);
      if (entry.isDirectory()) {
        total += await getDirSize(fullPath);
      } else {
        const stat = await fs.stat(fullPath);
        total += stat.size;
      }
    }
    return total;
  } catch {
    return 0;
  }
}

async function getDirSize(dirPath: string): Promise<number> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  let total = 0;
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      total += await getDirSize(fullPath);
    } else {
      const stat = await fs.stat(fullPath);
      total += stat.size;
    }
  }
  return total;
}
