'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Project } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, Image as ImageIcon } from 'lucide-react';

interface ProjectThumbnailProps {
  project: Project;
}

export function ProjectThumbnail({ project }: ProjectThumbnailProps) {
  return (
    <Link href={`/viewer/${project.id}`}>
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
              <ImageIcon className="h-12 w-12 text-muted-foreground/50" />
            </div>
          )}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
            <Eye className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-base line-clamp-1">{project.name}</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="text-xs">
              {project.panoramaCount} panoram
            </Badge>
            <span className="text-xs text-muted-foreground">
              {new Date(project.updatedAt).toLocaleDateString('pl-PL')}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
