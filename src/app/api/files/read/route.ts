import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { requireAdmin } from '@/lib/auth/session';
import { getDataRoot } from '@/lib/data-root';

const TEXT_EXT = new Set([
  'json',
  'txt',
  'md',
  'html',
  'css',
  'js',
  'ts',
  'tsx',
  'jsx',
  'xml',
  'yaml',
  'yml',
  'env',
  'log',
  'csv',
]);

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const root = getDataRoot();
    const rel = request.nextUrl.searchParams.get('path') ?? '';
    const decoded = decodeURIComponent(rel).replace(/\\/g, '/');
    const normalized = path.normalize(decoded).replace(/^\//, '');
    const filePath = path.join(root, normalized);

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

    const stat = await fs.stat(filePath).catch(() => null);
    if (!stat || !stat.isFile()) {
      return NextResponse.json({ error: 'Not a file' }, { status: 400 });
    }

    const ext = path.extname(filePath).slice(1).toLowerCase();
    if (!TEXT_EXT.has(ext)) {
      return NextResponse.json(
        { error: 'File type not previewable' },
        { status: 400 }
      );
    }

    const content = await fs.readFile(filePath, 'utf-8');
    const contentType = ext === 'json' ? 'application/json' : 'text/plain';

    return new NextResponse(content, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'no-store',
      },
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
    console.error('Read file error:', error);
    return NextResponse.json({ error: 'Failed to read file' }, { status: 500 });
  }
}
