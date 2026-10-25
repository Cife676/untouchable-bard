'use client';

import React from 'react';
import { Play, Square, Layers, Repeat, Volume2, Edit3, Star, Plus, Shield } from 'lucide-react';
import { Scene } from '@/types/audio';
import { useTabletop } from '@/context/TabletopContext';
import { useAudioEngine } from '@/lib/hooks/useAudioEngine';
import { useSession } from '@/lib/session/useSession';

interface CurrentSceneProps {
  scene: Scene | null;
}

export const CurrentScene: React.FC<CurrentSceneProps> = ({ scene }) => {
  const { assets, openSceneEditor, toggleSceneFavorite } = useTabletop();
  const { playAsset, stopChannel, snapshot, setChannelVolume } = useAudioEngine();
  const { startScene, stopScene } = useSession();

  // If no scene is currently selected or campaign is empty
  if (!scene) {
    return (
      <section className="bg-[#131720] border border-[#232936] rounded-xl p-8 shadow-lg text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400 mx-auto">
          <Layers className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-base font-bold text-neutral-200 uppercase tracking-wider">
            No Active Scene
          </h3>
          <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
            Select a scene from your campaign below or create a new multi-channel audio scene to begin.
          </p>
        </div>
        <button
          onClick={() => openSceneEditor()}
          className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-neutral-950 font-bold text-xs uppercase tracking-wider rounded-lg shadow transition cursor-pointer inline-flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Create Scene</span>
        </button>
      </section>
    );
  }

  // Check if any layer in this scene is currently playing
  const isScenePlaying = scene.layers.some(
    (layer) => snapshot.channels[layer.channel]?.isPlaying
  );

  const handleStartScene = async () => {
    // Dispatch through SessionController to ensure Discord receives SCENE_START
    startScene(scene.id);

    // Play in local Web Audio Engine
    for (const layer of scene.layers) {
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

  const handleStopScene = () => {
    stopScene(1.5);
    for (const layer of scene.layers) {
      stopChannel(layer.channel, 1.5);
    }
  };

  return (
    <section className="bg-[#131720] border border-[#232936] rounded-xl p-6 shadow-lg space-y-6">
      {/* Scene Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-[#232936]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-500 bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/20">
              Active Scene
            </span>
            {scene.category && (
              <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded bg-[#1e2535] text-amber-300 border border-[#2b354b]">
                {scene.category}
              </span>
            )}
            <button
              onClick={() => toggleSceneFavorite(scene.id)}
              className="text-neutral-500 hover:text-amber-400 transition cursor-pointer p-0.5"
              title={scene.isFavorite ? 'Remove favorite' : 'Mark as favorite'}
            >
              <Star className={`w-3.5 h-3.5 ${scene.isFavorite ? 'fill-amber-400 text-amber-400' : ''}`} />
            </button>
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            {scene.name}
          </h2>
          <p className="text-sm text-neutral-400 mt-1 max-w-2xl">
            {scene.description || 'No description provided.'}
          </p>
        </div>

        {/* Scene Playback & Edit Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => openSceneEditor(scene)}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#1a202c] hover:bg-[#252d3d] text-neutral-300 border border-[#2c3649] rounded-lg text-xs font-semibold transition cursor-pointer"
            title="Open in Scene Builder to add/modify layers"
          >
            <Edit3 className="w-3.5 h-3.5 text-amber-400" />
            <span>Edit Scene</span>
          </button>

          <button
            onClick={handleStartScene}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-neutral-950 font-bold text-xs uppercase tracking-wider rounded-lg shadow-lg hover:shadow-amber-600/30 transition transform active:scale-95 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-neutral-950" />
            <span>Play Scene</span>
          </button>

          <button
            onClick={handleStopScene}
            disabled={!isScenePlaying}
            className="flex items-center gap-2 px-3.5 py-2 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 text-neutral-200 font-semibold text-xs uppercase tracking-wider rounded-lg border border-neutral-700 transition cursor-pointer"
          >
            <Square className="w-4 h-4" />
            <span>Fade Out</span>
          </button>
        </div>
      </div>

      {/* Active Scene Layers */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-400" />
            <span>Configured Audio Layers ({scene.layers.length})</span>
          </h3>
          <span className="text-[11px] text-neutral-500">Smooth Multi-Layer Mixing</span>
        </div>

        {scene.layers.length === 0 ? (
          <div className="p-6 border border-dashed border-[#242c3d] rounded-lg text-center bg-[#151923]">
            <p className="text-xs text-neutral-400">No layers configured for this scene yet.</p>
            <button
              onClick={() => openSceneEditor(scene)}
              className="mt-2 text-xs text-amber-400 hover:underline font-semibold"
            >
              Open Scene Builder to add audio layers
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {scene.layers.map((layer) => {
              const channelState = snapshot.channels[layer.channel];
              const isLayerActive = channelState?.isPlaying;
              const asset = assets.find((a) => a.id === layer.assetId);

              return (
                <div
                  key={layer.id}
                  className={`p-4 rounded-lg border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition ${
                    isLayerActive
                      ? 'bg-[#18202d] border-[#37445c]'
                      : 'bg-[#151922] border-[#222733]'
                  }`}
                >
                  {/* Layer Info */}
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-md flex items-center justify-center font-bold text-xs uppercase ${
                        layer.channel === 'music'
                          ? 'bg-purple-950/70 text-purple-300 border border-purple-800'
                          : layer.channel === 'ambience'
                          ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-800'
                          : layer.channel === 'environment'
                          ? 'bg-blue-950/70 text-blue-300 border border-blue-800'
                          : 'bg-amber-950/70 text-amber-300 border border-amber-800'
                      }`}
                    >
                      {layer.channel.slice(0, 3)}
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm text-neutral-200">
                        {layer.name} {asset?.isCustom ? '★' : ''}
                      </h4>
                      <div className="flex items-center gap-2 text-[11px] text-neutral-400">
                        <span className="capitalize">{layer.channel} Channel</span>
                        {layer.loop && (
                          <span className="flex items-center gap-1 text-amber-400/80">
                            <Repeat className="w-3 h-3" /> Loop
                          </span>
                        )}
                        <span>• Fade: {layer.fadeDuration ?? 1.5}s</span>
                      </div>
                    </div>
                  </div>

                  {/* Layer Volume & Toggle */}
                  <div className="flex items-center gap-4 w-full md:w-auto justify-end">
                    <div className="flex items-center gap-2">
                      <Volume2 className="w-4 h-4 text-neutral-400" />
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={channelState?.volume ?? layer.volume}
                        onChange={(e) =>
                          setChannelVolume(layer.channel, parseFloat(e.target.value))
                        }
                        className="w-24 md:w-32 h-1.5 bg-[#252c3c] accent-amber-500 rounded cursor-pointer"
                      />
                      <span className="text-[11px] font-mono text-neutral-400 w-8 text-right">
                        {Math.round((channelState?.volume ?? layer.volume) * 100)}%
                      </span>
                    </div>

                    <button
                      onClick={async () => {
                        if (isLayerActive) {
                          stopChannel(layer.channel, 1.0);
                        } else if (asset) {
                          await playAsset(
                            layer.channel,
                            layer.assetId,
                            asset.fileUrl,
                            {
                              volume: layer.volume,
                              loop: layer.loop,
                              fadeDuration: 1.0,
                            },
                            layer.name
                          );
                        }
                      }}
                      className={`px-3 py-1.5 rounded text-xs font-medium border transition cursor-pointer ${
                        isLayerActive
                          ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border-neutral-700'
                          : 'bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border-amber-500/40'
                      }`}
                    >
                      {isLayerActive ? 'Fade Out' : 'Play Layer'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
