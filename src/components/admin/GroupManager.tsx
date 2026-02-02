'use client';

import { useState } from 'react';
import { Group, Project } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface GroupManagerProps {
  groups: Group[];
  projects: Project[];
}

export function GroupManager({ groups: initialGroups, projects }: GroupManagerProps) {
  const [groups, setGroups] = useState(initialGroups);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#6b7280');

  const getProjectNames = (projectIds: string[]) => {
    return projectIds
      .map((id) => projects.find((p) => p.id === id)?.name)
      .filter(Boolean);
  };

  const handleOpenDialog = (group?: Group) => {
    if (group) {
      setEditingGroup(group);
      setName(group.name);
      setDescription(group.description);
      setColor(group.color);
    } else {
      setEditingGroup(null);
      setName('');
      setDescription('');
      setColor('#6b7280');
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Podaj nazwę grupy');
      return;
    }

    try {
      if (editingGroup) {
        const res = await fetch(`/api/groups/${editingGroup.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, description, color }),
        });

        if (!res.ok) throw new Error('Failed to update group');

        const data = await res.json();
        setGroups((prev) =>
          prev.map((g) => (g.id === editingGroup.id ? data.group : g))
        );
        toast.success('Grupa zaktualizowana');
      } else {
        const res = await fetch('/api/groups', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, description, color }),
        });

        if (!res.ok) throw new Error('Failed to create group');

        const data = await res.json();
        setGroups((prev) => [...prev, data.group]);
        toast.success('Grupa utworzona');
      }

      setIsDialogOpen(false);
    } catch {
      toast.error('Nie udało się zapisać grupy');
    }
  };

  const handleDelete = async (groupId: string) => {
    try {
      const res = await fetch(`/api/groups/${groupId}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete group');

      setGroups((prev) => prev.filter((g) => g.id !== groupId));
      toast.success('Grupa usunięta');
    } catch {
      toast.error('Nie udało się usunąć grupy');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Nowa grupa
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingGroup ? 'Edytuj grupę' : 'Nowa grupa'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nazwa</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="np. Klienci VIP"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Opis</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Krótki opis grupy"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="color">Kolor</Label>
                <div className="flex gap-2">
                  <Input
                    id="color"
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-16 h-10 p-1"
                  />
                  <Input
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    placeholder="#6b7280"
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <Button onClick={handleSave} className="flex-1">
                  Zapisz
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Anuluj
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {groups.map((group) => (
          <Card key={group.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: group.color }}
                  />
                  <CardTitle className="text-lg">{group.name}</CardTitle>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleOpenDialog(group)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-500"
                    onClick={() => handleDelete(group.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                {group.description || 'Brak opisu'}
              </p>
              <div className="flex flex-wrap gap-1">
                {getProjectNames(group.projectIds).map((name, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {name}
                  </Badge>
                ))}
                {group.projectIds.length === 0 && (
                  <span className="text-xs text-muted-foreground">
                    Brak przypisanych projektów
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {groups.length === 0 && (
          <div className="col-span-full text-center py-16 border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground">Brak grup</p>
          </div>
        )}
      </div>
    </div>
  );
}
