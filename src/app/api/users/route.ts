import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/session';
import { getUsers } from '@/lib/db/users';

export async function GET() {
  try {
    await requireAdmin();
    const users = await getUsers();
    return NextResponse.json({ users });
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
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
