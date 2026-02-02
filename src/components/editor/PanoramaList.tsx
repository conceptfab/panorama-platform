'use client';

import { Panorama } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Image as ImageIcon, Crosshair, Trash2 } from 'lucide-react';
import Link from 'next/link';

interface PanoramaListProps {
  projectId: string;
  panoramas: Panorama[];
}

export function PanoramaList({ projectId, panoramas }: PanoramaListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Lista panoram ({panoramas.length})</span>
          <Link href={`/admin/projects/${projectId}/editor`}>
            <Button variant="outline" size="sm">
              <Crosshair className="h-4 w-4 mr-2" />
              Edytor hotspotów
            </Button>
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {panoramas.map((panorama, index) => (
            <div
              key={panorama.id}
              className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg"
            >
              <div className="w-20 h-10 bg-zinc-200 dark:bg-zinc-700 rounded flex items-center justify-center flex-shrink-0">
                <ImageIcon className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{panorama.name}</p>
                <p className="text-xs text-muted-foreground">{panorama.file}</p>
              </div>
              <Badge variant="secondary">
                {panorama.hotspots.length} hotspotów
              </Badge>
              <span className="text-sm text-muted-foreground">
                #{index + 1}
              </span>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-red-500">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
