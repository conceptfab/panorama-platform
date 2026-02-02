'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, Group } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface UserTableProps {
  users: User[];
  groups: Group[];
}

export function UserTable({ users, groups }: UserTableProps) {
  const router = useRouter();
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const getGroupNames = (groupIds: string[]) => {
    return groupIds
      .map((id) => groups.find((g) => g.id === id)?.name)
      .filter(Boolean)
      .join(', ');
  };

  const handleOpenDialog = (user: User) => {
    setEditingUser(user);
    setSelectedGroupIds([...user.groupIds]);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingUser(null);
  };

  const toggleGroup = (groupId: string) => {
    setSelectedGroupIds((prev) =>
      prev.includes(groupId)
        ? prev.filter((id) => id !== groupId)
        : [...prev, groupId]
    );
  };

  const handleSave = async () => {
    if (!editingUser) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupIds: selectedGroupIds }),
      });
      if (!res.ok) throw new Error('Failed to update user');
      toast.success('Grupy użytkownika zaktualizowane');
      handleCloseDialog();
      router.refresh();
    } catch {
      toast.error('Nie udało się zapisać grup');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (user: User) => setUserToDelete(user);

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/users/${userToDelete.id}`, {
        method: 'DELETE',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || 'Nie udało się usunąć użytkownika');
        return;
      }
      toast.success('Użytkownik usunięty');
      setUserToDelete(null);
      router.refresh();
    } catch {
      toast.error('Nie udało się usunąć użytkownika');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
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
                <TableHead className="w-[80px]">Akcje</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.email}</TableCell>
                  <TableCell>
                    <Badge
                      variant={user.role === 'admin' ? 'default' : 'secondary'}
                    >
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
                  <TableCell className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleOpenDialog(user)}
                      title="Edytuj grupy"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteClick(user)}
                      title="Usuń użytkownika"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog
        open={!!userToDelete}
        onOpenChange={(open) => !open && setUserToDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Usuń użytkownika</DialogTitle>
          </DialogHeader>
          {userToDelete && (
            <div className="space-y-4 pt-2">
              <p className="text-sm text-muted-foreground">
                Czy na pewno usunąć użytkownika{' '}
                <span className="font-medium text-foreground">
                  {userToDelete.email}
                </span>
                ? Tej operacji nie można cofnąć.
              </p>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setUserToDelete(null)}
                  disabled={deleting}
                >
                  Anuluj
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteConfirm}
                  disabled={deleting}
                >
                  {deleting ? 'Usuwanie…' : 'Usuń'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => !open && handleCloseDialog()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Przypisz użytkownika do grup</DialogTitle>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4 pt-2">
              <p className="text-sm text-muted-foreground">
                Użytkownik:{' '}
                <span className="font-medium text-foreground">
                  {editingUser.email}
                </span>
              </p>
              <div className="space-y-2">
                <Label>Grupy</Label>
                <div className="border rounded-md p-3 max-h-[240px] overflow-y-auto space-y-2">
                  {groups.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Brak grup do wyboru.
                    </p>
                  ) : (
                    groups.map((group) => (
                      <label
                        key={group.id}
                        className={cn(
                          'flex items-center gap-2 cursor-pointer rounded px-2 py-1.5 hover:bg-muted/50',
                          selectedGroupIds.includes(group.id) && 'bg-muted/50'
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={selectedGroupIds.includes(group.id)}
                          onChange={() => toggleGroup(group.id)}
                          className="h-4 w-4 rounded border-input"
                        />
                        <span
                          className="inline-block w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: group.color }}
                        />
                        <span className="text-sm">{group.name}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1"
                >
                  {saving ? 'Zapisywanie…' : 'Zapisz'}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCloseDialog}
                  disabled={saving}
                >
                  Anuluj
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
