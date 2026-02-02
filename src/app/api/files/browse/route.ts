import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { requireAdmin } from '@/lib/auth/session';
import { getDataRoot } from '@/lib/data-root';

export type BrowseEntry = {
  name: string;
  type: 'dir' | 'file';
  size?: number;
  mtime?: string;
};

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const root = getDataRoot();
    const searchParams = request.nextUrl.searchParams;
    const rel = searchParams.get('path') ?? '';
    const decoded = decodeURIComponent(rel).replace(/\\/g, '/');
    const normalized = path.normalize(decoded).replace(/^\//, '');
    const dirPath = path.join(root, normalized);

    const relativeResolved = path.relative(
      root,
      path.resolve(root, normalized)
    );
    if (
      relativeResolved.startsWith('..') ||
      path.isAbsolute(relativeResolved)
    ) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }

    const stat = await fs.stat(dirPath).catch(() => null);
    if (!stat || !stat.isDirectory()) {
      return NextResponse.json({ error: 'Not a directory' }, { status: 400 });
    }

    const names = await fs.readdir(dirPath);
    const entries: BrowseEntry[] = [];

    for (const name of names) {
      const fullPath = path.join(dirPath, name);
      try {
        const s = await fs.stat(fullPath);
        if (s.isDirectory()) {
          entries.push({
            name,
            type: 'dir',
            mtime: s.mtime.toISOString(),
          });
        } else {
          entries.push({
            name,
            type: 'file',
            size: s.size,
            mtime: s.mtime.toISOString(),
          });
        }
      } catch {
        // skip inaccessible
      }
    }

    entries.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });

    return NextResponse.json({
      path: normalized || '.',
      entries,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Forbidden')) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Browse error:', error);
    return NextResponse.json(
      { error: 'Failed to list directory' },
      { status: 500 }
    );
  }
}
