import { v4 as uuidv4 } from 'uuid';

export function generateId(prefix: string = ''): string {
  const id = uuidv4();
  return prefix ? `${prefix}-${id.slice(0, 8)}` : id;
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString();
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function matchEmailPattern(email: string, pattern: string): boolean {
  if (pattern === '*') return true;

  if (pattern.startsWith('*@')) {
    const domain = pattern.slice(2);
    return email.toLowerCase().endsWith(`@${domain.toLowerCase()}`);
  }

  if (pattern.includes('*')) {
    const regex = new RegExp(
      '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$',
      'i'
    );
    return regex.test(email);
  }

  return email.toLowerCase() === pattern.toLowerCase();
}

export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
}

export function isValidImageFormat(filename: string): boolean {
  const ext = getFileExtension(filename);
  return ['webp', 'jpg', 'jpeg', 'png'].includes(ext);
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
