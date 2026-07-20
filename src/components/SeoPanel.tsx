import React, { useState } from 'react';
import { AudienceId, MarketplaceId } from '../types';
import { AUDIENCES, MARKETPLACES } from '../data';
import * as Icons from 'lucide-react';

// Dynamic Icon Renderer
const IconRenderer = ({ name, className = "w-4 h-4" }: { name: string; className?: string }) => {
  const LucideIcon = (Icons as any)[name] || Icons.HelpCircle;
  return <LucideIcon className={className} />;
};

interface SeoPanelProps {
  productName: string;
  keywords: string[];
  onAddKeyword: (kw: string) => void;
  onRemoveKeyword: (idx: number) => void;
  onGenerate: (prompt: string) => void;
}

export const SeoPanel: React.FC<SeoPanelProps> = ({
  productName,
  keywords,
  onAddKeyword,
  onRemoveKeyword,
  onGenerate,
}) => {
  const [audience, setAudience] = useState<AudienceId>('casual');
  const [brand, setBrand] = useState('');
  const [type, setType] = useState('');
  const [size, setSize] = useState('');
  const [marketplace, setMarketplace] = useState<MarketplaceId>('shopee');
  const [unit, setUnit] = useState('');
  const [pack, setPack] = useState('');
  const [usp, setUsp] = useState('');
  const [kwInput, setKwInput] = useState('');

  const formulaResult = [
    productName.trim(),
    brand.trim(),
    type.trim(),
    size.trim()
  ].filter(Boolean).join(' ');

  // Template Options for auto-fill
  const TEMPLATE_OPTIONS = [
    { label: '--- Pilih Template Prompt ---', value: '' },
    { label: '💼 Professional (Technical & Elite)', value: 'professional' },
    { label: '☕ Casual (Lokal Pride & Daily Use)', value: 'casual' },
    { label: '🔥 Urgent Sales (Viraal Promo & Bundling)', value: 'urgent' }
  ];

  const handleTemplateSelect = (val: string) => {
    if (val === 'professional') {
      setAudience('professional');
      setBrand('Premium Brand');
      setType('Elite Series');
      setSize('All Size');
      setMarketplace('tokopedia');
      setUnit('1 Pcs');
      setPack('Kemasan Box Eksklusif');
      setUsp('Garansi Resmi 1 Tahun, Layanan Pelanggan 24/7, Material Premium Anti-Karat');
    } else if (val === 'casual') {
      setAudience('casual');
      setBrand('Lokal Pride');
      setType('Daily Series');
      setSize('M, L, XL');
      setMarketplace('shopee');
      setUnit('1 Pcs');
      setPack('Kemasan Ramah Lingkungan');
      setUsp('Bahan adem & nyaman dipakai seharian, cocok untuk segala aktivitas kasual, tidak mudah kusut');
    } else if (val === 'urgent') {
      setAudience('trendy');
      setBrand('Viraal');
      setType('Limited Edition');
      setSize('Free Size');
      setMarketplace('tiktok');
      setUnit('1 Pack');
      setPack('Beli 1 Gratis 1');
      setUsp('PROMO TERBATAS HARI INI! Bahan super elastis premium, tren masa kini, gratis ongkir se-Indonesia');
    }
  };

  const handleAddKw = () => {
    if (kwInput.trim()) {
      onAddKeyword(kwInput.trim());
      setKwInput('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddKw();
    }
  };

  const handleGenerate = () => {
    if (!productName.trim() || keywords.length === 0) {
      alert("Mohon isi Nama Utama Produk dan pastikan minimal ada 1 Kata Kunci SEO.");
      return;
    }

    const brandVal = brand.trim() || '-';
    const typeVal = type.trim() || '-';
    const sizeVal = size.trim() || '-';
    const unitVal = unit.trim() || '1 pcs';
    const packVal = pack.trim() || '';
    const uspVal = usp.trim() || '-';

    const audienceData = AUDIENCES.find(a => a.id === audience) || AUDIENCES[0];
    const marketplaceData = MARKETPLACES.find(m => m.id === marketplace) || MARKETPLACES[0];

    const systemPrompt = `Anda adalah pakar SEO Marketplace Indonesia. Buat deskripsi produk yang SANGAT RAPI, PROFESIONAL, dan BERSIH (PLAIN TEXT).
TARGET MARKETPLACE: ${marketplaceData.label}
GAYA BAHASA: ${audienceData.promptMod}

TUGAS ANDA:
1. Buat 3 variasi rekomendasi judul SEO friendly (100-125 karakter). Gunakan format nama produk utama: "${formulaResult}" sebagai basis utama dikombinasikan dengan kata kunci SEO secara alami. Wajib pisahkan setiap judul dengan 1 baris kosong (ENTER).
2. Buat deskripsi produk dalam SATU BLOK TEKS siap salin tanpa format berlebihan.

IKUTI FORMAT TATA LETAK INI SECARA PRESISI (WAJIB BERIKAN 1 BARIS KOSONG/ENTER DI SETIAP PERGANTIAN POKOK BAHASAN):

REKOMENDASI JUDUL SEO (100-125 Karakter):
----------------------------------------------------------------
(Judul 1)

(Judul 2)

(Judul 3)

(${formulaResult.toUpperCase()})
(Paragraf pembuka persuasif maksimal 3 kalimat)

KEUNGGULAN UTAMA:
• (Poin 1)
• (Poin 2)
• (Poin 3)

PENGALAMAN PEMAKAIAN:
(Jelaskan singkat manfaat yang dirasakan)

SANGAT COCOK UNTUK:
(Target 1)
(Target 2)

DETAIL SPESIFIKASI:
• Merk   : ${brandVal}
• Tipe   : ${typeVal}
• Harga  : Harga Tertera (${unitVal})${packVal ? `\n• Kemasan: ${packVal}` : ''}
• Ukuran : ${sizeVal}

CATATAN TOKO:
• Produk yang kami jual dijamin Original & Baru.
• Cover/kemasan/motif/warna dikirim sesuai stock yang tersedia.
• Mohon sertakan video unboxing untuk klaim produk.

ATURAN "ANTI-BERANTAKAN" (SANGAT PENTING):
1. JANGAN gunakan format Markdown berlebihan (TIDAK BOLEH ADA simbol ** atau * atau # di dalam teks deskripsi).
2. WAJIB tekan ENTER (1 baris kosong) sebelum menuliskan sub-judul baru (seperti KEUNGGULAN UTAMA, PENGALAMAN PEMAKAIAN, dll).
3. RATA KIRI MUTLAK: Jangan ada spasi (indentasi) di awal baris.
4. AMAN DARI PELANGGARAN: Sangat penting! HINDARI penggunaan kata/kalimat yang dilarang atau dibatasi oleh algoritma Shopee, Tokopedia, dan TikTok Shop (seperti ajakan transaksi di luar platform, nomor HP/WA, kata-kata kasar, janji/klaim medis berlebihan, atau kata kunci terlarang lainnya).

DATA INPUT PRODUK:
Nama Produk Utama (Sesuai Formula): ${formulaResult}
Keywords: ${keywords.join(', ')}
USP / Keunggulan Unik: ${uspVal}`;

    onGenerate(systemPrompt);
  };

  return (
    <div className="space-y-4 text-xs text-slate-700">
      {/* Template Prompt Dropdown */}
      <div className="bg-emerald-50/40 p-3 rounded-xl border border-emerald-100 space-y-1.5 shadow-3xs">
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 uppercase tracking-widest">
          <Icons.LayoutTemplate className="w-3.5 h-3.5" />
          <span>Template Parameter (Auto-Fill)</span>
        </div>
        <select
          onChange={(e) => handleTemplateSelect(e.target.value)}
          defaultValue=""
          className="w-full px-2.5 py-1.5 bg-white border border-emerald-200 text-slate-800 rounded-lg outline-none text-xs font-semibold hover:border-emerald-300 focus:ring-1 focus:ring-emerald-400 transition-colors"
        >
          {TEMPLATE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Target Buyer Selector */}
      <div>
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Tipe Pembeli (Tone of Voice)</label>
        <div className="grid grid-cols-2 gap-2">
          {AUDIENCES.map((aud) => (
            <button
              key={aud.id}
              type="button"
              onClick={() => setAudience(aud.id)}
              className={`p-2 rounded-xl border text-left transition-all flex flex-col items-start ${
                audience === aud.id
                  ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-200'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <IconRenderer name={aud.icon} className={`w-4 h-4 ${audience === aud.id ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span className={`text-xs font-bold ${audience === aud.id ? 'text-emerald-800' : 'text-slate-700'}`}>{aud.label}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Brand, Type, and Size Inputs */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Merk / Brand</label>
          <input
            type="text"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder="Opsional"
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-slate-800"
          />
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Tipe / Seri</label>
          <input
            type="text"
            value={type}
            onChange={(e) => setType(e.target.value)}
            placeholder="Opsional"
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-slate-800"
          />
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Ukuran</label>
          <input
            type="text"
            value={size}
            onChange={(e) => setSize(e.target.value)}
            placeholder="Size / Dimensi"
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-slate-800"
          />
        </div>
      </div>

      {/* Marketplace Selector */}
      <div>
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Marketplace Tujuan</label>
        <div className="flex gap-2">
          {MARKETPLACES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMarketplace(m.id)}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                marketplace === m.id
                  ? 'bg-slate-800 text-white border-slate-800'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Keywords (SEO) */}
      <div>
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Kata Kunci (SEO)</label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={kwInput}
            onChange={(e) => setKwInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ketik lalu Enter... (Maks 5)"
            className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-emerald-400"
          />
          <button
            type="button"
            onClick={handleAddKw}
            className="bg-slate-800 text-white px-3 rounded-lg hover:bg-slate-700 outline-none flex items-center justify-center"
          >
            <Icons.Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {keywords.map((kw, i) => (
            <span
              key={i}
              className="px-2 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-md border border-emerald-200 flex items-center gap-1"
            >
              {kw}
              <button type="button" onClick={() => onRemoveKeyword(i)} className="hover:text-red-500 transition-colors">
                <Icons.X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Packaging & USP Inputs */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Harga Untuk (Unit)</label>
          <input
            type="text"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            placeholder="1 Pcs, 1 Box, ..."
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-slate-800"
          />
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Info Kemasan (Opsional)</label>
          <input
            type="text"
            value={pack}
            onChange={(e) => setPack(e.target.value)}
            placeholder="Contoh: 1 Dus = 5 RIM"
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-slate-800"
          />
        </div>

        <div className="col-span-2">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Keunggulan & Properti (USP)</label>
          <textarea
            value={usp}
            onChange={(e) => setUsp(e.target.value)}
            rows={3}
            placeholder="Cipratan air, Anti-air, Garansi 1 Tahun..."
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-slate-800 resize-y"
          />
        </div>
      </div>

      {/* Generated Product Name Formula Preview */}
      <div className="bg-gradient-to-br from-indigo-50 to-emerald-50 border border-emerald-100 rounded-xl p-3.5 space-y-2 shadow-2xs">
        <div className="flex justify-between items-center">
          <span className="text-[9px] font-extrabold text-emerald-600 uppercase tracking-widest flex items-center gap-1">
            <Icons.Layers className="w-3.5 h-3.5 text-emerald-500" />
            Formula Hasil Nama Produk
          </span>
          <button
            type="button"
            onClick={async () => {
              if (formulaResult) {
                try {
                  await navigator.clipboard.writeText(formulaResult);
                  alert('Nama produk berhasil disalin!');
                } catch (err) {
                  // Fallback
                }
              }
            }}
            className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-0.5 outline-none"
            title="Salin hasil nama produk"
          >
            <Icons.Copy className="w-3 h-3" />
            <span>Salin</span>
          </button>
        </div>
        <div className="text-xs font-extrabold text-slate-800 bg-white/80 p-2.5 rounded-lg border border-emerald-100 font-mono break-words shadow-3xs leading-relaxed">
          {formulaResult || 'Belum ada nama produk...'}
        </div>
        <p className="text-[9px] text-slate-400 font-medium">
          Format: <span className="text-slate-500 font-bold">[Kategori/Jenis]</span> + <span className="text-slate-500 font-bold">[Merek]</span> + <span className="text-slate-500 font-bold">[Tipe/Model/Fitur]</span> + <span className="text-slate-500 font-bold">[Warna/Ukuran]</span>
        </p>
      </div>

      <button
        type="button"
        onClick={handleGenerate}
        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-2 group outline-none"
      >
        <Icons.Sparkles className="w-5 h-5 group-hover:animate-pulse" />
        <span>Generate Prompt SEO</span>
      </button>
    </div>
  );
};
