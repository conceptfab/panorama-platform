'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Project } from '@/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Eye,
  Pencil,
  Crosshair,
  MoreVertical,
  Trash2,
  Image as ImageIcon,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { GridSize } from './AdminProjectGrid';

export interface ProjectCardGroupInfo {
  name: string;
  color: string;
}

interface ProjectCardProps {
  project: Project;
  size?: GridSize;
  /** Jedna lub więcej grup – jedna: jeden pasek i nazwa; wiele: pasek podzielony na segmenty i wszystkie nazwy na dole */
  groups?: ProjectCardGroupInfo[];
}

const sizeConfig: Record<
  GridSize,
  {
    padding: string;
    titleSize: string;
    descSize: string;
    badgeSize: string;
    iconSize: string;
    placeholderIcon: string;
    showDescription: boolean;
    showDate: boolean;
    menuButtonSize: string;
  }
> = {
  large: {
    padding: 'p-4',
    titleSize: 'text-lg',
    descSize: 'text-sm',
    badgeSize: 'text-xs',
    iconSize: 'h-4 w-4',
    placeholderIcon: 'h-12 w-12',
    showDescription: true,
    showDate: true,
    menuButtonSize: 'h-8 w-8',
  },
  medium: {
    padding: 'p-3',
    titleSize: 'text-base',
    descSize: 'text-xs',
    badgeSize: 'text-xs',
    iconSize: 'h-4 w-4',
    placeholderIcon: 'h-10 w-10',
    showDescription: true,
    showDate: true,
    menuButtonSize: 'h-7 w-7',
  },
  small: {
    padding: 'p-2',
    titleSize: 'text-sm',
    descSize: 'text-xs',
    badgeSize: 'text-[10px]',
    iconSize: 'h-3 w-3',
    placeholderIcon: 'h-8 w-8',
    showDescription: false,
    showDate: false,
    menuButtonSize: 'h-6 w-6',
  },
};

export function ProjectCard({
  project,
  size = 'large',
  groups: groupsProp,
}: ProjectCardProps) {
  const router = useRouter();
  const config = sizeConfig[size];
  const groups = groupsProp ?? [];

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (
      !confirm(
        `Czy na pewno usunąć projekt „${project.name}"? Nie można tego cofnąć.`
      )
    ) {
      return;
    }
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Błąd usuwania');
      }
      toast.success(`Projekt „${project.name}" został usunięty.`);
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Nie udało się usunąć projektu'
      );
    }
  };

  const handleDownload = () => {
    window.open(
      `/api/files/projects/${project.id}/download`,
      '_blank',
      'noopener,noreferrer'
    );
    toast.success(`Pobieranie „${project.name}"…`);
  };

  return (
    <Card className="overflow-hidden">
      {groups.length > 0 && (
        <div className="h-1 shrink-0 flex" aria-hidden>
          {groups.length === 1 ? (
            <div
              className="flex-1 min-w-0"
              style={{ backgroundColor: groups[0].color }}
            />
          ) : (
            groups.map((g, i) => (
              <div
                key={i}
                className="flex-1 min-w-0 first:rounded-l last:rounded-r"
                style={{ backgroundColor: g.color }}
              />
            ))
          )}
        </div>
      )}
      <div className="relative aspect-video bg-zinc-100 dark:bg-zinc-800">
        {project.thumbnailUrl ? (
          <Image
            src={project.thumbnailUrl}
            alt={project.name}
            fill
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <ImageIcon
              className={cn('text-muted-foreground/50', config.placeholderIcon)}
            />
          </div>
        )}
        <div className="absolute top-2 right-2">
          <Badge
            variant={project.isPublished ? 'default' : 'secondary'}
            className={config.badgeSize}
          >
            {project.isPublished
              ? size === 'small'
                ? '✓'
                : 'Opublikowany'
              : size === 'small'
              ? '○'
              : 'Szkic'}
          </Badge>
        </div>
      </div>

      <CardHeader className={cn(config.padding, 'pb-2')}>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className={cn('line-clamp-1', config.titleSize)}>
              {project.name}
            </CardTitle>
            {config.showDescription && (
              <CardDescription
                className={cn('line-clamp-2 mt-1', config.descSize)}
              >
                {project.description || 'Brak opisu'}
              </CardDescription>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(config.menuButtonSize, '-mr-2')}
              >
                <MoreVertical className={config.iconSize} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/pano/${project.id}`}>
                  <Eye className="h-4 w-4 mr-2" />
                  Podgląd
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/admin/projects/${project.id}`}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edytuj
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/admin/projects/${project.id}/editor`}>
                  <Crosshair className="h-4 w-4 mr-2" />
                  Edytor hotspotów
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Pobierz projekt
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600"
                onClick={handleDelete}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Usuń
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className={cn(config.padding, 'pt-0')}>
        <div
          className={cn(
            'flex flex-wrap items-center gap-2 text-muted-foreground',
            size === 'small' ? 'text-xs' : 'text-sm'
          )}
        >
          <span>
            {project.panoramaCount} {size === 'small' ? 'p.' : 'panoram'}
          </span>
          {config.showDate && (
            <>
              <span>•</span>
              <span>
                {new Date(project.updatedAt).toLocaleDateString('pl-PL')}
              </span>
            </>
          )}
        </div>
        {(size === 'large' || size === 'medium') && groups.length > 0 && (
          <p className="mt-1 text-xs text-muted-foreground truncate flex flex-wrap gap-x-1.5 gap-y-0.5">
            {groups.map((g, i) => (
              <span key={i} style={{ color: g.color }}>
                {g.name}
                {i < groups.length - 1 ? ',' : ''}
              </span>
            ))}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
