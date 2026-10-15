import React from 'react';
import * as Icons from 'lucide-react';

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tab: any) => void;
}

export const GuideModal: React.FC<GuideModalProps> = ({ isOpen, onClose, onSelectTab }) => {
  if (!isOpen) return null;

  const features = [
    {
      id: 'visual',
      title: '1. Visual AI Prompt',
      tag: 'Midjourney & Flux',
      color: 'blue',
      icon: Icons.Image,
      description: 'Menghasilkan prompt visual berkualitas studio dengan sudut kamera, pencahayaan, model busana, dan background estetik untuk foto katalog produk.',
      tips: [
        'Gunakan nama produk spesifik (misal: "Sepatu sneakers kulit putih pria").',
        'Pilih gaya "Minimalist & Clean" untuk foto katalog marketplace.',
        'Aktifkan Model Manusia jika ingin produk terlihat dipakai oleh model.'
      ]
    },
    {
      id: 'caption',
      title: '2. Caption Sosmed',
      tag: 'IG, TikTok, WA',
      color: 'pink',
      icon: Icons.MessageSquare,
      description: 'Menyusun caption persuasif dengan hook menarik, poin keunggulan produk, dan Call To Action (CTA) yang aman dari pelanggaran kata kunci algoritma.',
      tips: [
        'Pilih gaya "Santai & Friendly" untuk Instagram atau "Urgent / Promo" untuk flash sale.',
        'Gunakan opsi platform TikTok atau Instagram agar jumlah karakter pas.',
        'Sertakan hashtag dan info promo bundling untuk meningkatkan konversi.'
      ]
    },
    {
      id: 'seo',
      title: '3. SEO Copywriter',
      tag: 'Shopee & Tokopedia',
      color: 'emerald',
      icon: Icons.ShoppingBag,
      description: 'Membuat 3 rekomendasi judul SEO (100-125 karakter) dan deskripsi produk berstruktur rapi siap salin dengan spesifikasi lengkap.',
      tips: [
        'Masukkan 3-5 kata kunci populer yang sering dicari pembeli.',
        'Format tata letak otomatis rapi dengan spasi pemisah antar-seksi.',
        'Bebas dari simbol berantakan dan aman dari kata-kata yang dilarang marketplace.'
      ]
    },
    {
      id: 'broadcast',
      title: '4. Broadcast Chat',
      tag: 'Shopee, Tokped, TikTok, WA',
      color: 'purple',
      icon: Icons.Radio,
      description: 'Menyusun pesan siaran (broadcast) yang ringkas, rapi, dan memicu tingkat klik tinggi untuk pengingat keranjang, produk baru, dan promo event seperti 9.9.',
      tips: [
        'Pilih template: Pengingat Keranjang, Produk Baru, Promosi Toko, atau Info Operasional.',
        'Pilih tema event promo atau topik operasional (jadwal libur, jam cut-off kirim, CS).',
        'Kalimat dioptimalkan pendek & padat (200-400 karakter) dengan hook pop-up HP yang kuat.'
      ]
    },
    {
      id: 'grid',
      title: '5. 9-Grid Splitter',
      tag: '1000x1000px & Video',
      color: 'indigo',
      icon: Icons.LayoutGrid,
      description: 'Alat pemotong gambar jadi 9 feed grid persegi, kolase multi-panel, hingga export video slideshow otomatis untuk marketplace.',
      tips: [
        'Unggah foto produk beresolusi tinggi.',
        'Ukuran otomatis disesuaikan 1000x1000px rasio 1:1 standar e-commerce.',
        'Hasil unduhan dioptimalkan di bawah batas 148KB per panel tanpa merusak warna.'
      ]
    },
    {
      id: 'batch',
      title: '6. Batch Processing',
      tag: 'Auto / Custom Resize & Remove BG',
      color: 'teal',
      icon: Icons.Layers,
      description: 'Kompres, resize otomatis mengikuti foto asli atau atur kustom piksel, dukung Hapus Background otomatis, serta bebas menentukan batas maksimal KB dengan format PNG berkualitas tinggi.',
      tips: [
        'Pilih "Otomatis Ikuti Gambar" untuk mempertahankan resolusi & rasio asli, atau "Kustom Ukuran Sendiri" untuk menentukan piksel.',
        'Atur batas ukuran maksimal secara bebas (misal: 148 KB, 100 KB, 200 KB, dsb.) sesuai kebutuhan marketplace.',
        'Aktifkan opsi "Hapus Background (Remove BG)" dengan algoritma aman edge-flood fill untuk mengisolasi produk.',
        'Download semua file yang telah dioptimasi dengan satu klik ZIP.'
      ]
    }
  ];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#0b101d]/95 border border-slate-800 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-100 ring-1 ring-white/10">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800/90 flex items-center justify-between bg-slate-900/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-tr from-indigo-600 to-blue-500 text-white rounded-xl shadow-md shadow-indigo-500/20">
              <Icons.BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white tracking-tight">Panduan Penggunaan MarketBoost AI</h3>
              <p className="text-xs text-slate-400">Tips & trik memaksimalkan konversi penjualan produk Anda</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-xl transition-colors cursor-pointer"
          >
            <Icons.X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Cards */}
        <div className="p-6 overflow-y-auto space-y-4 dark-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {features.map((f) => {
              const IconComp = f.icon;
              return (
                <div
                  key={f.id}
                  className="bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 rounded-2xl p-4.5 flex flex-col justify-between space-y-3.5 transition-all group hover:bg-slate-900/90 shadow-sm"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-slate-800/90 text-indigo-400 group-hover:scale-105 transition-transform shadow-xs">
                          <IconComp className="w-4 h-4" />
                        </div>
                        <h4 className="text-xs font-bold text-white">{f.title}</h4>
                      </div>
                      <span className="text-[9px] font-mono font-bold bg-slate-800/80 px-2.5 py-0.5 rounded-full text-slate-300 border border-slate-700/80">
                        {f.tag}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {f.description}
                    </p>
                    <div className="bg-slate-950/70 rounded-xl p-3 space-y-1.5 text-[10px] text-slate-300 border border-slate-800/80 shadow-inner">
                      <div className="font-bold text-indigo-300 flex items-center gap-1.5">
                        <Icons.CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" /> Tips Efektif:
                      </div>
                      <ul className="list-disc list-inside space-y-0.5 text-slate-400">
                        {f.tips.map((t, idx) => (
                          <li key={idx} className="leading-snug">{t}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      onSelectTab(f.id);
                      onClose();
                    }}
                    className="w-full py-2 bg-slate-800/90 hover:bg-indigo-600 text-slate-200 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-95 border border-slate-700/60"
                  >
                    <span>Buka Fitur Ini</span>
                    <Icons.ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800/90 bg-slate-900/80 flex items-center justify-between text-xs text-slate-400">
          <span className="text-[11px]">Semua prompt & setelan tersimpan otomatis di browser lokal Anda.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white rounded-xl font-bold transition-all cursor-pointer text-xs shadow-md shadow-indigo-500/20 active:scale-95 border border-white/20"
          >
            Mengerti & Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
