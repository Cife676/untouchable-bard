'use client';

import React, { useState } from 'react';
import {
  Library,
  Play,
  Square,
  Repeat,
  Search,
  Upload,
  Edit3,
  Trash2,
  FileAudio,
  Sparkles,
} from 'lucide-react';
import { useTabletop } from '@/context/TabletopContext';
import { useAudioEngine } from '@/lib/hooks/useAudioEngine';
import { useSession } from '@/lib/session/useSession';
import { AudioAsset, AudioCategoryType, ChannelId } from '@/types/audio';

const CATEGORY_TO_CHANNEL: Record<AudioCategoryType, ChannelId> = {
  MUSIC: 'music',
  AMBIENCE: 'ambience',
  ENVIRONMENT: 'environment',
  SFX: 'sfx',
};

export const AudioLibrary: React.FC = () => {
  const { assets, openImportModal, openAssetEditor, deleteAsset } = useTabletop();
  const { playAsset, stopChannel } = useAudioEngine();

  const [selectedFilter, setSelectedFilter] = useState<'ALL' | AudioCategoryType>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewingId, setPreviewingId] = useState<string | null>(null);

  // Filter and search
  const filteredAssets = assets.filter((asset) => {
    const matchesFilter = selectedFilter === 'ALL' || asset.type === selectedFilter;
    const matchesSearch =
      searchQuery.trim() === '' ||
      asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const { triggerSfx: triggerDiscordSfx, stopAll: stopDiscordAll, outputTarget } = useSession();

  const handlePreview = async (asset: AudioAsset) => {
    const channelId = CATEGORY_TO_CHANNEL[asset.type];

    if (previewingId === asset.id) {
      stopChannel(channelId, 0.5);
      stopDiscordAll(0.5);
      setPreviewingId(null);
    } else {
      setPreviewingId(asset.id);
      if (outputTarget === 'discord' || outputTarget === 'both') {
        triggerDiscordSfx(asset.id, 0.8);
      }
      if (outputTarget === 'browser' || outputTarget === 'both') {
        await playAsset(
          channelId,
          asset.id,
          asset.fileUrl,
          {
            volume: 0.8,
            loop: asset.loopable,
            fadeDuration: 0.5,
          },
          `Preview: ${asset.name}`
        );
      }
    }
  };

  const handleDelete = async (asset: AudioAsset) => {
    if (confirm(`Delete custom audio asset "${asset.name}"?`)) {
      if (previewingId === asset.id) {
        stopChannel(CATEGORY_TO_CHANNEL[asset.type], 0.2);
        setPreviewingId(null);
      }
      await deleteAsset(asset.id);
    }
  };

  return (
    <section className="bg-[#131720] border border-[#232936] rounded-xl p-5 shadow-lg space-y-4">
      {/* Top Header: Title, Search, Filters, and Import Button */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold tracking-wider uppercase text-neutral-300 flex items-center gap-2">
            <Library className="w-4 h-4 text-amber-400" />
            <span>Audio Asset Library</span>
          </h2>
          <p className="text-[11px] text-neutral-500">
            Manage procedural soundtracks and local audio imports ({assets.length} total tracks)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search audio by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#171b25] border border-[#262e3d] rounded-lg pl-8 pr-3 py-1.5 text-xs text-neutral-200 placeholder:text-neutral-500 focus:outline-hidden focus:border-amber-500/70 w-44 md:w-56"
            />
          </div>

          {/* Import Button */}
          <button
            onClick={openImportModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-neutral-950 font-bold text-xs uppercase tracking-wider rounded-lg shadow transition cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import Audio</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 bg-[#171b24] p-1 rounded-lg border border-[#242b3b] w-fit">
        {(['ALL', 'MUSIC', 'AMBIENCE', 'ENVIRONMENT', 'SFX'] as const).map((filter) => (
          <button
            key={filter}
            onClick={() => setSelectedFilter(filter)}
            className={`px-3 py-1 rounded text-[11px] font-semibold tracking-wider uppercase transition cursor-pointer ${
              selectedFilter === filter
                ? 'bg-amber-600 text-neutral-950 shadow'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Asset Table */}
      <div className="overflow-x-auto rounded-lg border border-[#202737]">
        <table className="w-full text-left text-xs text-neutral-300">
          <thead className="bg-[#161b24] text-[10px] uppercase tracking-wider text-neutral-400 border-b border-[#232936]">
            <tr>
              <th className="py-2.5 px-4">Track Name</th>
              <th className="py-2.5 px-3">Type</th>
              <th className="py-2.5 px-3">Category</th>
              <th className="py-2.5 px-3">Duration</th>
              <th className="py-2.5 px-3">Loop</th>
              <th className="py-2.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1f2533]">
            {filteredAssets.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-neutral-500 italic">
                  No audio assets match your search or filter.
                </td>
              </tr>
            ) : (
              filteredAssets.map((asset) => {
                const isCurrentlyPlaying = previewingId === asset.id;

                return (
                  <tr key={asset.id} className="hover:bg-[#181d29] transition">
                    {/* Name + Source indicator */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <FileAudio className="w-4 h-4 text-neutral-400 shrink-0" />
                        <div>
                          <div className="font-semibold text-neutral-200 flex items-center gap-1.5">
                            <span>{asset.name}</span>
                            {asset.isCustom && (
                              <span className="text-[9px] uppercase tracking-widest px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                Local File
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-neutral-500 font-mono">
                            {asset.fileName ?? asset.id}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Type Badge */}
                    <td className="py-3 px-3">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-mono font-semibold ${
                          asset.type === 'MUSIC'
                            ? 'bg-purple-950/80 text-purple-300 border border-purple-800'
                            : asset.type === 'AMBIENCE'
                            ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                            : asset.type === 'ENVIRONMENT'
                            ? 'bg-blue-950/80 text-blue-300 border border-blue-800'
                            : 'bg-amber-950/80 text-amber-300 border border-amber-800'
                        }`}
                      >
                        {asset.type}
                      </span>
                    </td>

                    {/* Category */}
                    <td className="py-3 px-3 text-neutral-400">{asset.category}</td>

                    {/* Duration */}
                    <td className="py-3 px-3 font-mono text-neutral-400">
                      {asset.duration ? `${asset.duration}s` : '—'}
                    </td>

                    {/* Loop */}
                    <td className="py-3 px-3">
                      {asset.loopable ? (
                        <span className="flex items-center gap-1 text-emerald-400 text-[11px]">
                          <Repeat className="w-3 h-3" /> Yes
                        </span>
                      ) : (
                        <span className="text-neutral-500 text-[11px]">No</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Preview / Stop Button */}
                        <button
                          onClick={() => handlePreview(asset)}
                          className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition cursor-pointer ${
                            isCurrentlyPlaying
                              ? 'bg-red-900/60 hover:bg-red-800 text-red-200 border border-red-700'
                              : 'bg-[#202736] hover:bg-amber-600/30 hover:text-amber-200 text-neutral-300 border border-[#2d364a]'
                          }`}
                          title={isCurrentlyPlaying ? 'Stop Preview' : 'Preview audio in channel'}
                        >
                          {isCurrentlyPlaying ? (
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

                        {/* Edit Button */}
                        <button
                          onClick={() => openAssetEditor(asset)}
                          className="p-1.5 rounded text-neutral-400 hover:text-white hover:bg-[#252e40] transition cursor-pointer"
                          title="Edit asset details"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Button (for custom imported files) */}
                        {asset.isCustom && (
                          <button
                            onClick={() => handleDelete(asset)}
                            className="p-1.5 rounded text-neutral-500 hover:text-red-400 hover:bg-red-950/40 transition cursor-pointer"
                            title="Delete custom asset"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};
