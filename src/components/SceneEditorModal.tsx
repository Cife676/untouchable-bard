'use client';

import React, { useState } from 'react';
import {
  Compass,
  X,
  Plus,
  Trash2,
  Play,
  Square,
  Repeat,
  Volume2,
  Save,
  Layers,
  ArrowUp,
  ArrowDown,
  Music,
  Wind,
  CloudRain,
  Zap,
  Tag,
} from 'lucide-react';
import { useTabletop } from '@/context/TabletopContext';
import { useAudioEngine } from '@/lib/hooks/useAudioEngine';
import { ChannelId, Scene, SceneLayer } from '@/types/audio';
import { SceneCategory } from '@/types/campaign';

const CHANNEL_ICONS: Record<ChannelId, React.ReactNode> = {
  music: <Music className="w-4 h-4 text-purple-400" />,
  ambience: <Wind className="w-4 h-4 text-emerald-400" />,
  environment: <CloudRain className="w-4 h-4 text-blue-400" />,
  sfx: <Zap className="w-4 h-4 text-amber-400" />,
};

const CATEGORIES: SceneCategory[] = [
  'Exploration',
  'Combat',
  'Boss',
  'Town',
  'Dungeon',
  'Mystery',
  'Travel',
  'Cutscene',
  'Custom',
];

