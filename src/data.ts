import { VisualOption, Audience, Marketplace } from './types';

export const VISUAL_STYLES: VisualOption[] = [
  { label: 'Minimalis & Bersih', value: 'minimalist and clean', icon: 'Square' },
  { label: 'Mewah & Elegan', value: 'luxury and elegant', icon: 'Gem' },
  { label: 'Alami & Organik', value: 'natural and organic', icon: 'Leaf' },
  { label: 'Gelap & Dramatis (Dark Mode)', value: 'dark and moody', icon: 'Moon' },
  { label: 'Futuristik / Cyberpunk', value: 'futuristic cyberpunk', icon: 'Zap' }
];

export const VISUAL_VIBES: VisualOption[] = [
  { label: 'Premium Look', value: 'premium look', icon: 'Crown' },
  { label: 'Clean Catalog', value: 'clean catalog', icon: 'LayoutGrid' },
  { label: 'Realistic Lifestyle', value: 'realistic Lifestyle', icon: 'Coffee' }
];

export const VISUAL_BACKGROUNDS: VisualOption[] = [
  { label: 'Putih Polos (Studio)', value: 'white plain background', icon: 'Maximize' },
  { label: 'Meja Kerja / Alat Tulis (Stationery)', value: 'desk with aesthetic stationery items', icon: 'PenTool' },
  { label: 'Lingkungan Kantor (Office)', value: 'modern office environment', icon: 'Building' },
  { label: 'Gudang Industrial (Warehouse)', value: 'industrial warehouse setting', icon: 'Box' },
  { label: 'Alam Terbuka (Nature)', value: 'beautiful outdoor nature, greenery', icon: 'Trees' },
  { label: 'Kafe / Coffee Shop', value: 'aesthetic cozy coffee shop interior', icon: 'Coffee' },
  { label: 'Dapur Modern (Kitchen)', value: 'clean modern kitchen counter', icon: 'Utensils' },
  { label: 'Ruang Tamu (Living Room)', value: 'cozy warm living room setup', icon: 'Sofa' },
  { label: 'Marmer Minimalis (Marble)', value: 'luxurious minimalist marble background', icon: 'Hexagon' },
  { label: 'Lainnya (Bebas / Netral)', value: 'simple neutral background', icon: 'MoreHorizontal' }
];

export const VISUAL_LIGHTINGS: VisualOption[] = [
  { label: 'Studio Lighting', value: 'studio lighting', icon: 'Lightbulb' },
  { label: 'Soft Natural Light', value: 'soft natural light', icon: 'Cloud' },
  { label: 'Warm Desk Lamp', value: 'warm desk lamp lighting', icon: 'Flame' },
  { label: 'Dramatic Lighting', value: 'dramatic lighting', icon: 'Contrast' }
];

export const VISUAL_COLORS: VisualOption[] = [
  { label: 'Netral / Bebas', value: 'neutral color palette', icon: 'Palette' },
  { label: 'Warna Pastel', value: 'soft pastel color palette', icon: 'Paintbrush' },
  { label: 'Hangat (Warm)', value: 'warm color tones, golden hour hues', icon: 'Sun' },
  { label: 'Dingin (Cold)', value: 'cold color tones, cool blue hues', icon: 'Snowflake' },
  { label: 'Mencolok (Vibrant)', value: 'vibrant and highly saturated colors', icon: 'Sparkles' },
  { label: 'Monokrom (Hitam Putih)', value: 'monochrome, black and white', icon: 'CircleDot' }
];

export const VISUAL_ANGLES: VisualOption[] = [
  { label: 'Eye-Level', value: 'eye-level shot', icon: 'Eye' },
  { label: 'Front Angle', value: 'front angle shot', icon: 'Square' },
  { label: 'Top View / Flat Lay', value: 'top view flat lay shot', icon: 'ArrowDown' },
  { label: 'Close-Up / Macro', value: 'close-up macro shot', icon: 'ZoomIn' }
];

export const MODEL_GENDERS: VisualOption[] = [
  { label: 'Wanita', value: 'female', icon: 'User' },
  { label: 'Pria', value: 'male', icon: 'User' },
  { label: 'Unisex / Bebas', value: 'androgynous/unisex', icon: 'Users' }
];

export const MODEL_AGES: VisualOption[] = [
  { label: 'Dewasa Muda (20an)', value: 'young adult in their 20s', icon: 'Star' },
  { label: 'Dewasa (30an-40an)', value: 'adult in their 30s-40s', icon: 'Briefcase' },
  { label: 'Remaja', value: 'teenager', icon: 'Headphones' },
  { label: 'Anak-anak', value: 'child', icon: 'Smile' },
  { label: 'Paruh Baya (50an)', value: 'middle-aged', icon: 'Coffee' },
  { label: 'Lansia', value: 'elderly', icon: 'Heart' }
];

