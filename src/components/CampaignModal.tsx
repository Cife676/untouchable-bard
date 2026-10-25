'use client';

import React, { useState, useEffect } from 'react';
import { BookOpen, X, Save } from 'lucide-react';
import { useTabletop } from '@/context/TabletopContext';

export const CampaignModal: React.FC = () => {
  const {
    campaignModalMode,
    editingCampaignData,
    closeCampaignModal,
    createCampaign,
    updateCampaign,
  } = useTabletop();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (campaignModalMode === 'edit' && editingCampaignData) {
      setName(editingCampaignData.name);
      setDescription(editingCampaignData.description);
    } else {
      setName('');
      setDescription('');
    }
  }, [campaignModalMode, editingCampaignData]);

  if (!campaignModalMode) return null;

  const handleSave = () => {
    if (!name.trim()) {
      alert('Please enter a campaign name.');
      return;
    }

    if (campaignModalMode === 'create') {
      createCampaign(name, description);
    } else if (editingCampaignData) {
      updateCampaign(editingCampaignData.id, {
        name: name.trim(),
        description: description.trim(),
      });
    }
    closeCampaignModal();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="bg-[#12161f] border border-[#262f40] rounded-xl max-w-md w-full p-6 shadow-2xl space-y-5 text-neutral-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#232b3b]">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-base tracking-wide text-neutral-100">
              {campaignModalMode === 'create' ? 'Create New Campaign' : 'Edit Campaign Details'}
            </h3>
          </div>
          <button
            onClick={closeCampaignModal}
            className="text-neutral-400 hover:text-white p-1 rounded transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1">
              Campaign Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Curse of the Crimson Moon, Spire of Shadows"
              className="w-full bg-[#181d29] border border-[#2c3649] rounded px-3 py-2 text-sm text-neutral-100 focus:outline-hidden focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1">
              Description / Setting Notes
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief summary of setting, tone, and campaign theme..."
              className="w-full bg-[#181d29] border border-[#2c3649] rounded px-3 py-2 text-xs text-neutral-300 focus:outline-hidden focus:border-amber-500 resize-none"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#232b3b]">
          <button
            onClick={closeCampaignModal}
            className="px-4 py-2 rounded text-xs font-semibold text-neutral-400 hover:text-white transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-neutral-950 font-bold text-xs uppercase tracking-wider rounded transition flex items-center gap-1.5 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{campaignModalMode === 'create' ? 'Create Campaign' : 'Save Changes'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
