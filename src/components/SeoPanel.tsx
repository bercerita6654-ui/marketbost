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

    const systemPrompt = `Anda adalah pakar SEO Marketplace Indonesia (Shopee, Tokopedia, TikTok Shop).
TUGAS ANDA: Buat deskripsi produk yang SANGAT RAPI, BERSIH, dan SIAP SALIN (PURE PLAIN TEXT) dengan struktur dan kerapatan baris yang PERSIS mengikuti contoh di bawah.
GAYA BAHASA: ${audienceData.promptMod}

ATURAN STRUKTUR & TATA LETAK BARIS (WAJIB DIIKUTI PERSIS):

1. REKOMENDASI JUDUL SEO:
- Buat 3 variasi rekomendasi judul SEO friendly (panjang 100-125 karakter).
- Gunakan kombinasi nama produk utama: "${formulaResult}" dengan kata kunci SEO secara alami.
- Tulis teks judul LANGSUNG tanpa tanda strip (-), tanpa tanda bullet (•), dan tanpa nomor urut (1., 2., 3.).
- Pisahkan setiap judul dengan 1 baris kosong (ENTER 2x).

2. DETAIL SPESIFIKASI:
- Tulis tepat di bawah header dengan ENTER 1x.
- Tulis baris demi baris RAPAT (ENTER 1x). DILARANG ADA BARIS KOSONG di antara baris spesifikasi!
- DILARANG menggunakan tanda bullet apapun (•, -, *, angka).
- Format:
Merk   : ${brandVal}
Tipe   : ${typeVal}
Harga  : Harga Tertera (${unitVal})${packVal ? `\nKemasan: ${packVal}` : ''}
Ukuran : ${sizeVal}

3. KEUNGGULAN UTAMA:
- Tulis 3 poin keunggulan utama dalam kalimat mengalir yang kuat dan jelas.
- DILARANG menggunakan tanda bullet (•, -, *, atau angka).
- Pisahkan setiap poin keunggulan dengan 1 baris kosong (ENTER 2x).

4. PENGALAMAN PEMAKAIAN:
- Tulis 1 paragraf mengalir tanpa bullet yang menceritakan kenyamanan, rasa tenang, dan manfaat nyata saat menggunakan produk ini.

5. SANGAT COCOK UNTUK:
- Tulis 2 poin kebutuhan atau penggunaan produk secara langsung berbaris rapat (ENTER 1x) tanpa baris kosong dan tanpa tanda bullet.

6. CATATAN TOKO:
- Tulis 3 baris catatan toko RAPAT baris demi baris (ENTER 1x).
- DILARANG ADA BARIS KOSONG di antara baris catatan toko dan DILARANG pakai bullet:
Produk yang kami jual dijamin Original & Baru.
Cover/kemasan/motif/warna dikirim sesuai stock yang tersedia.
Mohon sertakan video unboxing untuk klaim produk.

ATURAN ANTI-BERANTAKAN (SANGAT KRUSIAL):
- PURE PLAIN TEXT: DILARANG KERAS menggunakan format Markdown apapun (TIDAK BOLEH ADA simbol ** atau * atau # atau garis strip ---).
- TIDAK BOLEH ADA SIMBOL BULLET APAPUN (•, -, *, +, 1., 2., 3.) di seluruh teks output.
- RATA KIRI MUTLAK: Jangan ada spasi indentasi di awal baris.
- AMAN DARI PELANGGARAN ALGORITMA: Jangan cantumkan nomor HP/WA, ajakan transaksi di luar platform, atau janji klaim berlebihan yang dibatasi oleh algoritma marketplace.

CONTOH HASIL OUTPUT YANG WAJIB ANDA TIRU PERSIS:

REKOMENDASI JUDUL SEO:

Name Tag Holder Plastik jepit/ ID Card Nametag Plastik Jepit Multi/Sakura No. 101 / 30-A/301 9x5.5cm name holder murah

Name Tag Holder Plastik jepit/ ID Card Nametag Plastik Jepit Multi/Sakura No. 101 / 30-A/301 9x5.5cm name jepit bening

Name Tag Holder Plastik jepit/ ID Card Nametag Plastik Jepit Multi/Sakura No. 101 / 30-A/301 9x5.5cm tag holder kantor

DETAIL SPESIFIKASI:
Merk   : Multi/Sakura
Tipe   : No. 101 / 30-A/301
Harga  : Harga Tertera (1 PCS)
Ukuran : 9x5.5cm

KEUNGGULAN UTAMA:
Terbuat dari material plastik transparan yang tebal sehingga kartu identitas tetap aman, tidak mudah terlipat, dan terbaca jelas.

Dilengkapi dengan klip jepit yang kuat dan kokoh, memastikan name holder terpasang aman di saku baju tanpa takut mudah lepas.

Desain simpel dan ringan yang sangat praktis digunakan untuk pemakaian harian tanpa membuat kain pakaian rusak atau tertarik.

PENGALAMAN PEMAKAIAN:
Pernah ngerasa repot karena name tag sering jatuh atau posisinya miring saat lagi sibuk kerja? Dengan name tag holder plastik jepit ini, urusan identitas diri jadi super rapi dan aman seharian penuh. Jepitannya benar-benar mencengkeram kuat di saku atau kerah baju, jadi kamu bisa bebas beraktivitas, jalan cepat, atau sibuk di lapangan tanpa perlu bolak-balik membetulkan posisi ID card. Selain itu, bahan plastiknya yang bening bikin kartu kamu selalu bersih dari debu atau cipratan air, menjaga penampilan kamu tetap profesional dan meyakinkan di depan klien atau atasan.

SANGAT COCOK UNTUK:
Kebutuhan identitas karyawan kantoran, panitia event, guru, mahasiswa, atau tenaga medis yang butuh kartu selalu terlihat jelas.
Melindungi kartu akses gedung, kartu peserta seminar, atau kartu pelajar agar tidak cepat kusam, patah, atau hilang saat beraktivitas.

CATATAN TOKO:
Produk yang kami jual dijamin Original & Baru.
Cover/kemasan/motif/warna dikirim sesuai stock yang tersedia.
Mohon sertakan video unboxing untuk klaim produk.

DATA INPUT PRODUK:
Nama Produk Utama: ${formulaResult}
Keywords: ${effectiveKeywords.join(', ')}
${brand.trim() ? `Merk: ${brand.trim()}\n` : ''}${type.trim() ? `Tipe: ${type.trim()}\n` : ''}Ukuran: ${sizeVal}
Harga: Harga Tertera (${unitVal})${packVal ? `\nKemasan: ${packVal}` : ''}
USP / Keunggulan Unik: ${uspVal}

SEKARANG, BUATKAN TEKS OUTPUT SIAP SALIN PERSIS MENGIKUTI CONTOH FORMAT DI ATAS UNTUK DATA INPUT PRODUK:`;

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