export const MODEL_ETHNICITIES: VisualOption[] = [
  { label: 'Indonesia / Asia Tenggara', value: 'Indonesian/Southeast Asian', icon: 'MapPin' },
  { label: 'Kaukasia / Eropa', value: 'Caucasian/European', icon: 'Globe' },
  { label: 'Korea', value: 'Korean', icon: 'Music' },
  { label: 'Jepang', value: 'Japanese', icon: 'Camera' },
  { label: 'Tiongkok (Chinese)', value: 'Chinese', icon: 'Map' },
  { label: 'Afrika / Hitam', value: 'African descent/Black', icon: 'Sun' },
  { label: 'Timur Tengah', value: 'Middle Eastern', icon: 'Moon' },
  { label: 'Amerika Latin', value: 'Latino/Hispanic', icon: 'Flame' },
  { label: 'Bebas / Acak', value: 'mixed ethnicity', icon: 'Shuffle' }
];

export const MODEL_PLACEMENTS: VisualOption[] = [
  { label: 'Seluruh Tubuh (Pakaian)', value: 'body/torso', icon: 'Shirt' },
  { label: 'Wajah (Skincare/Makeup)', value: 'face', icon: 'Smile' },
  { label: 'Bibir (Lipstik)', value: 'lips', icon: 'Heart' },
  { label: 'Mata (Softlens/Kacamata)', value: 'eyes', icon: 'Eye' },
  { label: 'Kepala / Rambut (Topi)', value: 'head/hair', icon: 'Scissors' },
  { label: 'Telinga (Anting)', value: 'ears', icon: 'Headphones' },
  { label: 'Leher (Kalung)', value: 'neck', icon: 'Circle' },
  { label: 'Bahu (Tas Selempang)', value: 'shoulders', icon: 'Briefcase' },
  { label: 'Tangan / Lengan (Tas)', value: 'hands/arms', icon: 'Hand' },
  { label: 'Pergelangan Tangan (Jam)', value: 'wrists', icon: 'Watch' },
  { label: 'Jari Tangan (Cincin)', value: 'fingers', icon: 'PenTool' },
  { label: 'Kaki / Celana / Rok', value: 'legs', icon: 'Activity' },
  { label: 'Kaki / Sepatu / Sandal', value: 'feet', icon: 'Footprints' }
];

export const AUDIENCES: Audience[] = [
  { id: 'casual', label: 'Pembeli Umum', icon: 'ShoppingBag', promptMod: 'Gunakan nada bicara yang ramah dan santai. Fokus pada kegunaan praktis sehari-hari.' },
  { id: 'professional', label: 'Profesional', icon: 'Target', promptMod: 'Gunakan nada profesional dan informatif. Fokus pada spesifikasi teknis dan efisiensi.' },
  { id: 'trendy', label: 'Anak Muda', icon: 'Rocket', promptMod: 'Gunakan bahasa trendi/gaul Gen-Z yang enerjik. Tonjolkan sisi estetika dan viralitas.' },
  { id: 'premium', label: 'Eksklusif', icon: 'Star', promptMod: 'Gunakan nada bicara yang elegan dan mewah. Fokus pada eksklusivitas dan kualitas tinggi.' }
];

export const MARKETPLACES: Marketplace[] = [
  { id: 'shopee', label: 'Shopee' },
  { id: 'tokopedia', label: 'Tokopedia' },
  { id: 'tiktok', label: 'TikTok Shop' }
];

export const CSV_COMPANY_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQb3c5Q6TVKPGW0MJKD5Bq97j3YP3QCQHCqNzoa4E1c2C4K5e1_yLgJlggb1OWCsx7XXPEWCbsUU6iC/pub?gid=774565513&single=true&output=csv';
export const CSV_BRAND_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQb3c5Q6TVKPGW0MJKD5Bq97j3YP3QCQHCqNzoa4E1c2C4K5e1_yLgJlggb1OWCsx7XXPEWCbsUU6iC/pub?output=csv';

export const POSTER_TEMPLATES = [
  {
    title: 'MEGA PROMO 50% OFF',
    text: 'MEGA PROMO 50% OFF',
    img: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=200&h=150&fit=crop',
    previewText: 'MEGA PROMO\n50% OFF'
  },
  {
    title: 'NEW ARRIVAL 2024',
    text: 'NEW ARRIVAL 2024',
    img: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=200&h=150&fit=crop',
    previewText: 'NEW ARRIVAL\n2024'
  },
  {
    title: 'FLASH SALE ⚡ LIMITED',
    text: 'FLASH SALE ⚡ LIMITED EDITION',
    img: 'https://images.unsplash.com/photo-1557821552-171051530d21?w=200&h=150&fit=crop',
    previewText: 'FLASH SALE ⚡\nLIMITED'
  },
  {
    title: 'LESS IS MORE',
    text: 'LESS IS MORE. ESSENTIALS.',
    img: 'https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?w=200&h=150&fit=crop',
    previewText: 'Less is More.\nEssentials.'
  }
];
