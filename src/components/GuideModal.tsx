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
      tag: '1000x1000px & Remove BG',
      color: 'teal',
      icon: Icons.Layers,
      description: 'Kompres dan optimasi puluhan gambar sekaligus ke ukuran maksimal 148KB format PNG 1000x1000px, dukung Hapus Background otomatis, dan unduh langsung dalam 1 file ZIP.',
      tips: [
        'Tarik banyak file foto produk sekaligus ke area upload.',
        'Aktifkan opsi "Hapus Background (Remove BG)" untuk mengisolasi produk secara otomatis.',
        'Atur prefix nama file agar rapi dan seragam (misal: Sepatu_01, Sepatu_02).',
        'Download semua file yang telah dioptimasi dengan satu klik ZIP.'
      ]
    }
  ];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fade-in">
      <div className="bg-[#161f31] border border-slate-700/80 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-[#1e293b]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">
              <Icons.BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Panduan Penggunaan MarketBoost AI</h3>
              <p className="text-xs text-slate-400">Tips & trik memaksimalkan konversi penjualan produk Anda</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <Icons.X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Cards */}
        <div className="p-6 overflow-y-auto space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {features.map((f) => {
              const IconComp = f.icon;
              return (
                <div
                  key={f.id}
                  className="bg-[#0f172a] border border-slate-800 hover:border-slate-700 rounded-xl p-4 flex flex-col justify-between space-y-3 transition-all group"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-slate-800 text-indigo-400 group-hover:scale-105 transition-transform">
                          <IconComp className="w-4 h-4" />
                        </div>
                        <h4 className="text-xs font-bold text-white">{f.title}</h4>
                      </div>
                      <span className="text-[9px] font-mono font-bold bg-slate-800 px-2 py-0.5 rounded-full text-slate-300 border border-slate-700">
                        {f.tag}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {f.description}
                    </p>
                    <div className="bg-slate-900/80 rounded-lg p-2.5 space-y-1 text-[10px] text-slate-300 border border-slate-800/80">
                      <div className="font-bold text-indigo-300 flex items-center gap-1">
                        <Icons.CheckCircle2 className="w-3 h-3 text-indigo-400" /> Tips Efektif:
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
                    className="w-full py-1.5 bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
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
        <div className="px-6 py-3 border-t border-slate-800 bg-[#1e293b] flex items-center justify-between text-xs text-slate-400">
          <span>Semua prompt & setelan tersimpan otomatis di browser lokal Anda.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all cursor-pointer text-xs"
          >
            Mengerti & Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
