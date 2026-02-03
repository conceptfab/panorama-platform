'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Project } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GridSize } from './ProjectGrid';

interface ProjectThumbnailProps {
  project: Project;
  size?: GridSize;
}

const sizeConfig: Record<GridSize, {
  padding: string;
  titleSize: string;
  iconSize: string;
  placeholderIcon: string;
  hoverIcon: string;
  badgeSize: string;
  showDate: boolean;
  gap: string;
}> = {
  large: {
    padding: 'p-4',
    titleSize: 'text-base',
    iconSize: 'h-8 w-8',
    placeholderIcon: 'h-12 w-12',
    hoverIcon: 'h-8 w-8',
    badgeSize: 'text-xs',
    showDate: true,
    gap: 'gap-4',
  },
  medium: {
    padding: 'p-3',
    titleSize: 'text-sm',
    iconSize: 'h-6 w-6',
    placeholderIcon: 'h-10 w-10',
    hoverIcon: 'h-6 w-6',
    badgeSize: 'text-xs',
    showDate: true,
    gap: 'gap-3',
  },
  small: {
    padding: 'p-2',
    titleSize: 'text-xs',
    iconSize: 'h-5 w-5',
    placeholderIcon: 'h-8 w-8',
    hoverIcon: 'h-5 w-5',
    badgeSize: 'text-[10px]',
    showDate: false,
    gap: 'gap-2',
  },
};

export function ProjectThumbnail({ project, size = 'large' }: ProjectThumbnailProps) {
  const config = sizeConfig[size];

  return (
    <Link href={`/pano/${project.id}`}>
      <Card className="group overflow-hidden transition-all hover:shadow-lg hover:border-primary/50">
        <div className="relative aspect-video bg-zinc-100 dark:bg-zinc-800">
          {project.thumbnailUrl ? (
            <Image
              src={project.thumbnailUrl}
              alt={project.name}
              fill
              className="object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <ImageIcon className={cn('text-muted-foreground/50', config.placeholderIcon)} />
            </div>
          )}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
            <Eye className={cn('text-white opacity-0 group-hover:opacity-100 transition-opacity', config.hoverIcon)} />
          </div>
        </div>
        <CardHeader className={cn(config.padding, 'pb-1')}>
          <CardTitle className={cn('line-clamp-1', config.titleSize)}>
            {project.name}
          </CardTitle>
        </CardHeader>
        <CardContent className={cn(config.padding, 'pt-0')}>
          <div className={cn('flex items-center', config.showDate ? 'justify-between' : 'justify-start')}>
            <Badge variant="secondary" className={config.badgeSize}>
              {project.panoramaCount} {size === 'small' ? 'p.' : 'panoram'}
            </Badge>
            {config.showDate && (
              <span className="text-xs text-muted-foreground">
                {new Date(project.updatedAt).toLocaleDateString('pl-PL')}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
