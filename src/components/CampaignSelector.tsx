'use client';

import React, { useRef } from 'react';
import {
  Compass,
  Plus,
  FolderOpen,
  Edit3,
  Copy,
  Trash2,
  Upload,
  Calendar,
  Layers,
  Music,
  Shield,
} from 'lucide-react';
import { useTabletop } from '@/context/TabletopContext';
import { Campaign } from '@/types/campaign';

export const CampaignSelector: React.FC = () => {
  const {
    campaigns,
    allScenes,
    assets,
    selectCampaign,
    duplicateCampaign,
    deleteCampaign,
    openCreateCampaignModal,
    openEditCampaignModal,
    importCampaignBackup,
  } = useTabletop();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleBackupFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const success = importCampaignBackup(content);
        if (success) {
          alert('Campaign successfully restored from backup!');
        } else {
          alert('Failed to parse backup JSON. Please check file format.');
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDelete = (campaign: Campaign) => {
    const sceneCount = allScenes.filter((s) => s.campaignId === campaign.id).length;
    if (
      confirm(
        `Are you sure you want to delete campaign "${campaign.name}"?\n\nThis will remove the campaign and its ${sceneCount} scene(s). Audio files in your library will remain safe.`
      )
    ) {
      deleteCampaign(campaign.id);
    }
  };

  const formatDate = (timestamp: number) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return 'Recently';
    }
  };

  return (
    <div className="max-w-6xl w-full mx-auto p-6 space-y-8 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-[#232936]">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            <Compass className="w-7 h-7 text-amber-400" />
            <span>MY CAMPAIGNS</span>
          </h2>
          <p className="text-sm text-neutral-400 mt-1">
            Select an active tabletop campaign or organize encounters for your next RPG session
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleBackupFile}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#1b212d] hover:bg-[#252d3d] text-neutral-300 border border-[#2b3548] rounded-lg text-xs font-semibold transition cursor-pointer"
            title="Import campaign from a JSON backup file"
          >
            <Upload className="w-3.5 h-3.5 text-amber-400" />
            <span>Import Backup</span>
          </button>

          <button
            onClick={openCreateCampaignModal}
            className="flex items-center gap-2 px-5 py-2 bg-amber-600 hover:bg-amber-500 text-neutral-950 font-bold text-xs uppercase tracking-wider rounded-lg shadow-lg hover:shadow-amber-600/30 transition transform active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Campaign</span>
          </button>
        </div>
      </div>

      {/* Campaign Cards Grid or Empty State */}
      {campaigns.length === 0 ? (
        <div className="p-12 text-center border-2 border-dashed border-[#242d3d] rounded-2xl bg-[#121620] space-y-4 max-w-lg mx-auto">
          <div className="w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400 mx-auto">
            <Shield className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-neutral-100 uppercase tracking-wider">
              No Campaigns Yet
            </h3>
            <p className="text-xs text-neutral-400 mt-1 max-w-xs mx-auto">
              Create your first campaign to organize your scenes, ambient audio beds, and sound effects.
            </p>
          </div>
          <button
            onClick={openCreateCampaignModal}
            className="px-6 py-2.5 bg-amber-600 hover:bg-amber-500 text-neutral-950 font-bold text-xs uppercase tracking-wider rounded-lg shadow transition cursor-pointer"
          >
            + Create First Campaign
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaigns.map((camp) => {
            const campaignScenes = allScenes.filter((s) => s.campaignId === camp.id);

            return (
              <div
                key={camp.id}
                className="bg-[#141822] border border-[#232b3b] hover:border-[#38455e] rounded-xl p-6 flex flex-col justify-between transition-all duration-200 shadow-lg hover:shadow-xl group"
              >
                <div>
                  {/* Top Bar: Title & Edit/Duplicate/Delete */}
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="font-bold text-lg text-white group-hover:text-amber-200 transition">
                      {camp.name}
                    </h3>

                    <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition">
                      <button
                        onClick={() => openEditCampaignModal(camp)}
                        className="p-1.5 text-neutral-400 hover:text-white hover:bg-[#202737] rounded transition cursor-pointer"
                        title="Edit Campaign Name & Description"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => duplicateCampaign(camp.id)}
                        className="p-1.5 text-neutral-400 hover:text-amber-300 hover:bg-[#202737] rounded transition cursor-pointer"
                        title="Duplicate Campaign"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDelete(camp)}
                        className="p-1.5 text-neutral-500 hover:text-red-400 hover:bg-red-950/40 rounded transition cursor-pointer"
                        title="Delete Campaign"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-neutral-400 line-clamp-2 mb-4 leading-relaxed">
                    {camp.description || 'No description provided.'}
                  </p>

                  {/* Badges: Scene count & Audio assets */}
                  <div className="flex flex-wrap items-center gap-2 mb-4 text-[11px] text-neutral-400">
                    <span className="flex items-center gap-1 bg-[#1a202d] px-2.5 py-1 rounded border border-[#283244]">
                      <Layers className="w-3.5 h-3.5 text-amber-400" />
                      <span>{campaignScenes.length} Scenes</span>
                    </span>

                    <span className="flex items-center gap-1 bg-[#1a202d] px-2.5 py-1 rounded border border-[#283244]">
                      <Music className="w-3.5 h-3.5 text-purple-400" />
                      <span>{assets.length} Audio Assets</span>
                    </span>
                  </div>
                </div>

                {/* Footer / Open Button */}
                <div className="pt-4 border-t border-[#222838] flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[10px] text-neutral-500">
                    <Calendar className="w-3 h-3" />
                    <span>Updated {formatDate(camp.updatedAt || camp.createdAt)}</span>
                  </div>

                  <button
                    onClick={() => selectCampaign(camp)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-neutral-950 border border-amber-500/40 hover:border-amber-600 rounded-lg text-xs font-bold uppercase tracking-wider transition cursor-pointer"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>Open Dashboard</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
