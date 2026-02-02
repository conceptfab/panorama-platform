'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { ProjectConfig } from '@/types';
import { SplashScreen } from './SplashScreen';
import { ViewerControls } from './ViewerControls';
import Script from 'next/script';

interface PanoViewerProps {
  config: ProjectConfig;
  basePath: string;
  isAdmin?: boolean;
  projectId?: string;
}

export function PanoViewer({
  config,
  basePath,
  isAdmin,
  projectId,
}: PanoViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<unknown>(null);
  const panoramasRef = useRef<unknown[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const [scriptsLoaded, setScriptsLoaded] = useState(false);
  const [autoRotate, setAutoRotate] = useState(config.settings.autoRotate);
  const [threeLoaded, setThreeLoaded] = useState(false);
  const [, setCurrentPanoramaIndex] = useState(0);

  const initViewer = useCallback(() => {
    if (!containerRef.current || !window.PANOLENS || !window.THREE) return;

    const THREE = window.THREE;
    const PANOLENS = window.PANOLENS;

    // Create renderer with preserveDrawingBuffer for screenshots
    const renderer = new THREE.WebGLRenderer({
      preserveDrawingBuffer: true,
      antialias: true,
    });

    // Create viewer
    const viewer = new PANOLENS.Viewer({
      container: containerRef.current,
      controlBar: false,
      cameraFov: config.settings.cameraFov,
      renderer: renderer,
      autoRotate: false,
      autoRotateSpeed: config.settings.autoRotateSpeed,
    });

    viewerRef.current = viewer;

    // Load panoramas
    const panoramas: unknown[] = [];
    let loadedCount = 0;

    config.panoramas.forEach((panoData, index) => {
      const imagePath = `${basePath}/panoramas/${panoData.file}`;
      const panorama = new PANOLENS.ImagePanorama(imagePath);

      panorama.addEventListener('enter-fade-start', () => {
        const pos = panoData.initialPosition;
        viewer.tweenControlCenter(new THREE.Vector3(pos.x, pos.y, pos.z), 800);
        setCurrentPanoramaIndex(index);
      });

      // Link hotspots
      const LINK_ICON =
        'data:image/svg+xml,' +
        encodeURIComponent(
          '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512">' +
            '<path fill="none" stroke="rgba(255,255,255,0.95)" stroke-width="28" stroke-linecap="round" stroke-linejoin="round" d="M48 224 L160 96 L272 224"/>' +
            '</svg>'
        );

      panoData.hotspots.forEach((hotspot) => {
        if (hotspot.type === 'link') {
          const targetIndex = config.panoramas.findIndex(
            (p) => p.id === hotspot.target
          );
          if (targetIndex !== -1) {
            // Will be linked after all panoramas are created
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const panoAny = panorama as any;
            panoAny._pendingLinks = panoAny._pendingLinks || [];
            panoAny._pendingLinks.push({
              targetIndex,
              position: hotspot.position,
              icon: LINK_ICON,
            });
          }
        }
      });

      panoramas[index] = panorama;
    });

    // Link panoramas
    panoramas.forEach((pano) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const panoAny = pano as any;
      const pendingLinks = panoAny._pendingLinks;
      if (pendingLinks) {
        pendingLinks.forEach(
          (link: {
            targetIndex: number;
            position: { x: number; y: number; z: number };
            icon: string;
          }) => {
            const targetPano = panoramas[link.targetIndex];
            panoAny.link(
              targetPano,
              new THREE.Vector3(
                link.position.x,
                link.position.y,
                link.position.z
              ),
              360,
              link.icon
            );
          }
        );
      }
    });

    // Preload images
    config.panoramas.forEach((panoData) => {
      const img = new Image();
      img.onload = () => {
        loadedCount++;
        setLoadProgress((loadedCount / config.panoramas.length) * 100);
      };
      img.onerror = () => {
        loadedCount++;
        setLoadProgress((loadedCount / config.panoramas.length) * 100);
      };
      img.src = `${basePath}/panoramas/${panoData.file}`;
    });

    panoramasRef.current = panoramas;

    // Add all panoramas to viewer
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    panoramas.forEach((p) => (viewer as any).add(p));
    if (panoramas.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (viewer as any).setPanorama(panoramas[0]);
    }

    // Start auto-rotate after delay
    if (config.settings.autoRotate) {
      setTimeout(() => {
        if (viewer.OrbitControls) {
          viewer.enableAutoRate();
          setAutoRotate(true);
        }
      }, config.settings.autoRotateDelay);
    }

    // Splash screen fade
    setTimeout(() => {
      setIsLoading(false);
    }, config.settings.splashDuration);
  }, [config, basePath]);

  useEffect(() => {
    if (scriptsLoaded) {
      // Small delay to ensure scripts are ready
      const timer = setTimeout(initViewer, 100);
      return () => clearTimeout(timer);
    }
  }, [scriptsLoaded, initViewer]);

  useEffect(() => {
    return () => {
      // Cleanup
      if (viewerRef.current) {
        (viewerRef.current as { dispose?: () => void }).dispose?.();
      }
    };
  }, []);

  const handleToggleAutoRotate = useCallback(() => {
    const viewer = viewerRef.current as {
      OrbitControls?: { autoRotate: boolean };
      enableAutoRate?: () => void;
      disableAutoRate?: () => void;
    };
    if (viewer?.OrbitControls) {
      const next = !viewer.OrbitControls.autoRotate;
      viewer.OrbitControls.autoRotate = next;
      if (next) {
        viewer.enableAutoRate?.();
      } else {
        viewer.disableAutoRate?.();
      }
      setAutoRotate(next);
    }
  }, []);

  const handleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.body.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }, []);

  const handleHome = useCallback(() => {
    const viewer = viewerRef.current as { setPanorama?: (p: unknown) => void };
    const panoramas = panoramasRef.current;
    if (viewer?.setPanorama && panoramas[0]) {
      viewer.setPanorama(panoramas[0]);
    }
  }, []);

  const handleScreenshot = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const canvas = container.querySelector('canvas');
    if (!canvas) return;

    const viewer = viewerRef.current as {
      panorama?: {
        traverse: (fn: (obj: { visible: boolean }) => void) => void;
      };
    };
    const hidden: { visible: boolean }[] = [];

    // Hide hotspots temporarily
    viewer?.panorama?.traverse((obj) => {
      if (
        (obj as { constructor?: { name: string } }).constructor?.name ===
        'Infospot'
      ) {
        hidden.push(obj);
        obj.visible = false;
      }
    });

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        try {
          const w = canvas.width;
          const h = canvas.height;
          const tmp = document.createElement('canvas');
          tmp.width = w;
          tmp.height = h;
          const ctx = tmp.getContext('2d');
          if (!ctx) return;

          ctx.drawImage(canvas, 0, 0);

          // Add watermark (CONCEPTFAB 30% smaller, Pano 30% larger, version 1/3 of Pano)
          const appVersion =
            typeof process !== 'undefined'
              ? process.env.NEXT_PUBLIC_APP_VERSION ?? '0.0.0'
              : '0.0.0';
          const panoPart = ' Pano Viewer ';
          const versionPart = `v: ${appVersion}`;
          const fontSize = Math.max(14, Math.round(w / 60));
          const smallFontSize = fontSize * 0.7;
          const panoFontSize = smallFontSize * 1.3;
          const versionFontSize = 10;
          const xRight = w - Math.round(w * 0.04);
          const y = Math.round(h * 0.03);
          ctx.textAlign = 'right';
          ctx.textBaseline = 'top';
          ctx.shadowColor = 'rgba(0,0,0,0.6)';
          ctx.shadowBlur = 4;
          ctx.shadowOffsetX = 1;
          ctx.shadowOffsetY = 1;
          ctx.fillStyle = 'rgba(255,255,255,0.95)';
          ctx.font = `300 ${versionFontSize}px Inter, sans-serif`;
          ctx.fillText(versionPart, xRight, y);
          const versionWidth = ctx.measureText(versionPart).width;
          ctx.font = `300 ${panoFontSize}px Inter, sans-serif`;
          ctx.fillText(panoPart, xRight - versionWidth, y);
          const suffixWidth = ctx.measureText(panoPart).width + versionWidth;
          ctx.font = `300 ${smallFontSize}px Inter, sans-serif`;
          ctx.fillText('CONCEPTFAB', xRight - suffixWidth, y);

          let dataUrl;
          let ext = 'webp';
          try {
            dataUrl = tmp.toDataURL('image/webp', 0.92);
          } catch {
            ext = 'jpg';
            dataUrl = tmp.toDataURL('image/jpeg', 0.92);
          }

          const name = `panorama-${new Date()
            .toISOString()
            .slice(0, 19)
            .replace(/:/g, '-')}.${ext}`;
          const a = document.createElement('a');
          a.download = name;
          a.href = dataUrl;
          a.click();
        } finally {
          hidden.forEach((obj) => {
            obj.visible = true;
          });
        }
      });
    });
  }, []);

  const handleGenerateThumbnail = useCallback(async () => {
    if (!projectId || !isAdmin) return;

    const container = containerRef.current;
    if (!container) return;

    const canvas = container.querySelector('canvas');
    if (!canvas) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const viewer = viewerRef.current as any;
    if (!viewer) return;

    const hidden: { obj: { visible: boolean }; wasVisible: boolean }[] = [];

    // Hide ALL children of panorama (hotspots, infospots, sprites, links)
    if (viewer.panorama && viewer.panorama.children) {
      viewer.panorama.children.forEach((child: { visible: boolean }) => {
        if (child.visible) {
          hidden.push({ obj: child, wasVisible: true });
          child.visible = false;
        }
      });
    }

    // Also traverse scene for any stray sprites
    if (viewer.scene) {
      viewer.scene.traverse((obj: { visible: boolean; type?: string }) => {
        if (obj.type === 'Sprite' && obj.visible) {
          hidden.push({ obj, wasVisible: true });
          obj.visible = false;
        }
      });
    }

    // Force immediate render
    if (viewer.renderer && viewer.scene && viewer.camera) {
      viewer.renderer.render(viewer.scene, viewer.camera);
    }

    return new Promise<void>((resolve, reject) => {
      // Wait for render
      setTimeout(async () => {
        try {
          const dataUrl = canvas.toDataURL('image/png', 1.0);

          const response = await fetch(`/api/projects/${projectId}/thumbnail`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageData: dataUrl }),
          });

          if (!response.ok) {
            throw new Error('Failed to generate thumbnail');
          }

          // Show success feedback
          const toast = document.createElement('div');
          toast.className =
            'fixed bottom-6 left-1/2 -translate-x-1/2 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-fade-in';
          toast.textContent = 'Miniaturka zapisana!';
          document.body.appendChild(toast);
          setTimeout(() => toast.remove(), 2000);

          resolve();
        } catch (error) {
          console.error('Thumbnail generation error:', error);

          // Show error feedback
          const toast = document.createElement('div');
          toast.className =
            'fixed bottom-6 left-1/2 -translate-x-1/2 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg z-50';
          toast.textContent = 'Błąd generowania miniaturki';
          document.body.appendChild(toast);
          setTimeout(() => toast.remove(), 3000);

          reject(error);
        } finally {
          // Restore visibility
          hidden.forEach(({ obj, wasVisible }) => {
            obj.visible = wasVisible;
          });
        }
      }, 200);
    });
  }, [projectId, isAdmin]);

  return (
    <>
      <Script
        src="/panolens/three.min.js"
        strategy="afterInteractive"
        onLoad={() => {
          window.process = window.process || { env: {} };
          setThreeLoaded(true);
        }}
      />
      {threeLoaded && (
        <Script
          src="/panolens/panolens.min.js"
          strategy="afterInteractive"
          onLoad={() => setScriptsLoaded(true)}
        />
      )}

      <div className="relative w-full h-screen bg-black">
        <div
          ref={containerRef}
          id="panorama-container"
          className="w-full h-full"
        />

        {isLoading && (
          <SplashScreen
            projectName={config.projectName}
            progress={loadProgress}
            fadeDuration={config.settings.fadeDuration}
          />
        )}

        <ViewerControls
          autoRotate={autoRotate}
          onToggleAutoRotate={handleToggleAutoRotate}
          onFullscreen={handleFullscreen}
          onScreenshot={handleScreenshot}
          onHome={handleHome}
          isAdmin={isAdmin}
          onGenerateThumbnail={
            isAdmin && projectId ? handleGenerateThumbnail : undefined
          }
        />
      </div>
    </>
  );
}
