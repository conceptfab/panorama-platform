'use client';

import { Button } from '@/components/ui/button';
import {
  RotateCw,
  Maximize,
  Minimize,
  Camera,
} from 'lucide-react';
import { useState, useEffect } from 'react';

interface ViewerControlsProps {
  autoRotate: boolean;
  onToggleAutoRotate: () => void;
  onFullscreen: () => void;
  onScreenshot: () => void;
}

export function ViewerControls({
  autoRotate,
  onToggleAutoRotate,
  onFullscreen,
  onScreenshot,
}: ViewerControlsProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  return (
    <div className="absolute bottom-6 right-6 flex gap-2 z-40">
      <Button
        variant="secondary"
        size="icon"
        className="bg-black/50 hover:bg-black/70 text-white border-0"
        onClick={onToggleAutoRotate}
        title={autoRotate ? 'Wyłącz auto-rotację' : 'Włącz auto-rotację'}
      >
        <RotateCw
          className={`h-5 w-5 ${autoRotate ? 'animate-spin' : ''}`}
          style={{ animationDuration: '3s' }}
        />
      </Button>

      <Button
        variant="secondary"
        size="icon"
        className="bg-black/50 hover:bg-black/70 text-white border-0"
        onClick={onScreenshot}
        title="Zrzut ekranu"
      >
        <Camera className="h-5 w-5" />
      </Button>

      <Button
        variant="secondary"
        size="icon"
        className="bg-black/50 hover:bg-black/70 text-white border-0"
        onClick={onFullscreen}
        title={isFullscreen ? 'Wyjdź z pełnego ekranu' : 'Pełny ekran'}
      >
        {isFullscreen ? (
          <Minimize className="h-5 w-5" />
        ) : (
          <Maximize className="h-5 w-5" />
        )}
      </Button>
    </div>
  );
}
