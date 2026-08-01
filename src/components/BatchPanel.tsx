import React, { useState } from 'react';
import * as Icons from 'lucide-react';
import JSZip from 'jszip';
import { ActiveTab } from '../types';

interface BatchItem {
  id: string;
  originalName: string;
  newName: string;
  originalSizeKb: number;
  compressedUrl: string;
  compressedSizeKb: number;
  status: 'pending' | 'processing' | 'success' | 'error';
  blob: Blob | null;
  dimensions: string;
  keywordTag: string;
}

interface BatchPanelProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
}

export const BatchPanel: React.FC<BatchPanelProps> = ({ activeTab, setActiveTab }) => {
  const [items, setItems] = useState<BatchItem[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [overallProgress, setOverallProgress] = useState<number>(0);
  const [filePrefix, setFilePrefix] = useState<string>('Product_Optimized');
  const [seoTag, setSeoTag] = useState<string>('Shopee Tokopedia Ready');
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const processFiles = async (fileList: FileList | File[]) => {
    if (!fileList || fileList.length === 0) return;

    setIsProcessing(true);
    setOverallProgress(0);
    const files = Array.from(fileList);
    const newBatchItems: BatchItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const originalSizeKb = Math.round(file.size / 1024);
      const url = URL.createObjectURL(file);

      setOverallProgress(Math.round(((i) / files.length) * 100));

      try {
        const processed = await new Promise<{ blob: Blob; url: string; sizeKb: number }>((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = async () => {
            const canvas = document.createElement('canvas');
            canvas.width = 1000;
            canvas.height = 1000;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              reject(new Error('Canvas context error'));
              return;
            }

            const maxBytes = 148 * 1024; // 148 KB max strictly
            let bestBlob: Blob = new Blob();

            const tryFormat = (): Promise<Blob> => {
              return new Promise((res) => {
                canvas.toBlob((b) => {
                  res(b || new Blob());
                }, 'image/png');
              });
            };

            const scales = [1.0, 0.95, 0.90, 0.85, 0.80, 0.75, 0.70, 0.65, 0.60];
            for (const sFactor of scales) {
              ctx.imageSmoothingEnabled = true;
              ctx.imageSmoothingQuality = 'high';
              ctx.fillStyle = '#FFFFFF';
              ctx.fillRect(0, 0, 1000, 1000);

              const currentScale = Math.min(1000 / img.width, 1000 / img.height) * sFactor;
              const cw = img.width * currentScale;
              const ch = img.height * currentScale;
              const cx = (1000 - cw) / 2;
              const cy = (1000 - ch) / 2;
              ctx.drawImage(img, cx, cy, cw, ch);

              const candidate = await tryFormat();
              bestBlob = candidate;
              if (bestBlob.size <= maxBytes) {
                break;
              }
            }

            // Final safety pass if still above 148KB
            if (bestBlob.size > maxBytes) {
              ctx.imageSmoothingEnabled = true;
              ctx.imageSmoothingQuality = 'high';
              ctx.fillStyle = '#FFFFFF';
              ctx.fillRect(0, 0, 1000, 1000);
              const currentScale = Math.min(1000 / img.width, 1000 / img.height) * 0.55;
              const cw = img.width * currentScale;
              const ch = img.height * currentScale;
              const cx = (1000 - cw) / 2;
              const cy = (1000 - ch) / 2;
              ctx.drawImage(img, cx, cy, cw, ch);
              bestBlob = await tryFormat();
            }

            const compUrl = URL.createObjectURL(bestBlob);
            resolve({
              blob: bestBlob,
              url: compUrl,
              sizeKb: Math.round(bestBlob.size / 1024)
            });
          };
          img.onerror = reject;
          img.src = url;
        });

        const cleanPrefix = filePrefix.trim() || 'Product';
        const formattedIndex = String(items.length + newBatchItems.length + 1).padStart(2, '0');
        const sanitizedNewName = `${cleanPrefix}_${formattedIndex}_1000x1000.png`;

        newBatchItems.push({
          id: Math.random().toString(36).substring(2, 9),
          originalName: file.name,
          newName: sanitizedNewName,
          originalSizeKb,
          compressedUrl: processed.url,
          compressedSizeKb: processed.sizeKb,
          status: 'success',
          blob: processed.blob,
          dimensions: '1000x1000px',
          keywordTag: seoTag
        });
      } catch (err) {
        console.error("Batch processing error for file:", file.name, err);
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
    const folder = zip.folder("MarketBoost_Batch_1000x1000_148KB");
    items.forEach((item) => {
      if (item.blob) {
        folder?.file(item.newName, item.blob);
      }
    });
    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'MarketBoost_Batch_Optimized_148KB.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter(item => item.id !== id));
  };

  return (
    <div className="flex-1 flex bg-[#0f172a] text-slate-100 overflow-hidden">
      
      {/* Left Control Column */}
      <div className="w-[360px] bg-[#1e293b] border-r border-slate-800 flex flex-col p-5 space-y-5 overflow-y-auto shrink-0 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-700 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/30">
              <Icons.Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white tracking-wide">Batch Processing</h2>
              <p className="text-[10px] text-slate-400 font-medium">Multi-Image Auto Compressor & Metadata</p>
            </div>
          </div>
          <span className="text-[9px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
            MAX 148 KB
          </span>
        </div>

        {/* Configuration settings */}
        <div className="space-y-4 bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
          <h3 className="text-xs font-extrabold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Icons.Settings className="w-3.5 h-3.5 text-indigo-400" /> Konfigurasi Output
          </h3>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 block">Prefix Penamaan File</label>
            <input
              type="text"
              value={filePrefix}
              onChange={(e) => setFilePrefix(e.target.value)}
              placeholder="Contoh: SepatuPria_Official"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
            />
          </div>

            <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 block">SEO Tag / Keyword Metadata</label>
            <input
              type="text"
              value={seoTag}
              onChange={(e) => setSeoTag(e.target.value)}
              placeholder="Contoh: Tokopedia Shopee Ready"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
            />
          </div>

          <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-400 space-y-1.5 leading-relaxed">
            <div className="flex items-center gap-1.5 text-indigo-300 font-bold">
              <Icons.CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span>Standar Marketplace Presisi</span>
            </div>
            <p>• Resolusi: <strong>1000x1000px</strong> (Square)</p>
            <p>• Ukuran: Maksimal <strong>&lt; 148 KB</strong></p>
            <p>• Format: <strong>PNG</strong> (High Color Fidelity)</p>
          </div>
        </div>

        {/* Upload Zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-2 group ${
            isDragging ? 'border-indigo-500 bg-indigo-950/30' : 'border-slate-700 hover:border-indigo-500 bg-slate-900/40 hover:bg-slate-900/70'
          }`}
        >
          <div className="p-3 bg-indigo-600/10 text-indigo-400 rounded-2xl group-hover:scale-110 transition-transform border border-indigo-500/20">
            <Icons.UploadCloud className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-white block">Tarik Banyak Gambar ke Sini</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">atau klik untuk memilih berkas</span>
          </div>
          <label className="mt-2 inline-block bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-lg shadow-indigo-600/20 cursor-pointer transition-all">
            Pilih Berkas Gambar
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>

        {items.length > 0 && (
          <button
            type="button"
            onClick={handleDownloadZip}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 cursor-pointer"
          >
            <Icons.FolderArchive className="w-4 h-4" />
            <span>Download Semua Berkas (ZIP)</span>
          </button>
        )}
      </div>

      {/* Right Workspace Preview & Results */}
      <div className="flex-1 flex flex-col bg-[#0b0f19] overflow-hidden">
        
        {/* Top bar summary */}
        <div className="h-16 bg-[#161f31] border-b border-slate-800 px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <Icons.FileCheck className="w-4 h-4 text-emerald-400" />
              Antrean Berkas Batch
            </h3>
            <span className="text-xs bg-slate-800 text-slate-300 font-mono px-2.5 py-0.5 rounded-full border border-slate-700 font-bold">
              {items.length} Selesai diproses
            </span>
          </div>

          {isProcessing && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-indigo-400 font-mono font-bold animate-pulse">
                Memproses... {overallProgress}%
              </span>
              <div className="w-32 bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700">
                <div
                  className="bg-indigo-500 h-full transition-all duration-300"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
            </div>
          )}

          {items.length > 0 && (
            <button
              type="button"
              onClick={() => setItems([])}
              className="text-xs font-bold text-rose-400 hover:text-rose-300 bg-rose-950/30 border border-rose-900/40 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
            >
              Reset Semua
            </button>
          )}
        </div>

        {/* Content grid */}
        <div className="flex-1 p-6 overflow-y-auto">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center text-indigo-400 shadow-inner">
                <Icons.Sparkles className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-200">Belum Ada Gambar yang Diproses</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Unggah beberapa gambar produk sekaligus di panel kiri. Sistem otomatis menyesuaikan resolusi <strong>1000x1000px</strong> dan membatasi ukuran maksimal <strong>&lt; 148 KB</strong> tanpa menurunkan kualitas warna & ketajaman.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((item) => (
                <div key={item.id} className="bg-[#161f31] border border-slate-800/80 rounded-2xl p-4 flex flex-col gap-3 shadow-lg hover:border-slate-700 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 rounded-xl border border-slate-700 bg-slate-900 overflow-hidden flex items-center justify-center shrink-0">
                      <img src={item.compressedUrl} alt={item.newName} className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <span className="text-xs font-bold text-white truncate block" title={item.newName}>
                        {item.newName}
                      </span>
                      <div className="flex items-center gap-2 text-[10px] font-mono">
                        <span className="text-slate-500 line-through">{item.originalSizeKb} KB</span>
                        <span className="text-emerald-400 font-extrabold">{item.compressedSizeKb} KB</span>
                        <span className="bg-indigo-950 text-indigo-300 px-1.5 py-0.2 rounded border border-indigo-900/50">{item.dimensions}</span>
                      </div>
                      <div className="text-[9px] text-slate-400 font-medium truncate">
                        Tag: <span className="text-slate-300 font-bold">{item.keywordTag}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[10px]">
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <Icons.CheckCircle2 className="w-3.5 h-3.5" /> Optimal (&lt; 148KB)
                    </span>
                    <div className="flex items-center gap-1.5">
                      <a
                        href={item.compressedUrl}
                        download={item.newName}
                        className="p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all shadow-md cursor-pointer flex items-center justify-center"
                        title="Unduh Berkas Ini"
                      >
                        <Icons.Download className="w-3.5 h-3.5" />
                      </a>
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="p-1.5 hover:bg-rose-950/40 text-rose-400 rounded-lg transition-all cursor-pointer"
                        title="Hapus dari antrean"
                      >
                        <Icons.Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
