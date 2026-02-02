'use client';

import { User, Group } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface UserTableProps {
  users: User[];
  groups: Group[];
}

export function UserTable({ users, groups }: UserTableProps) {
  const getGroupNames = (groupIds: string[]) => {
    return groupIds
      .map((id) => groups.find((g) => g.id === id)?.name)
      .filter(Boolean)
      .join(', ');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lista użytkowników ({users.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Rola</TableHead>
              <TableHead>Grupy</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ostatnie logowanie</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.email}</TableCell>
                <TableCell>
                  <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                    {user.role === 'admin' ? 'Admin' : 'Użytkownik'}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {getGroupNames(user.groupIds) || '-'}
                </TableCell>
                <TableCell>
                  <Badge variant={user.isActive ? 'default' : 'destructive'}>
                    {user.isActive ? 'Aktywny' : 'Nieaktywny'}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {user.lastLoginAt
                    ? new Date(user.lastLoginAt).toLocaleString('pl-PL')
                    : 'Nigdy'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
