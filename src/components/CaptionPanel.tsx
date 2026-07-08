import React, { useState } from 'react';
import * as Icons from 'lucide-react';

interface CaptionPanelProps {
  productName: string;
  keywords: string[];
  onAddKeyword: (kw: string) => void;
  onRemoveKeyword: (idx: number) => void;
  onGenerate: (prompt: string) => void;
}

export const CaptionPanel: React.FC<CaptionPanelProps> = ({
  productName,
  keywords,
  onAddKeyword,
  onRemoveKeyword,
  onGenerate,
}) => {
  const [platform, setPlatform] = useState('Instagram');
  const [goal, setGoal] = useState('Hard Selling (Jualan langsung untuk konversi)');
  const [tone, setTone] = useState('Santai, Gaul, dan Akrab (Ala Gen-Z)');
  const [cta, setCta] = useState('');
  const [extraInfo, setExtraExtra] = useState('');
  const [kwInput, setKwInput] = useState('');

  // Template Options for auto-fill
  const TEMPLATE_OPTIONS = [
    { label: '--- Pilih Template Prompt ---', value: '' },
    { label: '💼 Professional (Elevated & Formal)', value: 'professional' },
    { label: '☕ Casual / Relatable (Gen-Z & Friendly)', value: 'casual' },
    { label: '🔥 Urgent Sales (FOMO & Big Promo)', value: 'urgent' }
  ];

  const handleTemplateSelect = (val: string) => {
    if (val === 'professional') {
      setPlatform('Instagram');
      setGoal('Soft Selling (Edukasi atau Storytelling)');
      setTone('Profesional, Sopan, dan Elegan');
      setCta('Silakan hubungi kami untuk informasi lebih lanjut.');
      setExtraExtra('Kualitas premium bergaransi resmi.');
    } else if (val === 'casual') {
      setPlatform('Instagram');
      setGoal('Engagement (Interaksi audiens, memancing komentar)');
      setTone('Santai, Gaul, dan Akrab (Ala Gen-Z)');
      setCta('Komen "MAU" di bawah ya guys!');
      setExtraExtra('Stok terbatas banget, jangan sampai kehabisan!');
    } else if (val === 'urgent') {
      setPlatform('TikTok');
      setGoal('Giveaway / Promosi Khusus / Diskon Besar');
      setTone('Santai, Gaul, dan Akrab (Ala Gen-Z)');
      setCta('Klik keranjang kuning sekarang sebelum diskon berakhir!');
      setExtraExtra('DISKON 50% HARI INI SAJA!');
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
    if (!productName.trim()) {
      alert("Mohon isi Nama Utama Produk terlebih dahulu.");
      return;
    }

    const ctaText = cta.trim() || 'Sertakan Call to Action (CTA) yang menarik';
    const extraText = extraInfo.trim() || '-';
    const kws = keywords.length > 0 ? keywords.join(', ') : '-';

    const promptCaption = `Anda adalah seorang Social Media Specialist dan Copywriter profesional. Buatkan draft caption untuk postingan media sosial dengan detail berikut:

TARGET PLATFORM: ${platform}
NAMA PRODUK: ${productName}
TUJUAN POSTINGAN: ${goal}
GAYA BAHASA: ${tone}
KATA KUNCI / HASHTAG TARGET: ${kws}
INFO TAMBAHAN / PROMO: ${extraText}
CALL TO ACTION (CTA): ${ctaText}

TUGAS ANDA:
1. Buat caption yang menarik, interaktif, dan formatnya dioptimalkan untuk algoritma platform ${platform}.
2. BATASAN SANGAT KETAT: MAKSIMAL HANYA 250 KARAKTER (termasuk spasi dan hashtag) per opsi caption. Dilarang keras membuat teks yang panjang!
3. Gunakan teknik copywriting yang memancing interaksi (gunakan Hook yang kuat, masukkan info singkat, lalu arahkan dengan CTA: "${ctaText}").
4. Sertakan maksimal 3 hashtag pendek di akhir (pastikan total keseluruhan teks tetap di bawah 250 karakter).
5. Gunakan emoji secukupnya agar teks lebih hidup, namun tetap profesional.

Berikan 2 (dua) opsi variasi caption yang berbeda (Opsi 1 dan Opsi 2) agar saya bisa memilih yang terbaik. Pisahkan setiap opsi dengan jelas menggunakan pembatas "---------------------".`;

    onGenerate(promptCaption);
  };

  return (
    <div className="space-y-4 text-xs text-slate-700">
      {/* Template Prompt Dropdown */}
      <div className="bg-pink-50/40 p-3 rounded-xl border border-pink-100 space-y-1.5 shadow-3xs">
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-pink-600 uppercase tracking-widest">
          <Icons.LayoutTemplate className="w-3.5 h-3.5" />
          <span>Template Parameter (Auto-Fill)</span>
        </div>
        <select
          onChange={(e) => handleTemplateSelect(e.target.value)}
          defaultValue=""
          className="w-full px-2.5 py-1.5 bg-white border border-pink-200 text-slate-800 rounded-lg outline-none text-xs font-semibold hover:border-pink-300 focus:ring-1 focus:ring-pink-400 transition-colors"
        >
          {TEMPLATE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Platform Target</label>
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-slate-800"
          >
            <option value="Instagram">Instagram</option>
            <option value="TikTok">TikTok</option>
            <option value="Facebook">Facebook</option>
            <option value="Twitter/X">Twitter/X</option>
          </select>
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Tujuan Postingan</label>
          <select
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-slate-800"
          >
            <option value="Hard Selling (Jualan langsung untuk konversi)">Hard Selling (Jualan)</option>
            <option value="Soft Selling (Edukasi atau Storytelling)">Soft Selling</option>
            <option value="Engagement (Interaksi audiens, memancing komentar)">Interaksi / Engagement</option>
            <option value="Giveaway / Promosi Khusus / Diskon Besar">Giveaway / Promo Khusus</option>
          </select>
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Gaya Bahasa (Tone)</label>
          <select
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-slate-800"
          >
            <option value="Santai, Gaul, dan Akrab (Ala Gen-Z)">Santai & Gaul</option>
            <option value="Profesional, Sopan, dan Elegan">Profesional & Elegan</option>
            <option value="Lucu, Humor, dan Menghibur">Lucu & Menghibur</option>
            <option value="Inspiratif, Emosional, dan Menyentuh">Inspiratif</option>
          </select>
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Call to Action (CTA)</label>
          <input
            type="text"
            value={cta}
            onChange={(e) => setCta(e.target.value)}
            placeholder="Contoh: Klik link di bio, Komen mau..."
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-slate-800"
          />
        </div>
      </div>

      {/* Global Keywords Sync Panel */}
      <div>
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Kata Kunci Utama / Topik (Max 5)</label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={kwInput}
            onChange={(e) => setKwInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ketik lalu Enter..."
            className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-slate-800 focus:border-pink-400"
          />
          <button
            type="button"
            onClick={handleAddKw}
            className="bg-slate-800 text-white px-3 rounded-lg hover:bg-slate-700 outline-none flex items-center justify-center"
          >
            <Icons.Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Keywords list */}
        <div className="flex flex-wrap gap-2">
          {keywords.map((kw, i) => (
            <span
              key={i}
              className="px-2 py-1 bg-pink-50 text-pink-700 text-[10px] font-bold rounded-md border border-pink-100 flex items-center gap-1 animate-fade-in"
            >
              {kw}
              <button type="button" onClick={() => onRemoveKeyword(i)} className="hover:text-red-500 transition-colors">
                <Icons.X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Info Promo / Pesan Tambahan</label>
        <input
          type="text"
          value={extraInfo}
          onChange={(e) => setExtraExtra(e.target.value)}
          placeholder="Contoh: Diskon 50% hari ini, Beli 1 Gratis 1, ..."
          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-slate-800"
        />
      </div>

      <button
        type="button"
        onClick={handleGenerate}
        className="w-full bg-pink-600 hover:bg-pink-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-2 group outline-none"
      >
        <Icons.Sparkles className="w-5 h-5 group-hover:animate-pulse" />
        <span>Generate Prompt Caption</span>
      </button>
    </div>
  );
};
