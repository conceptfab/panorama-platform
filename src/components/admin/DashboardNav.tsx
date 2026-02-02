'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  LayoutGrid,
  FolderOpen,
  Users,
  Tags,
  FileText,
  LogOut,
  Menu,
} from 'lucide-react';

interface DashboardNavProps {
  userRole: 'admin' | 'user';
  userEmail: string;
}

export function DashboardNav({ userRole, userEmail }: DashboardNavProps) {
  const pathname = usePathname();
  const { logout } = useAuth();

  const isAdmin = userRole === 'admin';

  const navItems = isAdmin
    ? [
        { href: '/admin/projects', label: 'Projekty', icon: FolderOpen },
        { href: '/admin/users', label: 'Użytkownicy', icon: Users },
        { href: '/admin/groups', label: 'Grupy', icon: Tags },
        { href: '/admin/files', label: 'Pliki', icon: FileText },
      ]
    : [{ href: '/gallery', label: 'Galeria', icon: LayoutGrid }];

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  const initials = userEmail.slice(0, 2).toUpperCase();

  return (
    <header className="sticky top-0 z-50 border-b bg-white dark:bg-zinc-900">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="font-semibold text-lg">
              <span className="text-primary text-[0.7em]">CONCEPTFAB</span>
              <span className="text-muted-foreground text-[0.91em] ml-2">
                Pano{' '}
                <span className="text-[10px]">
                  v: {process.env.NEXT_PUBLIC_APP_VERSION ?? '0.0.0'}
                </span>
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link key={item.href} href={item.href}>
                    <Button
                      variant={isActive ? 'secondary' : 'ghost'}
                      size="sm"
                      className="gap-2"
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <DropdownMenuItem key={item.href} asChild>
                      <Link
                        href={item.href}
                        className="flex items-center gap-2"
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </Link>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden md:inline text-sm">{userEmail}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem disabled className="text-muted-foreground">
                  {isAdmin ? 'Administrator' : 'Użytkownik'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-red-600"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Wyloguj
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
