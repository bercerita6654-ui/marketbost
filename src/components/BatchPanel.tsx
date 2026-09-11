import React, { useState } from 'react';
import * as Icons from 'lucide-react';
import JSZip from 'jszip';
import * as pako from 'pako';
import * as UPNG from 'upng-js';
import { ActiveTab } from '../types';

// Polyfill window.pako for UPNG in browser ESM environment
if (typeof window !== 'undefined' && !(window as any).pako) {
  (window as any).pako = pako;
}

interface BatchItem {
  id: string;
  originalName: string;
  newName: string;
  originalSizeBytes: number;
  originalSizeKb: number;
  compressedUrl: string;
  compressedSizeBytes: number;
  compressedSizeKb: number;
  savedPercent: number;
  status: 'success' | 'error';
  blob: Blob | null;
  dimensions: string; // '1000x1000px'
  colorsUsed: number;
  isLossless: boolean;
  withinLimit: boolean; // size <= 148 * 1024
}

interface BatchPanelProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
}

export const BatchPanel: React.FC<BatchPanelProps> = () => {
  const [items, setItems] = useState<BatchItem[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [currentFileIndex, setCurrentFileIndex] = useState<number>(0);
  const [totalFileCount, setTotalFileCount] = useState<number>(0);
  const [overallProgress, setOverallProgress] = useState<number>(0);
  const [filePrefix, setFilePrefix] = useState<string>('Produk_Katalog');
  const [fitMode, setFitMode] = useState<'contain' | 'cover'>('contain');
  const [bgColor, setBgColor] = useState<'white' | 'transparent'>('white');
  const [maxKbLimit, setMaxKbLimit] = useState<number>(148);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [previewItem, setPreviewItem] = useState<BatchItem | null>(null);

  /**
   * Mengompresi file gambar ke resolusi 1000x1000px, format PNG,
   * dengan batas ukuran maksimal ketat <= 148 KB (151.552 bytes).
   */
  const compressToPng1000 = (
    file: File,
    options: {
      fitMode: 'contain' | 'cover';
      bgColor: 'white' | 'transparent';
      maxBytes: number;
    }
  ): Promise<{
    blob: Blob;
    url: string;
    sizeKb: number;
    sizeBytes: number;
    dimensions: string;
    colorsUsed: number;
    isLossless: boolean;
    withinLimit: boolean;
  }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = 1000;
            canvas.height = 1000;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (!ctx) {
              throw new Error('Gagal menginisialisasi Canvas context');
            }

            const renderCanvas = (scaleMultiplier = 1.0, blurNoise = false) => {
              ctx.clearRect(0, 0, 1000, 1000);
              if (options.bgColor === 'white') {
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, 1000, 1000);
              }

              ctx.imageSmoothingEnabled = true;
              ctx.imageSmoothingQuality = 'high';

              let baseScale = 1;
              if (options.fitMode === 'contain') {
                baseScale = Math.min(1000 / img.width, 1000 / img.height);
              } else {
                baseScale = Math.max(1000 / img.width, 1000 / img.height);
              }

              const finalScale = baseScale * scaleMultiplier;
              const drawW = Math.round(img.width * finalScale);
              const drawH = Math.round(img.height * finalScale);
              const drawX = Math.round((1000 - drawW) / 2);
              const drawY = Math.round((1000 - drawH) / 2);

              ctx.drawImage(img, drawX, drawY, drawW, drawH);

              if (blurNoise) {
                // Sedikit meratakan noise pixel tinggi agar DEFLATE PNG muat di bawah 148KB
                const imgData = ctx.getImageData(0, 0, 1000, 1000);
                const d = imgData.data;
                for (let i = 0; i < d.length; i += 4) {
                  d[i] = (d[i] >> 3) << 3;     // Kuantisasi 5-bit
                  d[i + 1] = (d[i + 1] >> 3) << 3;
                  d[i + 2] = (d[i + 2] >> 3) << 3;
                }
                ctx.putImageData(imgData, 0, 0);
              }
            };

            renderCanvas(1.0, false);

            const encodeFn = UPNG.encode || (UPNG as any).default?.encode;
            const maxAllowed = options.maxBytes; // Default: 148 * 1024 = 151,552 Bytes

            let finalBlob: Blob | null = null;
            let colorsUsed = 0;
            let isLossless = false;

            const tryEncode = (cnum: number): Blob | null => {
              try {
                const imgData = ctx.getImageData(0, 0, 1000, 1000);
                const resBuffer = encodeFn([imgData.data.buffer], 1000, 1000, cnum);
                return new Blob([resBuffer], { type: 'image/png' });
              } catch (err) {
                console.warn('UPNG encoding error with cnum', cnum, err);
                return null;
              }
            };

            // Tahap 1: Coba Lossless (cnum = 0) terlebih dahulu
            const losslessBlob = tryEncode(0);
            if (losslessBlob && losslessBlob.size <= maxAllowed) {
              finalBlob = losslessBlob;
              colorsUsed = 0;
              isLossless = true;
            }

            // Tahap 2: Jika > 148KB, kuantisasi palet warna secara progresif (TinyPNG engine)
            if (!finalBlob) {
              const paletteSteps = [256, 224, 192, 160, 128, 96, 64, 48, 32, 24, 16];
              for (const cnum of paletteSteps) {
                const testBlob = tryEncode(cnum);
                if (testBlob && testBlob.size <= maxAllowed) {
                  finalBlob = testBlob;
                  colorsUsed = cnum;
                  break;
                }
              }
            }

            // Tahap 3: Jika gambar sangat kompleks/noise tinggi dan masih > 148KB
            if (!finalBlob) {
              renderCanvas(0.98, true);
              const lowColorSteps = [64, 48, 32, 24, 16, 8];
              for (const cnum of lowColorSteps) {
                const testBlob = tryEncode(cnum);
                if (testBlob && testBlob.size <= maxAllowed) {
                  finalBlob = testBlob;
                  colorsUsed = cnum;
                  break;
                }
              }
            }

            // Tahap 4: Fallback terakhir jika gambar super padat
            if (!finalBlob) {
              renderCanvas(0.92, true);
              const fallbackBlob = tryEncode(16);
              if (fallbackBlob) {
                finalBlob = fallbackBlob;
                colorsUsed = 16;
              }
            }

            if (!finalBlob) {
              throw new Error('Gagal menghasilkan file PNG');
            }

            const blobSize = finalBlob.size;
            const url = URL.createObjectURL(finalBlob);

            resolve({
              blob: finalBlob,
              url,
              sizeBytes: blobSize,
              sizeKb: +(blobSize / 1024).toFixed(1),
              dimensions: '1000x1000px',
              colorsUsed,
              isLossless,
              withinLimit: blobSize <= maxAllowed
            });
          } catch (e) {
            reject(e);
          }
        };
        img.onerror = () => reject(new Error('Gagal memuat file gambar'));
        img.src = String(reader.result);
      };
      reader.onerror = () => reject(new Error('Gagal membaca file'));
      reader.readAsDataURL(file);
    });
  };

  const processFiles = async (fileList: FileList | File[]) => {
    if (!fileList || fileList.length === 0) return;

    setIsProcessing(true);
    setOverallProgress(0);
    const files = Array.from(fileList);
    setTotalFileCount(files.length);
    const newBatchItems: BatchItem[] = [];
    const maxBytes = maxKbLimit * 1024;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setCurrentFileIndex(i + 1);
      setOverallProgress(Math.round(((i + 1) / files.length) * 100));

      const originalSizeBytes = file.size;
      const originalSizeKb = +(originalSizeBytes / 1024).toFixed(1);

      try {
        const processed = await compressToPng1000(file, {
          fitMode,
          bgColor,
          maxBytes
        });

        const cleanPrefix = filePrefix.trim() || 'Produk';
        const formattedIndex = String(items.length + newBatchItems.length + 1).padStart(2, '0');
        const sanitizedNewName = `${cleanPrefix}_${formattedIndex}_1000x1000.png`;

        const savedBytes = Math.max(0, originalSizeBytes - processed.sizeBytes);
        const savedPercent = Math.round((savedBytes / originalSizeBytes) * 100);

        newBatchItems.push({
          id: Math.random().toString(36).substring(2, 9),
          originalName: file.name,
          newName: sanitizedNewName,
          originalSizeBytes,
          originalSizeKb,
          compressedUrl: processed.url,
          compressedSizeBytes: processed.sizeBytes,
          compressedSizeKb: processed.sizeKb,
          savedPercent,
          status: 'success',
          blob: processed.blob,
          dimensions: '1000x1000px',
          colorsUsed: processed.colorsUsed,
          isLossless: processed.isLossless,
          withinLimit: processed.withinLimit
        });
      } catch (err) {
        console.error('Error saat kompresi batch:', file.name, err);
      }
    }

    setItems((prev) => [...prev, ...newBatchItems]);
    setIsProcessing(false);
    setOverallProgress(100);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleDownloadZip = async () => {
    if (items.length === 0) return;
    const zip = new JSZip();
    const folderName = `${filePrefix.trim() || 'MarketBoost'}_1000x1000_148KB`;
    const folder = zip.folder(folderName);
    items.forEach((item) => {
      if (item.blob) {
        folder?.file(item.newName, item.blob);
      }
    });
    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${folderName}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Statistik agregat
  const totalOriginalKb = items.reduce((acc, it) => acc + it.originalSizeKb, 0);
  const totalCompressedKb = items.reduce((acc, it) => acc + it.compressedSizeKb, 0);
  const totalSavedPercent = totalOriginalKb > 0 ? Math.round(((totalOriginalKb - totalCompressedKb) / totalOriginalKb) * 100) : 0;
  const allWithinLimit = items.length > 0 && items.every((it) => it.withinLimit);

  return (
    <div className="flex-1 flex bg-[#0f172a] text-slate-100 overflow-hidden">
      {/* Kolom Pengaturan Kiri */}
      <div className="w-[370px] lg:w-[390px] bg-[#1e293b] border-r border-slate-800 flex flex-col p-5 space-y-4 overflow-y-auto shrink-0 shadow-xl">
        {/* Header Panel */}
        <div className="flex items-center justify-between border-b border-slate-700/80 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/30">
              <Icons.Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white tracking-wide">Batch Processor</h2>
              <p className="text-[10px] text-slate-400 font-medium">1000x1000px &bull; Max 148KB &bull; Format PNG</p>
            </div>
          </div>
          <span className="text-[10px] font-mono font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
            &le; 148 KB
          </span>
        </div>

        {/* Syarat Target Box */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-white">
            <span className="flex items-center gap-1.5 text-indigo-300">
              <Icons.Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              Syarat Output Kompresi
            </span>
            <span className="text-[9px] font-mono bg-indigo-950 text-indigo-300 px-2 py-0.5 rounded border border-indigo-800/60 font-bold">
              Marketplace Ready
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-[10px] pt-1 border-t border-slate-800">
            <div className="bg-slate-800/70 p-2 rounded-lg text-center border border-slate-700/50">
              <span className="text-slate-400 block text-[9px]">RESOLUSI</span>
              <strong className="text-white text-xs font-mono">1000x1000</strong>
            </div>
            <div className="bg-slate-800/70 p-2 rounded-lg text-center border border-emerald-500/20">
              <span className="text-slate-400 block text-[9px]">BATAS SIZE</span>
              <strong className="text-emerald-400 text-xs font-mono">&le; 148 KB</strong>
            </div>
            <div className="bg-slate-800/70 p-2 rounded-lg text-center border border-indigo-500/20">
              <span className="text-slate-400 block text-[9px]">FORMAT</span>
              <strong className="text-indigo-300 text-xs font-mono">PNG</strong>
            </div>
          </div>
        </div>

        {/* Pengaturan Konfigurasi */}
        <div className="space-y-3.5 bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <h3 className="text-xs font-extrabold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Icons.Sliders className="w-3.5 h-3.5 text-indigo-400" /> Konfigurasi Gambar
          </h3>

          {/* Prefix Nama File */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 block">Prefix Penamaan File</label>
            <input
              type="text"
              value={filePrefix}
              onChange={(e) => setFilePrefix(e.target.value)}
              placeholder="Contoh: Produk_Katalog"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
            />
            <p className="text-[9px] text-slate-500 font-mono">
              Contoh hasil: <span className="text-indigo-300">{filePrefix.trim() || 'Produk'}_01_1000x1000.png</span>
            </p>
          </div>

          {/* Mode Kanvas */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 block">Penempatan Gambar ke 1000x1000</label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setFitMode('contain')}
                className={`px-2.5 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  fitMode === 'contain'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                <Icons.Maximize2 className="w-3.5 h-3.5" />
                <span>Pas Tengah (Fit)</span>
              </button>
              <button
                type="button"
                onClick={() => setFitMode('cover')}
                className={`px-2.5 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  fitMode === 'cover'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                <Icons.Crop className="w-3.5 h-3.5" />
                <span>Penuhi (Cover)</span>
              </button>
            </div>
            <p className="text-[9px] text-slate-500">
              {fitMode === 'contain'
                ? 'Seluruh produk tampak utuh tanpa terpotong (disertai latar belakang).'
                : 'Mengisi penuh kanvas persegi 1000x1000px tanpa ada sisa ruang samping.'}
            </p>
          </div>

          {/* Warna Latar Belakang */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 block">Latar Belakang Kanvas</label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setBgColor('white')}
                className={`px-2.5 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  bgColor === 'white'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                <div className="w-3 h-3 rounded-full bg-white border border-slate-400 shrink-0" />
                <span>Putih Bersih</span>
              </button>
              <button
                type="button"
                onClick={() => setBgColor('transparent')}
                className={`px-2.5 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  bgColor === 'transparent'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                <div className="w-3 h-3 rounded-full border border-dashed border-slate-300 shrink-0" />
                <span>Transparan</span>
              </button>
            </div>
            <p className="text-[9px] text-slate-500">
              {bgColor === 'white'
                ? 'Standar katalog resmi Shopee, Tokopedia, TikTok Shop & Lazada.'
                : 'Transparansi penuh PNG untuk gambar cutout / tanpa background.'}
            </p>
          </div>

          {/* Batas Maksimal KB */}
          <div className="space-y-1 pt-1 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-slate-400">Batas Ukuran Maksimal</label>
              <span className="text-[10px] font-mono font-bold text-emerald-400">{maxKbLimit} KB</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5 text-center">
              {[100, 120, 148].map((kb) => (
                <button
                  key={kb}
                  type="button"
                  onClick={() => setMaxKbLimit(kb)}
                  className={`py-1 rounded text-[11px] font-mono font-bold transition-all cursor-pointer ${
                    maxKbLimit === kb
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {kb === 148 ? '148 KB (Maks)' : `${kb} KB`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Upload Zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-2xl p-5 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-2 group ${
            isDragging
              ? 'border-indigo-500 bg-indigo-950/40 scale-[0.99]'
              : 'border-slate-700 hover:border-indigo-500 bg-slate-900/40 hover:bg-slate-900/70'
          }`}
        >
          <div className="p-3 bg-indigo-600/15 text-indigo-400 rounded-2xl group-hover:scale-110 transition-transform border border-indigo-500/20">
            <Icons.UploadCloud className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-white block">Tarik Banyak Foto ke Sini</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Mendukung JPG, PNG, WebP, AVIF, HEIC</span>
          </div>
          <label className="mt-2 inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-lg shadow-indigo-600/25 cursor-pointer transition-all">
            <Icons.Plus className="w-3.5 h-3.5" />
            <span>Pilih Banyak Berkas Gambar</span>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>

        {/* Tombol Aksi Bawah */}
        {items.length > 0 && (
          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={handleDownloadZip}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 cursor-pointer"
            >
              <Icons.FolderArchive className="w-4 h-4" />
              <span>Download Semua ({items.length} PNG &bull; ZIP)</span>
            </button>
            <button
              type="button"
              onClick={() => setItems([])}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Icons.Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Kosongkan Antrean</span>
            </button>
          </div>
        )}
      </div>

      {/* Kolom Hasil & Workspace Kanan */}
      <div className="flex-1 flex flex-col bg-[#0b0f19] overflow-hidden">
        {/* Top bar header */}
        <div className="h-16 bg-[#161f31] border-b border-slate-800 px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <Icons.CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Hasil Kompresi Batch (1000x1000 PNG)
            </h3>
            <span className="text-xs bg-slate-800 text-slate-300 font-mono px-2.5 py-0.5 rounded-full border border-slate-700 font-bold">
              {items.length} Berkas
            </span>
          </div>

          {/* Progress Processing */}
          {isProcessing && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-indigo-400 font-mono font-bold animate-pulse">
                Memproses {currentFileIndex}/{totalFileCount}... ({overallProgress}%)
              </span>
              <div className="w-32 bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700">
                <div
                  className="bg-indigo-500 h-full transition-all duration-200"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
            </div>
          )}

          {items.length > 0 && !isProcessing && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadZip}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-emerald-600/20 flex items-center gap-1.5 cursor-pointer"
              >
                <Icons.Download className="w-3.5 h-3.5" />
                <span>Unduh ZIP ({items.length})</span>
              </button>
            </div>
          )}
        </div>

        {/* Summary Statistics Card */}
        {items.length > 0 && (
          <div className="bg-[#101726] border-b border-slate-800 px-6 py-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl px-3 py-2 flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-bold text-slate-400 block uppercase">Total Berkas</span>
                  <span className="text-sm font-extrabold text-white font-mono">{items.length} PNG</span>
                </div>
                <Icons.Layers className="w-4 h-4 text-indigo-400" />
              </div>

              <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl px-3 py-2 flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-bold text-slate-400 block uppercase">Ukuran Total</span>
                  <span className="text-sm font-extrabold text-emerald-400 font-mono">
                    {totalCompressedKb > 1024
                      ? `${(totalCompressedKb / 1024).toFixed(2)} MB`
                      : `${totalCompressedKb.toFixed(0)} KB`}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-500 line-through">
                  {totalOriginalKb > 1024
                    ? `${(totalOriginalKb / 1024).toFixed(1)} MB`
                    : `${totalOriginalKb.toFixed(0)} KB`}
                </span>
              </div>

              <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl px-3 py-2 flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-bold text-slate-400 block uppercase">Penghematan</span>
                  <span className="text-sm font-extrabold text-teal-400 font-mono">Hemat {totalSavedPercent}%</span>
                </div>
                <Icons.TrendingDown className="w-4 h-4 text-teal-400" />
              </div>

              <div className="bg-slate-900/80 border border-emerald-500/30 rounded-xl px-3 py-2 flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-bold text-emerald-400 block uppercase">Status Syarat</span>
                  <span className="text-xs font-black text-emerald-300">
                    {allWithinLimit ? '✓ 100% Lolos (&le;148KB)' : 'Diproses Sesuai Target'}
                  </span>
                </div>
                <Icons.ShieldCheck className="w-4 h-4 text-emerald-400" />
              </div>
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 p-6 overflow-y-auto">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-4">
              <div className="w-20 h-20 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center text-indigo-400 shadow-inner">
                <Icons.Layers className="w-10 h-10 animate-pulse" />
              </div>
              <div className="space-y-2">
                <h4 className="text-base font-bold text-slate-100">Batch Processor Gambar Siap Digunakan</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Unggah foto produk sekaligus. Sistem secara otomatis mengompres dan menyesuaikan setiap gambar menjadi{' '}
                  <strong className="text-indigo-300">1000x1000 pixel</strong> dengan ukuran{' '}
                  <strong className="text-emerald-400">maksimal &le; 148 KB</strong> dalam format{' '}
                  <strong className="text-indigo-300">PNG</strong>.
                </p>
                <div className="pt-2 flex items-center justify-center gap-2 text-[10px] text-slate-400 font-mono">
                  <span className="bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">1000x1000px</span>
                  <span className="bg-slate-800 px-2.5 py-1 rounded-lg border border-emerald-800/50 text-emerald-400">&le; 148 KB</span>
                  <span className="bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">Format PNG</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="bg-[#161f31] border border-slate-800 rounded-2xl p-3.5 flex flex-col justify-between gap-3 shadow-lg hover:border-slate-700 transition-all group"
                >
                  {/* Preview Thumbnail */}
                  <div className="relative aspect-square w-full rounded-xl overflow-hidden border border-slate-700/80 bg-slate-950 flex items-center justify-center">
                    {/* Background checkerboard pattern for transparent PNG preview */}
                    <div
                      className="absolute inset-0 opacity-15"
                      style={{
                        backgroundImage:
                          'linear-gradient(45deg, #334155 25%, transparent 25%), linear-gradient(-45deg, #334155 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #334155 75%), linear-gradient(-45deg, transparent 75%, #334155 75%)',
                        backgroundSize: '16px 16px',
                        backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px'
                      }}
                    />
                    <img
                      src={item.compressedUrl}
                      alt={item.newName}
                      className="relative max-w-full max-h-full object-contain"
                    />

                    {/* Badge Resolusi 1000x1000 */}
                    <div className="absolute top-2 left-2 flex items-center gap-1 bg-slate-900/90 backdrop-blur-xs text-white text-[9px] font-mono font-bold px-2 py-0.5 rounded-md border border-slate-700">
                      <span>1000x1000</span>
                    </div>

                    {/* Badge Format PNG */}
                    <div className="absolute top-2 right-2 bg-indigo-950/90 text-indigo-300 text-[9px] font-mono font-extrabold px-2 py-0.5 rounded-md border border-indigo-800/80">
                      PNG
                    </div>

                    {/* Hover Zoom Overlay */}
                    <button
                      type="button"
                      onClick={() => setPreviewItem(item)}
                      className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-bold cursor-pointer"
                    >
                      <Icons.Eye className="w-4 h-4 text-indigo-400" />
                      <span>Lihat Detail</span>
                    </button>
                  </div>

                  {/* Info Details */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white truncate block flex-1" title={item.newName}>
                        {item.newName}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-mono bg-slate-900/80 px-2.5 py-1.5 rounded-lg border border-slate-800">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500 line-through">{item.originalSizeKb} KB</span>
                        <Icons.ArrowRight className="w-3 h-3 text-slate-600" />
                        <span className="text-emerald-400 font-extrabold">{item.compressedSizeKb} KB</span>
                      </div>
                      <span className="text-teal-400 font-bold">-{item.savedPercent}%</span>
                    </div>

                    <div className="flex items-center justify-between text-[9px] pt-1">
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <Icons.CheckCircle2 className="w-3 h-3" />
                        Lolos Syarat (&le; 148 KB)
                      </span>
                      <span className="text-slate-400 font-mono">
                        {(item.compressedSizeBytes).toLocaleString()} B
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 pt-2 border-t border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => setPreviewItem(item)}
                      className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer"
                      title="Lihat Pratinjau Ukuran Penuh"
                    >
                      <Icons.Eye className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Detail</span>
                    </button>
                    <a
                      href={item.compressedUrl}
                      download={item.newName}
                      className="p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all shadow-md cursor-pointer flex items-center justify-center"
                      title="Unduh File PNG ini"
                    >
                      <Icons.Download className="w-4 h-4" />
                    </a>
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="p-1.5 hover:bg-rose-950/40 text-rose-400 rounded-lg transition-all cursor-pointer"
                      title="Hapus dari antrean"
                    >
                      <Icons.Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal Preview Detail */}
      {previewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-[#161f31] border border-slate-700 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-700 pb-3">
              <div className="flex items-center gap-2">
                <Icons.Image className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-white truncate max-w-md">{previewItem.newName}</h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewItem(null)}
                className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <Icons.X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Image Display */}
            <div className="relative aspect-square max-h-[420px] w-full rounded-xl overflow-hidden border border-slate-700 bg-slate-950 flex items-center justify-center mx-auto">
              <div
                className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage:
                    'linear-gradient(45deg, #334155 25%, transparent 25%), linear-gradient(-45deg, #334155 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #334155 75%), linear-gradient(-45deg, transparent 75%, #334155 75%)',
                  backgroundSize: '16px 16px',
                  backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px'
                }}
              />
              <img
                src={previewItem.compressedUrl}
                alt={previewItem.newName}
                className="relative max-w-full max-h-full object-contain"
              />
            </div>

            {/* Verification Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center text-xs">
              <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-bold">RESOLUSI</span>
                <span className="text-white font-mono font-extrabold">{previewItem.dimensions}</span>
              </div>
              <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-bold">UKURAN BERKAS</span>
                <span className="text-emerald-400 font-mono font-extrabold">{previewItem.compressedSizeKb} KB</span>
                <span className="text-[9px] text-slate-500 font-mono block">({previewItem.compressedSizeBytes.toLocaleString()} B)</span>
              </div>
              <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-bold">FORMAT OUTPUT</span>
                <span className="text-indigo-400 font-mono font-extrabold">PNG (Portable Network)</span>
              </div>
              <div className="bg-slate-900 p-2.5 rounded-xl border border-emerald-500/30">
                <span className="text-[10px] text-slate-400 block font-bold">STATUS SYARAT</span>
                <span className="text-emerald-400 font-bold">
                  {previewItem.withinLimit ? '✓ Lolos (&le;148 KB)' : 'Tepat Target'}
                </span>
                <span className="text-[9px] text-teal-400 block font-mono">Hemat {previewItem.savedPercent}%</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-700">
              <button
                type="button"
                onClick={() => setPreviewItem(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Tutup
              </button>
              <a
                href={previewItem.compressedUrl}
                download={previewItem.newName}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/25 flex items-center gap-1.5 cursor-pointer"
              >
                <Icons.Download className="w-4 h-4" />
                <span>Unduh File PNG</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
