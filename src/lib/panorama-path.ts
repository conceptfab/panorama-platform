function normalizeSlashes(value: string): string {
  return value.replace(/\\/g, '/').trim();
}

function extractUploadsPath(value: string): string | null {
  if (value.startsWith('/uploads/')) return value;
  if (value.startsWith('uploads/')) return `/${value}`;

  const withLeadingSlash = value.indexOf('/uploads/');
  if (withLeadingSlash >= 0) {
    return value.slice(withLeadingSlash);
  }

  const withoutLeadingSlash = value.indexOf('uploads/');
  if (withoutLeadingSlash >= 0) {
    return `/${value.slice(withoutLeadingSlash)}`;
  }

  return null;
}

/**
 * Build a safe panorama image URL from config value.
 * Supports plain filenames, relative paths and absolute /uploads/... paths.
 */
export function buildPanoramaImagePath(basePath: string, file: string): string {
  const normalized = normalizeSlashes(file);
  if (!normalized) return `${basePath}/panoramas/`;

  if (/^https?:\/\//i.test(normalized)) {
    return normalized;
  }

  const uploadsPath = extractUploadsPath(normalized);
  if (uploadsPath) {
    return uploadsPath;
  }

  const fileName = normalized.split('/').filter(Boolean).pop() ?? normalized;
  return `${basePath}/panoramas/${fileName}`;
}
