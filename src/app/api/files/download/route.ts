import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { requireAdmin } from '@/lib/auth/session';
import { getDataRoot } from '@/lib/data-root';

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
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const name = path.basename(filePath);
    const buffer = await fs.readFile(filePath);

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(
          name
        )}"`,
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
    console.error('Download error:', error);
    return NextResponse.json(
      { error: 'Failed to download file' },
      { status: 500 }
    );
  }
}
