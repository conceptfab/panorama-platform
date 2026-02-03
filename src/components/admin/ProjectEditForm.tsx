'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Project, Group } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardAction,
} from '@/components/ui/card';
import { ArrowLeft, Loader2, Save, Globe, GlobeLock } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ProjectEditFormProps {
  project: Project;
  groups: Group[];
  /** Dla edytora – tylko te grupy są wybieralne (jego grupy). */
  editorGroupIds?: string[];
}

export function ProjectEditForm({
  project,
  groups,
  editorGroupIds,
}: ProjectEditFormProps) {
  const selectableGroups = editorGroupIds
    ? groups.filter((g) => editorGroupIds.includes(g.id))
    : groups;
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description);
  const [isPublished, setIsPublished] = useState(project.isPublished);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>(
    project.groupIds ?? []
  );

  const toggleGroup = (groupId: string) => {
    setSelectedGroupIds((prev) =>
      prev.includes(groupId)
        ? prev.filter((id) => id !== groupId)
        : [...prev, groupId]
    );
  };

  const handleTogglePublish = async () => {
    setIsPublishing(true);
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublished: !isPublished }),
      });

      if (!res.ok) throw new Error('Failed to update');

      setIsPublished(!isPublished);
      toast.success(isPublished ? 'Projekt ukryty' : 'Projekt opublikowany');
      router.refresh();
    } catch {
      toast.error('Nie udało się zmienić statusu');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          groupIds: selectedGroupIds,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to update project');
      }

      toast.success('Projekt zaktualizowany');
      router.refresh();
    } catch {
      toast.error('Nie udało się zaktualizować projektu');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <Link href="/admin/projects">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Powrót do listy
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Edycja projektu</CardTitle>
          <CardAction>
            <Button
              variant={isPublished ? 'outline' : 'default'}
              onClick={handleTogglePublish}
              disabled={isPublishing}
              className={
                isPublished
                  ? 'border-green-500 text-green-600 hover:bg-green-50'
                  : ''
              }
            >
              {isPublishing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : isPublished ? (
                <Globe className="h-4 w-4 mr-2" />
              ) : (
                <GlobeLock className="h-4 w-4 mr-2" />
              )}
              {isPublished ? 'Opublikowany' : 'Opublikuj'}
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Nazwa projektu</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Opis</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label>Grupy (dostęp do projektu)</Label>
              <div className="border rounded-md p-3 max-h-[200px] overflow-y-auto space-y-2">
                {selectableGroups.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Brak grup.</p>
                ) : (
                  selectableGroups.map((group) => (
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

            <div className="flex gap-4">
              <Button type="submit" disabled={isLoading || !name.trim()}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Zapisz zmiany
              </Button>
              <Link href={`/admin/projects/${project.id}/editor`}>
                <Button type="button" variant="outline">
                  Edytor hotspotów
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
