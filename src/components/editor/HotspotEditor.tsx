'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Script from 'next/script';
import Link from 'next/link';
import { ProjectConfig, Hotspot, Position3D } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Copy,
  Loader2,
  RotateCw,
  Camera,
  Maximize,
} from 'lucide-react';
import { toast } from 'sonner';
import { generateId } from '@/utils/helpers';

interface HotspotEditorProps {
  projectId: string;
  projectName: string;
  initialConfig: ProjectConfig;
}

export function HotspotEditor({
  projectId,
  projectName,
  initialConfig,
}: HotspotEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<unknown>(null);
  const currentPanoramaRef = useRef<unknown>(null);

  const [config, setConfig] = useState<ProjectConfig>(initialConfig);
  const [threeLoaded, setThreeLoaded] = useState(false);
  const [scriptsLoaded, setScriptsLoaded] = useState(false);
  const [currentPanoramaIndex, setCurrentPanoramaIndex] = useState(0);
  const [selectedHotspotId, setSelectedHotspotId] = useState<string | null>(
    null
  );
  const [clickedPosition, setClickedPosition] = useState<Position3D | null>(
    null
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [autoRotate, setAutoRotate] = useState(false);
  const [isAddingMode, setIsAddingMode] = useState(false);
  const markerRef = useRef<unknown>(null);
  const isAddingModeRef = useRef(false);
  const configRef = useRef(initialConfig);
  const hotspotMarkersRef = useRef<unknown[]>([]);
  const existingHotspotTextureRef = useRef<unknown>(null);
  const currentPanoramaIndexRef = useRef(0);

  // Keep refs in sync with state
  useEffect(() => {
    isAddingModeRef.current = isAddingMode;
  }, [isAddingMode]);

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  useEffect(() => {
    currentPanoramaIndexRef.current = currentPanoramaIndex;
  }, [currentPanoramaIndex]);

  const currentPanorama = config.panoramas[currentPanoramaIndex];
  const selectedHotspot = currentPanorama?.hotspots.find(
    (h) => h.id === selectedHotspotId
  );
  const basePath = `/uploads/projects/${projectId}`;

  // Create marker texture for hotspot position
  const createMarkerTexture = useCallback(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;

    // Outer ring
    ctx.beginPath();
    ctx.arc(32, 32, 28, 0, Math.PI * 2);
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Inner dot
    ctx.beginPath();
    ctx.arc(32, 32, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#ef4444';
    ctx.fill();

    // Crosshair lines
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(32, 4);
    ctx.lineTo(32, 18);
    ctx.moveTo(32, 46);
    ctx.lineTo(32, 60);
    ctx.moveTo(4, 32);
    ctx.lineTo(18, 32);
    ctx.moveTo(46, 32);
    ctx.lineTo(60, 32);
    ctx.stroke();

    const texture = new window.THREE.CanvasTexture(canvas);
    return texture;
  }, []);

  // Tekstura znacznika istniejącego hotspota (cyjan, żeby odróżnić od czerwonego „nowego”)
  const createExistingHotspotTexture = useCallback(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.beginPath();
    ctx.arc(32, 32, 26, 0, Math.PI * 2);
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(32, 32, 10, 0, Math.PI * 2);
    ctx.fillStyle = '#22d3ee';
    ctx.fill();
    return new window.THREE.CanvasTexture(canvas);
  }, []);

  // Usuń znaczniki istniejących hotspotów ze sceny i zwolnij zasoby
  const clearHotspotMarkers = useCallback(
    (viewer: { scene: { remove: (o: unknown) => void } }) => {
      for (const m of hotspotMarkersRef.current) {
        viewer.scene.remove(m);
        const sprite = m as {
          material?: { map?: { dispose: () => void }; dispose: () => void };
        };
        sprite.material?.map?.dispose?.();
        sprite.material?.dispose?.();
      }
      hotspotMarkersRef.current = [];
      const tex = existingHotspotTextureRef.current as {
        dispose?: () => void;
      } | null;
      if (tex?.dispose) {
        tex.dispose();
        existingHotspotTextureRef.current = null;
      }
    },
    []
  );

  // Dodaj znaczniki dla istniejących hotspotów na panoramie
  const addHotspotMarkers = useCallback(
    (viewer: { scene: { add: (o: unknown) => void } }, hotspots: Hotspot[]) => {
      if (!hotspots?.length || !window.THREE) return;
      const THREE = window.THREE;
      const texture = createExistingHotspotTexture();
      existingHotspotTextureRef.current = texture;
      for (const hp of hotspots) {
        const mat = new THREE.SpriteMaterial({
          map: texture,
          depthTest: false,
          transparent: true,
        });
        const sprite = new THREE.Sprite(mat);
        sprite.scale.set(250, 250, 1);
        // Konwersja jak przy zapisie: config ma (-pt.x, pt.y, pt.z)
        sprite.position.set(-hp.position.x, hp.position.y, hp.position.z);
        viewer.scene.add(sprite);
        hotspotMarkersRef.current.push(sprite);
      }
    },
    [createExistingHotspotTexture]
  );

  // Load single panorama
  const loadPanorama = useCallback(
    (index: number) => {
      if (!window.PANOLENS || !window.THREE) return;

      const viewer = viewerRef.current as {
        add?: (p: unknown) => void;
        remove?: (p: unknown) => void;
        setPanorama?: (p: unknown) => void;
        tweenControlCenter?: (v: unknown, d: number) => void;
        scene?: { remove: (o: unknown) => void; add: (o: unknown) => void };
        camera?: unknown;
        panorama?: unknown;
      };
      if (!viewer?.scene) return;

      const viewerWithScene = viewer as {
        scene: { remove: (o: unknown) => void; add: (o: unknown) => void };
      };

      setIsLoading(true);

      const THREE = window.THREE;
      const PANOLENS = window.PANOLENS;

      // Usuń stare znaczniki hotspotów
      clearHotspotMarkers(viewerWithScene);

      // Remove old panorama
      if (currentPanoramaRef.current) {
        viewer.remove?.(currentPanoramaRef.current);
        (currentPanoramaRef.current as { dispose?: () => void }).dispose?.();
        currentPanoramaRef.current = null;
      }

      const panoData = configRef.current.panoramas[index];
      if (!panoData) {
        setIsLoading(false);
        return;
      }

      const imagePath = `${basePath}/panoramas/${panoData.file}`;
      const panorama = new PANOLENS.ImagePanorama(imagePath);

      panorama.addEventListener('enter-fade-start', () => {
        const pos = panoData.initialPosition;
        viewer.tweenControlCenter?.(
          new THREE.Vector3(pos.x, pos.y, pos.z),
          400
        );
        addHotspotMarkers(viewerWithScene, panoData.hotspots ?? []);
        setIsLoading(false);
      });

      currentPanoramaRef.current = panorama;
      viewer.add?.(panorama);
      viewer.setPanorama?.(panorama);
    },
    [basePath, clearHotspotMarkers, addHotspotMarkers]
  );

  const initViewer = useCallback(() => {
    if (!containerRef.current || !window.PANOLENS || !window.THREE) return;
    if (viewerRef.current) return; // Already initialized

    const THREE = window.THREE;
    const PANOLENS = window.PANOLENS;

    const viewer = new PANOLENS.Viewer({
      container: containerRef.current,
      controlBar: false,
      cameraFov: 55,
    });

    viewerRef.current = viewer;

    // Click handler for coordinate picking
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    // Create marker sprite
    const markerTexture = createMarkerTexture();
    const markerMaterial = new THREE.SpriteMaterial({
      map: markerTexture,
      depthTest: false,
      transparent: true,
    });
    const marker = new THREE.Sprite(markerMaterial);
    marker.scale.set(300, 300, 1);
    marker.visible = false;
    viewer.scene.add(marker);
    markerRef.current = marker;

    containerRef.current.addEventListener('click', (event: MouseEvent) => {
      if (!viewer.panorama || !isAddingModeRef.current) return;

      const rect = containerRef.current!.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, viewer.camera);
      const hits = raycaster.intersectObject(viewer.panorama, true);

      if (hits.length > 0) {
        const pt = hits[0].point;

        // Update marker position
        marker.position.set(pt.x, pt.y, pt.z);
        marker.visible = true;

        // Negate X as in original editor
        setClickedPosition({
          x: Math.round(-pt.x),
          y: Math.round(pt.y),
          z: Math.round(pt.z),
        });
      }
    });

    // Load first panorama after viewer is ready
    loadPanorama(0);
  }, [loadPanorama, createMarkerTexture]);

  useEffect(() => {
    if (scriptsLoaded) {
      const timer = setTimeout(initViewer, 100);
      return () => clearTimeout(timer);
    }
  }, [scriptsLoaded, initViewer]);

  // Po zmianie config (dodanie/usunięcie hotspota) odśwież znaczniki na panoramie
  useEffect(() => {
    const viewer = viewerRef.current as {
      scene?: { remove: (o: unknown) => void; add: (o: unknown) => void };
    } | null;
    if (!viewer?.scene) return;
    const viewerWithScene = viewer as {
      scene: { remove: (o: unknown) => void; add: (o: unknown) => void };
    };
    const idx = currentPanoramaIndexRef.current;
    const pano = configRef.current.panoramas[idx];
    if (!pano) return;
    clearHotspotMarkers(viewerWithScene);
    addHotspotMarkers(viewerWithScene, pano.hotspots ?? []);
  }, [config, clearHotspotMarkers, addHotspotMarkers]);

  useEffect(() => {
    return () => {
      if (currentPanoramaRef.current) {
        (currentPanoramaRef.current as { dispose?: () => void }).dispose?.();
      }
      if (viewerRef.current) {
        (viewerRef.current as { dispose?: () => void }).dispose?.();
      }
    };
  }, []);

  const handlePanoramaChange = (index: number) => {
    setCurrentPanoramaIndex(index);
    setSelectedHotspotId(null);
    setClickedPosition(null);
    setIsAddingMode(false);
    if (markerRef.current) {
      (markerRef.current as { visible: boolean }).visible = false;
    }
    loadPanorama(index);
  };

  const handleAddHotspot = () => {
    if (!clickedPosition) {
      toast.error('Kliknij w panoramę, aby wybrać pozycję');
      return;
    }

    const nextNumber = (currentPanorama?.hotspots.length ?? 0) + 1;
    const newHotspot: Hotspot = {
      id: generateId('hs'),
      type: 'link',
      position: clickedPosition,
      target: config.panoramas[0]?.id || '',
      title: `Hotspot ${nextNumber}`,
      icon: 'arrow-up',
      scale: 1.0,
    };

    setConfig((prev) => {
      const updated = { ...prev };
      updated.panoramas = [...prev.panoramas];
      updated.panoramas[currentPanoramaIndex] = {
        ...updated.panoramas[currentPanoramaIndex],
        hotspots: [
          ...updated.panoramas[currentPanoramaIndex].hotspots,
          newHotspot,
        ],
      };
      return updated;
    });

    // Hide marker and exit adding mode
    if (markerRef.current) {
      (markerRef.current as { visible: boolean }).visible = false;
    }
    setClickedPosition(null);
    setIsAddingMode(false);
    setSelectedHotspotId(newHotspot.id);
    toast.success('Hotspot dodany');
  };

  const toggleAddingMode = () => {
    const newMode = !isAddingMode;
    setIsAddingMode(newMode);
    if (!newMode && markerRef.current) {
      (markerRef.current as { visible: boolean }).visible = false;
      setClickedPosition(null);
    }
    if (newMode) {
      toast.info('Kliknij w panoramę, aby wybrać pozycję hotspota');
    }
  };

  const handleDeleteHotspot = (hotspotId: string) => {
    setConfig((prev) => {
      const updated = { ...prev };
      updated.panoramas = [...prev.panoramas];
      updated.panoramas[currentPanoramaIndex] = {
        ...updated.panoramas[currentPanoramaIndex],
        hotspots: updated.panoramas[currentPanoramaIndex].hotspots.filter(
          (h) => h.id !== hotspotId
        ),
      };
      return updated;
    });

    if (selectedHotspotId === hotspotId) {
      setSelectedHotspotId(null);
    }
    toast.success('Hotspot usunięty');
  };

  const handleUpdateHotspot = (
    hotspotId: string,
    updates: Partial<Hotspot>
  ) => {
    setConfig((prev) => {
      const updated = { ...prev };
      updated.panoramas = [...prev.panoramas];
      updated.panoramas[currentPanoramaIndex] = {
        ...updated.panoramas[currentPanoramaIndex],
        hotspots: updated.panoramas[currentPanoramaIndex].hotspots.map((h) =>
          h.id === hotspotId ? ({ ...h, ...updates } as Hotspot) : h
        ),
      };
      return updated;
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (!res.ok) throw new Error('Failed to save');
      toast.success('Konfiguracja zapisana');
    } catch {
      toast.error('Nie udało się zapisać');
    } finally {
      setIsSaving(false);
    }
  };

  const copyCoordinates = () => {
    if (clickedPosition) {
      const text = `${clickedPosition.x}, ${clickedPosition.y}, ${clickedPosition.z}`;
      navigator.clipboard.writeText(text);
      toast.success('Współrzędne skopiowane');
    }
  };

  const toggleAutoRotate = () => {
    const viewer = viewerRef.current as {
      OrbitControls?: { autoRotate: boolean };
    };
    if (viewer?.OrbitControls) {
      const newValue = !autoRotate;
      viewer.OrbitControls.autoRotate = newValue;
      setAutoRotate(newValue);
      toast.success(
        newValue ? 'Auto-rotacja włączona' : 'Auto-rotacja wyłączona'
      );
    }
  };

  const takeScreenshot = () => {
    const viewer = viewerRef.current as {
      getRenderer?: () => { domElement: HTMLCanvasElement };
    };
    if (viewer?.getRenderer) {
      const canvas = viewer.getRenderer().domElement;
      const link = document.createElement('a');
      link.download = `panorama-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success('Screenshot zapisany');
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

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

      <div className="fixed inset-0 flex bg-zinc-900">
        {/* Viewer */}
        <div className="flex-1 relative">
          <div
            ref={containerRef}
            className={`w-full h-full ${
              isAddingMode ? 'cursor-crosshair' : ''
            }`}
          />

          {/* Loading indicator */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 pointer-events-none">
              <div className="flex items-center gap-3 bg-black/70 text-white px-4 py-2 rounded-lg">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Ładowanie panoramy...</span>
              </div>
            </div>
          )}

          {/* Top bar */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href={`/admin/projects/${projectId}`}>
                <Button variant="secondary" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Powrót
                </Button>
              </Link>
              <span className="text-white font-medium">{projectName}</span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="icon"
                onClick={toggleAutoRotate}
                className={
                  autoRotate
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : ''
                }
                title="Auto-rotacja"
              >
                <RotateCw className="h-4 w-4" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                onClick={takeScreenshot}
                title="Screenshot"
              >
                <Camera className="h-4 w-4" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                onClick={toggleFullscreen}
                title="Pełny ekran"
              >
                <Maximize className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Coordinates display */}
          {isAddingMode && clickedPosition && (
            <div className="absolute bottom-4 left-4 bg-black/70 text-white px-4 py-2 rounded-lg flex items-center gap-3">
              <span className="font-mono">
                {clickedPosition.x}, {clickedPosition.y}, {clickedPosition.z}
              </span>
              <Button variant="ghost" size="sm" onClick={copyCoordinates}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Adding mode indicator */}
          {isAddingMode && (
            <div className="absolute bottom-4 right-4 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium">
              Tryb dodawania hotspota
            </div>
          )}
        </div>

        {/* Side panel */}
        <div className="w-80 bg-white dark:bg-zinc-950 border-l flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Panorama selector */}
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm">Panorama</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-2">
                <Select
                  value={String(currentPanoramaIndex)}
                  onValueChange={(v) => handlePanoramaChange(Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {config.panoramas.map((p, i) => (
                      <SelectItem key={p.id} value={String(i)}>
                        #{i + 1} - {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Add hotspot */}
            <Card className={isAddingMode ? 'ring-2 ring-primary' : ''}>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  Dodaj hotspot
                  {isAddingMode && (
                    <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">
                      Aktywny
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-2 space-y-3">
                <Button
                  className="w-full"
                  variant={isAddingMode ? 'default' : 'outline'}
                  onClick={toggleAddingMode}
                >
                  {isAddingMode ? (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Anuluj wybieranie
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Wybierz pozycję
                    </>
                  )}
                </Button>

                {isAddingMode && clickedPosition && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      Wybrana pozycja:{' '}
                      <span className="font-mono">
                        {clickedPosition.x}, {clickedPosition.y},{' '}
                        {clickedPosition.z}
                      </span>
                    </p>
                    <Button className="w-full" onClick={handleAddHotspot}>
                      <Plus className="h-4 w-4 mr-2" />
                      Dodaj hotspot tutaj
                    </Button>
                  </div>
                )}

                {isAddingMode && !clickedPosition && (
                  <p className="text-xs text-muted-foreground text-center">
                    Kliknij w panoramę, aby wybrać pozycję
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Hotspot list */}
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm">
                  Hotspoty ({currentPanorama?.hotspots.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-2 space-y-2">
                {currentPanorama?.hotspots.map((hotspot) => (
                  <div
                    key={hotspot.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedHotspotId === hotspot.id
                        ? 'border-primary bg-primary/5'
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => setSelectedHotspotId(hotspot.id)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium truncate">
                        {hotspot.title}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteHotspot(hotspot.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {hotspot.type === 'link' ? 'Link' : 'Info'}
                    </p>
                  </div>
                ))}

                {(!currentPanorama ||
                  currentPanorama.hotspots.length === 0) && (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    Brak hotspotów
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Hotspot editor */}
            {selectedHotspot && (
              <Card>
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm">Edycja hotspotu</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-2 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Tytuł</Label>
                    <Input
                      value={selectedHotspot.title}
                      onChange={(e) =>
                        handleUpdateHotspot(selectedHotspot.id, {
                          title: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Typ</Label>
                    <Select
                      value={selectedHotspot.type}
                      onValueChange={(v) =>
                        handleUpdateHotspot(selectedHotspot.id, {
                          type: v as 'link' | 'info',
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="link">Link</SelectItem>
                        <SelectItem value="info">Info</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedHotspot.type === 'link' && (
                    <div className="space-y-2">
                      <Label className="text-xs">Cel (panorama)</Label>
                      <Select
                        value={selectedHotspot.target}
                        onValueChange={(v) =>
                          handleUpdateHotspot(selectedHotspot.id, { target: v })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {config.panoramas.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label className="text-xs">Pozycja</Label>
                    <div className="grid grid-cols-3 gap-2">
                      <Input
                        type="number"
                        value={selectedHotspot.position.x}
                        onChange={(e) =>
                          handleUpdateHotspot(selectedHotspot.id, {
                            position: {
                              ...selectedHotspot.position,
                              x: Number(e.target.value),
                            },
                          })
                        }
                        placeholder="X"
                      />
                      <Input
                        type="number"
                        value={selectedHotspot.position.y}
                        onChange={(e) =>
                          handleUpdateHotspot(selectedHotspot.id, {
                            position: {
                              ...selectedHotspot.position,
                              y: Number(e.target.value),
                            },
                          })
                        }
                        placeholder="Y"
                      />
                      <Input
                        type="number"
                        value={selectedHotspot.position.z}
                        onChange={(e) =>
                          handleUpdateHotspot(selectedHotspot.id, {
                            position: {
                              ...selectedHotspot.position,
                              z: Number(e.target.value),
                            },
                          })
                        }
                        placeholder="Z"
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        if (clickedPosition) {
                          handleUpdateHotspot(selectedHotspot.id, {
                            position: clickedPosition,
                          });
                          toast.success('Pozycja zaktualizowana');
                        }
                      }}
                      disabled={!clickedPosition}
                    >
                      Użyj klikniętej pozycji
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Save button at bottom */}
          <div className="p-4 border-t bg-white dark:bg-zinc-950">
            <Button className="w-full" onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Zapisz zmiany
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
