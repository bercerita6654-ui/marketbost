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

export type ActiveTab = 'visual' | 'caption' | 'seo' | 'broadcast' | 'grid' | 'batch';

export interface CopiedPrompt {
  id: string;
  text: string;
  type: 'visual' | 'caption' | 'seo' | 'broadcast';
  timestamp: string;
  customName?: string;
}

export type BroadcastTemplateId = 'cart_reminder' | 'new_arrival' | 'promo' | 'operational_info';

export interface BroadcastTemplate {
  id: BroadcastTemplateId;
  label: string;
  subtitle: string;
  description: string;
  icon: string;
  tag: string;
}

export type BroadcastThemeId = 'double_date' | 'payday' | 'flash_sale' | 'weekend' | 'clearance' | 'store_anniversary' | 'custom';

export interface BroadcastTheme {
  id: BroadcastThemeId;
  label: string;
  icon: string;
  badge: string;
  defaultEventName: string;
}


