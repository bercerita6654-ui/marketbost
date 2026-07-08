export type SubjectMode = 'product' | 'model' | 'poster';

export interface VisualOption {
  label: string;
  value: string;
  icon: string;
}

export type AudienceId = 'casual' | 'professional' | 'trendy' | 'premium';

export interface Audience {
  id: AudienceId;
  label: string;
  icon: string;
  promptMod: string;
}

export type MarketplaceId = 'shopee' | 'tokopedia' | 'tiktok';

export interface Marketplace {
  id: MarketplaceId;
  label: string;
}

export interface GridPiece {
  img: HTMLImageElement | null;
  zoom: number;
  panX: number;
  panY: number;
  baseScale: number;
  dataUrl?: string; // Cache the source data URL if needed
}

export interface LogoSticker {
  img: HTMLImageElement | null;
  x: number;
  y: number;
  size: number;
  active: boolean;
  dragOffsetX?: number;
  dragOffsetY?: number;
}

export interface IgSticker {
  active: boolean;
  x: number;
  y: number;
  size: number;
  color: 'white' | 'black';
  text: string;
  dragOffsetX?: number;
  dragOffsetY?: number;
}

export type ActiveTab = 'visual' | 'caption' | 'seo' | 'grid';

export interface CopiedPrompt {
  id: string;
  text: string;
  type: 'visual' | 'caption' | 'seo';
  timestamp: string;
  customName?: string;
}