export const SceneEditorModal: React.FC = () => {
  const { editingScene, closeSceneEditor, saveScene, deleteScene, assets, activeCampaign } =
    useTabletop();
  const { playAsset, stopChannel, stopAll } = useAudioEngine();

  const [sceneState, setSceneState] = useState<Scene | null>(editingScene);
  const [activePreviewLayerId, setActivePreviewLayerId] = useState<string | null>(null);
  const [isPreviewingFullScene, setIsPreviewingFullScene] = useState(false);

  React.useEffect(() => {
    setSceneState(editingScene ? JSON.parse(JSON.stringify(editingScene)) : null);
    setIsPreviewingFullScene(false);
    setActivePreviewLayerId(null);
  }, [editingScene]);

  if (!sceneState) return null;

  // Add Layer
  const handleAddLayer = () => {
    const defaultAsset = assets[0];
    const defaultChannel: ChannelId =
      defaultAsset?.type.toLowerCase() === 'music'
        ? 'music'
        : defaultAsset?.type.toLowerCase() === 'ambience'
        ? 'ambience'
        : defaultAsset?.type.toLowerCase() === 'environment'
        ? 'environment'
        : 'sfx';

    const newLayer: SceneLayer = {
      id: `layer_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      assetId: defaultAsset?.id ?? '',
      channel: defaultChannel,
      name: defaultAsset?.name ?? 'New Audio Layer',
      volume: 0.5,
      loop: true,
      fadeDuration: 1.5,
    };

    setSceneState((prev) => (prev ? { ...prev, layers: [...prev.layers, newLayer] } : null));
  };

  const handleRemoveLayer = (layerId: string) => {
    setSceneState((prev) =>
      prev ? { ...prev, layers: prev.layers.filter((l) => l.id !== layerId) } : null
    );
  };

  const handleMoveLayer = (index: number, direction: 'up' | 'down') => {
    setSceneState((prev) => {
      if (!prev) return null;
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.layers.length) return prev;

      const newLayers = [...prev.layers];
      const temp = newLayers[index];
      newLayers[index] = newLayers[targetIndex];
      newLayers[targetIndex] = temp;
      return { ...prev, layers: newLayers };
    });
  };

  const handleUpdateLayer = (layerId: string, updates: Partial<SceneLayer>) => {
    setSceneState((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        layers: prev.layers.map((l) => {
          if (l.id !== layerId) return l;

          if (updates.assetId && updates.assetId !== l.assetId) {
            const asset = assets.find((a) => a.id === updates.assetId);
            if (asset) {
              const guessedChannel: ChannelId =
                asset.type === 'MUSIC'
                  ? 'music'
                  : asset.type === 'AMBIENCE'
                  ? 'ambience'
                  : asset.type === 'ENVIRONMENT'
                  ? 'environment'
                  : 'sfx';

              return {
                ...l,
                ...updates,
                name: asset.name,
                channel: updates.channel ?? guessedChannel,
                loop: asset.loopable,
              };
            }
          }

          if (updates.channel && updates.channel !== l.channel && updates.loop === undefined) {
            const shouldLoop = updates.channel === 'music' || updates.channel === 'ambience' || updates.channel === 'environment';
            return {
              ...l,
              ...updates,
              loop: shouldLoop,
            };
          }

          return { ...l, ...updates };
        }),
      };
    });
  };

  // Preview Layer
  const handlePreviewLayer = async (layer: SceneLayer) => {
    const asset = assets.find((a) => a.id === layer.assetId);
    if (!asset) return;

    if (activePreviewLayerId === layer.id) {
      stopChannel(layer.channel, 0.5);
      setActivePreviewLayerId(null);
    } else {
      setActivePreviewLayerId(layer.id);
      await playAsset(
        layer.channel,
        layer.assetId,
        asset.fileUrl,
        {
          volume: layer.volume,
          loop: layer.loop,
          fadeDuration: 0.5,
        },
        `Preview: ${layer.name}`
      );
    }
  };

  // Preview Scene
  const handlePreviewFullScene = async () => {
    setIsPreviewingFullScene(true);
    for (const layer of sceneState.layers) {
      const asset = assets.find((a) => a.id === layer.assetId);
      if (asset) {
        await playAsset(
          layer.channel,
          layer.assetId,
          asset.fileUrl,
          {
            volume: layer.volume,
            loop: layer.loop,
            fadeDuration: layer.fadeDuration ?? 1.5,
          },
          layer.name
        );
      }
    }
  };

  const handleStopPreview = () => {
    stopAll(1.0);
    setIsPreviewingFullScene(false);
    setActivePreviewLayerId(null);
  };

  const handleSave = () => {
    if (!sceneState.name.trim()) {
      alert('Please enter a scene name.');
      return;
    }
    saveScene(sceneState);
  };

  const handleDelete = () => {
    if (confirm(`Delete scene "${sceneState.name}" from this campaign?`)) {
      deleteScene(sceneState.id);
      closeSceneEditor();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="bg-[#121620] border border-[#273142] rounded-xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl text-neutral-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#232b3b] bg-[#141924] rounded-t-xl">
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-bold text-base tracking-wide text-neutral-100 flex items-center gap-2">
                <span>SCENE BUILDER</span>
                <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {activeCampaign?.name ?? 'Campaign'}
                </span>
              </h3>
              <p className="text-xs text-neutral-400">
                Configure layers, volume buses, and looping for this encounter
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDelete}
              className="text-red-400 hover:text-red-300 hover:bg-red-950/40 p-2 rounded transition cursor-pointer text-xs flex items-center gap-1"
              title="Delete this scene"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete</span>
            </button>
            <button
              onClick={() => {
                handleStopPreview();
                closeSceneEditor();
              }}
              className="text-neutral-400 hover:text-white p-2 rounded transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Metadata Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pb-4 border-b border-[#232b3b]">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Scene Name
              </label>
              <input
                type="text"
                value={sceneState.name}
                onChange={(e) => setSceneState({ ...sceneState, name: e.target.value })}
                placeholder="e.g. Haunted Forest, Tavern Brawl"
                className="w-full bg-[#181d29] border border-[#2c3649] rounded px-3 py-2 text-sm font-semibold text-neutral-100 focus:outline-hidden focus:border-amber-500"
              />
            </div>

            <div className="md:col-span-1">
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Category
              </label>
              <select
                value={sceneState.category ?? 'Exploration'}
                onChange={(e) =>
                  setSceneState({ ...sceneState, category: e.target.value as SceneCategory })
                }
                className="w-full bg-[#181d29] border border-[#2c3649] rounded px-3 py-2 text-xs text-neutral-200 focus:outline-hidden focus:border-amber-500"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-1">
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Crossfade (sec)
              </label>
              <input
                type="number"
                min="0"
                max="30"
                step="0.5"
                value={sceneState.transitionOverride ?? ''}
                onChange={(e) => {
                  const val = e.target.value === '' ? undefined : Math.max(0, parseFloat(e.target.value));
                  setSceneState({ ...sceneState, transitionOverride: val });
                }}
                placeholder="Default"
                className="w-full bg-[#181d29] border border-[#2c3649] rounded px-3 py-2 text-xs text-neutral-200 focus:outline-hidden focus:border-amber-500 font-mono"
              />
            </div>

            <div className="md:col-span-4">
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Description / GM Narration Cue
              </label>
              <input
                type="text"
                value={sceneState.description}
                onChange={(e) => setSceneState({ ...sceneState, description: e.target.value })}
                placeholder="Atmospheric context for tabletop narration..."
                className="w-full bg-[#181d29] border border-[#2c3649] rounded px-3 py-2 text-xs text-neutral-300 focus:outline-hidden focus:border-amber-500"
              />
            </div>
          </div>

          {/* Configured Audio Layers */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-400" />
                <span>Audio Layers ({sceneState.layers.length})</span>
              </h4>
              <button
                onClick={handleAddLayer}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 rounded text-xs font-semibold transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Audio Layer</span>
              </button>
            </div>

            {sceneState.layers.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-[#283244] rounded-lg bg-[#141924]">
                <p className="text-sm text-neutral-400">No audio layers configured yet.</p>
                <button
                  onClick={handleAddLayer}
                  className="mt-3 text-xs text-amber-400 font-semibold hover:underline inline-flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add your first layer
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {sceneState.layers.map((layer, index) => {
                  const isLayerPreviewing = activePreviewLayerId === layer.id;

                  return (
                    <div
                      key={layer.id}
                      className="p-4 rounded-lg bg-[#161b26] border border-[#252e3e] space-y-3 hover:border-[#354259] transition"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        {/* Channel Badge & Selector */}
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded bg-[#1f2636]">
                            {CHANNEL_ICONS[layer.channel]}
                          </div>
                          <select
                            value={layer.channel}
                            onChange={(e) =>
                              handleUpdateLayer(layer.id, {
                                channel: e.target.value as ChannelId,
                              })
                            }
                            className="bg-[#1a202d] border border-[#2e3748] rounded px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-amber-300 focus:outline-hidden"
                          >
                            <option value="music">MUSIC BUS</option>
                            <option value="ambience">AMBIENCE BUS</option>
                            <option value="environment">ENVIRONMENT BUS</option>
                            <option value="sfx">SFX BUS</option>
                          </select>
                        </div>

                        {/* Layer Reorder and Actions */}
                        <div className="flex items-center gap-1.5">
                          {/* Order Buttons */}
                          <div className="flex items-center bg-[#1c2230] border border-[#2a3447] rounded p-0.5">
                            <button
                              onClick={() => handleMoveLayer(index, 'up')}
                              disabled={index === 0}
                              className="p-1 text-neutral-400 hover:text-white disabled:opacity-20 cursor-pointer"
                              title="Move layer up"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleMoveLayer(index, 'down')}
                              disabled={index === sceneState.layers.length - 1}
                              className="p-1 text-neutral-400 hover:text-white disabled:opacity-20 cursor-pointer"
                              title="Move layer down"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <button
                            onClick={() => handlePreviewLayer(layer)}
                            className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 border transition cursor-pointer ${
                              isLayerPreviewing
                                ? 'bg-red-900/60 text-red-200 border-red-700'
                                : 'bg-[#202737] hover:bg-[#283247] text-neutral-300 border-[#2f394d]'
                            }`}
                          >
                            {isLayerPreviewing ? (
                              <>
                                <Square className="w-3 h-3" />
                                <span>Stop</span>
                              </>
                            ) : (
                              <>
                                <Play className="w-3 h-3 text-emerald-400" />
                                <span>Preview</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => handleRemoveLayer(layer.id)}
                            className="p-1 text-neutral-500 hover:text-red-400 rounded transition cursor-pointer"
                            title="Remove layer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Asset Dropdown & Layer Volume */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                        <div>
                          <label className="block text-[11px] text-neutral-400 mb-1">
                            Assigned Audio Asset
                          </label>
                          <select
                            value={layer.assetId}
                            onChange={(e) =>
                              handleUpdateLayer(layer.id, { assetId: e.target.value })
                            }
                            className="w-full bg-[#1c2230] border border-[#2d3749] rounded px-3 py-1.5 text-xs text-neutral-200 focus:outline-hidden focus:border-amber-500"
                          >
                            {assets.map((asset) => (
                              <option key={asset.id} value={asset.id}>
                                [{asset.type}] {asset.name} {asset.isCustom ? '★ (Custom)' : ''}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Volume & Looping */}
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex justify-between text-[11px] text-neutral-400 mb-1">
                              <span className="flex items-center gap-1">
                                <Volume2 className="w-3.5 h-3.5" /> Layer Volume
                              </span>
                              <span className="font-mono text-amber-300">
                                {Math.round(layer.volume * 100)}%
                              </span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="0.01"
                              value={layer.volume}
                              onChange={(e) =>
                                handleUpdateLayer(layer.id, {
                                  volume: parseFloat(e.target.value),
                                })
                              }
                              className="w-full h-1.5 bg-[#252d3d] accent-amber-500 rounded cursor-pointer"
                            />
                          </div>

                          <div className="pt-4 flex items-center gap-2">
                            <input
                              type="checkbox"
                              id={`loop-${layer.id}`}
                              checked={layer.loop}
                              onChange={(e) =>
                                handleUpdateLayer(layer.id, { loop: e.target.checked })
                              }
                              className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                            />
                            <label
                              htmlFor={`loop-${layer.id}`}
                              className="text-xs text-neutral-300 cursor-pointer flex items-center gap-1"
                            >
                              <Repeat className="w-3 h-3 text-amber-400" />
                              <span>Loop</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#232b3b] bg-[#141924] rounded-b-xl flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePreviewFullScene}
              className="px-4 py-2 bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-200 border border-emerald-800/70 rounded text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-emerald-300" />
              <span>Preview Scene</span>
            </button>

            <button
              onClick={handleStopPreview}
              className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
            >
              <Square className="w-3.5 h-3.5" />
              <span>Stop Scene</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                handleStopPreview();
                closeSceneEditor();
              }}
              className="px-4 py-2 text-xs font-semibold text-neutral-400 hover:text-white transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              onClick={handleSave}
              className="px-6 py-2 bg-amber-600 hover:bg-amber-500 text-neutral-950 font-bold text-xs uppercase tracking-wider rounded shadow-lg transition flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save Scene</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
