import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/auth/session';
import { Button } from '@/components/ui/button';
import { ShieldX } from 'lucide-react';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  if (session.role !== 'admin') {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
        <ShieldX className="h-16 w-16 text-amber-500 mb-4" />
        <h1 className="text-2xl font-bold text-center mb-2">
          Brak uprawnień
        </h1>
        <p className="text-muted-foreground text-center mb-6 max-w-md">
          Nie masz uprawnień administratora. Panel admina jest dostępny tylko
          dla użytkowników z rolą admin.
        </p>
        <Button asChild>
          <Link href="/gallery">Przejdź do galerii</Link>
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
