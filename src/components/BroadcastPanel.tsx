import React, { useState } from 'react';
import { BroadcastTemplateId, BroadcastThemeId } from '../types';
import { BROADCAST_TEMPLATES, BROADCAST_THEMES } from '../data';
import * as Icons from 'lucide-react';

interface BroadcastPanelProps {
  productName: string;
  onGenerate: (prompt: string) => void;
}

export const BroadcastPanel: React.FC<BroadcastPanelProps> = ({
  productName,
  onGenerate,
}) => {
  const [activeTemplate, setActiveTemplate] = useState<BroadcastTemplateId>('cart_reminder');
  const [selectedTheme, setSelectedTheme] = useState<BroadcastThemeId>('double_date');
  const [customEventName, setCustomEventName] = useState('Event 9.9 Super Shopping Day');
  const [platform, setPlatform] = useState<'shopee' | 'tokopedia' | 'tiktok' | 'whatsapp'>('shopee');
  const [discountBenefit, setDiscountBenefit] = useState('Diskon Ekstra 25% + Gratis Ongkir');
  const [voucherCode, setVoucherCode] = useState('HEMAT99');
  const [urgencyLimit, setUrgencyLimit] = useState('Berakhir malam ini pukul 23:59 WIB (Kuota 50 Tercepat)');
  const [toneStyle, setToneStyle] = useState<'friendly' | 'fomo' | 'direct' | 'exclusive'>('friendly');
  const [includeVoucher, setIncludeVoucher] = useState(true);

  const selectedThemeObj = BROADCAST_THEMES.find(t => t.id === selectedTheme) || BROADCAST_THEMES[0];
  const selectedTemplateObj = BROADCAST_TEMPLATES.find(t => t.id === activeTemplate) || BROADCAST_TEMPLATES[0];

  const handleThemeChange = (themeId: BroadcastThemeId) => {
    setSelectedTheme(themeId);
    const theme = BROADCAST_THEMES.find(t => t.id === themeId);
    if (theme) {
      if (themeId === 'double_date') {
        setCustomEventName('Event 9.9 Super Shopping Day');
      } else if (themeId === 'payday') {
        setCustomEventName('Promo Spesial Gajian (Payday Sale)');
      } else if (themeId === 'flash_sale') {
        setCustomEventName('Flash Sale Kilat 24 Jam');
      } else if (themeId === 'weekend') {
        setCustomEventName('Weekend Super Deals');
      } else if (themeId === 'clearance') {
        setCustomEventName('Cuci Gudang Cuci Lemari Diskon Terbesar');
      } else if (themeId === 'store_anniversary') {
        setCustomEventName('Spesial Ulang Tahun Toko Kami');
      } else {
        setCustomEventName('Promo Terbatas Toko');
      }
    }
  };

  const handleGenerate = () => {
    const product = productName.trim() || 'Produk Favorit Pilihan Anda';
    const eventName = customEventName.trim() || selectedThemeObj.defaultEventName;
    const discount = discountBenefit.trim() || 'Penawaran Spesial Terbatas';
    const voucher = includeVoucher && voucherCode.trim() ? voucherCode.trim() : '-';
    const urgency = urgencyLimit.trim() || 'Stok dan kuota sangat terbatas';

    const platformLabels = {
      shopee: 'Shopee (Fitur Pesan Siaran Penjual)',
      tokopedia: 'Tokopedia (Chat Broadcast Seller)',
      tiktok: 'TikTok Shop (Seller Center Broadcast)',
      whatsapp: 'WhatsApp Business / Broadcast Pelanggan',
    };

    const templateGoals = {
      cart_reminder: 'MENGINGATKAN PEMBELI UNTUK SEGERA CHECKOUT PRODUK DI KERANJANG (Cart Abandonment Recovery). Sentuh pembeli secara ramah bahwa produk impiannya masih menunggu dan stok/promo terbatas.',
      new_arrival: 'MEMPERKENALKAN RILIS PRODUK TERBARU TOKO KEPADA PEMBELI (New Arrival Update). Bangkitkan antusiasme pembeli untuk jadi yang pertama memiliki produk ini dengan promo peluncuran khusus.',
      promo: 'MENYEBARKAN INFO PROMO DISKON / EVENT BERJALAN KEPADA PEMBELI (Active Promotion). Tunjukkan keuntungan besar belanja hari ini dengan penawaran potongan harga/voucher yang tak boleh dilewatkan.',
    };

    const toneDescriptions = {
      friendly: 'Hangat, sopan, akrab seperti teman terpercaya, tidak kaku, dan membuat pembeli merasa nyaman.',
      fomo: 'Memicu rasa urgensi tinggi (Fear Of Missing Out), stok terbatas, promo kilat segera berakhir malam ini.',
      direct: 'To-the-point, sangat ringkas, padat, langsung menyoroti keuntungan diskon dan link checkout.',
      exclusive: 'Eksklusif dan istimewa, memperlakukan penerima pesan sebagai pelanggan VIP / Followers prioritas toko.',
    };

    const systemPrompt = `Anda adalah seorang Master Copywriter E-Commerce & Pakar Broadcast Chat Marketplace Indonesia (Shopee, Tokopedia, TikTok Shop, WhatsApp).

TUGAS ANDA:
Buatkan 3 VARIASI PESAN BROADCAST CHAT yang SANGAT MENARIK, EFEKTIF, dan MEMICU KLIK TINGGI (HIGH CTR & CONVERSION) untuk dikirimkan kepada pembeli toko.

TARGET UTAMA FORMAT & GAYA BAHASA (ATURAN KETAT):
1. KALIMAT TIDAK TERLALU PANJANG: Panjang pesan per variasi berkisar antara 200 - 450 karakter (maksimal 60-80 kata). Pesan yang terlalu panjang akan diabaikan oleh pembeli di HP.
2. HOOK PEMBUKA SANGAT MEMIKAT: 1-2 baris pertama harus langsung menarik perhatian di notifikasi pop-up layar handphone pembeli.
3. TATA LETAK SANGAT RAPI (MOBILE-FRIENDLY): Berikan 1 baris kosong (ENTER) di antara hook, isi promo, dan Call-to-Action (CTA). Jangan membuat teks menumpuk rapat.
4. EMOJI YANG TEPAT & ESTETIK: Gunakan emoji yang eye-catching namun tidak berlebihan (misal: ⚡, 🛒, 🎁, 🔥, ⏳, 👉).
5. AMAN DARI FILTER PELANGGARAN MARKETPLACE: JANGAN gunakan kata-kata spam terlarang, janji palsu, atau nomor kontak luar platform.
6. CALL TO ACTION (CTA) JELAS: Akhiri pesan dengan ajakan bertindak yang kuat (misal: "Klik tombol Lihat Keranjang di bawah", "Klaim kuponnya sekarang").

DATA PARAMETER BROADCAST:
• Kategori Template : ${selectedTemplateObj.label} (${selectedTemplateObj.subtitle})
• Fokus Utama Pesan : ${templateGoals[activeTemplate]}
• Tema / Event Acara: ${eventName}
• Platform Sasaran  : ${platformLabels[platform]}
• Nama Produk       : ${product}
• Penawaran/Benefit : ${discount}
• Kode Voucher      : ${voucher}
• Batas Waktu / Urgensi: ${urgency}
• Nada Bicara (Tone): ${toneDescriptions[toneStyle]}

IKUTI STRUKTUR OUTPUT DI BAWAH INI SECARA PERSIS (SIAP DISALIN OLEH SELLER):

═════════════════════════════════════════════════════
📢 REKOMENDASI 3 VARIASI BROADCAST CHAT (${eventName.toUpperCase()})
Kategori: ${selectedTemplateObj.label} | Platform: ${platform.toUpperCase()}
═════════════════════════════════════════════════════

🎯 VARIASI 1: PENDEK, PADAT & LANGSUNG PADA INTI (Punchy & Direct)
(Karakter: Singkat, langsung to-the-point, sangat cocok untuk pembaca cepat)

[Tuliskan Teks Pesan Siaran Lengkap Siap Salin di sini]

Rekomendasi Tombol CTA: [Tuliskan teks tombol action marketplace, misal: "Buka Keranjang", "Ambil Voucher"]

─────────────────────────────────────────────────────

❤️ VARIASI 2: RAMAH, MENYAPA HANGAT & PERSONAL (Friendly & Engaging)
(Karakter: Menyapa akrab pembeli setia, sopan, persuasif tanpa terkesan memaksa)

[Tuliskan Teks Pesan Siaran Lengkap Siap Salin di sini]

Rekomendasi Tombol CTA: [Tuliskan teks tombol action marketplace, misal: "Cek Sekarang", "Lihat Produk"]

─────────────────────────────────────────────────────

⚡ VARIASI 3: URGENSI TINGGI & KUOTA TERBATAS (FOMO Booster)
(Karakter: Menimbulkan rasa khawatir ketinggalan promo, batasan waktu/stok menipis)

[Tuliskan Teks Pesan Siaran Lengkap Siap Salin di sini]

Rekomendasi Tombol CTA: [Tuliskan teks tombol action marketplace, misal: "Checkout Cepat", "Klaim Promo"]

═════════════════════════════════════════════════════
💡 TIPS OPTIMASI BROADCAST DARI STUDIO MARKETBOOST:
• Waktu Kirim Terbaik: Pukul 11.30 - 13.00 (Jam Istirahat Siang) atau 19.00 - 21.00 (Jam Santai Malam).
• Hubungkan langsung link tombol pesan siaran dengan produk "${product}" atau halaman keranjang pembeli.`;

    onGenerate(systemPrompt);
  };

  return (
    <div className="space-y-4 text-xs text-slate-700">
      
      {/* 1. Pilih Template Utama (3 Pilihan Wajib) */}
      <div className="space-y-2">
        <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          <Icons.MessageSquareQuote className="w-4 h-4 text-purple-600" />
          <span>Pilih Template Broadcast</span>
        </label>

        <div className="grid grid-cols-1 gap-2">
          {BROADCAST_TEMPLATES.map((tmpl) => {
            const isSelected = activeTemplate === tmpl.id;
            const IconC = tmpl.id === 'cart_reminder' ? Icons.ShoppingCart : tmpl.id === 'new_arrival' ? Icons.Sparkles : Icons.BadgePercent;

            return (
              <button
                key={tmpl.id}
                type="button"
                onClick={() => setActiveTemplate(tmpl.id)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3 relative ${
                  isSelected
                    ? 'bg-purple-50/80 border-purple-400 ring-2 ring-purple-400/20 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                }`}
              >
                <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${isSelected ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  <IconC className="w-4 h-4" />
                </div>

                <div className="flex-1 min-w-0 pr-6">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">{tmpl.label}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${tmpl.badgeColor}`}>
                      {tmpl.tag}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    {tmpl.subtitle}
                  </p>
                </div>

                {/* Selected Checkmark */}
                <div className="absolute right-3 top-3">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center border transition-all ${
                    isSelected ? 'bg-purple-600 border-purple-600 text-white' : 'border-slate-300 bg-white'
                  }`}>
                    {isSelected && <Icons.Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Pilihan Tema Promo / Event */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3 shadow-2xs">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Icons.CalendarDays className="w-4 h-4 text-purple-600" />
            <span>Tema Acara / Event Promo</span>
          </label>
          <span className="text-[10px] text-purple-700 font-bold bg-purple-100 px-2 py-0.5 rounded-md">
            {selectedThemeObj.badge}
          </span>
        </div>

        {/* Theme Pills */}
        <div className="grid grid-cols-2 gap-1.5">
          {BROADCAST_THEMES.map((th) => {
            const isSel = selectedTheme === th.id;
            return (
              <button
                key={th.id}
                type="button"
                onClick={() => handleThemeChange(th.id)}
                className={`px-2.5 py-1.5 rounded-lg text-left text-[11px] font-medium transition-all flex items-center gap-1.5 border cursor-pointer ${
                  isSel
                    ? 'bg-purple-600 text-white border-purple-600 font-bold shadow-2xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100/80'
                }`}
              >
                <span className="truncate">{th.label.split('(')[0]}</span>
              </button>
            );
          })}
        </div>

        {/* Event Name Input (customizable) */}
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
            Nama Spesifik Event / Judul Campaign
          </label>
          <input
            type="text"
            value={customEventName}
            onChange={(e) => setCustomEventName(e.target.value)}
            placeholder="Contoh: Event 9.9 Super Shopping Day / Promo Gajian"
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 shadow-2xs"
          />
        </div>
      </div>

      {/* 3. Platform Sasaran & Gaya Bahasa */}
      <div className="grid grid-cols-2 gap-3">
        {/* Platform Selector */}
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
            Platform Target
          </label>
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value as any)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:border-purple-500 shadow-2xs"
          >
            <option value="shopee">Shopee (Pesan Siaran)</option>
            <option value="tokopedia">Tokopedia (Broadcast)</option>
            <option value="tiktok">TikTok Shop (Broadcast)</option>
            <option value="whatsapp">WhatsApp Business</option>
          </select>
        </div>

        {/* Tone Selector */}
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
            Gaya Bahasa (Tone)
          </label>
          <select
            value={toneStyle}
            onChange={(e) => setToneStyle(e.target.value as any)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:border-purple-500 shadow-2xs"
          >
            <option value="friendly">Ramah & Menyapa Akrab</option>
            <option value="fomo">Urgensi Tinggi (FOMO)</option>
            <option value="direct">Padat, Singkat & To the Point</option>
            <option value="exclusive">Eksklusif / Pelanggan VIP</option>
          </select>
        </div>
      </div>

      {/* 4. Insentif, Diskon & Kode Voucher */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3 shadow-2xs">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Icons.Gift className="w-4 h-4 text-purple-600" />
            <span>Penawaran & Diskon Booster</span>
          </label>

          <label className="flex items-center gap-1 text-[11px] text-slate-600 font-medium cursor-pointer">
            <input
              type="checkbox"
              checked={includeVoucher}
              onChange={(e) => setIncludeVoucher(e.target.checked)}
              className="accent-purple-600 rounded cursor-pointer"
            />
            <span>Sertakan Voucher</span>
          </label>
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
            Manfaat Promo Utama (Diskon / Cashback / Ongkir)
          </label>
          <input
            type="text"
            value={discountBenefit}
            onChange={(e) => setDiscountBenefit(e.target.value)}
            placeholder="Contoh: Diskon 25% + Potongan Ongkir s.d Rp20.000"
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 shadow-2xs"
          />
        </div>

        {includeVoucher && (
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Kode Voucher (Jika Ada)
              </label>
              <input
                type="text"
                value={voucherCode}
                onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                placeholder="Misal: DISKON99"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-purple-700 uppercase outline-none focus:border-purple-500 shadow-2xs"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Tombol Action CTA
              </label>
              <input
                type="text"
                readOnly
                value={selectedTemplateObj.defaultActionText}
                className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 outline-none cursor-not-allowed"
              />
            </div>
          </div>
        )}

        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
            Batas Waktu / Urgensi Kuota
          </label>
          <input
            type="text"
            value={urgencyLimit}
            onChange={(e) => setUrgencyLimit(e.target.value)}
            placeholder="Contoh: Berakhir malam ini jam 23:59 WIB / Sisa 15 kuota lagi"
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 shadow-2xs"
          />
        </div>
      </div>

      {/* Target Formula Highlight */}
      <div className="bg-purple-50/70 border border-purple-200/80 rounded-xl p-3 space-y-1">
        <div className="flex items-center gap-1.5 text-purple-800 font-bold text-[11px]">
          <Icons.CheckCircle2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
          <span>Standar Copywriting Broadcast Studio</span>
        </div>
        <p className="text-[10px] text-purple-700/90 leading-relaxed">
          Dirancang agar kalimat <strong>tidak terlalu panjang</strong> (ringkas & padat), <strong>tata letak rapi</strong> di layar smartphone, dan memiliki hook psikologis yang mendorong pembeli <strong>membuka chat & meng-klik link checkout</strong>.
        </p>
      </div>

      {/* Generate Prompt Button */}
      <button
        type="button"
        onClick={handleGenerate}
        className="w-full py-3 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-purple-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
      >
        <Icons.Send className="w-4 h-4" />
        <span>Generate Prompt Broadcast Chat</span>
      </button>

    </div>
  );
};
