'use client';

import React from 'react';
import { Compass, Star, Play, History, ArrowRight, Layers, Plus, UploadCloud } from 'lucide-react';
import { useSession } from '@/lib/session/useSession';
import { useTabletop } from '@/context/TabletopContext';
import { Scene } from '@/types/audio';

export const LiveSceneGrid: React.FC = () => {
  const { state, startScene } = useSession();
  const { scenes, activeScene, setActiveScene, recentScenes, openSceneEditor, openImportModal } = useTabletop();

  const handleSelectScene = (scene: Scene) => {
    setActiveScene(scene);
    startScene(scene.id);
  };

  // Recent scene objects in current campaign
  const recentSceneObjects = recentScenes
    .map((r) => scenes.find((s) => s.id === r.sceneId))
    .filter((s): s is Scene => Boolean(s));

  return (
    <div className="bg-[#121620] border border-[#242e40] rounded-xl p-5 shadow-lg space-y-4">
      {/* Header & Recent Scenes Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#212b3c]">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-2">
            <Compass className="w-4 h-4 text-amber-400" />
            <span>Scene Quick Select Grid</span>
          </h3>
          <p className="text-[10px] text-neutral-500">
            Click to crossfade smoothly into any encounter ({scenes.length} scenes)
          </p>
        </div>

        {/* Action Buttons: New Scene & Import Audio */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => openImportModal()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#171d29] hover:bg-[#202939] text-neutral-300 hover:text-white border border-[#2b374c] rounded-lg text-xs font-medium transition cursor-pointer"
            title="Import custom audio file (MP3/WAV/OGG) and sync to bot"
          >
            <UploadCloud className="w-3.5 h-3.5 text-amber-400" />
            <span>Import Audio</span>
          </button>

          <button
            onClick={() => openSceneEditor()}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-neutral-950 font-bold text-xs uppercase tracking-wider rounded-lg shadow-sm transition cursor-pointer"
            title="Create a new multi-channel audio scene"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Scene</span>
          </button>
        </div>

        {/* Compact Recent Scenes */}
        {recentSceneObjects.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 max-w-full">
            <span className="text-[10px] font-bold uppercase text-neutral-500 flex items-center gap-1 shrink-0">
              <History className="w-3 h-3" /> Recent:
            </span>
            {recentSceneObjects.slice(0, 4).map((scene) => (
              <button
                key={scene.id}
                onClick={() => handleSelectScene(scene)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer shrink-0 ${
                  scene.id === activeScene?.id
                    ? 'bg-amber-600 text-neutral-950 font-bold'
                    : 'bg-[#181f2c] hover:bg-[#222c3d] text-neutral-300 border border-[#283549]'
                }`}
              >
                {scene.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Grid of Scenes */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
        {scenes.map((scene) => {
          const isActive = scene.id === activeScene?.id;
          const isPlaying = isActive && state.playbackState === 'playing';

          return (
            <button
              key={scene.id}
              onClick={() => handleSelectScene(scene)}
              className={`p-3 rounded-lg border text-left flex flex-col justify-between min-h-[90px] transition transform active:scale-95 group cursor-pointer ${
                isActive
                  ? 'bg-[#1a2333] border-amber-500 shadow-md ring-1 ring-amber-500/50'
                  : scene.isFavorite
                  ? 'bg-[#151c27] border-amber-500/30 hover:border-amber-500/60'
                  : 'bg-[#141924] border-[#222938] hover:border-[#354359]'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-1 mb-1">
                  <span className="font-bold text-xs text-neutral-100 group-hover:text-amber-200 line-clamp-2">
                    {scene.name}
                  </span>
                  {scene.isFavorite && (
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
                  )}
                </div>

                {scene.category && (
                  <span className="text-[9px] uppercase tracking-wider text-amber-400/80 font-mono">
                    {scene.category}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between text-[10px] text-neutral-500 pt-2 border-t border-[#1e2636] mt-2">
                <span>{scene.layers.length} Layers</span>
                {isPlaying ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    LIVE
                  </span>
                ) : (
                  <span className="text-neutral-500 group-hover:text-neutral-300">TRANSITION ▶</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
