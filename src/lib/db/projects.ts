import { promises as fs } from 'fs';
import path from 'path';
import { readJsonFile, writeJsonFile, ensureDir, deleteDir } from './json-store';
import { Project, ProjectsData, ProjectConfig } from '@/types';
import { generateId, formatDate } from '@/utils/helpers';
import { projectsDataSchema, projectConfigSchema } from '@/utils/validation';

const PROJECTS_FILE = 'projects.json';
const UPLOADS_DIR = path.join(process.cwd(), 'uploads', 'projects');

export async function getProjects(): Promise<Project[]> {
  const data = await readJsonFile<ProjectsData>(PROJECTS_FILE);
  const validated = projectsDataSchema.parse(data);
  return validated.projects;
}

export async function getProjectById(id: string): Promise<Project | null> {
  const projects = await getProjects();
  return projects.find((p) => p.id === id) || null;
}

export async function getProjectsByGroupId(groupId: string): Promise<Project[]> {
  const projects = await getProjects();
  return projects.filter((p) => p.groupIds.includes(groupId));
}

export async function getProjectsForUser(userGroupIds: string[]): Promise<Project[]> {
  const projects = await getProjects();
  return projects.filter(
    (p) =>
      p.isPublished && p.groupIds.some((gid) => userGroupIds.includes(gid))
  );
}

export async function createProject(
  name: string,
  description: string,
  createdBy: string,
  groupIds: string[] = []
): Promise<Project> {
  const projects = await getProjects();
  const id = generateId('proj');
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

  return newProject;
}

export async function updateProject(
  id: string,
  updates: Partial<Omit<Project, 'id' | 'createdAt' | 'createdBy'>>
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
  return projects[index];
}

export async function deleteProject(id: string): Promise<boolean> {
  const projects = await getProjects();
  const index = projects.findIndex((p) => p.id === id);

  if (index === -1) return false;

  const projectDir = path.join(UPLOADS_DIR, id);
  await deleteDir(projectDir);

  projects.splice(index, 1);
  await writeJsonFile<ProjectsData>(PROJECTS_FILE, { projects });

  return true;
}

export async function getProjectConfig(id: string): Promise<ProjectConfig | null> {
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

    await updateProject(id, {
      name: validated.projectName,
      description: validated.description,
      panoramaCount: validated.panoramas.length,
    });

    return true;
  } catch {
    return false;
  }
}
