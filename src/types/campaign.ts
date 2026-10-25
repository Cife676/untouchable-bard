/**
 * Campaign and Project Management Types for Tabletop Sessions
 */

export type SceneCategory =
  | 'Exploration'
  | 'Combat'
  | 'Boss'
  | 'Town'
  | 'Dungeon'
  | 'Mystery'
  | 'Travel'
  | 'Cutscene'
  | 'Custom';

export interface CampaignSettings {
  defaultMasterVolume?: number;
  autoFadeDuration?: number;
}

export interface Campaign {
  id: string;
  name: string;
  description: string;
  createdAt: number;
  updatedAt: number;
  activeSceneId?: string;
  sceneIds: string[];
  settings?: CampaignSettings;
}

export interface RecentSceneEntry {
  sceneId: string;
  timestamp: number;
}

export interface CampaignExportBackup {
  schemaVersion: number;
  exportedAt: number;
  campaign: Campaign;
  scenes: import('./audio').Scene[];
  referencedAssets: import('./audio').AudioAsset[];
}
