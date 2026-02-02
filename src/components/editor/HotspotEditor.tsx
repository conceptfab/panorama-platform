'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Script from 'next/script';
import Link from 'next/link';
import { ProjectConfig, Hotspot, Position3D } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, Plus, Trash2, Copy, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { generateId } from '@/utils/helpers';

interface HotspotEditorProps {
  projectId: string;
  projectName: string;
  initialConfig: ProjectConfig;
}

export function HotspotEditor({ projectId, projectName, initialConfig }: HotspotEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<unknown>(null);
  const panoramasRef = useRef<unknown[]>([]);

  const [config, setConfig] = useState<ProjectConfig>(initialConfig);
  const [scriptsLoaded, setScriptsLoaded] = useState(false);
  const [currentPanoramaIndex, setCurrentPanoramaIndex] = useState(0);
  const [selectedHotspotId, setSelectedHotspotId] = useState<string | null>(null);
  const [clickedPosition, setClickedPosition] = useState<Position3D | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const currentPanorama = config.panoramas[currentPanoramaIndex];
  const selectedHotspot = currentPanorama?.hotspots.find(h => h.id === selectedHotspotId);
  const basePath = `/uploads/projects/${projectId}`;

  const initViewer = useCallback(() => {
    if (!containerRef.current || !window.PANOLENS || !window.THREE) return;

    const THREE = window.THREE;
    const PANOLENS = window.PANOLENS;

    const viewer = new PANOLENS.Viewer({
      container: containerRef.current,
      controlBar: false,
      cameraFov: 55,
    });

    viewerRef.current = viewer;

    const panoramas: unknown[] = [];

    config.panoramas.forEach((panoData, index) => {
      const imagePath = `${basePath}/panoramas/${panoData.file}`;
      const panorama = new PANOLENS.ImagePanorama(imagePath);

      panorama.addEventListener('enter', () => {
        const pos = panoData.initialPosition;
        viewer.tweenControlCenter(
          new THREE.Vector3(pos.x, pos.y, pos.z),
          400
        );
      });

      panoramas[index] = panorama;
    });

    panoramasRef.current = panoramas;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    panoramas.forEach((p) => (viewer as any).add(p));

    if (panoramas.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (viewer as any).setPanorama(panoramas[0]);
    }

    // Click handler for coordinate picking
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    containerRef.current.addEventListener('click', (event: MouseEvent) => {
      if (!viewer.panorama) return;

      const rect = containerRef.current!.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, viewer.camera);
      const hits = raycaster.intersectObject(viewer.panorama, true);

      if (hits.length > 0) {
        const pt = hits[0].point;
        // Negate X as in original editor
        setClickedPosition({
          x: Math.round(-pt.x),
          y: Math.round(pt.y),
          z: Math.round(pt.z),
        });
      }
    });
  }, [config.panoramas, basePath]);

  useEffect(() => {
    if (scriptsLoaded) {
      const timer = setTimeout(initViewer, 100);
      return () => clearTimeout(timer);
    }
  }, [scriptsLoaded, initViewer]);

  useEffect(() => {
    return () => {
      if (viewerRef.current) {
        (viewerRef.current as { dispose?: () => void }).dispose?.();
      }
    };
  }, []);

  const handlePanoramaChange = (index: number) => {
    setCurrentPanoramaIndex(index);
    setSelectedHotspotId(null);
    setClickedPosition(null);

    const viewer = viewerRef.current as { setPanorama?: (p: unknown) => void };
    const panoramas = panoramasRef.current;
    if (viewer?.setPanorama && panoramas[index]) {
      viewer.setPanorama(panoramas[index]);
    }
  };

  const handleAddHotspot = () => {
    if (!clickedPosition) {
      toast.error('Kliknij w panoramę, aby wybrać pozycję');
      return;
    }

    const newHotspot: Hotspot = {
      id: generateId('hs'),
      type: 'link',
      position: clickedPosition,
      target: config.panoramas[0]?.id || '',
      title: 'Nowy hotspot',
      icon: 'arrow-up',
      scale: 1.0,
    };

    setConfig((prev) => {
      const updated = { ...prev };
      updated.panoramas = [...prev.panoramas];
      updated.panoramas[currentPanoramaIndex] = {
        ...updated.panoramas[currentPanoramaIndex],
        hotspots: [...updated.panoramas[currentPanoramaIndex].hotspots, newHotspot],
      };
      return updated;
    });

    setSelectedHotspotId(newHotspot.id);
    toast.success('Hotspot dodany');
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

  const handleUpdateHotspot = (hotspotId: string, updates: Partial<Hotspot>) => {
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

  return (
    <>
      <Script
        src="/panolens/three.min.js"
        strategy="afterInteractive"
        onLoad={() => {
          window.process = window.process || { env: {} };
        }}
      />
      <Script
        src="/panolens/panolens.min.js"
        strategy="afterInteractive"
        onLoad={() => setScriptsLoaded(true)}
      />

      <div className="fixed inset-0 flex bg-zinc-900">
        {/* Viewer */}
        <div className="flex-1 relative">
          <div ref={containerRef} className="w-full h-full" />

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

            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Zapisz
            </Button>
          </div>

          {/* Coordinates display */}
          {clickedPosition && (
            <div className="absolute bottom-4 left-4 bg-black/70 text-white px-4 py-2 rounded-lg flex items-center gap-3">
              <span className="font-mono">
                {clickedPosition.x}, {clickedPosition.y}, {clickedPosition.z}
              </span>
              <Button variant="ghost" size="sm" onClick={copyCoordinates}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Side panel */}
        <div className="w-80 bg-white dark:bg-zinc-950 border-l overflow-y-auto">
          <div className="p-4 space-y-4">
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
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm">Dodaj hotspot</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-2">
                <p className="text-xs text-muted-foreground mb-3">
                  Kliknij w panoramę, aby wybrać pozycję
                </p>
                <Button
                  className="w-full"
                  onClick={handleAddHotspot}
                  disabled={!clickedPosition}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Dodaj hotspot
                </Button>
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

                {(!currentPanorama || currentPanorama.hotspots.length === 0) && (
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
        </div>
      </div>
    </>
  );
}
