import React, { useState, useEffect } from 'react';
import { AudienceId } from '../types';
import { AUDIENCES } from '../data';
import { extractKeywordsFromProductName } from '../utils';
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
  onSetKeywords?: (kws: string[]) => void;
  onGenerate: (prompt: string) => void;
}

export const SeoPanel: React.FC<SeoPanelProps> = ({
  productName,
  keywords,
  onAddKeyword,
  onRemoveKeyword,
  onSetKeywords,
  onGenerate,
}) => {
  const [audience, setAudience] = useState<AudienceId>('casual');
  const [brand, setBrand] = useState('');
  const [type, setType] = useState('');
  const [size, setSize] = useState('');
  const [unit, setUnit] = useState('');
  const [pack, setPack] = useState('');
  const [usp, setUsp] = useState('');
  const [kwInput, setKwInput] = useState('');
  const [autoSync, setAutoSync] = useState(true);

  // Otomatis sinkronkan kata kunci dari nama utama produk jika autoSync aktif
  useEffect(() => {
    if (autoSync && productName && productName.trim() && onSetKeywords) {
      const extracted = extractKeywordsFromProductName(productName);
      if (extracted.length > 0) {
        onSetKeywords(extracted);
      }
    }
  }, [productName, autoSync, onSetKeywords]);

  const handleSyncFromProductName = () => {
    if (productName.trim() && onSetKeywords) {
      const extracted = extractKeywordsFromProductName(productName);
      if (extracted.length > 0) {
        onSetKeywords(extracted);
      }
    }
  };

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
      setUnit('1 Pcs');
      setPack('Kemasan Box Eksklusif');
      setUsp('Garansi Resmi 1 Tahun, Layanan Pelanggan 24/7, Material Premium Anti-Karat');
    } else if (val === 'casual') {
      setAudience('casual');
      setBrand('Lokal Pride');
      setType('Daily Series');
      setSize('M, L, XL');
      setUnit('1 Pcs');
      setPack('Kemasan Ramah Lingkungan');
      setUsp('Bahan adem & nyaman dipakai seharian, cocok untuk segala aktivitas kasual, tidak mudah kusut');
    } else if (val === 'urgent') {
      setAudience('trendy');
      setBrand('Viraal');
      setType('Limited Edition');
      setSize('Free Size');
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
    let effectiveKeywords = keywords;
    if (effectiveKeywords.length === 0 && productName.trim()) {
      effectiveKeywords = extractKeywordsFromProductName(productName);
      if (onSetKeywords && effectiveKeywords.length > 0) {
        onSetKeywords(effectiveKeywords);
      }
    }

    if (!productName.trim() || effectiveKeywords.length === 0) {
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

    const systemPrompt = `Anda adalah pakar SEO Marketplace Indonesia (Shopee & Tokopedia). Buat deskripsi produk yang SANGAT RAPI, BERSIH, dan SIAP SALIN (PLAIN TEXT) sesuai format standar berikut.
GAYA BAHASA: ${audienceData.promptMod}

TUGAS ANDA:
1. Buat 3 variasi rekomendasi judul SEO friendly (100-125 karakter). Gunakan format nama produk utama: "${formulaResult}" sebagai basis utama dikombinasikan dengan kata kunci SEO secara alami. Wajib diawali tanda strip (-) di setiap judul dan pisahkan setiap judul dengan 1 baris kosong (ENTER).
2. Buat deskripsi produk dalam SATU BLOK TEKS siap salin dengan garis pembatas (---------------------) di antara setiap pokok bahasan.

IKUTI STRUKTUR FORMAT DI BAWAH INI SECARA PERSIS:

REKOMENDASI JUDUL SEO (100-125 Karakter):
- (Judul 1 dengan panjang 100-125 karakter)

- (Judul 2 dengan panjang 100-125 karakter)

- (Judul 3 dengan panjang 100-125 karakter)
---------------------
DETAIL SPESIFIKASI:
• Merk   : ${brandVal}
• Tipe   : ${typeVal}
• Harga  : Harga Tertera (${unitVal})${packVal ? `\n• Kemasan: ${packVal}` : ''}
• Ukuran : ${sizeVal}
---------------------
KEUNGGULAN UTAMA:
• (Poin keunggulan 1 yang kuat dan jelas)
• (Poin keunggulan 2)
• (Poin keunggulan 3)
---------------------
PENGALAMAN PEMAKAIAN:
(Paragraf ringkas yang menjelaskan secara mengalir kenyamanan, rasa tenang, dan manfaat nyata yang dirasakan pembeli saat menggunakan produk ini)
---------------------
SANGAT COCOK UNTUK:
(Poin kebutuhan / penggunaan 1)
(Poin kebutuhan / penggunaan 2)
---------------------
CATATAN TOKO:
• Produk yang kami jual dijamin Original & Baru.
• Cover/kemasan/motif/warna dikirim sesuai stock yang tersedia.
• Mohon sertakan video unboxing untuk klaim produk.

ATURAN "ANTI-BERANTAKAN" (SANGAT PENTING):
1. JANGAN gunakan format Markdown berlebihan (TIDAK BOLEH ADA simbol ** atau * atau # di dalam teks deskripsi).
2. Gunakan garis pembatas --------------------- persis di antara setiap bagian seperti contoh struktur di atas.
3. RATA KIRI MUTLAK: Jangan ada spasi (indentasi) di awal baris.
4. AMAN DARI PELANGGARAN: Sangat penting! HINDARI penggunaan kata/kalimat yang dilarang atau dibatasi oleh algoritma Shopee, Tokopedia, dan TikTok Shop (seperti ajakan transaksi di luar platform, nomor HP/WA, kata-kata kasar, janji/klaim medis berlebihan, atau kata kunci terlarang lainnya).

DATA INPUT PRODUK:
Nama Produk Utama (Sesuai Formula): ${formulaResult}
Keywords: ${effectiveKeywords.join(', ')}
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

      {/* Keywords (SEO) */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Icons.Key className="w-4 h-4 text-emerald-600" />
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              Kata Kunci (SEO)
            </label>
          </div>
          
          <div className="flex items-center gap-1.5">
            {/* Auto-Sync Toggle */}
            <button
              type="button"
              onClick={() => {
                const nextState = !autoSync;
                setAutoSync(nextState);
                if (nextState) {
                  handleSyncFromProductName();
                }
              }}
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 transition-all cursor-pointer ${
                autoSync
                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                  : 'bg-slate-200 text-slate-600 border border-slate-300'
              }`}
              title={autoSync ? 'Auto-sync aktif: kata kunci mengikuti nama produk. Klik untuk ubah ke manual.' : 'Mode manual: klik untuk aktifkan auto-sync.'}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${autoSync ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
              <span>{autoSync ? 'Otomatis' : 'Manual'}</span>
            </button>

            {/* Manual Sync Button */}
            <button
              type="button"
              onClick={handleSyncFromProductName}
              className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-200 transition-colors flex items-center gap-1 cursor-pointer"
              title="Sinkronkan ulang kata kunci dari Nama Utama Produk"
            >
              <Icons.RefreshCw className="w-3 h-3 text-emerald-600" />
              <span>Sinkron</span>
            </button>
          </div>
        </div>

        {autoSync ? (
          <p className="text-[10px] text-emerald-700 bg-emerald-50/80 px-2.5 py-1 rounded-lg border border-emerald-200/60 font-medium flex items-center gap-1.5">
            <Icons.Sparkles className="w-3 h-3 text-emerald-500 shrink-0" />
            <span>Kata kunci otomatis diselaraskan dari <strong>Nama Utama Produk</strong>.</span>
          </p>
        ) : (
          <p className="text-[10px] text-slate-500 font-medium">
            Mode manual: ketik kata kunci custom Anda sendiri di bawah.
          </p>
        )}

        {/* Input to add additional custom keywords */}
        <div className="flex gap-2">
          <input
            type="text"
            value={kwInput}
            onChange={(e) => setKwInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Tambah kata kunci custom... (Maks 5)"
            className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-semibold text-slate-800 shadow-2xs"
          />
          <button
            type="button"
            onClick={handleAddKw}
            className="bg-slate-800 text-white px-3.5 py-2 rounded-lg hover:bg-slate-700 outline-none flex items-center justify-center cursor-pointer transition-colors shadow-2xs"
            title="Tambahkan kata kunci"
          >
            <Icons.Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Active Keywords Badges */}
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {keywords.length > 0 ? (
            keywords.map((kw, i) => (
              <span
                key={i}
                className="px-2.5 py-1 bg-white text-emerald-800 text-[11px] font-bold rounded-lg border border-emerald-200 flex items-center gap-1.5 shadow-3xs"
              >
                <span>{kw}</span>
                <button
                  type="button"
                  onClick={() => onRemoveKeyword(i)}
                  className="text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                  title="Hapus kata kunci"
                >
                  <Icons.X className="w-3 h-3" />
                </button>
              </span>
            ))
          ) : (
            <div className="text-[11px] text-slate-400 italic py-1">
              Belum ada kata kunci. Ketik nama produk untuk menghasilkan otomatis.
            </div>
          )}
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
