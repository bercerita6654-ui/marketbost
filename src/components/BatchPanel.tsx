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
  originalFile?: File;
  originalName: string;
  newName: string;
  originalSizeBytes: number;
  originalSizeKb: number;
  originalWidth?: number;
  originalHeight?: number;
  compressedUrl: string;
  compressedSizeBytes: number;
  compressedSizeKb: number;
  savedPercent: number;
  status: 'success' | 'error';
  blob: Blob | null;
  dimensions: string; // e.g. '1000x1000px'
  aspectRatio: string; // e.g. '1:1', '4:5', '3:4', '9:16', '16:9', 'Asli'
  colorsUsed: number;
  isLossless: boolean;
  withinLimit: boolean; // size <= maxAllowed
  bgRemoved: boolean;
  fitMode?: 'contain' | 'cover';
  bgColor?: 'white' | 'transparent';
  customMaxKb?: number;
}

interface BatchPanelProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
}

const RESIZE_PRESETS = [
  { label: '1000 x 1000', w: 1000, h: 1000, tag: 'Shopee/Tokopedia' },
  { label: '800 x 800', w: 800, h: 800, tag: 'Katalog E-Comm' },
  { label: '1080 x 1080', w: 1080, h: 1080, tag: 'Feed IG (1:1)' },
  { label: '1080 x 1350', w: 1080, h: 1350, tag: 'Portrait (4:5)' },
  { label: '1080 x 1920', w: 1080, h: 1920, tag: 'Story/TikTok (9:16)' },
  { label: '500 x 500', w: 500, h: 500, tag: 'Thumbnail Mini' },
];

export interface AspectRatioPreset {
  label: string;
  name: string;
  ratio: number | null;
  w: number;
  h: number;
  tag: string;
}

export const ASPECT_RATIO_PRESETS: AspectRatioPreset[] = [
  { label: '1:1', name: 'Persegi', ratio: 1, w: 1000, h: 1000, tag: 'Feed IG / Marketplace' },
  { label: '4:5', name: 'Portrait', ratio: 4 / 5, w: 1080, h: 1350, tag: 'Feed IG Vertikal' },
  { label: '3:4', name: 'Katalog', ratio: 3 / 4, w: 900, h: 1200, tag: 'Katalog Shopee & TikTok' },
  { label: '9:16', name: 'Story', ratio: 9 / 16, w: 1080, h: 1920, tag: 'Story & Reels' },
  { label: '16:9', name: 'Lanskap', ratio: 16 / 9, w: 1920, h: 1080, tag: 'Banner Web / Desktop' },
  { label: 'Bebas', name: 'Kustom', ratio: null, w: 0, h: 0, tag: 'Rasio Bebas Manual' },
];

export function getAspectRatioLabel(w: number, h: number): string {
  if (!w || !h) return '1:1';
  const ratio = w / h;
  if (Math.abs(ratio - 1) < 0.04) return '1:1';
  if (Math.abs(ratio - 4 / 5) < 0.04) return '4:5';
  if (Math.abs(ratio - 3 / 4) < 0.04) return '3:4';
  if (Math.abs(ratio - 9 / 16) < 0.04) return '9:16';
  if (Math.abs(ratio - 16 / 9) < 0.04) return '16:9';
  if (Math.abs(ratio - 2 / 3) < 0.04) return '2:3';
  if (Math.abs(ratio - 3 / 2) < 0.04) return '3:2';
  return `${w}:${h}`;
}

/**
 * Algoritma cerdas penghapus latar belakang berbasis BFS Edge-Connected Flood-Fill
 * dan Edge Anti-Aliasing/Feathering. Melindungi bagian dalam produk (seperti sol putih,
 * tali putih, atau logo) agar tidak bolong.
 */
