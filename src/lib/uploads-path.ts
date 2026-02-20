import { promises as fs } from 'fs';
import path from 'path';

function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

function toSafeSegments(pathSegments: string[]): string[] {
  return pathSegments
    .map((segment) => decodeSegment(segment).replace(/\\/g, '/'))
    .flatMap((segment) => segment.split('/'))
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0 && segment !== '.' && segment !== '..');
}

function isWithinRoot(candidatePath: string, rootPath: string): boolean {
  const relative = path.relative(rootPath, candidatePath);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

/**
 * Resolve path under uploads root, with case-insensitive fallback per segment.
 * Useful for Linux deployments where imported config/file names may differ in letter case.
 */
export async function resolveExistingUploadPath(
  uploadsRoot: string,
  pathSegments: string[]
): Promise<string | null> {
  const resolvedRoot = path.resolve(uploadsRoot);
  const safeSegments = toSafeSegments(pathSegments);
  let current = resolvedRoot;

  for (const segment of safeSegments) {
    const exactPath = path.join(current, segment);
    const resolvedExactPath = path.resolve(exactPath);
    if (!isWithinRoot(resolvedExactPath, resolvedRoot)) {
      return null;
    }

    try {
      await fs.access(exactPath);
      current = exactPath;
      continue;
    } catch {
      // try case-insensitive match in current directory
    }

    let entries: string[];
    try {
      entries = await fs.readdir(current);
    } catch {
      return null;
    }

    const matchedEntry = entries.find(
      (entry) => entry.toLowerCase() === segment.toLowerCase()
    );
    if (!matchedEntry) {
      return null;
    }

    current = path.join(current, matchedEntry);
  }

  const resolvedCurrent = path.resolve(current);
  if (!isWithinRoot(resolvedCurrent, resolvedRoot)) {
    return null;
  }

  return resolvedCurrent;
}