function removeBackgroundFromImage(
  sourceImg: HTMLImageElement,
  options: {
    tolerance: number; // 5 to 60
    feather: number;   // 0 to 5
    edgeOnly: boolean; // true = flood fill dari batas luar; false = global chroma
    customColor?: string;
  }
): HTMLCanvasElement {
  const w = sourceImg.naturalWidth || sourceImg.width;
  const h = sourceImg.naturalHeight || sourceImg.height;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return canvas;

  ctx.drawImage(sourceImg, 0, 0, w, h);
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  // Menentukan warna latar belakang yang akan dihapus
  let bgR = 255;
  let bgG = 255;
  let bgB = 255;

  if (options.customColor) {
    const hex = options.customColor.replace('#', '');
    if (hex.length === 6) {
      bgR = parseInt(hex.substring(0, 2), 16);
      bgG = parseInt(hex.substring(2, 4), 16);
      bgB = parseInt(hex.substring(4, 6), 16);
    }
  } else {
    // Deteksi otomatis warna dominan pada sudut-sudut dan pinggir kanvas
    const sampleCoords: [number, number][] = [
      [0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1],
      [Math.floor(w / 2), 0], [Math.floor(w / 2), h - 1],
      [0, Math.floor(h / 2)], [w - 1, Math.floor(h / 2)],
      [2, 2], [w - 3, 2], [2, h - 3], [w - 3, h - 3]
    ];
    let sumR = 0, sumG = 0, sumB = 0, count = 0;
    for (const [sx, sy] of sampleCoords) {
      if (sx >= 0 && sx < w && sy >= 0 && sy < h) {
        const idx = (sy * w + sx) * 4;
        if (data[idx + 3] > 20) { // Hanya pixel yang tidak transparan
          sumR += data[idx];
          sumG += data[idx + 1];
          sumB += data[idx + 2];
          count++;
        }
      }
    }
    if (count > 0) {
      bgR = Math.round(sumR / count);
      bgG = Math.round(sumG / count);
      bgB = Math.round(sumB / count);
    }
  }

  const maxEuclideanDist = 441.67; // sqrt(255^2 * 3)
  const thresholdDist = (options.tolerance / 100) * maxEuclideanDist;
  const featherDist = Math.max(2, (options.feather * 3 / 100) * maxEuclideanDist);

  // Fungsi pengukur kemiripan warna & alpha transisi
  const getAlphaFactor = (r: number, g: number, b: number, a: number): number => {
    if (a < 10) return 0;
    const dr = r - bgR;
    const dg = g - bgG;
    const db = b - bgB;
    const dist = Math.sqrt(dr * dr + dg * dg + db * db);
    if (dist <= thresholdDist - featherDist) {
      return 0; // Latar belakang pasti -> hapus total (transparan)
    }
    if (dist >= thresholdDist + featherDist) {
      return 1; // Subjek utama pasti -> biarkan solid
    }
    // Gradasi halus pada tepian produk (feathering)
    return (dist - (thresholdDist - featherDist)) / (2 * featherDist);
  };

  if (options.edgeOnly) {
    // Edge-Connected Flood Fill BFS: Hanya menghapus latar yang tersambung dari tepian luar
    const visited = new Uint8Array(w * h);
    const queue = new Int32Array(w * h);
    let head = 0;
    let tail = 0;

    // Masukkan seluruh pixel batas luar (tepi atas, bawah, kiri, kanan)
    for (let x = 0; x < w; x++) {
      // Baris atas
      let idx = x;
      let p = idx * 4;
      if (getAlphaFactor(data[p], data[p + 1], data[p + 2], data[p + 3]) < 0.95) {
        visited[idx] = 1;
        queue[tail++] = idx;
      }
      // Baris bawah
      idx = (h - 1) * w + x;
      p = idx * 4;
      if (getAlphaFactor(data[p], data[p + 1], data[p + 2], data[p + 3]) < 0.95) {
        visited[idx] = 1;
        queue[tail++] = idx;
      }
    }
    for (let y = 1; y < h - 1; y++) {
      // Kolom kiri
      let idx = y * w;
      let p = idx * 4;
      if (getAlphaFactor(data[p], data[p + 1], data[p + 2], data[p + 3]) < 0.95) {
        visited[idx] = 1;
        queue[tail++] = idx;
      }
      // Kolom kanan
      idx = y * w + (w - 1);
      p = idx * 4;
      if (getAlphaFactor(data[p], data[p + 1], data[p + 2], data[p + 3]) < 0.95) {
        visited[idx] = 1;
        queue[tail++] = idx;
      }
    }

    // Jalankan BFS ke pixel-pixel tetangga
    while (head < tail) {
      const curr = queue[head++];
      const cx = curr % w;
      const cy = Math.floor(curr / w);

      const neighbors = [
        cx > 0 ? curr - 1 : -1,
        cx < w - 1 ? curr + 1 : -1,
        cy > 0 ? curr - w : -1,
        cy < h - 1 ? curr + w : -1
      ];

      for (const n of neighbors) {
        if (n !== -1 && visited[n] === 0) {
          const np = n * 4;
          const factor = getAlphaFactor(data[np], data[np + 1], data[np + 2], data[np + 3]);
          if (factor < 0.95) {
            visited[n] = 1;
            queue[tail++] = n;
          }
        }
      }
    }

    // Terapkan transparansi pada pixel latar yang terhubung
    for (let i = 0; i < w * h; i++) {
      if (visited[i] === 1) {
        const p = i * 4;
        const factor = getAlphaFactor(data[p], data[p + 1], data[p + 2], data[p + 3]);
        data[p + 3] = Math.round(data[p + 3] * factor);
      }
    }
  } else {
    // Global Color Keying
    for (let i = 0; i < data.length; i += 4) {
      const factor = getAlphaFactor(data[i], data[i + 1], data[i + 2], data[i + 3]);
      data[i + 3] = Math.round(data[i + 3] * factor);
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

export const BatchPanel: React.FC<BatchPanelProps> = () => {
  const [items, setItems] = useState<BatchItem[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [currentFileIndex, setCurrentFileIndex] = useState<number>(0);
  const [totalFileCount, setTotalFileCount] = useState<number>(0);
  const [overallProgress, setOverallProgress] = useState<number>(0);
  const [filePrefix, setFilePrefix] = useState<string>('Produk_Katalog');

  // Mode Ukuran: 'original' (Otomatis ikuti dimensi file upload) vs 'custom' (Resize manual / preset)
  const [resizeMode, setResizeMode] = useState<'original' | 'custom'>('original');

  // State Ukuran / Resize Sesuai Keinginan (jika mode custom)
  const [targetWidth, setTargetWidth] = useState<number>(1000);
  const [targetHeight, setTargetHeight] = useState<number>(1000);
  const [lockRatio, setLockRatio] = useState<boolean>(true);
  const [selectedRatio, setSelectedRatio] = useState<string>('1:1');

  const [fitMode, setFitMode] = useState<'contain' | 'cover'>('contain');
  const [bgColor, setBgColor] = useState<'white' | 'transparent'>('white');
  const [maxKbLimit, setMaxKbLimit] = useState<number>(148);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [previewItem, setPreviewItem] = useState<BatchItem | null>(null);

  // State untuk Modal Penyesuaian Individual (Adjust Size & Rasio Per-Item)
  const [adjustingItem, setAdjustingItem] = useState<BatchItem | null>(null);
  const [adjWidth, setAdjWidth] = useState<number>(1000);
  const [adjHeight, setAdjHeight] = useState<number>(1000);
  const [adjRatio, setAdjRatio] = useState<string>('1:1');
  const [adjLockRatio, setAdjLockRatio] = useState<boolean>(true);
  const [adjFitMode, setAdjFitMode] = useState<'contain' | 'cover'>('contain');
  const [adjBgColor, setAdjBgColor] = useState<'white' | 'transparent'>('white');
  const [adjMaxKb, setAdjMaxKb] = useState<number>(148);
  const [adjRemoveBg, setAdjRemoveBg] = useState<boolean>(false);
  const [isAdjustingLoading, setIsAdjustingLoading] = useState<boolean>(false);

  // State untuk Remove Background
  const [removeBg, setRemoveBg] = useState<boolean>(false);
  const [bgTolerance, setBgTolerance] = useState<number>(26); // 5 to 60
  const [bgFeather, setBgFeather] = useState<number>(2); // 0 to 5
  const [bgRemovalMode, setBgRemovalMode] = useState<'edge' | 'global'>('edge');
  const [customBgColor, setCustomBgColor] = useState<string>('#ffffff');
  const [useCustomColor, setUseCustomColor] = useState<boolean>(false);

  const applyRatioPreset = (preset: AspectRatioPreset) => {
    setSelectedRatio(preset.label);
    if (preset.label === 'Bebas') {
      setLockRatio(false);
      return;
    }
    setTargetWidth(preset.w);
    setTargetHeight(preset.h);
    setLockRatio(true);
  };

  const handleWidthChange = (val: number) => {
    const w = Math.max(10, Math.min(4000, val || 10));
    setTargetWidth(w);
    if (lockRatio) {
      const preset = ASPECT_RATIO_PRESETS.find((p) => p.label === selectedRatio);
      if (preset && preset.ratio) {
        setTargetHeight(Math.round(w / preset.ratio));
      } else {
        const ratio = targetWidth && targetHeight ? targetWidth / targetHeight : 1;
        setTargetHeight(Math.round(w / ratio));
      }
    }
  };

  const handleHeightChange = (val: number) => {
    const h = Math.max(10, Math.min(4000, val || 10));
    setTargetHeight(h);
    if (lockRatio) {
      const preset = ASPECT_RATIO_PRESETS.find((p) => p.label === selectedRatio);
      if (preset && preset.ratio) {
        setTargetWidth(Math.round(h * preset.ratio));
      } else {
        const ratio = targetWidth && targetHeight ? targetWidth / targetHeight : 1;
        setTargetWidth(Math.round(h * ratio));
      }
    }
  };

  const applyPreset = (w: number, h: number) => {
    setTargetWidth(w);
    setTargetHeight(h);
    const label = getAspectRatioLabel(w, h);
    setSelectedRatio(label);
    if (w === h) {
      setLockRatio(true);
    } else {
      setLockRatio(false);
    }
  };

  /**
   * Mengompresi & me-resize file gambar.
   * Mendukung mode 'original' (otomatis mengikuti lebar x tinggi asli foto yang diunggah)
   * atau mode 'custom' (targetWidth x targetHeight bebas/preset),
   * format PNG, dengan batas ukuran maksimal bebas diatur sendiri (maxKbLimit),
   * plus opsi hapus background studio otomatis.
   */
  const compressToPng = (
    file: File,
    options: {
      resizeMode: 'original' | 'custom';
      targetWidth: number;
      targetHeight: number;
      fitMode: 'contain' | 'cover';
      bgColor: 'white' | 'transparent';
      maxBytes: number;
      removeBg: boolean;
      bgTolerance: number;
      bgFeather: number;
      bgRemovalMode: 'edge' | 'global';
      customBgColor?: string;
    }
  ): Promise<{
    blob: Blob;
    url: string;
    sizeKb: number;
    sizeBytes: number;
    dimensions: string;
    aspectRatio?: string;
    srcWidth?: number;
    srcHeight?: number;
    colorsUsed: number;
    isLossless: boolean;
    withinLimit: boolean;
    bgRemoved: boolean;
  }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          try {
            const srcWidth = img.naturalWidth || img.width;
            const srcHeight = img.naturalHeight || img.height;

            // Resolusi target: otomatis ikuti foto asli jika mode original, atau custom sesuai input
            const outW = options.resizeMode === 'original' ? srcWidth : (options.targetWidth || 1000);
            const outH = options.resizeMode === 'original' ? srcHeight : (options.targetHeight || 1000);

            // Jika fitur Remove Background aktif, olah gambar terlebih dahulu
            let sourceToDraw: CanvasImageSource = img;
            let bgWasRemoved = false;

            if (options.removeBg) {
              const cutoutCanvas = removeBackgroundFromImage(img, {
                tolerance: options.bgTolerance,
                feather: options.bgFeather,
                edgeOnly: options.bgRemovalMode === 'edge',
                customColor: options.customBgColor
              });
              sourceToDraw = cutoutCanvas;
              bgWasRemoved = true;
            }

            const canvas = document.createElement('canvas');
            canvas.width = outW;
            canvas.height = outH;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (!ctx) {
              throw new Error('Gagal menginisialisasi Canvas context');
            }

            const currentDrawW = (sourceToDraw as any).width || img.width;
            const currentDrawH = (sourceToDraw as any).height || img.height;

            const renderCanvas = (scaleMultiplier = 1.0, blurNoise = false) => {
              ctx.clearRect(0, 0, outW, outH);
              if (options.bgColor === 'white') {
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, outW, outH);
              }

              ctx.imageSmoothingEnabled = true;
              ctx.imageSmoothingQuality = 'high';

              let baseScale = 1;
              if (options.resizeMode === 'original') {
                // Mode Otomatis: Rasio dan dimensi 100% bawaan asli foto
                baseScale = 1;
              } else if (options.fitMode === 'contain') {
                baseScale = Math.min(outW / currentDrawW, outH / currentDrawH);
              } else {
                baseScale = Math.max(outW / currentDrawW, outH / currentDrawH);
              }

              const finalScale = baseScale * scaleMultiplier;
              const drawW = Math.round(currentDrawW * finalScale);
              const drawH = Math.round(currentDrawH * finalScale);
              const drawX = Math.round((outW - drawW) / 2);
              const drawY = Math.round((outH - drawH) / 2);

              ctx.drawImage(sourceToDraw, drawX, drawY, drawW, drawH);

              if (blurNoise) {
                // Sedikit meratakan noise pixel tinggi agar DEFLATE PNG muat di bawah batas KB
                const imgData = ctx.getImageData(0, 0, outW, outH);
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
                const imgData = ctx.getImageData(0, 0, outW, outH);
                const resBuffer = encodeFn([imgData.data.buffer], outW, outH, cnum);
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

            // Tahap 2: Jika > maxAllowed, kuantisasi palet warna secara progresif (TinyPNG engine)
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

            // Tahap 3: Jika gambar sangat kompleks/noise tinggi dan masih > maxAllowed
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
              dimensions: `${outW}x${outH}px`,
              aspectRatio: getAspectRatioLabel(outW, outH),
              srcWidth,
              srcHeight,
              colorsUsed,
              isLossless,
              withinLimit: blobSize <= maxAllowed,
              bgRemoved: bgWasRemoved
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
    const maxBytes = Math.max(10, maxKbLimit || 148) * 1024;
    const curW = targetWidth;
    const curH = targetHeight;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setCurrentFileIndex(i + 1);
      setOverallProgress(Math.round(((i + 1) / files.length) * 100));

      const originalSizeBytes = file.size;
      const originalSizeKb = +(originalSizeBytes / 1024).toFixed(1);

      try {
        const processed = await compressToPng(file, {
          resizeMode,
          targetWidth: curW,
          targetHeight: curH,
          fitMode,
          bgColor,
          maxBytes,
          removeBg,
          bgTolerance,
          bgFeather,
          bgRemovalMode,
          customBgColor: useCustomColor ? customBgColor : undefined
        });

        const cleanPrefix = filePrefix.trim() || 'Produk';
        const formattedIndex = String(items.length + newBatchItems.length + 1).padStart(2, '0');
        const dimStr = processed.dimensions.replace('px', '');
        const sanitizedNewName = `${cleanPrefix}_${formattedIndex}_${dimStr}.png`;

        const savedBytes = Math.max(0, originalSizeBytes - processed.sizeBytes);
        const savedPercent = Math.round((savedBytes / originalSizeBytes) * 100);

        newBatchItems.push({
          id: Math.random().toString(36).substring(2, 9),
          originalFile: file,
          originalName: file.name,
          newName: sanitizedNewName,
          originalSizeBytes,
          originalSizeKb,
          originalWidth: processed.srcWidth,
          originalHeight: processed.srcHeight,
          compressedUrl: processed.url,
          compressedSizeBytes: processed.sizeBytes,
          compressedSizeKb: processed.sizeKb,
          savedPercent,
          status: 'success',
          blob: processed.blob,
          dimensions: processed.dimensions,
          aspectRatio: processed.aspectRatio,
          colorsUsed: processed.colorsUsed,
          isLossless: processed.isLossless,
          withinLimit: processed.withinLimit,
          bgRemoved: processed.bgRemoved,
          fitMode,
          bgColor
        });
      } catch (err) {
        console.error('Error saat kompresi batch:', file.name, err);
      }
    }

    setItems((prev) => [...prev, ...newBatchItems]);
    setIsProcessing(false);
    setOverallProgress(100);
  };

  /**
   * Buka Modal Penyesuaian Ukuran & Rasio untuk item tertentu
   */
  const openAdjustModal = (item: BatchItem) => {
    setAdjustingItem(item);
    const parts = item.dimensions.replace('px', '').split('x');
    const w = parseInt(parts[0], 10) || targetWidth || 1000;
    const h = parseInt(parts[1], 10) || targetHeight || 1000;
    setAdjWidth(w);
    setAdjHeight(h);
    const ratioLabel = getAspectRatioLabel(w, h);
    setAdjRatio(ratioLabel);
    setAdjLockRatio(w === h || Math.abs(w / h - 4 / 5) < 0.04 || Math.abs(w / h - 3 / 4) < 0.04 || Math.abs(w / h - 9 / 16) < 0.04);
    setAdjFitMode(item.fitMode || fitMode);
    setAdjBgColor(item.bgColor || bgColor);
    setAdjMaxKb(item.customMaxKb || maxKbLimit);
    setAdjRemoveBg(item.bgRemoved);
  };

  const handleAdjRatioClick = (label: string) => {
    setAdjRatio(label);
    if (label === 'Asli' && adjustingItem?.originalWidth && adjustingItem?.originalHeight) {
      setAdjWidth(adjustingItem.originalWidth);
      setAdjHeight(adjustingItem.originalHeight);
      setAdjLockRatio(true);
      return;
    }
    const preset = ASPECT_RATIO_PRESETS.find((p) => p.label === label);
    if (preset && preset.ratio) {
      setAdjWidth(preset.w);
      setAdjHeight(preset.h);
      setAdjLockRatio(true);
    } else {
      setAdjLockRatio(false);
    }
  };

  const handleAdjWidthChange = (val: number) => {
    const w = Math.max(10, Math.min(4000, val || 10));
    setAdjWidth(w);
    if (adjLockRatio) {
      const preset = ASPECT_RATIO_PRESETS.find((p) => p.label === adjRatio);
      if (preset && preset.ratio) {
        setAdjHeight(Math.round(w / preset.ratio));
      } else {
        const ratio = adjWidth && adjHeight ? adjWidth / adjHeight : 1;
        setAdjHeight(Math.round(w / ratio));
      }
    }
  };

  const handleAdjHeightChange = (val: number) => {
    const h = Math.max(10, Math.min(4000, val || 10));
    setAdjHeight(h);
    if (adjLockRatio) {
      const preset = ASPECT_RATIO_PRESETS.find((p) => p.label === adjRatio);
      if (preset && preset.ratio) {
        setAdjWidth(Math.round(h * preset.ratio));
      } else {
        const ratio = adjWidth && adjHeight ? adjWidth / adjHeight : 1;
        setAdjWidth(Math.round(h * ratio));
      }
    }
  };

  /**
   * Proses perubahan ukuran & rasio untuk satu item
   */
  const processSingleItemAdjustment = async (
    item: BatchItem,
    opts: {
      targetWidth: number;
      targetHeight: number;
      fitMode: 'contain' | 'cover';
      bgColor: 'white' | 'transparent';
      maxKb: number;
      removeBg: boolean;
    }
  ) => {
    const fileToUse = item.originalFile || (item.blob ? new File([item.blob], item.originalName, { type: 'image/png' }) : null);
    if (!fileToUse) return;

    setIsAdjustingLoading(true);
    try {
      const processed = await compressToPng(fileToUse, {
        resizeMode: 'custom',
        targetWidth: opts.targetWidth,
        targetHeight: opts.targetHeight,
        fitMode: opts.fitMode,
        bgColor: opts.bgColor,
        maxBytes: opts.maxKb * 1024,
        removeBg: opts.removeBg,
        bgTolerance,
        bgFeather,
        bgRemovalMode,
        customBgColor: useCustomColor ? customBgColor : undefined
      });

      const dimStr = processed.dimensions.replace('px', '');
      const cleanPrefix = filePrefix.trim() || 'Produk';
      const indexPart = item.newName.split('_')[1] || '01';
      const sanitizedNewName = `${cleanPrefix}_${indexPart}_${dimStr}.png`;
      const savedBytes = Math.max(0, item.originalSizeBytes - processed.sizeBytes);
      const savedPercent = Math.round((savedBytes / item.originalSizeBytes) * 100);

      setItems((prev) =>
        prev.map((it) => {
          if (it.id === item.id) {
            return {
              ...it,
              newName: sanitizedNewName,
              compressedUrl: processed.url,
              compressedSizeBytes: processed.sizeBytes,
              compressedSizeKb: processed.sizeKb,
              savedPercent,
              blob: processed.blob,
              dimensions: processed.dimensions,
              aspectRatio: processed.aspectRatio,
              colorsUsed: processed.colorsUsed,
              isLossless: processed.isLossless,
              withinLimit: processed.withinLimit,
              bgRemoved: processed.bgRemoved,
              fitMode: opts.fitMode,
              bgColor: opts.bgColor,
              customMaxKb: opts.maxKb
            };
          }
          return it;
        })
      );
      setAdjustingItem(null);
    } catch (err) {
      console.error('Gagal menyesuaikan gambar:', err);
    } finally {
      setIsAdjustingLoading(false);
    }
  };

  /**
   * Penyesuaian cepat batas KB untuk satu item langsung dari card
   */
  const quickAdjustItemKb = async (item: BatchItem, newKb: number) => {
    const parts = item.dimensions.replace('px', '').split('x');
    const w = parseInt(parts[0], 10) || targetWidth || 1000;
    const h = parseInt(parts[1], 10) || targetHeight || 1000;
    await processSingleItemAdjustment(item, {
      targetWidth: w,
      targetHeight: h,
      fitMode: item.fitMode || fitMode,
      bgColor: item.bgColor || bgColor,
      maxKb: newKb,
      removeBg: item.bgRemoved
    });
  };

  /**
   * Terapkan pengaturan ukuran & rasio ke seluruh file dalam antrean
   */
  const applyAdjustmentToAll = async (opts: {
    targetWidth: number;
    targetHeight: number;
    fitMode: 'contain' | 'cover';
    bgColor: 'white' | 'transparent';
    maxKb: number;
    removeBg: boolean;
  }) => {
    if (items.length === 0) return;
    setIsAdjustingLoading(true);
    setIsProcessing(true);
    setOverallProgress(0);

    try {
      const updatedItems: BatchItem[] = [];
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        setCurrentFileIndex(i + 1);
        setOverallProgress(Math.round(((i + 1) / items.length) * 100));

        const fileToUse = it.originalFile || (it.blob ? new File([it.blob], it.originalName, { type: 'image/png' }) : null);
        if (!fileToUse) {
          updatedItems.push(it);
          continue;
        }

        const processed = await compressToPng(fileToUse, {
          resizeMode: 'custom',
          targetWidth: opts.targetWidth,
          targetHeight: opts.targetHeight,
          fitMode: opts.fitMode,
          bgColor: opts.bgColor,
          maxBytes: opts.maxKb * 1024,
          removeBg: opts.removeBg,
          bgTolerance,
          bgFeather,
          bgRemovalMode,
          customBgColor: useCustomColor ? customBgColor : undefined
        });

        const dimStr = processed.dimensions.replace('px', '');
        const cleanPrefix = filePrefix.trim() || 'Produk';
        const formattedIndex = String(i + 1).padStart(2, '0');
        const sanitizedNewName = `${cleanPrefix}_${formattedIndex}_${dimStr}.png`;
        const savedBytes = Math.max(0, it.originalSizeBytes - processed.sizeBytes);
        const savedPercent = Math.round((savedBytes / it.originalSizeBytes) * 100);

        updatedItems.push({
          ...it,
          newName: sanitizedNewName,
          compressedUrl: processed.url,
          compressedSizeBytes: processed.sizeBytes,
          compressedSizeKb: processed.sizeKb,
          savedPercent,
          blob: processed.blob,
          dimensions: processed.dimensions,
          aspectRatio: processed.aspectRatio,
          colorsUsed: processed.colorsUsed,
          isLossless: processed.isLossless,
          withinLimit: processed.withinLimit,
          bgRemoved: processed.bgRemoved,
          fitMode: opts.fitMode,
          bgColor: opts.bgColor
        });
      }

      setItems(updatedItems);
      setTargetWidth(opts.targetWidth);
      setTargetHeight(opts.targetHeight);
      setResizeMode('custom');
      setAdjustingItem(null);
    } catch (err) {
      console.error('Gagal menerapkan ke semua foto:', err);
    } finally {
      setIsAdjustingLoading(false);
      setIsProcessing(false);
    }
  };

  /**
   * Ubah rasio cepat langsung dari kartu item (1-klik)
   */
  const quickAdjustItemRatio = async (item: BatchItem, preset: AspectRatioPreset) => {
    if (!preset || !preset.w || !preset.h) return;
    await processSingleItemAdjustment(item, {
      targetWidth: preset.w,
      targetHeight: preset.h,
      fitMode,
      bgColor,
      maxKb: maxKbLimit,
      removeBg: item.bgRemoved
    });
  };

  /**
   * Terapkan pengaturan sidebar kiri (ukuran & rasio) ke seluruh antrean
   */
  const reprocessQueueWithGlobalSettings = async () => {
    if (items.length === 0) return;
    await applyAdjustmentToAll({
      targetWidth,
      targetHeight,
      fitMode,
      bgColor,
      maxKb: maxKbLimit,
      removeBg
    });
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
    const folderName = `${filePrefix.trim() || 'MarketBoost'}_${resizeMode === 'original' ? 'AutoOriginal' : `${targetWidth}x${targetHeight}`}_${maxKbLimit || 148}KB`;
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
      <div className="w-[370px] lg:w-[410px] bg-[#1e293b] border-r border-slate-800 flex flex-col p-5 space-y-4 overflow-y-auto shrink-0 shadow-xl">
        {/* Header Panel */}
        <div className="flex items-center justify-between border-b border-slate-700/80 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/30">
              <Icons.Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white tracking-wide">Batch Processor</h2>
              <p className="text-[10px] text-slate-400 font-medium">
                {resizeMode === 'original' ? 'Resolusi Foto Asli' : `${targetWidth}x${targetHeight}px`} &bull; Max {maxKbLimit}KB &bull; PNG
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
            &le; {maxKbLimit} KB
          </span>
        </div>

        {/* Syarat Target Box */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-white">
            <span className="flex items-center gap-1.5 text-indigo-300">
              <Icons.Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              Syarat Output Kompresi & Resize
            </span>
            <span className="text-[9px] font-mono bg-indigo-950 text-indigo-300 px-2 py-0.5 rounded border border-indigo-800/60 font-bold">
              {resizeMode === 'original' ? 'Auto Size' : 'Custom Size'}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-[10px] pt-1 border-t border-slate-800">
            <div className="bg-slate-800/70 p-2 rounded-lg text-center border border-indigo-500/30">
              <span className="text-slate-400 block text-[9px]">RESOLUSI</span>
              <strong className="text-white text-xs font-mono truncate block" title={resizeMode === 'original' ? 'Otomatis Ikuti Foto Asli' : `${targetWidth}x${targetHeight}`}>
                {resizeMode === 'original' ? 'Auto Asli' : `${targetWidth}x${targetHeight}`}
              </strong>
            </div>
            <div className="bg-slate-800/70 p-2 rounded-lg text-center border border-emerald-500/20">
              <span className="text-slate-400 block text-[9px]">BATAS SIZE</span>
              <strong className="text-emerald-400 text-xs font-mono">&le; {maxKbLimit} KB</strong>
            </div>
            <div className="bg-slate-800/70 p-2 rounded-lg text-center border border-indigo-500/20">
              <span className="text-slate-400 block text-[9px]">FORMAT</span>
              <strong className="text-indigo-300 text-xs font-mono">PNG</strong>
            </div>
          </div>
        </div>

        {/* Fitur Resize Sesuai Keinginan & Mode Otomatis */}
        <div className="space-y-3 bg-slate-900/70 border border-slate-800 p-3.5 rounded-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Icons.Scaling className="w-3.5 h-3.5 text-indigo-400" /> Ukuran & Resolusi (Resize)
            </h3>
            <span className="text-[10px] font-mono font-bold text-indigo-300 bg-indigo-950/70 border border-indigo-800/60 px-2 py-0.5 rounded-md">
              {resizeMode === 'original' ? '⚡ Otomatis' : '📐 Kustom'}
            </span>
          </div>

          {/* Mode Switcher: Otomatis Ikuti Gambar vs Kustom Sendiri */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setResizeMode('original')}
              className={`py-2 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                resizeMode === 'original'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Icons.Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Otomatis Ikuti Gambar</span>
            </button>
            <button
              type="button"
              onClick={() => setResizeMode('custom')}
              className={`py-2 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                resizeMode === 'custom'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Icons.Sliders className="w-3.5 h-3.5" />
              <span>Kustom Ukuran Sendiri</span>
            </button>
          </div>

          {resizeMode === 'original' ? (
            <div className="p-3 bg-indigo-950/30 border border-indigo-500/20 rounded-xl space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-200">
                <Icons.CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Dimensi & Rasio 100% Asli</span>
              </div>
              <p className="text-[10px] text-slate-300 leading-relaxed">
                Setiap gambar yang di-upload akan mempertahankan resolusi, lebar, tinggi, dan rasio aslinya tanpa diubah atau dipotong.
              </p>
            </div>
          ) : (
            <div className="space-y-3 pt-1 border-t border-slate-800/80">
              {/* Pilihan Rasio Cepat (Aspect Ratio) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-300 flex items-center gap-1">
                    <Icons.Ratio className="w-3.5 h-3.5 text-indigo-400" />
                    Aspek Rasio (Aspect Ratio)
                  </span>
                  <span className="text-[9px] font-mono font-bold text-indigo-400 bg-indigo-950 px-1.5 py-0.5 rounded border border-indigo-800/60">
                    {selectedRatio}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {ASPECT_RATIO_PRESETS.map((p) => {
                    const isActive = selectedRatio === p.label;
                    return (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => applyRatioPreset(p)}
                        className={`p-1.5 rounded-lg text-center transition-all border cursor-pointer ${
                          isActive
                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm shadow-indigo-600/30'
                            : 'bg-slate-800/70 border-slate-700/60 text-slate-300 hover:text-white hover:bg-slate-800'
                        }`}
                      >
                        <span className="text-[11px] font-mono font-black block">{p.label}</span>
                        <span className="text-[8px] text-slate-400 block truncate">{p.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Atur Resolusi Target Manual */}
              <div className="space-y-2 pt-1 border-t border-slate-800/80">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400">Dimensi Target (px)</span>
                  <button
                    type="button"
                    onClick={() => setLockRatio(!lockRatio)}
                    className={`text-[10px] px-2 py-0.5 rounded-md font-mono font-bold flex items-center gap-1 transition-all cursor-pointer ${
                      lockRatio
                        ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
                    }`}
                    title={lockRatio ? 'Rasio Terkunci' : 'Rasio Bebas'}
                  >
                    {lockRatio ? <Icons.Lock className="w-3 h-3" /> : <Icons.Unlock className="w-3 h-3" />}
                    <span>{lockRatio ? 'Kunci Rasio' : 'Bebas'}</span>
                  </button>
                </div>

                {/* Input Dimensi Manual (Lebar x Tinggi) */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 block">Lebar (px)</label>
                    <div className="relative">
                      <input
                        type="number"
                        min={50}
                        max={4000}
                        step={10}
                        value={targetWidth}
                        onChange={(e) => handleWidthChange(parseInt(e.target.value, 10))}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-3 pr-8 py-2 text-xs text-white font-mono font-bold focus:outline-none focus:border-indigo-500"
                      />
                      <span className="absolute right-2.5 top-2.5 text-[10px] text-slate-400 font-mono">px</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 block">Tinggi (px)</label>
                    <div className="relative">
                      <input
                        type="number"
                        min={50}
                        max={4000}
                        step={10}
                        value={targetHeight}
                        onChange={(e) => handleHeightChange(parseInt(e.target.value, 10))}
                        disabled={lockRatio && selectedRatio !== 'Bebas'}
                        className={`w-full border rounded-xl pl-3 pr-8 py-2 text-xs font-mono font-bold focus:outline-none ${
                          lockRatio && selectedRatio !== 'Bebas'
                            ? 'bg-slate-800/50 border-slate-800 text-slate-400'
                            : 'bg-slate-800 border-slate-700 text-white focus:border-indigo-500'
                        }`}
                      />
                      <span className="absolute right-2.5 top-2.5 text-[10px] text-slate-400 font-mono">px</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mode Pas & Warna BG */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 block">Penempatan (Fit)</label>
                  <div className="grid grid-cols-2 gap-1 p-0.5 bg-slate-950 rounded-lg border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setFitMode('contain')}
                      className={`py-1 text-[10px] font-bold rounded cursor-pointer ${
                        fitMode === 'contain' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Contain
                    </button>
                    <button
                      type="button"
                      onClick={() => setFitMode('cover')}
                      className={`py-1 text-[10px] font-bold rounded cursor-pointer ${
                        fitMode === 'cover' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Cover
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 block">Latar Belakang</label>
                  <div className="grid grid-cols-2 gap-1 p-0.5 bg-slate-950 rounded-lg border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setBgColor('transparent')}
                      className={`py-1 text-[10px] font-bold rounded cursor-pointer ${
                        bgColor === 'transparent' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Transparan
                    </button>
                    <button
                      type="button"
                      onClick={() => setBgColor('white')}
                      className={`py-1 text-[10px] font-bold rounded cursor-pointer ${
                        bgColor === 'white' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Putih
                    </button>
                  </div>
                </div>
              </div>

              {/* Preset Resolusi Populer */}
              <div className="space-y-1.5 pt-1 border-t border-slate-800/80">
                <label className="text-[10px] font-bold text-slate-400 block">Pilihan Ukuran Cepat (Preset)</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {RESIZE_PRESETS.map((p) => {
                    const isActive = targetWidth === p.w && targetHeight === p.h;
                    return (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => applyPreset(p.w, p.h)}
                        className={`p-1.5 rounded-lg text-left transition-all border cursor-pointer ${
                          isActive
                            ? 'bg-indigo-600/30 border-indigo-500 text-white shadow-sm'
                            : 'bg-slate-800/70 border-slate-700/60 text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                      >
                        <span className="text-[10px] font-mono font-bold block truncate">{p.label}</span>
                        <span className="text-[8px] text-slate-400 block truncate">{p.tag}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tombol Terapkan ke Antrean jika ada item */}
              {items.length > 0 && (
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={reprocessQueueWithGlobalSettings}
                  className="w-full mt-2 py-2 px-3 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/20 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Terapkan ukuran dan rasio ini ke semua gambar yang telah diupload"
                >
                  <Icons.RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
                  <span>Terapkan Ukuran Baru ke Antrean ({items.length} Foto)</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Fitur: Hapus Background (Remove BG) */}
        <div className="space-y-3 bg-gradient-to-br from-indigo-950/40 to-slate-900/80 border border-indigo-500/30 p-3.5 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-lg transition-colors ${removeBg ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/40' : 'bg-slate-800 text-slate-400'}`}>
                <Icons.Wand2 className="w-4 h-4" />
              </div>
              <div>
                <label
                  onClick={() => setRemoveBg(!removeBg)}
                  className="text-xs font-extrabold text-white block cursor-pointer flex items-center gap-1.5"
                >
                  <span>Hapus Background (Remove BG)</span>
                  <span className="text-[9px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 px-1.5 py-0.2 rounded font-mono font-bold">
                    AUTO
                  </span>
                </label>
                <span className="text-[9px] text-slate-400 block">Isolasi subjek produk otomatis sebelum kompresi</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setRemoveBg(!removeBg)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer shrink-0 ${
                removeBg ? 'bg-indigo-600' : 'bg-slate-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  removeBg ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {removeBg && (
            <div className="space-y-3 pt-2.5 border-t border-slate-800 animate-fade-in">
              {/* Mode Hapus */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 block">Metode Hapus Latar</label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setBgRemovalMode('edge')}
                    className={`px-2 py-1.5 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                      bgRemovalMode === 'edge'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Icons.ShieldCheck className="w-3 h-3" />
                    <span>Batas Luar (Aman)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBgRemovalMode('global')}
                    className={`px-2 py-1.5 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                      bgRemovalMode === 'global'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Icons.Zap className="w-3 h-3" />
                    <span>Semua Warna Serupa</span>
                  </button>
                </div>
                <p className="text-[9px] text-slate-400">
                  {bgRemovalMode === 'edge'
                    ? 'Direkomendasikan: Hanya menghapus latar dari tepian luar kanvas sehingga warna putih di dalam produk tidak bolong.'
                    : 'Menghapus warna latar di seluruh area foto.'}
                </p>
              </div>

              {/* Slider Toleransi */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-bold text-slate-400">Sensitivitas / Toleransi</span>
                  <span className="font-mono font-bold text-indigo-300">{bgTolerance}%</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={60}
                  value={bgTolerance}
                  onChange={(e) => setBgTolerance(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
                <div className="flex justify-between text-[8px] text-slate-500 font-mono">
                  <span>Ketat (5%)</span>
                  <span>Standar Studio (26%)</span>
                  <span>Lebar (60%)</span>
                </div>
              </div>

              {/* Slider Edge Feather */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-bold text-slate-400">Kehalusan Tepi (Edge Feather)</span>
                  <span className="font-mono font-bold text-indigo-300">{bgFeather} px</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={5}
                  value={bgFeather}
                  onChange={(e) => setBgFeather(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
                <p className="text-[9px] text-slate-400">
                  Membuat tepian potongan produk halus alami, tanpa pixel kasar atau bergerigi.
                </p>
              </div>

              {/* Custom Color Sampler Toggle */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                <label className="text-[10px] font-bold text-slate-400 cursor-pointer flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={useCustomColor}
                    onChange={(e) => setUseCustomColor(e.target.checked)}
                    className="rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-0 cursor-pointer"
                  />
                  <span>Target Warna Latar Kustom</span>
                </label>
                {useCustomColor && (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={customBgColor}
                      onChange={(e) => setCustomBgColor(e.target.value)}
                      className="w-6 h-6 rounded border border-slate-700 bg-transparent cursor-pointer"
                    />
                    <span className="text-[9px] font-mono text-slate-300 uppercase">{customBgColor}</span>
                  </div>
                )}
              </div>
            </div>
          )}
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
              Contoh hasil: <span className="text-indigo-300">{filePrefix.trim() || 'Produk'}_01_{resizeMode === 'original' ? 'auto' : `${targetWidth}x${targetHeight}`}.png</span>
            </p>
          </div>

          {/* Mode Kanvas */}
          {resizeMode === 'custom' ? (
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 block">Penempatan Gambar ke {targetWidth}x{targetHeight}px</label>
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
                  ? 'Seluruh produk tampak utuh tanpa terpotong (disertai latar belakang pilihan).'
                  : `Mengisi penuh kanvas ${targetWidth}x${targetHeight}px tanpa ada sisa ruang samping.`}
              </p>
            </div>
          ) : (
            <div className="p-2.5 bg-slate-800/40 border border-slate-700/60 rounded-xl flex items-center justify-between text-[10px]">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Icons.Maximize2 className="w-3 h-3 text-indigo-400" />
                Penempatan Gambar:
              </span>
              <span className="text-indigo-300 font-bold font-mono">100% Rasio Bawaan Asli</span>
            </div>
          )}

          {/* Warna Latar Belakang Hasil Akhir */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 block">
              {removeBg ? 'Latar Belakang Baru (Pasca Hapus BG)' : 'Latar Belakang Kanvas'}
            </label>
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
                <span>Putih Bersih (#FFF)</span>
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
                <span>Transparan (Alpha)</span>
              </button>
            </div>
            <p className="text-[9px] text-slate-500">
              {bgColor === 'white'
                ? 'Standar resmi katalog Shopee, Tokopedia, TikTok Shop & Lazada.'
                : 'Format transparan murni untuk isolasi produk atau desain grafis.'}
            </p>
          </div>

          {/* Batas Maksimal KB Bebas Diatur */}
          <div className="space-y-2.5 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-slate-300 flex items-center gap-1.5">
                <Icons.HardDrive className="w-3.5 h-3.5 text-emerald-400" />
                <span>Batas Ukuran Maksimal (Bebas Diatur)</span>
              </label>
              <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded">
                &le; {maxKbLimit} KB
              </span>
            </div>

            {/* Input Bebas Angka KB Berapa Saja */}
            <div className="relative">
              <input
                type="number"
                min={10}
                max={50000}
                step={1}
                value={maxKbLimit || ''}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setMaxKbLimit(isNaN(val) ? 0 : Math.max(1, val));
                }}
                placeholder="Isi bebas batas KB (cth: 148)"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-3 pr-12 py-2 text-xs text-white font-mono font-bold focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40"
              />
              <span className="absolute right-3 top-2 text-[10px] text-emerald-400 font-mono font-bold">
                KB
              </span>
            </div>

            {/* Detail konversi byte & MB */}
            <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono px-1">
              <span>Maks: {(maxKbLimit * 1024).toLocaleString('id-ID')} Bytes</span>
              {maxKbLimit >= 1024 && (
                <span className="text-emerald-400 font-bold">
                  ({(maxKbLimit / 1024).toFixed(2)} MB)
                </span>
              )}
            </div>

            {/* Tombol Pilihan Cepat Preset KB */}
            <div className="space-y-1">
              <span className="text-[9px] font-bold text-slate-500 block">Pilihan Cepat (Preset):</span>
              <div className="grid grid-cols-3 gap-1.5 text-center">
                {[50, 100, 148, 200, 500, 1024].map((kb) => (
                  <button
                    key={kb}
                    type="button"
                    onClick={() => setMaxKbLimit(kb)}
                    className={`py-1 rounded text-[10px] font-mono font-bold transition-all cursor-pointer border ${
                      maxKbLimit === kb
                        ? 'bg-emerald-600 border-emerald-500 text-white shadow-md shadow-emerald-600/25'
                        : 'bg-slate-800 border-slate-700/60 text-slate-400 hover:text-white hover:bg-slate-700'
                    }`}
                  >
                    {kb === 148 ? '148 KB (Std)' : kb === 1024 ? '1 MB' : `${kb} KB`}
                  </button>
                ))}
              </div>
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
              Hasil Kompresi & Resize ({resizeMode === 'original' ? 'Resolusi Foto Asli' : `${targetWidth}x${targetHeight}px`} &bull; &le; {maxKbLimit}KB &bull; PNG)
            </h3>
            <span className="text-xs bg-slate-800 text-slate-300 font-mono px-2.5 py-0.5 rounded-full border border-slate-700 font-bold">
              {items.length} Berkas
            </span>
          </div>

          {/* Progress Processing */}
          {isProcessing && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-indigo-400 font-mono font-bold animate-pulse">
                {removeBg ? 'Hapus BG & Resize' : 'Memproses'} {currentFileIndex}/{totalFileCount}... ({overallProgress}%)
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
                    {allWithinLimit ? `✓ 100% Lolos (≤${maxKbLimit}KB)` : 'Diproses Sesuai Target'}
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
                <Icons.Scaling className="w-10 h-10 animate-pulse" />
              </div>
              <div className="space-y-2">
                <h4 className="text-base font-bold text-slate-100">Batch Resize & Compressor Siap Digunakan</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Unggah foto produk sekaligus. Ukuran dan resolusi <strong className="text-indigo-300">otomatis mengikuti foto asli</strong> atau bebas di-resize manual, batas ukuran <strong className="text-emerald-400">bebas ditentukan (&le; {maxKbLimit} KB)</strong>, plus dukungan <strong className="text-indigo-300">Hapus Background (Remove BG)</strong> dan format murni <strong className="text-indigo-300">PNG</strong>.
                </p>
                <div className="pt-2 flex flex-wrap items-center justify-center gap-2 text-[10px] text-slate-400 font-mono">
                  <span className="bg-slate-800 px-2.5 py-1 rounded-lg border border-indigo-500/40 text-indigo-300">
                    {resizeMode === 'original' ? '⚡ Auto Ikuti Foto Asli' : `📐 Resize Bebas (${targetWidth}x${targetHeight}px)`}
                  </span>
                  <span className="bg-slate-800 px-2.5 py-1 rounded-lg border border-indigo-700/50 text-indigo-300">✨ Remove BG</span>
                  <span className="bg-slate-800 px-2.5 py-1 rounded-lg border border-emerald-800/50 text-emerald-400">&le; {maxKbLimit} KB</span>
                  <span className="bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">PNG</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="bg-[#161f31] border border-slate-800 hover:border-indigo-500/60 rounded-2xl p-3.5 flex flex-col justify-between gap-3 shadow-lg hover:shadow-indigo-500/10 hover:shadow-xl transition-all group relative"
                >
                  {/* Preview Thumbnail */}
                  <div className="relative aspect-square w-full rounded-xl overflow-hidden border border-slate-700/80 bg-slate-950 flex items-center justify-center">
                    {/* Background checkerboard pattern for transparent PNG preview */}
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
                      src={item.compressedUrl}
                      alt={item.newName}
                      className="relative max-w-full max-h-full object-contain"
                    />

                    {/* Badge Resolusi & Rasio Aktif */}
                    <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-xs text-white text-[9px] font-mono font-bold px-2 py-0.5 rounded-md border border-slate-700 shadow">
                      <span>{item.dimensions}</span>
                      <span className="text-indigo-400 font-extrabold">&bull; {item.aspectRatio || '1:1'}</span>
                    </div>

                    {/* Badge Remove BG jika aktif */}
                    {item.bgRemoved && (
                      <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-indigo-600/90 backdrop-blur-xs text-white text-[8px] font-bold px-2 py-0.5 rounded-md shadow">
                        <Icons.Sparkles className="w-2.5 h-2.5 text-yellow-300" />
                        <span>No BG</span>
                      </div>
                    )}

                    {/* Badge Format PNG */}
                    <div className="absolute top-2 right-2 bg-indigo-950/90 text-indigo-300 text-[9px] font-mono font-extrabold px-2 py-0.5 rounded-md border border-indigo-800/80">
                      PNG
                    </div>

                    {/* Hover Overlay with Action Buttons */}
                    <div className="absolute inset-0 bg-slate-950/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-3 text-white text-xs font-bold">
                      <button
                        type="button"
                        onClick={() => openAdjustModal(item)}
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-all"
                      >
                        <Icons.Sliders className="w-3.5 h-3.5" />
                        <span>Adjust Size & Rasio</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewItem(item)}
                        className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl flex items-center justify-center gap-1 text-[11px] cursor-pointer"
                      >
                        <Icons.Eye className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Lihat Detail</span>
                      </button>
                    </div>
                  </div>

                  {/* Info Details */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white truncate block flex-1" title={item.newName}>
                        {item.newName}
                      </span>
                    </div>

                    {/* Target element for custom size: clickable with clear custom size indicator */}
                    <div
                      onClick={() => openAdjustModal(item)}
                      className="flex items-center justify-between text-[10px] font-mono bg-slate-900/90 hover:bg-slate-800/90 px-2.5 py-1.5 rounded-lg border border-slate-800 hover:border-indigo-500/70 transition-all cursor-pointer group/size shadow-xs"
                      title="Klik untuk Custom Ukuran (Dimensi px & Batas KB) Foto Ini"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500 line-through">{item.originalSizeKb} KB</span>
                        <Icons.ArrowRight className="w-3 h-3 text-slate-600" />
                        <span className="text-emerald-400 font-extrabold">{item.compressedSizeKb} KB</span>
                        <span className="text-[9px] text-indigo-300 font-sans font-semibold ml-0.5">
                          (&le;{item.customMaxKb || maxKbLimit}k)
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-teal-400 font-bold">-{item.savedPercent}%</span>
                        <span className="text-[9px] bg-indigo-600/30 group-hover/size:bg-indigo-600 text-indigo-300 group-hover/size:text-white px-1.5 py-0.5 rounded font-sans font-bold transition-all flex items-center gap-0.5">
                          <Icons.Sliders className="w-2.5 h-2.5" />
                          Custom Size
                        </span>
                      </div>
                    </div>

                    {/* Bar Custom Size Cepat (Batas KB Per-Item) */}
                    <div className="flex items-center justify-between gap-1 pt-0.5 text-[9px]">
                      <span className="text-slate-400 font-bold">Batas Size:</span>
                      <div className="flex items-center gap-1">
                        {[50, 100, 148, 200].map((kb) => {
                          const isCurrent = (item.customMaxKb || maxKbLimit) === kb;
                          return (
                            <button
                              key={kb}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                quickAdjustItemKb(item, kb);
                              }}
                              className={`px-1.5 py-0.5 rounded font-mono font-bold transition-all cursor-pointer border ${
                                isCurrent
                                  ? 'bg-emerald-600 border-emerald-500 text-white shadow-xs'
                                  : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                              }`}
                              title={`Ubah batas ukuran file ke ≤ ${kb} KB`}
                            >
                              {kb}k
                            </button>
                          );
                        })}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openAdjustModal(item);
                          }}
                          className="px-1.5 py-0.5 rounded font-bold transition-all cursor-pointer bg-slate-900/80 hover:bg-indigo-950 border border-slate-800 hover:border-indigo-600/50 text-indigo-300 flex items-center gap-0.5"
                          title="Custom ukuran dan dimensi bebas"
                        >
                          <Icons.Edit3 className="w-2.5 h-2.5" />
                          Atur
                        </button>
                      </div>
                    </div>

                    {/* Bar Pilihan Rasio Cepat */}
                    <div className="flex items-center justify-between gap-1 pt-0.5">
                      <span className="text-[9px] font-bold text-slate-400">Rasio:</span>
                      <div className="flex items-center gap-1">
                        {(['1:1', '4:5', '3:4', '9:16'] as const).map((r) => {
                          const isCurrent = item.aspectRatio === r;
                          return (
                            <button
                              key={r}
                              type="button"
                              onClick={() => {
                                const preset = ASPECT_RATIO_PRESETS.find((p) => p.label === r);
                                if (preset) quickAdjustItemRatio(item, preset);
                              }}
                              className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold transition-all cursor-pointer border ${
                                isCurrent
                                  ? 'bg-indigo-600 border-indigo-500 text-white shadow-xs'
                                  : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                              }`}
                              title={`Ubah langsung ke Rasio ${r}`}
                            >
                              {r}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[9px] pt-0.5">
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <Icons.CheckCircle2 className="w-3 h-3" />
                        Lolos Syarat (&le; {item.customMaxKb || maxKbLimit} KB)
                      </span>
                      <span className="text-slate-400 font-mono">
                        {(item.compressedSizeBytes).toLocaleString()} B
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => openAdjustModal(item)}
                      className="w-full py-1.5 px-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                      title="Ubah & Sesuaikan Ukuran (px) dan Rasio Foto Ini"
                    >
                      <Icons.Sliders className="w-3.5 h-3.5" />
                      <span>Adjust Size & Rasio</span>
                    </button>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setPreviewItem(item)}
                        className="flex-1 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer"
                        title="Lihat Pratinjau Ukuran Penuh"
                      >
                        <Icons.Eye className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Detail</span>
                      </button>
                      <a
                        href={item.compressedUrl}
                        download={item.newName}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-all cursor-pointer flex items-center justify-center"
                        title="Unduh File PNG ini"
                      >
                        <Icons.Download className="w-4 h-4 text-emerald-400" />
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
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal Adjust Size & Rasio Per-Item */}
      {adjustingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fade-in">
          <div className="bg-[#161f31] border border-slate-700 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl flex flex-col max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-700 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/30">
                  <Icons.Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Adjust Ukuran (Size) & Rasio</span>
                    <span className="text-[10px] font-mono font-bold bg-indigo-950 text-indigo-300 border border-indigo-800/80 px-2 py-0.5 rounded-full">
                      {adjWidth}x{adjHeight}px ({adjRatio})
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400 truncate max-w-sm">{adjustingItem.originalName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAdjustingItem(null)}
                className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <Icons.X className="w-5 h-5" />
              </button>
            </div>

            {/* Grid Pratinjau Kanvas & Pengaturan */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-center">
              {/* Kolom Pratinjau Proporsi Frame */}
              <div className="space-y-2.5 flex flex-col items-center">
                <div className="relative w-full max-w-[260px] aspect-square rounded-2xl border-2 border-dashed border-indigo-500/40 bg-slate-950/90 flex items-center justify-center p-2 overflow-hidden shadow-inner">
                  {/* Checkerboard pattern */}
                  <div
                    className="absolute inset-0 opacity-20"
                    style={{
                      backgroundImage:
                        'linear-gradient(45deg, #334155 25%, transparent 25%), linear-gradient(-45deg, #334155 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #334155 75%), linear-gradient(-45deg, transparent 75%, #334155 75%)',
                      backgroundSize: '16px 16px',
                      backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px'
                    }}
                  />
                  {/* Dynamic aspect frame */}
                  <div
                    className="relative rounded-xl overflow-hidden border-2 border-indigo-400 shadow-2xl transition-all duration-200 flex items-center justify-center"
                    style={{
                      width: adjWidth >= adjHeight ? '100%' : `${Math.max(20, Math.round((adjWidth / adjHeight) * 100))}%`,
                      height: adjHeight >= adjWidth ? '100%' : `${Math.max(20, Math.round((adjHeight / adjWidth) * 100))}%`,
                      backgroundColor: adjBgColor === 'white' ? '#ffffff' : 'transparent'
                    }}
                  >
                    <img
                      src={adjustingItem.compressedUrl}
                      alt="Pratinjau Rasio"
                      className={`w-full h-full ${adjFitMode === 'contain' ? 'object-contain' : 'object-cover'}`}
                    />
                    <div className="absolute bottom-1 right-1 bg-black/75 text-[8px] font-mono font-bold text-white px-1.5 py-0.5 rounded shadow">
                      {adjRatio}
                    </div>
                  </div>
                </div>

                <div className="text-center space-y-0.5">
                  <span className="text-[11px] font-mono font-bold text-indigo-300 block">
                    Target: {adjWidth} x {adjHeight} px ({adjRatio})
                  </span>
                  <span className="text-[9px] text-slate-400 block">
                    Mode: {adjFitMode === 'contain' ? 'Pas Tengah (Contain)' : 'Penuh (Cover)'} &bull; BG: {adjBgColor}
                  </span>
                </div>
              </div>

              {/* Kolom Pengaturan Ukuran & Rasio */}
              <div className="space-y-3.5">
                {/* 1. Preset Aspek Rasio */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block">
                    1. Pilih Aspek Rasio (Aspect Ratio)
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {ASPECT_RATIO_PRESETS.map((p) => {
                      const isActive = adjRatio === p.label;
                      return (
                        <button
                          key={p.label}
                          type="button"
                          onClick={() => handleAdjRatioClick(p.label)}
                          className={`py-1.5 px-2 rounded-xl text-center border transition-all cursor-pointer ${
                            isActive
                              ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/30'
                              : 'bg-slate-900 border-slate-700/80 text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          <span className="text-xs font-mono font-extrabold block">{p.label}</span>
                          <span className="text-[8px] text-slate-400 block truncate">{p.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Dimensi Target (px) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                      2. Dimensi Piksel Target (px)
                    </label>
                    <button
                      type="button"
                      onClick={() => setAdjLockRatio(!adjLockRatio)}
                      className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-md flex items-center gap-1 border transition-all cursor-pointer ${
                        adjLockRatio
                          ? 'bg-indigo-950 text-indigo-300 border-indigo-700/60'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {adjLockRatio ? <Icons.Lock className="w-2.5 h-2.5" /> : <Icons.Unlock className="w-2.5 h-2.5" />}
                      <span>{adjLockRatio ? 'Kunci Rasio' : 'Bebas'}</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[9px] font-semibold text-slate-400 block mb-0.5">Lebar</span>
                      <div className="relative">
                        <input
                          type="number"
                          min={50}
                          max={4000}
                          step={10}
                          value={adjWidth}
                          onChange={(e) => handleAdjWidthChange(parseInt(e.target.value, 10))}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono font-bold focus:outline-none focus:border-indigo-500"
                        />
                        <span className="absolute right-2 top-2 text-[9px] text-slate-500 font-mono">px</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-[9px] font-semibold text-slate-400 block mb-0.5">Tinggi</span>
                      <div className="relative">
                        <input
                          type="number"
                          min={50}
                          max={4000}
                          step={10}
                          value={adjHeight}
                          onChange={(e) => handleAdjHeightChange(parseInt(e.target.value, 10))}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono font-bold focus:outline-none focus:border-indigo-500"
                        />
                        <span className="absolute right-2 top-2 text-[9px] text-slate-500 font-mono">px</span>
                      </div>
                    </div>
                  </div>

                  {/* Preset Dimensi Cepat */}
                  <div className="flex items-center gap-1 overflow-x-auto pt-1 pb-0.5">
                    <span className="text-[8px] text-slate-500 font-bold shrink-0">Preset:</span>
                    {[
                      { w: 500, h: 500, label: '500px' },
                      { w: 800, h: 800, label: '800px' },
                      { w: 1000, h: 1000, label: '1000px' },
                      { w: 1080, h: 1080, label: '1080px' },
                      { w: 1080, h: 1350, label: '1080x1350' },
                      { w: 1080, h: 1920, label: '1080x1920' },
                    ].map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => {
                          setAdjWidth(p.w);
                          setAdjHeight(p.h);
                          setAdjRatio(getAspectRatioLabel(p.w, p.h));
                        }}
                        className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold border shrink-0 transition-all cursor-pointer ${
                          adjWidth === p.w && adjHeight === p.h
                            ? 'bg-indigo-600 border-indigo-500 text-white'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Batas Ukuran Berkas Maksimal (Max KB) Bebas Kustom */}
                <div className="space-y-1.5 pt-1 border-t border-slate-800">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Icons.HardDrive className="w-3.5 h-3.5 text-emerald-400" />
                      <span>3. Batas Ukuran File (Max KB Bebas Kustom)</span>
                    </label>
                    <span className="text-[9px] font-mono text-emerald-400 font-bold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/60">
                      &le; {adjMaxKb} KB
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <input
                        type="number"
                        min={10}
                        max={50000}
                        step={1}
                        value={adjMaxKb}
                        onChange={(e) => setAdjMaxKb(Math.max(5, parseInt(e.target.value, 10) || 5))}
                        placeholder="Kustom angka KB..."
                        style={{ width: '90.6836px' }}
                        className="bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono font-bold focus:outline-none focus:border-emerald-500"
                      />
                      <span className="absolute right-2 top-2 text-[9px] text-emerald-400 font-mono font-bold">KB Max</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {[50, 100, 148, 200, 500].map((kb) => (
                        <button
                          key={kb}
                          type="button"
                          onClick={() => setAdjMaxKb(kb)}
                          className={`px-2 py-1.5 rounded-lg text-[9px] font-mono font-bold transition-all cursor-pointer border ${
                            adjMaxKb === kb
                              ? 'bg-emerald-600 border-emerald-500 text-white shadow-xs'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                          }`}
                        >
                          {kb === 148 ? '148k (Std)' : `${kb}k`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 4. Penempatan & Latar Belakang */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800">
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 block mb-1">Penempatan (Fit)</label>
                    <div className="grid grid-cols-2 gap-1 p-0.5 bg-slate-900 rounded-lg border border-slate-800">
                      <button
                        type="button"
                        onClick={() => setAdjFitMode('contain')}
                        className={`py-1 text-[10px] font-bold rounded cursor-pointer ${
                          adjFitMode === 'contain' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Contain
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdjFitMode('cover')}
                        className={`py-1 text-[10px] font-bold rounded cursor-pointer ${
                          adjFitMode === 'cover' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Cover
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[9px] font-bold text-slate-400 block mb-1">Warna Background</label>
                    <div className="grid grid-cols-2 gap-1 p-0.5 bg-slate-900 rounded-lg border border-slate-800">
                      <button
                        type="button"
                        onClick={() => setAdjBgColor('transparent')}
                        className={`py-1 text-[10px] font-bold rounded cursor-pointer ${
                          adjBgColor === 'transparent' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Transparan
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdjBgColor('white')}
                        className={`py-1 text-[10px] font-bold rounded cursor-pointer ${
                          adjBgColor === 'white' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Putih
                      </button>
                    </div>
                  </div>
                </div>

                {/* 4. Remove Background Toggle */}
                <div className="pt-1 flex items-center justify-between bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                  <div className="flex items-center gap-2">
                    <Icons.Wand2 className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="text-[10px] font-bold text-slate-300">Hapus Background Foto</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={adjRemoveBg}
                    onChange={(e) => setAdjRemoveBg(e.target.checked)}
                    className="accent-indigo-600 cursor-pointer w-4 h-4"
                  />
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-700">
              <button
                type="button"
                onClick={() => setAdjustingItem(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Batal
              </button>

              <div className="flex items-center gap-2">
                {items.length > 1 && (
                  <button
                    type="button"
                    disabled={isAdjustingLoading}
                    onClick={() =>
                      applyAdjustmentToAll({
                        targetWidth: adjWidth,
                        targetHeight: adjHeight,
                        fitMode: adjFitMode,
                        bgColor: adjBgColor,
                        maxKb: adjMaxKb,
                        removeBg: adjRemoveBg
                      })
                    }
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    title="Terapkan ukuran dan rasio ini ke semua foto dalam antrean"
                  >
                    <Icons.Layers className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Terapkan ke Semua ({items.length})</span>
                  </button>
                )}

                <button
                  type="button"
                  disabled={isAdjustingLoading}
                  onClick={() =>
                    processSingleItemAdjustment(adjustingItem, {
                      targetWidth: adjWidth,
                      targetHeight: adjHeight,
                      fitMode: adjFitMode,
                      bgColor: adjBgColor,
                      maxKb: adjMaxKb,
                      removeBg: adjRemoveBg
                    })
                  }
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/25 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isAdjustingLoading ? (
                    <>
                      <Icons.Loader2 className="w-4 h-4 animate-spin" />
                      <span>Memproses...</span>
                    </>
                  ) : (
                    <>
                      <Icons.Check className="w-4 h-4" />
                      <span>Terapkan ke Foto Ini</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Preview Detail */}
      {previewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-[#161f31] border border-slate-700 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-700 pb-3">
              <div className="flex items-center gap-2">
                <Icons.Image className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-white truncate max-w-md">{previewItem.newName}</h3>
                {previewItem.bgRemoved && (
                  <span className="text-[10px] bg-indigo-600/30 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/40 font-bold">
                    Background Removed
                  </span>
                )}
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
                  {previewItem.withinLimit ? `✓ Lolos (≤${maxKbLimit} KB)` : 'Tepat Target'}
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
