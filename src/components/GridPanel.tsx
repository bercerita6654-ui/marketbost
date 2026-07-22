import React, { useState, useEffect, useRef } from 'react';
import JSZip from 'jszip';
import * as Icons from 'lucide-react';
import { GridPiece, LogoSticker, IgSticker } from '../types';

interface GridPanelProps {
  companyLogos: { name: string; url: string }[];
  brandLogos: { name: string; url: string }[];
  onRecordingStart: (msg: string) => void;
  onRecordingEnd: () => void;
  onRecordingProgress: (pct: number) => void;
  activeTab?: string;
  setActiveTab?: (tab: 'visual' | 'caption' | 'seo' | 'grid') => void;
}

// Detect the bounding box of the foreground product/content inside an image or sub-rect
function detectFocalBoundingBox(
  source: HTMLCanvasElement | HTMLImageElement,
  cols: number = 1,
  rows: number = 1,
  colIdx: number = 0,
  rowIdx: number = 0
): { x: number; y: number; width: number; height: number } | null {
  const scanCanvas = document.createElement('canvas');
  const maxDim = 120; // smaller is faster and less memory-intensive
  
  // Calculate source dimensions and clip area
  let srcWidth = source.width;
  let srcHeight = source.height;
  let srcX = 0;
  let srcY = 0;
  
  if (cols > 1 || rows > 1) {
    srcWidth = source.width / cols;
    srcHeight = source.height / rows;
    srcX = colIdx * srcWidth;
    srcY = rowIdx * srcHeight;
  }

  let scanWidth = srcWidth;
  let scanHeight = srcHeight;
  if (scanWidth > maxDim || scanHeight > maxDim) {
    if (scanWidth > scanHeight) {
      scanHeight = Math.round((scanHeight * maxDim) / scanWidth);
      scanWidth = maxDim;
    } else {
      scanWidth = Math.round((scanWidth * maxDim) / scanHeight);
      scanHeight = maxDim;
    }
  }

  scanCanvas.width = scanWidth;
  scanCanvas.height = scanHeight;
  const ctx = scanCanvas.getContext('2d', { alpha: true });
  if (!ctx) return null;

  try {
    ctx.drawImage(source, srcX, srcY, srcWidth, srcHeight, 0, 0, scanWidth, scanHeight);
    const imgData = ctx.getImageData(0, 0, scanWidth, scanHeight);
    const data = imgData.data;

    let minX = scanWidth;
    let maxX = 0;
    let minY = scanHeight;
    let maxY = 0;
    let nonBgCount = 0;

    for (let y = 0; y < scanHeight; y++) {
      for (let x = 0; x < scanWidth; x++) {
        const idx = (y * scanWidth + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = data[idx + 3];

        // Background classification:
        // - transparent (alpha < 30)
        // - white-ish/light background (r, g, b > 235)
        // - black-ish/dark background (r, g, b < 25)
        const isTransparent = a < 30;
        const isWhite = r > 235 && g > 235 && b > 235;
        const isBlack = r < 25 && g < 25 && b < 25;

        if (!isTransparent && !isWhite && !isBlack) {
          nonBgCount++;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    // If we found a clear foreground object (taking up some minimum pixel area)
    if (nonBgCount > (scanWidth * scanHeight) * 0.005 && maxX >= minX && maxY >= minY) {
      const scaleX = srcWidth / scanWidth;
      const scaleY = srcHeight / scanHeight;
      return {
        x: minX * scaleX,
        y: minY * scaleY,
        width: (maxX - minX) * scaleX,
        height: (maxY - minY) * scaleY,
      };
    }
  } catch (err) {
    console.warn("Focal box detection failed (probably CORS restrictions or empty canvas):", err);
  }

  return null;
}

export const GridPanel: React.FC<GridPanelProps> = ({
  companyLogos,
  brandLogos,
  onRecordingStart,
  onRecordingEnd,
  onRecordingProgress,
  activeTab = 'grid',
  setActiveTab,
}) => {
  // Grid Matrix
  const [cols, setCols] = useState(2);
  const [rows, setRows] = useState(2);
  const [gridAspectRatio, setGridAspectRatio] = useState<'1:1' | '3:4' | '9:16'>('1:1');

  const getGridMaxWidth = () => {
    if (gridAspectRatio === '9:16') {
      if (cols === 1) return 'max-w-[200px]';
      if (cols === 2) return 'max-w-[400px]';
      return 'max-w-[600px]';
    } else if (gridAspectRatio === '3:4') {
      if (cols === 1) return 'max-w-[240px]';
      if (cols === 2) return 'max-w-[480px]';
      return 'max-w-[720px]';
    } else {
      if (cols === 1) return 'max-w-[280px]';
      if (cols === 2) return 'max-w-[560px]';
      return 'max-w-[800px]';
    }
  };

  interface MasterImage {
    id: string;
    img: HTMLImageElement;
    src: string;
    name: string;
    dimensions: string;
  }

  // Master Images List (supports up to 5 master images)
  const [masterImages, setMasterImages] = useState<MasterImage[]>([]);
  const [activeMasterIdx, setActiveMasterIdx] = useState<number>(0);
  const [customZipName, setCustomZipName] = useState<string>('MarketBoost_Grid');
  const [renameModalOpen, setRenameModalOpen] = useState<boolean>(false);
  const [renameModalType, setRenameModalType] = useState<'batch' | 'slices'>('batch');
  const [tempZipName, setTempZipName] = useState<string>('MarketBoost_Grid');
  const [previewModalOpen, setPreviewModalOpen] = useState<boolean>(false);
  const [previewCanvasUrls, setPreviewCanvasUrls] = useState<string[]>([]);
  const [previewSeamlessMode, setPreviewSeamlessMode] = useState<boolean>(true);
  const [previewDeviceMock, setPreviewDeviceMock] = useState<'none' | 'mobile'>('none');
  const [draggedImgIdx, setDraggedImgIdx] = useState<number | null>(null);
  const [dragOverImgIdx, setDragOverImgIdx] = useState<number | null>(null);
  const [previewImage, setPreviewImage] = useState<MasterImage | null>(null);
  const [includeVideoSlideshow, setIncludeVideoSlideshow] = useState<boolean>(true);
  const [videoSelectedImageIds, setVideoSelectedImageIds] = useState<string[]>([]);
  const [videoSelectedPanelKeys, setVideoSelectedPanelKeys] = useState<string[]>([]);
  const [autoCenterEnabled, setAutoCenterEnabled] = useState<boolean>(false);

  // Grid Label Badge (Quantity/Packaging) Overlay States
  const [gridLabelPreset, setGridLabelPreset] = useState<'none' | '1_pcs' | '1_set' | '1_roll' | '1_box' | 'custom'>('none');
  const [customGridLabel, setCustomGridLabel] = useState('1 pcs');
  const [gridLabelPosition, setGridLabelPosition] = useState<'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'>('top-right');
  const [gridLabelColor, setGridLabelColor] = useState<'indigo' | 'slate' | 'amber' | 'rose' | 'white'>('indigo');
  const [gridLabelScope, setGridLabelScope] = useState<'all' | 'first'>('all');

  // Global PNG Watermark States
  const [watermarkImg, setWatermarkImg] = useState<HTMLImageElement | null>(null);
  const [watermarkOpacity, setWatermarkOpacity] = useState<number>(0.5);
  const [watermarkScale, setWatermarkScale] = useState<number>(20);
  const [watermarkPosition, setWatermarkPosition] = useState<'top-left' | 'center' | 'bottom-right'>('bottom-right');
  const [watermarkName, setWatermarkName] = useState<string | null>(null);

  // Preset Loading State
  const [isPresetLoading, setIsPresetLoading] = useState<boolean>(false);

  // Slicing Loading States
  const [isSlicing, setIsSlicing] = useState<boolean>(false);
  const [slicingMessage, setSlicingMessage] = useState<string>('');

  // Grid Slices State
  const [pieces, setPieces] = useState<GridPiece[]>([]);

  // Bulk Renaming States
  const [renamePrefix, setRenamePrefix] = useState<string>('Product');
  const [renameSeparator, setRenameSeparator] = useState<string>('-');
  const [renameStartCounter, setRenameStartCounter] = useState<number>(1);
  const [renamePadding, setRenamePadding] = useState<string>('2'); // '1' | '2' | '3'
  const [renameExtension, setRenameExtension] = useState<string>('.jpg'); // '.png' | '.jpg'
  const [isRenamerOpen, setIsRenamerOpen] = useState<boolean>(true);

  // Helper to generate custom sequenced name for a slice
  const getPieceFilename = (idx: number): string => {
    const prefix = renamePrefix.trim() || 'Product';
    const separator = renameSeparator;
    const counterNum = renameStartCounter + idx;
    
    let counterStr = String(counterNum);
    const paddingLength = parseInt(renamePadding, 10);
    if (counterStr.length < paddingLength) {
      counterStr = counterStr.padStart(paddingLength, '0');
    }
    
    const ext = renameExtension; // '.jpg' or '.png'
    return `${prefix}${separator}${counterStr}${ext}`;
  };

  // Helper to generate custom sequenced name for a batch slice
  const getBatchPieceFilename = (globalIdx: number): string => {
    const prefix = renamePrefix.trim() || 'Product';
    const separator = renameSeparator;
    const counterNum = renameStartCounter + globalIdx;
    
    let counterStr = String(counterNum);
    const paddingLength = parseInt(renamePadding, 10);
    if (counterStr.length < paddingLength) {
      counterStr = counterStr.padStart(paddingLength, '0');
    }
    
    const ext = renameExtension; // '.jpg' or '.png'
    return `${prefix}${separator}${counterStr}${ext}`;
  };

  // Logos/IG Overlays for 9:16
  const [logoCompany, setLogoCompany] = useState<LogoSticker>({ img: null, x: 50, y: 50, size: 200, active: false });
  const [logoBrand, setLogoBrand] = useState<LogoSticker>({ img: null, x: 830, y: 50, size: 200, active: false });
  const [igSticker, setIgSticker] = useState<IgSticker>({ active: false, x: 580, y: 1750, size: 45, color: 'white', text: 'globalmart.id' });

  // Draggable State for 9:16 Preview Canvas
  const [draggingSticker, setDraggingSticker] = useState<'company' | 'brand' | 'ig' | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Refs for Canvases
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Local storage cache for IG username
  const [igUsername, setIgUsername] = useState('globalmart.id');
  const [igColor, setIgColor] = useState<'white' | 'black'>('white');

  // SVGs converted to Images
  const [igWhiteImg, setIgWhiteImg] = useState<HTMLImageElement | null>(null);
  const [igBlackImg, setIgBlackImg] = useState<HTMLImageElement | null>(null);

  // Initialize SVGs
  useEffect(() => {
    const wImg = new Image();
    wImg.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>`
    );
    wImg.onload = () => setIgWhiteImg(wImg);

    const bImg = new Image();
    bImg.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>`
    );
    bImg.onload = () => setIgBlackImg(bImg);
  }, []);

  // Load default watermark from Google Drive on mount
  useEffect(() => {
    const driveImgId = '1dyed9YL6QxBSDefdx47sf8pWXUVWD3nc';
    const directUrl = `https://lh3.googleusercontent.com/d/${driveImgId}`;
    
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setWatermarkImg(img);
      setWatermarkName("Watermark_Drive.png");
    };
    img.onerror = () => {
      // Fallback url if lh3 is blocked or fails
      const fallbackUrl = `https://docs.google.com/uc?export=view&id=${driveImgId}`;
      const imgFallback = new Image();
      imgFallback.crossOrigin = "anonymous";
      imgFallback.onload = () => {
        setWatermarkImg(imgFallback);
        setWatermarkName("Watermark_Drive.png");
      };
      imgFallback.src = fallbackUrl;
    };
    img.src = directUrl;
  }, []);

  // Sync pieces array when matrix is resized
  useEffect(() => {
    const total = cols * rows;
    setPieces((prev) => {
      const next = [...prev];
      if (next.length < total) {
        for (let i = next.length; i < total; i++) {
          next.push({ img: null, zoom: 1, panX: 0, panY: 0, baseScale: 1 });
        }
      } else if (next.length > total) {
        return next.slice(0, total);
      }
      return next;
    });
  }, [cols, rows]);

  // Automatically re-cut active master image when autoCenterEnabled changes
  useEffect(() => {
    if (masterImages.length > 0 && masterImages[activeMasterIdx]) {
      handleCutSingleImage(activeMasterIdx);
    }
  }, [autoCenterEnabled]);

  const drawWatermarkOnCanvas = (ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number) => {
    if (!watermarkImg) return;
    
    ctx.save();
    ctx.globalAlpha = watermarkOpacity;
    
    const aspect = watermarkImg.width / watermarkImg.height;
    const w = canvasWidth * (watermarkScale / 100);
    const h = w / aspect;
    const margin = canvasWidth * 0.05; // 5% margin
    
    let x = 0;
    let y = 0;
    
    if (watermarkPosition === 'top-left') {
      x = margin;
      y = margin;
    } else if (watermarkPosition === 'center') {
      x = (canvasWidth - w) / 2;
      y = (canvasHeight - h) / 2;
    } else if (watermarkPosition === 'bottom-right') {
      x = canvasWidth - w - margin;
      y = canvasHeight - h - margin;
    }
    
    ctx.drawImage(watermarkImg, x, y, w, h);
    ctx.restore();
  };

  const drawGridLabelBadge = (ctx: CanvasRenderingContext2D, text: string, canvasWidth: number, canvasHeight: number, position: string, theme: string) => {
    ctx.save();
    ctx.font = 'bold 36px Arial, sans-serif';
    const textMetrics = ctx.measureText(text);
    const textWidth = textMetrics.width;
    const badgeHeight = 72;
    const badgeWidth = textWidth + 56; // padding horizontal
    const radius = 36; // rounded-full

    let x = 60;
    let y = 60;

    if (position === 'top-right') {
      x = canvasWidth - badgeWidth - 60;
    } else if (position === 'bottom-left') {
      y = canvasHeight - badgeHeight - 60;
    } else if (position === 'bottom-right') {
      x = canvasWidth - badgeWidth - 60;
      y = canvasHeight - badgeHeight - 60;
    }

    // Draw Shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.22)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 6;

    // Colors
    let bgColor = '#6366f1'; // indigo
    let textColor = '#ffffff';
    if (theme === 'slate') {
      bgColor = '#1e293b';
    } else if (theme === 'amber') {
      bgColor = '#fbbf24';
      textColor = '#1e293b';
    } else if (theme === 'rose') {
      bgColor = '#f43f5e';
    } else if (theme === 'white') {
      bgColor = '#ffffff';
      textColor = '#1e293b';
    }

    ctx.fillStyle = bgColor;
    ctx.beginPath();
    if (typeof (ctx as any).roundRect === 'function') {
      (ctx as any).roundRect(x, y, badgeWidth, badgeHeight, radius);
    } else {
      ctx.rect(x, y, badgeWidth, badgeHeight);
    }
    ctx.fill();

    // Reset shadow for text
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Text
    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + badgeWidth / 2, y + badgeHeight / 2 + 2); // vertical adjust
    ctx.restore();
  };

  const handleWatermarkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        setWatermarkImg(img);
        setWatermarkName(file.name);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemoveWatermark = () => {
    setWatermarkImg(null);
    setWatermarkName(null);
  };

  const handleExportPreset = () => {
    onRecordingStart('Menyiapkan berkas preset workspace (JSON)...');
    try {
      // Helper to serialize images to base64 if needed
      const serializeImage = (img: HTMLImageElement | null): string | null => {
        if (!img) return null;
        if (img.src.startsWith('data:')) return img.src;
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            return canvas.toDataURL('image/png');
          }
        } catch (err) {
          console.warn("Serialization failed, keeping original src:", err);
        }
        return img.src;
      };

      const serializedMasterImages = masterImages.map(m => ({
        id: m.id,
        name: m.name,
        dimensions: m.dimensions,
        src: serializeImage(m.img) || m.src
      }));

      const serializedPieces = pieces.map(p => ({
        zoom: p.zoom,
        panX: p.panX,
        panY: p.panY,
        baseScale: p.baseScale,
        imgSrc: p.img ? (serializeImage(p.img) || p.img.src) : null
      }));

      const presetData = {
        version: "1.0",
        cols,
        rows,
        gridAspectRatio,
        autoCenterEnabled,
        customZipName,
        includeVideoSlideshow,
        videoSelectedPanelKeys,
        watermarkOpacity,
        watermarkScale,
        watermarkPosition,
        watermarkName,
        watermarkImgSrc: watermarkImg ? serializeImage(watermarkImg) : null,
        igUsername,
        igColor,
        masterImages: serializedMasterImages,
        pieces: serializedPieces,
        logoCompany: {
          x: logoCompany.x,
          y: logoCompany.y,
          size: logoCompany.size,
          active: logoCompany.active,
          imgSrc: logoCompany.img ? serializeImage(logoCompany.img) : null
        },
        logoBrand: {
          x: logoBrand.x,
          y: logoBrand.y,
          size: logoBrand.size,
          active: logoBrand.active,
          imgSrc: logoBrand.img ? serializeImage(logoBrand.img) : null
        },
        igSticker: {
          active: igSticker.active,
          x: igSticker.x,
          y: igSticker.y,
          size: igSticker.size,
          color: igSticker.color,
          text: igSticker.text
        }
      };

      const jsonStr = JSON.stringify(presetData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${customZipName || 'MarketBoost'}_GridPreset.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Gagal mengekspor preset:", err);
      alert("Gagal mengekspor preset workspace.");
    } finally {
      onRecordingEnd();
    }
  };

  const handleImportPreset = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsPresetLoading(true);
    onRecordingStart('Memuat berkas preset JSON & merekonstruksi workspace...');

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);

        // Helper to load image from src asynchronously
        const loadImageAsync = (src: string | null): Promise<HTMLImageElement | null> => {
          if (!src) return Promise.resolve(null);
          return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => {
              console.error("Failed to load image from preset:", src.substring(0, 50));
              resolve(null);
            };
            img.src = src;
          });
        };

        // 1. Basic properties
        if (data.cols !== undefined) setCols(data.cols);
        if (data.rows !== undefined) setRows(data.rows);
        if (data.gridAspectRatio !== undefined) setGridAspectRatio(data.gridAspectRatio);
        if (data.autoCenterEnabled !== undefined) setAutoCenterEnabled(data.autoCenterEnabled);
        if (data.customZipName !== undefined) setCustomZipName(data.customZipName);
        if (data.includeVideoSlideshow !== undefined) setIncludeVideoSlideshow(data.includeVideoSlideshow);
        if (data.videoSelectedPanelKeys !== undefined) setVideoSelectedPanelKeys(data.videoSelectedPanelKeys);
        if (data.igUsername !== undefined) setIgUsername(data.igUsername);
        if (data.igColor !== undefined) setIgColor(data.igColor);

        // 2. Watermark settings
        if (data.watermarkOpacity !== undefined) setWatermarkOpacity(data.watermarkOpacity);
        if (data.watermarkScale !== undefined) setWatermarkScale(data.watermarkScale);
        if (data.watermarkPosition !== undefined) setWatermarkPosition(data.watermarkPosition);
        if (data.watermarkName !== undefined) setWatermarkName(data.watermarkName);

        if (data.watermarkImgSrc) {
          const img = await loadImageAsync(data.watermarkImgSrc);
          setWatermarkImg(img);
        } else {
          setWatermarkImg(null);
        }

        // 3. logoCompany, logoBrand, igSticker
        if (data.logoCompany) {
          const img = await loadImageAsync(data.logoCompany.imgSrc);
          setLogoCompany({
            x: data.logoCompany.x ?? 50,
            y: data.logoCompany.y ?? 50,
            size: data.logoCompany.size ?? 200,
            active: data.logoCompany.active ?? false,
            img
          });
        }

        if (data.logoBrand) {
          const img = await loadImageAsync(data.logoBrand.imgSrc);
          setLogoBrand({
            x: data.logoBrand.x ?? 830,
            y: data.logoBrand.y ?? 50,
            size: data.logoBrand.size ?? 200,
            active: data.logoBrand.active ?? false,
            img
          });
        }

        if (data.igSticker) {
          setIgSticker({
            active: data.igSticker.active ?? false,
            x: data.igSticker.x ?? 580,
            y: data.igSticker.y ?? 1750,
            size: data.igSticker.size ?? 45,
            color: data.igSticker.color ?? 'white',
            text: data.igSticker.text ?? 'globalmart.id'
          });
        }

        // 4. Master Images list
        if (Array.isArray(data.masterImages)) {
          const loadedMaster = await Promise.all(
            data.masterImages.map(async (m: any) => {
              const img = await loadImageAsync(m.src);
              return {
                id: m.id || Math.random().toString(36).substring(2, 9),
                name: m.name || 'unnamed.png',
                dimensions: m.dimensions || 'unknown px',
                src: m.src,
                img: img!
              };
            })
          );
          const validMaster = loadedMaster.filter(m => m.img !== null);
          setMasterImages(validMaster);
        }

        // 5. Pieces list
        if (Array.isArray(data.pieces)) {
          const loadedPieces = await Promise.all(
            data.pieces.map(async (p: any) => {
              const img = await loadImageAsync(p.imgSrc);
              return {
                zoom: p.zoom ?? 1,
                panX: p.panX ?? 0,
                panY: p.panY ?? 0,
                baseScale: p.baseScale ?? 1,
                img: img
              };
            })
          );
          setPieces(loadedPieces);
        }

        alert("Workspace berhasil dipulihkan dari file preset JSON!");
      } catch (err) {
        console.error("Gagal mengimpor preset:", err);
        alert("Format file preset JSON tidak valid atau rusak.");
      } finally {
        setIsPresetLoading(false);
        onRecordingEnd();
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Redraw canvases when grid pieces or overlays change
  useEffect(() => {
    pieces.forEach((piece, idx) => {
      drawPieceCanvas(idx);
    });
    if (gridAspectRatio === '9:16') {
      drawPreviewCanvas();
    }
  }, [
    pieces,
    gridAspectRatio,
    logoCompany,
    logoBrand,
    igSticker,
    draggingSticker,
    igWhiteImg,
    igBlackImg,
    watermarkImg,
    watermarkOpacity,
    watermarkScale,
    watermarkPosition,
    gridLabelPreset,
    customGridLabel,
    gridLabelPosition,
    gridLabelColor,
    gridLabelScope
  ]);

  const drawPieceCanvas = (idx: number) => {
    const canvas = canvasRefs.current[idx];
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const piece = pieces[idx];
    const targetWidth = 1080;
    const targetHeight = gridAspectRatio === '9:16' ? 1920 : (gridAspectRatio === '3:4' ? 1440 : 1080);

    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
    }

    ctx.clearRect(0, 0, targetWidth, targetHeight);

    if (piece && piece.img) {
      ctx.save();
      ctx.translate(piece.panX, piece.panY);
      ctx.scale(piece.baseScale * piece.zoom, piece.baseScale * piece.zoom);
      ctx.drawImage(piece.img, -piece.img.width / 2, -piece.img.height / 2);
      ctx.restore();

      // Apply global watermark on interactive canvas pieces
      drawWatermarkOnCanvas(ctx, targetWidth, targetHeight);

      // Apply Grid Label badge overlay
      if (gridLabelPreset !== 'none') {
        if (gridLabelScope === 'all' || idx === 0) {
          const labelText = gridLabelPreset === 'custom' ? customGridLabel : gridLabelPreset.replace('_', ' ').toUpperCase();
          drawGridLabelBadge(ctx, labelText, targetWidth, targetHeight, gridLabelPosition, gridLabelColor);
        }
      }
    }
  };

  // Draw 9:16 interactive canvas preview
  const drawPreviewCanvas = () => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 1080;
    canvas.height = 1920;

    // Draw background (Panel 1)
    const p1 = pieces[0];
    if (p1 && p1.img) {
      ctx.save();
      ctx.translate(p1.panX, p1.panY);
      ctx.scale(p1.baseScale * p1.zoom, p1.baseScale * p1.zoom);
      ctx.drawImage(p1.img, -p1.img.width / 2, -p1.img.height / 2);
      ctx.restore();
    } else {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, 1080, 1920);
    }

    // Grid center guidelines
    ctx.save();
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.5)';
    ctx.lineWidth = 4;
    ctx.setLineDash([15, 15]);
    ctx.beginPath(); ctx.moveTo(1080 / 2, 0); ctx.lineTo(1080 / 2, 1920); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, 1920 / 2); ctx.lineTo(1080, 1920 / 2); ctx.stroke();
    ctx.restore();

    // Draw Overlays: Company Logo, Brand Logo, Instagram Sticker
    const drawOverlay = (type: 'company' | 'brand' | 'ig') => {
      if (type === 'ig' && igSticker.active) {
        const icon = igSticker.color === 'white' ? igWhiteImg : igBlackImg;
        if (icon) {
          ctx.drawImage(icon, igSticker.x, igSticker.y, igSticker.size, igSticker.size);
        }
        ctx.font = `bold ${igSticker.size * 0.75}px Arial`;
        ctx.fillStyle = igSticker.color;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(igSticker.text, igSticker.x + igSticker.size + 15, igSticker.y + (igSticker.size / 2));
      } else if (type === 'company' && logoCompany.active && logoCompany.img) {
        const aspect = logoCompany.img.width / logoCompany.img.height;
        const drawH = logoCompany.size / aspect;
        ctx.drawImage(logoCompany.img, logoCompany.x, logoCompany.y, logoCompany.size, drawH);
      } else if (type === 'brand' && logoBrand.active && logoBrand.img) {
        const aspect = logoBrand.img.width / logoBrand.img.height;
        const drawH = logoBrand.size / aspect;
        ctx.drawImage(logoBrand.img, logoBrand.x, logoBrand.y, logoBrand.size, drawH);
      }

      // Draw dragging bounds
      if (draggingSticker === type) {
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 6;
        let w = 200, h = 100;
        if (type === 'company') {
          const aspect = logoCompany.img ? logoCompany.img.width / logoCompany.img.height : 1;
          w = logoCompany.size; h = logoCompany.size / aspect;
          ctx.strokeRect(logoCompany.x - 2, logoCompany.y - 2, w + 4, h + 4);
        } else if (type === 'brand') {
          const aspect = logoBrand.img ? logoBrand.img.width / logoBrand.img.height : 1;
          w = logoBrand.size; h = logoBrand.size / aspect;
          ctx.strokeRect(logoBrand.x - 2, logoBrand.y - 2, w + 4, h + 4);
        } else if (type === 'ig') {
          ctx.font = `bold ${igSticker.size * 0.75}px Arial`;
          const textW = ctx.measureText(igSticker.text).width;
          w = igSticker.size + 15 + textW;
          h = igSticker.size;
          ctx.strokeRect(igSticker.x - 2, igSticker.y - 2, w + 4, h + 4);
        }
      }
    };

    drawOverlay('company');
    drawOverlay('brand');
    drawOverlay('ig');

    // Draw Grid Label badge overlay
    if (gridLabelPreset !== 'none') {
      const labelText = gridLabelPreset === 'custom' ? customGridLabel : gridLabelPreset.replace('_', ' ').toUpperCase();
      drawGridLabelBadge(ctx, labelText, 1080, 1920, gridLabelPosition, gridLabelColor);
    }

    // Guidelines Ruler labels
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(0, 0, 1080, 50);
    ctx.fillRect(0, 0, 50, 1920);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = 0; i <= 1080; i += 100) {
      ctx.fillText(String(i), i, 25);
    }
    for (let i = 0; i <= 1920; i += 100) {
      ctx.save();
      ctx.translate(25, i);
      ctx.rotate(-Math.PI / 2);
      if (i > 0) ctx.fillText(String(i), 0, 0);
      ctx.restore();
    }
    ctx.restore();
  };

  // Master Image Auto-cut Upload (Supports uploading multiple, up to 5 master images total)
  const handleMasterUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const currentCount = masterImages.length;
    const remainingSlots = 5 - currentCount;
    if (remainingSlots <= 0) {
      alert("Maksimal 5 gambar utama (1 utama + 4 tambahan) telah terunggah.");
      return;
    }

    const filesToLoad = Array.from(files).slice(0, remainingSlots) as File[];

    filesToLoad.forEach((file) => {
      const img = new Image();
      img.onload = () => {
        const newImgObj: MasterImage = {
          id: Math.random().toString(36).substring(2, 9),
          img,
          src: img.src,
          name: file.name,
          dimensions: `${img.width} x ${img.height} px`
        };
        setMasterImages((prev) => {
          const next = [...prev, newImgObj];
          return next;
        });
      };
      img.src = URL.createObjectURL(file);
    });
  };

  const handleDeleteMasterImage = (idx: number) => {
    setMasterImages((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      if (activeMasterIdx >= next.length) {
        setActiveMasterIdx(Math.max(0, next.length - 1));
      }
      return next;
    });
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedImgIdx(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedImgIdx === null || draggedImgIdx === index) return;
    setDragOverImgIdx(index);
  };

  const handleDragEnd = () => {
    setDraggedImgIdx(null);
    setDragOverImgIdx(null);
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedImgIdx === null || draggedImgIdx === index) return;

    setMasterImages((prev) => {
      const next = [...prev];
      const [draggedItem] = next.splice(draggedImgIdx, 1);
      next.splice(index, 0, draggedItem);
      
      // Update activeMasterIdx to point to the newly dropped position
      if (activeMasterIdx === draggedImgIdx) {
        setActiveMasterIdx(index);
      } else if (activeMasterIdx > draggedImgIdx && activeMasterIdx <= index) {
        setActiveMasterIdx(activeMasterIdx - 1);
      } else if (activeMasterIdx < draggedImgIdx && activeMasterIdx >= index) {
        setActiveMasterIdx(activeMasterIdx + 1);
      }
      
      return next;
    });

    setDraggedImgIdx(null);
    setDragOverImgIdx(null);
  };

  // Execute Matrix Grid Slicing for a single specified master image index
  const handleCutSingleImage = (idx: number) => {
    const selectedObj = masterImages[idx];
    if (!selectedObj) return;

    const img = selectedObj.img;
    const pieceWidth = img.width / cols;
    const pieceHeight = img.height / rows;

    const newPieces: GridPiece[] = [];

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = pieceWidth;
        tempCanvas.height = pieceHeight;
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) {
          tempCtx.drawImage(
            img,
            x * pieceWidth, y * pieceHeight, pieceWidth, pieceHeight,
            0, 0, pieceWidth, pieceHeight
          );
        }

        const croppedImg = new Image();
        croppedImg.src = tempCanvas.toDataURL('image/png');

        const targetWidth = 1080;
        const targetHeight = gridAspectRatio === '9:16' ? 1920 : (gridAspectRatio === '3:4' ? 1440 : 1080);
        const scaleX = targetWidth / pieceWidth;
        const scaleY = targetHeight / pieceHeight;
        const baseScale = Math.max(scaleX, scaleY);

        let panX = targetWidth / 2;
        let panY = targetHeight / 2;
        let finalScale = baseScale;

        if (autoCenterEnabled) {
          const box = detectFocalBoundingBox(img, cols, rows, x, y);
          if (box) {
            const focalCenterX = box.x + box.width / 2;
            const focalCenterY = box.y + box.height / 2;

            // Smart-Crop: fit the product safely within 85% of the target canvas boundaries
            const fitScaleX = (targetWidth * 0.85) / box.width;
            const fitScaleY = (targetHeight * 0.85) / box.height;
            const fitScale = Math.min(fitScaleX, fitScaleY);

            if (fitScale < baseScale) {
              finalScale = Math.max(fitScale, Math.min(scaleX, scaleY));
            } else {
              finalScale = Math.min(fitScale, baseScale * 1.15);
            }

            panX = targetWidth / 2 - (focalCenterX - pieceWidth / 2) * finalScale;
            panY = targetHeight / 2 - (focalCenterY - pieceHeight / 2) * finalScale;
          }
        }

        newPieces.push({
          img: croppedImg,
          zoom: 1,
          panX: panX,
          panY: panY,
          baseScale: finalScale
        });
      }
    }

    setPieces(newPieces);
  };

  // Default cut action for active master image
  const handleCutImage = () => {
    if (masterImages.length === 0) {
      alert("Silakan unggah Gambar Utama terlebih dahulu.");
      return;
    }
    handleCutSingleImage(activeMasterIdx);
  };

  // Helper to generate a slice data URL for *any* master image, applying current watermark overlays
  const getPieceDataUrlForImage = (
    imgElement: HTMLImageElement,
    colIdx: number,
    rowIdx: number,
    applyOverlays: boolean = true,
    formatType: 'image/png' | 'image/jpeg' = 'image/png'
  ): string | null => {
    const targetWidth = 1080;
    const targetHeight = gridAspectRatio === '9:16' ? 1920 : (gridAspectRatio === '3:4' ? 1440 : 1080);

    const pieceWidth = imgElement.width / cols;
    const pieceHeight = imgElement.height / rows;

    const sliceCanvas = document.createElement('canvas');
    sliceCanvas.width = pieceWidth;
    sliceCanvas.height = pieceHeight;
    const sliceCtx = sliceCanvas.getContext('2d');
    if (!sliceCtx) return null;

    sliceCtx.drawImage(
      imgElement,
      colIdx * pieceWidth, rowIdx * pieceHeight, pieceWidth, pieceHeight,
      0, 0, pieceWidth, pieceHeight
    );

    const targetCanvas = document.createElement('canvas');
    targetCanvas.width = targetWidth;
    targetCanvas.height = targetHeight;
    const targetCtx = targetCanvas.getContext('2d');
    if (!targetCtx) return null;

    targetCtx.fillStyle = '#000000';
    targetCtx.fillRect(0, 0, targetWidth, targetHeight);

    const scaleX = targetWidth / pieceWidth;
    const scaleY = targetHeight / pieceHeight;
    const baseScale = Math.max(scaleX, scaleY);

    let panX = targetWidth / 2;
    let panY = targetHeight / 2;
    let finalScale = baseScale;

    if (autoCenterEnabled) {
      const box = detectFocalBoundingBox(imgElement, cols, rows, colIdx, rowIdx);
      if (box) {
        const focalCenterX = box.x + box.width / 2;
        const focalCenterY = box.y + box.height / 2;

        const fitScaleX = (targetWidth * 0.85) / box.width;
        const fitScaleY = (targetHeight * 0.85) / box.height;
        const fitScale = Math.min(fitScaleX, fitScaleY);

        if (fitScale < baseScale) {
          finalScale = Math.max(fitScale, Math.min(scaleX, scaleY));
        } else {
          finalScale = Math.min(fitScale, baseScale * 1.15);
        }

        panX = targetWidth / 2 - (focalCenterX - pieceWidth / 2) * finalScale;
        panY = targetHeight / 2 - (focalCenterY - pieceHeight / 2) * finalScale;
      }
    }

    targetCtx.save();
    targetCtx.translate(panX, panY);
    targetCtx.scale(finalScale, finalScale);
    targetCtx.drawImage(sliceCanvas, -pieceWidth / 2, -pieceHeight / 2);
    targetCtx.restore();

    if (applyOverlays && gridAspectRatio === '9:16') {
      if (logoCompany.active && logoCompany.img) {
        const aspect = logoCompany.img.width / logoCompany.img.height;
        const h = logoCompany.size / aspect;
        targetCtx.drawImage(logoCompany.img, logoCompany.x, logoCompany.y, logoCompany.size, h);
      }
      if (logoBrand.active && logoBrand.img) {
        const aspect = logoBrand.img.width / logoBrand.img.height;
        const h = logoBrand.size / aspect;
        targetCtx.drawImage(logoBrand.img, logoBrand.x, logoBrand.y, logoBrand.size, h);
      }
      if (igSticker.active) {
        const icon = igSticker.color === 'white' ? igWhiteImg : igBlackImg;
        if (icon) {
          targetCtx.drawImage(icon, igSticker.x, igSticker.y, igSticker.size, igSticker.size);
        }
        targetCtx.font = `bold ${igSticker.size * 0.75}px Arial`;
        targetCtx.fillStyle = igSticker.color;
        targetCtx.textAlign = 'left';
        targetCtx.textBaseline = 'middle';
        targetCtx.fillText(igSticker.text, igSticker.x + igSticker.size + 15, igSticker.y + (igSticker.size / 2));
      }
    }

    // Apply global watermark to each sliced panel in batch cut
    drawWatermarkOnCanvas(targetCtx, targetWidth, targetHeight);

    // Apply Grid Label badge overlay
    if (gridLabelPreset !== 'none') {
      const idx = rowIdx * cols + colIdx;
      if (gridLabelScope === 'all' || idx === 0) {
        const labelText = gridLabelPreset === 'custom' ? customGridLabel : gridLabelPreset.replace('_', ' ').toUpperCase();
        drawGridLabelBadge(targetCtx, labelText, targetWidth, targetHeight, gridLabelPosition, gridLabelColor);
      }
    }

    return targetCanvas.toDataURL(formatType, 0.9);
  };

  // Batch Crop All Uploaded Images to ZIP with Watermarks
  const handleBatchCutAllToZip = async (nameToUse: string = customZipName) => {
    if (masterImages.length === 0) {
      alert("Harap unggah minimal 1 Gambar Utama terlebih dahulu.");
      return;
    }

    setIsSlicing(true);
    setSlicingMessage('Menyiapkan batch potong seluruh Gambar Utama...');
    onRecordingStart('Menyiapkan batch potong semua gambar...');

    try {
      const zip = new JSZip();
      const folder = zip.folder(nameToUse || renamePrefix || "MarketBoost_Batch_Slices");
      const mime = renameExtension === '.jpg' ? 'image/jpeg' : 'image/png';

      let globalPanelIndex = 0;
      for (let imgIdx = 0; imgIdx < masterImages.length; imgIdx++) {
        const m = masterImages[imgIdx];
        
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const dataUrl = getPieceDataUrlForImage(m.img, c, r, true, mime);
            if (dataUrl) {
              const base64Data = dataUrl.split(',')[1];
              const filename = getBatchPieceFilename(globalPanelIndex);
              folder?.file(filename, base64Data, { base64: true });
            }
            globalPanelIndex++;
          }
        }
      }

      // Automatically generate video slideshow and pack it directly in the zip if enabled
      if (includeVideoSlideshow && videoSelectedPanelKeys.length > 0) {
        setSlicingMessage('Merekam Video Slideshow untuk disisipkan ke berkas ZIP...');
        onRecordingStart('Menyiapkan & Merekam Video Slideshow untuk ZIP...');
        const videoSlices: string[] = [];
        
        videoSelectedPanelKeys.forEach(key => {
          if (key.startsWith('batch_')) {
            const parts = key.split('_'); // ["batch", imgIdx, sliceIdx]
            const imgIdx = parseInt(parts[1], 10);
            const sliceIdx = parseInt(parts[2], 10);
            const r = Math.floor(sliceIdx / cols);
            const c = sliceIdx % cols;
            const m = masterImages[imgIdx];
            if (m) {
              const dataUrl = getPieceDataUrlForImage(m.img, c, r, true, mime);
              if (dataUrl) {
                videoSlices.push(dataUrl);
              }
            }
          }
        });

        if (videoSlices.length > 0) {
          try {
            const videoResult = await generateVideoBlob(videoSlices);
            
            // Check maximum size constraint (30MB)
            const maxBytes = 30 * 1024 * 1024; // 30MB
            if (videoResult.blob.size > maxBytes) {
              alert(`Ukuran video slideshow (${(videoResult.blob.size / (1024 * 1024)).toFixed(2)} MB) melebihi batas 30MB. Video tetap disertakan dalam ZIP, namun disarankan mengurangi jumlah panel terpilih.`);
            }
            
            folder?.file(`${nameToUse || 'Slideshow'}_Video.${videoResult.ext}`, videoResult.blob);
          } catch (videoErr) {
            console.error("Gagal menyisipkan video ke ZIP:", videoErr);
          }
        }
      }

      setSlicingMessage('Mengompresi potongan gambar ke berkas ZIP...');
      onRecordingStart('Membuat file ZIP hasil potong...');
      const zipContent = await zip.generateAsync({ type: 'blob' }, (metadata) => {
        const percent = Math.round(metadata.percent);
        onRecordingProgress(percent);
      });
      const url = URL.createObjectURL(zipContent);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${nameToUse || 'MarketBoost_Batch_Grid'}_${cols}x${rows}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert("Gagal melakukan batch potong.");
    } finally {
      setIsSlicing(false);
      setSlicingMessage('');
      onRecordingEnd();
    }
  };

  const openBatchCutRenamePopup = () => {
    if (masterImages.length === 0) {
      alert("Harap unggah minimal 1 Gambar Utama terlebih dahulu.");
      return;
    }
    setTempZipName(customZipName);
    setRenameModalType('batch');
    
    // Pre-select all available panels in batch!
    const initialKeys: string[] = [];
    masterImages.forEach((m, imgIdx) => {
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          initialKeys.push(`batch_${imgIdx}_${r * cols + c}`);
        }
      }
    });
    setVideoSelectedPanelKeys(initialKeys);
    setIncludeVideoSlideshow(true);
    setRenameModalOpen(true);
  };

  // Manual image upload on a specific slot
  const handleSlotUpload = (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const img = new Image();
    img.onload = () => {
      const targetWidth = 1080;
      const targetHeight = gridAspectRatio === '9:16' ? 1920 : (gridAspectRatio === '3:4' ? 1440 : 1080);
      const scaleX = targetWidth / img.width;
      const scaleY = targetHeight / img.height;
      const baseScale = Math.max(scaleX, scaleY);

      let panX = targetWidth / 2;
      let panY = targetHeight / 2;
      let finalScale = baseScale;

      if (autoCenterEnabled) {
        const box = detectFocalBoundingBox(img);
        if (box) {
          const focalCenterX = box.x + box.width / 2;
          const focalCenterY = box.y + box.height / 2;

          const fitScaleX = (targetWidth * 0.85) / box.width;
          const fitScaleY = (targetHeight * 0.85) / box.height;
          const fitScale = Math.min(fitScaleX, fitScaleY);

          if (fitScale < baseScale) {
            finalScale = Math.max(fitScale, Math.min(scaleX, scaleY));
          } else {
            finalScale = Math.min(fitScale, baseScale * 1.15);
          }

          panX = targetWidth / 2 - (focalCenterX - img.width / 2) * finalScale;
          panY = targetHeight / 2 - (focalCenterY - img.height / 2) * finalScale;
        }
      }

      setPieces((prev) => {
        const next = [...prev];
        next[idx] = {
          img,
          zoom: 1,
          panX,
          panY,
          baseScale: finalScale
        };
        return next;
      });
    };
    img.src = URL.createObjectURL(file);
  };

  // Grid item pan & scale logic
  const handleGridDragStart = (idx: number, e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const piece = pieces[idx];
    if (!piece || !piece.img) return;

    const canvas = canvasRefs.current[idx];
    if (!canvas) return;

    let clientX = 0, clientY = 0;
    if ('touches' in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const initialX = (clientX - rect.left) * scaleX;
    const initialY = (clientY - rect.top) * scaleY;

    const handleDragMove = (moveEvent: MouseEvent | TouchEvent) => {
      let currentX = 0, currentY = 0;
      if ('touches' in moveEvent) {
        if (moveEvent.touches.length === 0) return;
        currentX = moveEvent.touches[0].clientX;
        currentY = moveEvent.touches[0].clientY;
      } else {
        currentX = moveEvent.clientX;
        currentY = moveEvent.clientY;
      }

      const currentCanvasX = (currentX - rect.left) * scaleX;
      const currentCanvasY = (currentY - rect.top) * scaleY;

      const deltaX = currentCanvasX - initialX;
      const deltaY = currentCanvasY - initialY;

      setPieces((prev) => {
        const next = [...prev];
        if (next[idx]) {
          next[idx] = {
            ...next[idx],
            panX: next[idx].panX + deltaX,
            panY: next[idx].panY + deltaY
          };
        }
        return next;
      });
    };

    const handleDragEnd = () => {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleDragMove);
      window.removeEventListener('touchend', handleDragEnd);
    };

    window.addEventListener('mousemove', handleDragMove);
    window.addEventListener('mouseup', handleDragEnd);
    window.addEventListener('touchmove', handleDragMove, { passive: false });
    window.addEventListener('touchend', handleDragEnd);
  };

  // Drag overlays inside 9:16 interactive screen
  const getMousePosOnPreview = (evt: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX = 0, clientY = 0;
    if ('touches' in evt) {
      if (evt.touches.length === 0) return { x: 0, y: 0 };
      clientX = evt.touches[0].clientX;
      clientY = evt.touches[0].clientY;
    } else {
      clientX = evt.clientX;
      clientY = evt.clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const startDragLogo = (evt: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const pos = getMousePosOnPreview(evt);

    // Helper bounds checker
    const checkHit = (x: number, y: number, w: number, h: number) => {
      return pos.x >= x && pos.x <= x + w && pos.y >= y && pos.y <= y + h;
    };

    // Instagram Info bounds check
    if (igSticker.active) {
      const canvas = previewCanvasRef.current;
      const ctx = canvas?.getContext('2d');
      let textW = 300;
      if (ctx) {
        ctx.font = `bold ${igSticker.size * 0.75}px Arial`;
        textW = ctx.measureText(igSticker.text).width;
      }
      const w = igSticker.size + 15 + textW;
      const h = igSticker.size;
      if (checkHit(igSticker.x, igSticker.y, w, h)) {
        setDraggingSticker('ig');
        setDragOffset({ x: pos.x - igSticker.x, y: pos.y - igSticker.y });
        return;
      }
    }

    // Company Logo bounds check
    if (logoCompany.active && logoCompany.img) {
      const aspect = logoCompany.img.width / logoCompany.img.height;
      const h = logoCompany.size / aspect;
      if (checkHit(logoCompany.x, logoCompany.y, logoCompany.size, h)) {
        setDraggingSticker('company');
        setDragOffset({ x: pos.x - logoCompany.x, y: pos.y - logoCompany.y });
        return;
      }
    }

    // Brand Logo bounds check
    if (logoBrand.active && logoBrand.img) {
      const aspect = logoBrand.img.width / logoBrand.img.height;
      const h = logoBrand.size / aspect;
      if (checkHit(logoBrand.x, logoBrand.y, logoBrand.size, h)) {
        setDraggingSticker('brand');
        setDragOffset({ x: pos.x - logoBrand.x, y: pos.y - logoBrand.y });
        return;
      }
    }
  };

  const moveDragLogo = (evt: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!draggingSticker) return;
    evt.preventDefault();
    const pos = getMousePosOnPreview(evt);

    const nx = pos.x - dragOffset.x;
    const ny = pos.y - dragOffset.y;

    if (draggingSticker === 'company') {
      setLogoCompany((prev) => ({ ...prev, x: nx, y: ny }));
    } else if (draggingSticker === 'brand') {
      setLogoBrand((prev) => ({ ...prev, x: nx, y: ny }));
    } else if (draggingSticker === 'ig') {
      setIgSticker((prev) => ({ ...prev, x: nx, y: ny }));
    }
  };

  const stopDragLogo = () => {
    setDraggingSticker(null);
  };

  // Setup logos from Google Sheet Database
  const handleLogoDBSelect = (type: 'company' | 'brand', url: string) => {
    if (!url) {
      if (type === 'company') setLogoCompany((prev) => ({ ...prev, active: false }));
      else setLogoBrand((prev) => ({ ...prev, active: false }));
      return;
    }

    let fileId = '';
    const match = url.match(/[-\w]{25,}/);
    if (match) fileId = match[0];
    else fileId = url;

    const proxyUrl = `https://wsrv.nl/?url=` + encodeURIComponent(`https://drive.google.com/uc?export=view&id=${fileId}`);

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (type === 'company') {
        setLogoCompany((prev) => ({ ...prev, img, active: true }));
      } else {
        setLogoBrand((prev) => ({ ...prev, img, active: true }));
      }
    };
    img.onerror = () => {
      alert("Gagal memuat gambar dari Google Drive. Pastikan pengaturan share file Google Drive Anda telah di-set 'Anyone with link / Siapa saja dengan link'.");
    };
    img.src = proxyUrl;
  };

  // Manual local upload for Company or Brand Logo stickers
  const handleManualStickerUpload = (type: 'company' | 'brand', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const img = new Image();
      img.onload = () => {
        if (type === 'company') {
          setLogoCompany((prev) => ({ ...prev, img, active: true }));
        } else {
          setLogoBrand((prev) => ({ ...prev, img, active: true }));
        }
      };
      img.src = evt.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // IG details change
  const handleIgEnableChange = (checked: boolean) => {
    setIgSticker((prev) => ({ ...prev, active: checked, text: igUsername, color: igColor }));
  };

  // Render high-res snapshot of a specific slice with overlays applied on top
  const getPieceDataUrl = (idx: number, formatType: 'image/png' | 'image/jpeg' = 'image/png'): string | null => {
    const piece = pieces[idx];
    if (!piece || !piece.img) return null;

    const targetWidth = 1080;
    const targetHeight = gridAspectRatio === '9:16' ? 1920 : (gridAspectRatio === '3:4' ? 1440 : 1080);

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, targetWidth, targetHeight);

    ctx.save();
    ctx.translate(piece.panX, piece.panY);
    ctx.scale(piece.baseScale * piece.zoom, piece.baseScale * piece.zoom);
    ctx.drawImage(piece.img, -piece.img.width / 2, -piece.img.height / 2);
    ctx.restore();

    // Slices are styled with brand/company/ig logos only in 9:16 layout
    if (gridAspectRatio === '9:16') {
      if (logoCompany.active && logoCompany.img) {
        const aspect = logoCompany.img.width / logoCompany.img.height;
        const h = logoCompany.size / aspect;
        ctx.drawImage(logoCompany.img, logoCompany.x, logoCompany.y, logoCompany.size, h);
      }
      if (logoBrand.active && logoBrand.img) {
        const aspect = logoBrand.img.width / logoBrand.img.height;
        const h = logoBrand.size / aspect;
        ctx.drawImage(logoBrand.img, logoBrand.x, logoBrand.y, logoBrand.size, h);
      }
      if (igSticker.active) {
        const icon = igSticker.color === 'white' ? igWhiteImg : igBlackImg;
        if (icon) {
          ctx.drawImage(icon, igSticker.x, igSticker.y, igSticker.size, igSticker.size);
        }
        ctx.font = `bold ${igSticker.size * 0.75}px Arial`;
        ctx.fillStyle = igSticker.color;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(igSticker.text, igSticker.x + igSticker.size + 15, igSticker.y + (igSticker.size / 2));
      }
    }

    // Apply global watermark to all output panel files
    drawWatermarkOnCanvas(ctx, targetWidth, targetHeight);

    // Apply Grid Label badge overlay
    if (gridLabelPreset !== 'none') {
      if (gridLabelScope === 'all' || idx === 0) {
        const labelText = gridLabelPreset === 'custom' ? customGridLabel : gridLabelPreset.replace('_', ' ').toUpperCase();
        drawGridLabelBadge(ctx, labelText, targetWidth, targetHeight, gridLabelPosition, gridLabelColor);
      }
    }

    return canvas.toDataURL(formatType, 0.9);
  };

  // Unified Collage Image Generation
  const handleDownloadCollage = async () => {
    const hasImage = pieces.some((p) => p && p.img);
    if (!hasImage) {
      alert("Harap unggah minimal 1 gambar ke dalam slot grid.");
      return;
    }

    setIsSlicing(true);
    setSlicingMessage("Menggabungkan seluruh panel menjadi 1 collage...");
    try {
      const targetWidth = 1080;
      const targetHeight = gridAspectRatio === '9:16' ? 1920 : (gridAspectRatio === '3:4' ? 1440 : 1080);

      const collageCanvas = document.createElement('canvas');
      collageCanvas.width = targetWidth * cols;
      collageCanvas.height = targetHeight * rows;
      const ctx = collageCanvas.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, collageCanvas.width, collageCanvas.height);

      let pieceIndex = 0;
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const url = getPieceDataUrl(pieceIndex);
          if (url) {
            const img = await new Promise<HTMLImageElement>((resolve) => {
              const tempImg = new Image();
              tempImg.onload = () => resolve(tempImg);
              tempImg.src = url;
            });
            ctx.drawImage(img, x * targetWidth, y * targetHeight, targetWidth, targetHeight);
          }
          pieceIndex++;
        }
      }

      const collageUrl = collageCanvas.toDataURL('image/png', 0.9);
      const link = document.createElement('a');
      link.href = collageUrl;
      link.download = `${customZipName || 'Collage'}-collage.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      console.error(err);
      alert("Gagal mengunduh collage: " + (err.message || err));
    } finally {
      setIsSlicing(false);
      setSlicingMessage('');
    }
  };

  // Download a single specific panel slice directly
  const handleDownloadSinglePiece = (idx: number) => {
    const mime = renameExtension === '.jpg' ? 'image/jpeg' : 'image/png';
    const url = getPieceDataUrl(idx, mime);
    if (!url) {
      alert("Belum ada gambar di slot ini.");
      return;
    }
    const link = document.createElement('a');
    link.href = url;
    link.download = getPieceFilename(idx);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ZIP Downloader for all Slices as single archive pack
  const handleDownloadZip = async (nameToUse: string = customZipName) => {
    const mime = renameExtension === '.jpg' ? 'image/jpeg' : 'image/png';
    const validPieces = pieces.map((p, idx) => ({ url: getPieceDataUrl(idx, mime), idx })).filter((x) => x.url !== null);

    if (validPieces.length === 0) {
      alert("Harap unggah minimal 1 gambar ke dalam slot grid.");
      return;
    }

    setIsSlicing(true);
    setSlicingMessage("Menyiapkan potongan gambar...");
    try {
      const zip = new JSZip();
      const folder = zip.folder(nameToUse || renamePrefix || "MarketBoost_Slices");

      for (const piece of validPieces) {
        if (piece.url) {
          // Strip data:image/png;base64, or data:image/jpeg;base64,
          const base64Data = piece.url.split(',')[1];
          const filename = getPieceFilename(piece.idx);
          folder?.file(filename, base64Data, { base64: true });
        }
      }

      // Automatically generate video slideshow and pack it directly in the zip if enabled
      if (includeVideoSlideshow && videoSelectedPanelKeys.length > 0) {
        setSlicingMessage("Merekam Video Slideshow untuk disisipkan ke berkas ZIP...");
        onRecordingStart('Menyiapkan & Merekam Video Slideshow untuk ZIP...');
        const videoSlices: string[] = [];
        
        videoSelectedPanelKeys.forEach(key => {
          if (key.startsWith('slice_')) {
            const sliceIdx = parseInt(key.replace('slice_', ''), 10);
            const url = getPieceDataUrl(sliceIdx, mime);
            if (url) {
              videoSlices.push(url);
            }
          }
        });

        if (videoSlices.length > 0) {
          try {
            const videoResult = await generateVideoBlob(videoSlices);
            
            // Check maximum size constraint (30MB)
            const maxBytes = 30 * 1024 * 1024; // 30MB
            if (videoResult.blob.size > maxBytes) {
              alert(`Ukuran video slideshow (${(videoResult.blob.size / (1024 * 1024)).toFixed(2)} MB) melebihi batas 30MB. Video tetap disertakan dalam ZIP, namun disarankan mengurangi jumlah panel terpilih.`);
            }
            
            folder?.file(`${nameToUse || 'Slideshow'}_Video.${videoResult.ext}`, videoResult.blob);
          } catch (videoErr) {
            console.error("Gagal menyisipkan video ke ZIP:", videoErr);
          }
        }
      }

      setSlicingMessage("Mengompresi potongan gambar ke berkas ZIP...");
      onRecordingStart('Membuat file ZIP hasil potong...');
      const zipContent = await zip.generateAsync({ type: 'blob' }, (metadata) => {
        const percent = Math.round(metadata.percent);
        onRecordingProgress(percent);
      });
      const url = URL.createObjectURL(zipContent);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${nameToUse || 'MarketBoost_Grid_Slices'}_${cols}x${rows}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error(err);
      alert("Gagal memotong & mengunduh ZIP: " + (err.message || err));
    } finally {
      setIsSlicing(false);
      setSlicingMessage("");
      onRecordingEnd();
    }
  };

  const openPreviewModal = () => {
    const urls: (string | null)[] = [];
    for (let i = 0; i < cols * rows; i++) {
      const url = getPieceDataUrl(i);
      urls.push(url);
    }
    setPreviewCanvasUrls(urls.map(u => u || ''));
    setPreviewModalOpen(true);
  };

  const openDownloadZipRenamePopup = () => {
    const validPieces = pieces.map((p, idx) => ({ url: getPieceDataUrl(idx), idx })).filter((x) => x.url !== null);
    if (validPieces.length === 0) {
      alert("Harap unggah minimal 1 gambar ke dalam slot grid.");
      return;
    }
    setTempZipName(customZipName);
    setRenameModalType('slices');
    
    // Pre-select all valid slice panels!
    const initialKeys = validPieces.map(p => `slice_${p.idx}`);
    setVideoSelectedPanelKeys(initialKeys);
    setIncludeVideoSlideshow(true);
    setRenameModalOpen(true);
  };

  // Video Slideshow Slides Video Generator
  const generateVideoBlob = async (customImages?: string[]): Promise<{ blob: Blob; ext: string }> => {
    const validImages = customImages || (pieces.map((p, idx) => getPieceDataUrl(idx)).filter((x) => x !== null) as string[]);

    if (validImages.length === 0) {
      throw new Error("Harap unggah minimal 1 gambar ke dalam slot grid.");
    }

    onRecordingStart('Merekam Slideshow Video...');

    const targetWidth = 1080;
    const targetHeight = gridAspectRatio === '9:16' ? 1920 : (gridAspectRatio === '3:4' ? 1440 : 1080);

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error("Gagal mengambil context 2D");

    const loadedImages = await Promise.all(validImages.map((url) => {
      return new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = url;
      });
    }));

    const stream = canvas.captureStream(30);

    let mimeType = 'video/mp4';
    let ext = 'mp4';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm;codecs=vp8';
      ext = 'webm';
    }

    const recorder = new MediaRecorder(stream, {
      mimeType: mimeType,
      videoBitsPerSecond: 10000000
    });

    const chunks: Blob[] = [];
    recorder.ondataavailable = (ev) => {
      if (ev && ev.data.size > 0) chunks.push(ev.data);
    };

    const recordingPromise = new Promise<Blob>((resolve, reject) => {
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        resolve(blob);
      };
      recorder.onerror = reject;
    });

    recorder.start(100);

    const slideDuration = 2800; // milliseconds
    const transitionDuration = 500;
    const totalDuration = loadedImages.length * slideDuration;

    // Random transition types per image slide
    const transitions = loadedImages.map(() => Math.floor(Math.random() * 4));

    return new Promise<{ blob: Blob; ext: string }>((resolveOverall, rejectOverall) => {
      let currentFrame = 0;
      const fps = 30;
      const frameDuration = 1000 / fps; // ~33.33ms
      const totalFrames = Math.ceil((totalDuration + 200) / frameDuration);

      const renderFrame = () => {
        const elapsed = currentFrame * frameDuration;
        const progressPct = Math.min(100, Math.floor((elapsed / (totalDuration + 200)) * 100));
        onRecordingProgress(progressPct);

        if (currentFrame >= totalFrames) {
          cleanup();
          recorder.stop();
          recordingPromise.then((blob) => {
            resolveOverall({ blob, ext });
          }).catch(rejectOverall);
          return;
        }

        const visualElapsed = Math.min(elapsed, totalDuration - 1);

        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, targetWidth, targetHeight);

        const currentSlideIndex = Math.min(Math.floor(visualElapsed / slideDuration), loadedImages.length - 1);
        const slideElapsed = visualElapsed % slideDuration;
        const isTransitioning = slideElapsed > (slideDuration - transitionDuration);

        const imgCurrent = loadedImages[currentSlideIndex];
        const imgNext = loadedImages[(currentSlideIndex + 1) % loadedImages.length];

        if (!isTransitioning || currentSlideIndex === loadedImages.length - 1) {
          ctx.globalAlpha = 1;
          ctx.drawImage(imgCurrent, 0, 0, targetWidth, targetHeight);
        } else {
          const progress = (slideElapsed - (slideDuration - transitionDuration)) / transitionDuration;
          const easeProgress = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;

          const tType = transitions[currentSlideIndex];

          if (tType === 0) { // Crossfade
            ctx.globalAlpha = 1;
            ctx.drawImage(imgCurrent, 0, 0, targetWidth, targetHeight);
            ctx.globalAlpha = easeProgress;
            ctx.drawImage(imgNext, 0, 0, targetWidth, targetHeight);
            ctx.globalAlpha = 1;
          } else if (tType === 1) { // Horiz slide
            ctx.globalAlpha = 1;
            const offset = easeProgress * targetWidth;
            ctx.drawImage(imgCurrent, -offset, 0, targetWidth, targetHeight);
            ctx.drawImage(imgNext, targetWidth - offset, 0, targetWidth, targetHeight);
          } else if (tType === 2) { // Vert slide
            ctx.globalAlpha = 1;
            const offset = easeProgress * targetHeight;
            ctx.drawImage(imgCurrent, 0, -offset, targetWidth, targetHeight);
            ctx.drawImage(imgNext, 0, targetHeight - offset, targetWidth, targetHeight);
          } else if (tType === 3) { // Zoom fade
            ctx.globalAlpha = 1 - easeProgress;
            const scale1 = 1 + (easeProgress * 0.2);
            ctx.drawImage(imgCurrent, -targetWidth * (scale1 - 1) / 2, -targetHeight * (scale1 - 1) / 2, targetWidth * scale1, targetHeight * scale1);

            ctx.globalAlpha = easeProgress;
            const scale2 = 1.2 - (easeProgress * 0.2);
            ctx.drawImage(imgNext, -targetWidth * (scale2 - 1) / 2, -targetHeight * (scale2 - 1) / 2, targetWidth * scale2, targetHeight * scale2);
            ctx.globalAlpha = 1;
          }
        }

        currentFrame++;
      };

      let timerId: any = null;
      let timerWorker: Worker | null = null;
      let workerUrl = '';

      const cleanup = () => {
        if (timerWorker) {
          timerWorker.postMessage({ action: 'stop' });
          timerWorker.terminate();
          timerWorker = null;
        }
        if (workerUrl) {
          URL.revokeObjectURL(workerUrl);
          workerUrl = '';
        }
        if (timerId) {
          clearInterval(timerId);
          timerId = null;
        }
      };

      try {
        // Create inline web worker for reliable background timing (avoid minimized throttling)
        const workerCode = `
          let timerId = null;
          self.onmessage = function(e) {
            if (e.data.action === 'start') {
              const interval = e.data.interval || 33;
              timerId = setInterval(() => {
                self.postMessage('tick');
              }, interval);
            } else if (e.data.action === 'stop') {
              if (timerId) {
                clearInterval(timerId);
                timerId = null;
              }
            }
          };
        `;
        const workerBlob = new Blob([workerCode], { type: 'application/javascript' });
        workerUrl = URL.createObjectURL(workerBlob);
        timerWorker = new Worker(workerUrl);
        timerWorker.onmessage = () => {
          renderFrame();
        };
        timerWorker.postMessage({ action: 'start', interval: Math.round(frameDuration) });
      } catch (workerErr) {
        console.warn("Web Worker creation failed. Falling back to normal background interval timer:", workerErr);
        // Fallback to standard setInterval (will still work, although minimized tabs are throttled to 1s)
        timerId = setInterval(() => {
          renderFrame();
        }, Math.round(frameDuration));
      }
    });
  };

  const handleDownloadVideo = async (customImages?: string[]) => {
    setIsSlicing(true);
    setSlicingMessage("Merekam video slideshow...");
    try {
      const { blob, ext } = await generateVideoBlob(customImages);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Slideshow_${Math.floor(10000 + Math.random() * 90000)}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error("Gagal membuat video:", error);
      alert(error?.message || "Terjadi kesalahan saat memproses video. Browser sandbox Anda mungkin membatasi captureStream atau MediaRecorder.");
    } finally {
      setIsSlicing(false);
      setSlicingMessage("");
      onRecordingEnd();
    }
  };

  const getAvailablePanelsForVideo = () => {
    if (renameModalType === 'slices') {
      const list: { key: string; label: string; imgSrc: string; imgIdx: number; colIdx: number; rowIdx: number; sliceIdx: number }[] = [];
      const activeMaster = masterImages[activeMasterIdx];
      if (!activeMaster) return [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const idx = r * cols + c;
          list.push({
            key: `slice_${idx}`,
            label: `Panel ${idx + 1}`,
            imgSrc: activeMaster.src,
            imgIdx: activeMasterIdx,
            colIdx: c,
            rowIdx: r,
            sliceIdx: idx
          });
        }
      }
      return list;
    } else {
      const list: { key: string; label: string; imgSrc: string; imgIdx: number; colIdx: number; rowIdx: number; sliceIdx: number }[] = [];
      masterImages.forEach((m, imgIdx) => {
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const sliceIdx = r * cols + c;
            list.push({
              key: `batch_${imgIdx}_${sliceIdx}`,
              label: `${m.name} - P${sliceIdx + 1}`,
              imgSrc: m.src,
              imgIdx,
              colIdx: c,
              rowIdx: r,
              sliceIdx
            });
          }
        }
      });
      return list;
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden h-full w-full bg-slate-900 text-slate-200 relative">
      {/* PROCESSING & SLICING FULLSCREEN OVERLAY */}
      {isSlicing && (
        <div className="absolute inset-0 z-[100] bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300 space-y-4">
          <div className="relative">
            <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-2xl opacity-40 animate-pulse" />
            <div className="w-16 h-16 bg-slate-900 border border-indigo-500/40 rounded-2xl flex items-center justify-center shadow-2xl relative z-10 animate-bounce">
              <Icons.Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
            </div>
          </div>
          <div className="space-y-1.5 max-w-sm relative z-10">
            <h3 className="text-sm font-black text-white uppercase tracking-wider">Sedang Memproses Potongan</h3>
            <p className="text-xs text-indigo-300 font-semibold font-mono">{slicingMessage || "Harap tunggu sebentar..."}</p>
            <p className="text-[10px] text-slate-500 leading-relaxed pt-2">
              Slicing Engine sedang merender kanvas presisi, menyematkan watermark, dan mengompresi gambar ke berkas ZIP. Mohon tidak menutup tab atau workspace ini.
            </p>
          </div>
        </div>
      )}

      {/* COLUMN KIRI: Grid Controls & Form (Light theme matches left sidebar style) */}
      <div className="w-[320px] bg-white border-r border-gray-200 flex flex-col overflow-y-auto shrink-0 p-4 space-y-4 text-slate-800">
        
        <div className="flex items-center gap-1.5 border-b border-gray-100 pb-2 mb-1 shrink-0">
          <Icons.Sliders className="w-4 h-4 text-indigo-600" />
          <h2 className="font-extrabold text-xs text-slate-800 uppercase tracking-widest">Grid & Watermark Controls</h2>
        </div>

        {/* Configuration Matrix Input Card */}
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 space-y-3 shadow-3xs">
          <p className="text-center font-bold text-indigo-900 text-[11px] mb-1">Buat template grid atau Potong Otomatis 1 gambar besar.</p>

          {/* Aspect Ratio Config */}
          <div>
            <label className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest block mb-1 text-center">Rasio Potongan</label>
            <div className="flex gap-2">
              {(['1:1', '3:4', '9:16'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setGridAspectRatio(r)}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                    gridAspectRatio === r ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-55'
                  }`}
                >
                  {r === '1:1' ? '1:1 Feed' : r === '3:4' ? '3:4 Port' : '9:16 Story'}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Grid Dimensions (Columns & Rows) */}
          <div>
            <label className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest block mb-1 text-center">Custom Jumlah Potongan</label>
            <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
              <div>
                <label className="text-[9px] font-semibold text-indigo-400 block mb-0.5 text-center">Kolom (H)</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={cols}
                  onChange={(e) => setCols(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-2 py-1 bg-white border border-indigo-200 rounded text-center text-xs font-bold"
                />
              </div>
              <div>
                <label className="text-[9px] font-semibold text-indigo-400 block mb-0.5 text-center">Baris (V)</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={rows}
                  onChange={(e) => setRows(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-2 py-1 bg-white border border-indigo-200 rounded text-center text-xs font-bold"
                />
              </div>
            </div>
          </div>

          {/* Auto-Center / Smart-Crop Toggle */}
          <div className="border-t border-indigo-200 pt-3 mt-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">Auto-Center & Smart-Crop</span>
              <span className="text-[9px] font-semibold text-indigo-400 bg-indigo-50 px-1.5 py-0.5 rounded-full">Subject Focus</span>
            </div>
            <label className="flex items-center justify-between p-2.5 bg-white border border-indigo-100 rounded-xl hover:border-indigo-300 transition-all cursor-pointer select-none">
              <div className="flex items-center gap-2">
                <Icons.Target className={`w-4 h-4 ${autoCenterEnabled ? 'text-indigo-600' : 'text-slate-400'}`} />
                <div className="text-left">
                  <p className="text-[10px] font-bold text-slate-700">Pusatkan Produk Otomatis</p>
                  <p className="text-[8px] text-slate-400">Deteksi rasio & fokus subjek</p>
                </div>
              </div>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={autoCenterEnabled}
                  onChange={(e) => setAutoCenterEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-8 h-4.5 bg-slate-200 rounded-full peer peer-focus:ring-2 peer-focus:ring-indigo-300 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-indigo-600"></div>
              </div>
            </label>
          </div>

          {/* Auto-cut image upload panel */}
          <div className="border-t border-indigo-200 pt-3 mt-3 space-y-3">
            <label className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest block text-center">Opsi 1: Potong Otomatis (Auto-Cut)</label>
            <div className="flex flex-col items-center">
              <label className="cursor-pointer w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-bold transition duration-200 flex justify-center items-center gap-2 shadow-sm text-xs">
                <Icons.UploadCloud className="w-4 h-4" /> Unggah Gambar (Bisa Banyak)
                <input type="file" accept="image/*" multiple onChange={handleMasterUpload} className="hidden" />
              </label>
              <span className="text-[9px] text-indigo-400 font-semibold mt-1 block text-center">Bisa upload tambahan 4 gambar (Total 5)</span>
            </div>

            {masterImages.length > 0 && (
              <div className="space-y-3 pt-1">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Daftar Gambar ({masterImages.length}/5)
                  </span>
                  {masterImages.length < 5 && (
                    <span className="text-[9px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                      +{5 - masterImages.length} slot
                    </span>
                  )}
                </div>

                {/* Thumbnail Gallery */}
                <div className="grid grid-cols-5 gap-1.5">
                  {masterImages.map((m, idx) => (
                    <div
                      key={m.id}
                      onClick={() => setActiveMasterIdx(idx)}
                      onDoubleClick={() => setPreviewImage(m)}
                      draggable
                      onDragStart={(e) => handleDragStart(e, idx)}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDragEnd={handleDragEnd}
                      onDrop={(e) => handleDrop(e, idx)}
                      className={`relative aspect-square rounded-lg border-2 overflow-hidden cursor-grab active:cursor-grabbing group transition-all ${
                        activeMasterIdx === idx 
                          ? 'border-indigo-600 ring-2 ring-indigo-600/15 scale-105' 
                          : 'border-slate-200 hover:border-slate-400'
                      } ${draggedImgIdx === idx ? 'opacity-30 border-dashed border-indigo-400' : ''} ${
                        dragOverImgIdx === idx ? 'border-emerald-500 scale-95' : ''
                      }`}
                      title={`Double-klik untuk memperbesar, Seret untuk mengurutkan: ${m.name}`}
                    >
                      <img src={m.src} className="w-full h-full object-cover pointer-events-none" alt={m.name} />
                      <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                        <Icons.Move className="w-4 h-4 text-white drop-shadow-md" />
                      </div>
                      {activeMasterIdx === idx && (
                        <div className="absolute top-0.5 right-0.5 bg-indigo-600 text-white rounded-full p-0.5 flex items-center justify-center shadow-xs">
                          <Icons.Check className="w-2 h-2" />
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewImage(m);
                        }}
                        className="absolute bottom-1 left-1 bg-indigo-600 hover:bg-indigo-700 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 shadow-sm cursor-pointer z-10 hover:scale-105"
                        title="Pratinjau gambar penuh"
                      >
                        <Icons.Eye className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteMasterImage(idx);
                        }}
                        className="absolute -top-1 -right-1 bg-rose-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-700 focus:opacity-100 shadow-xs z-10"
                        title="Hapus gambar ini"
                      >
                        <Icons.X className="w-2 h-2" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Selected Image Info & Actions */}
                {masterImages[activeMasterIdx] && (
                  <div className="p-3 bg-white border border-indigo-100 rounded-xl space-y-2.5 shadow-sm">
                    <div className="flex justify-between items-center text-[10px] gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <button
                          type="button"
                          onClick={() => setPreviewImage(masterImages[activeMasterIdx])}
                          className="p-1 hover:bg-indigo-50 text-indigo-600 hover:text-indigo-800 rounded transition-all shrink-0 cursor-pointer"
                          title="Pratinjau Gambar Penuh"
                        >
                          <Icons.Eye className="w-3.5 h-3.5" />
                        </button>
                        <span className="font-bold text-slate-600 truncate" title={masterImages[activeMasterIdx].name}>
                          {masterImages[activeMasterIdx].name}
                        </span>
                      </div>
                      <span className="font-mono bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-extrabold text-[9px] shrink-0">
                        {masterImages[activeMasterIdx].dimensions}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleCutSingleImage(activeMasterIdx)}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                        title="Potong gambar ini ke canvas grid"
                      >
                        <Icons.Scissors className="w-3 h-3" />
                        <span>Terapkan Grid</span>
                      </button>
                      <button
                        type="button"
                        onClick={openBatchCutRenamePopup}
                        className="w-full bg-slate-800 hover:bg-slate-700 text-slate-100 py-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                        title="Batch potong semua gambar sekaligus dan download ZIP"
                      >
                        <Icons.FolderArchive className="w-3 h-3 text-indigo-400" />
                        <span>Batch Potong</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Global PNG Watermark Controls */}
        <div className="bg-sky-50 border border-sky-100 rounded-2xl p-4 space-y-3 shadow-3xs">
          <h3 className="text-xs font-extrabold text-sky-950 flex items-center gap-1.5">
            <Icons.Layers className="w-4 h-4 text-sky-600" /> PNG Watermark Global
          </h3>
          <p className="text-[10px] text-sky-850 font-medium leading-relaxed">
            Unggah logo PNG transparan untuk diterapkan otomatis pada semua panel potongan grid (Feed, Portrait, & Story).
          </p>

          <div className="space-y-3">
            {/* Upload Area */}
            {!watermarkImg ? (
              <label className="cursor-pointer border-2 border-dashed border-sky-200 hover:border-sky-400 bg-white hover:bg-sky-50/30 transition-all rounded-xl p-3.5 flex flex-col items-center justify-center gap-1.5 text-center group">
                <Icons.UploadCloud className="w-6 h-6 text-sky-500 group-hover:scale-110 transition-transform" />
                <div>
                  <span className="text-[11px] font-bold text-slate-700 block">Pilih Logo Watermark</span>
                  <span className="text-[9px] text-slate-400 font-semibold block mt-0.5">Mendukung file PNG Transparan</span>
                </div>
                <input type="file" accept="image/png" onChange={handleWatermarkUpload} className="hidden" />
              </label>
            ) : (
              <div className="bg-white border border-sky-100 rounded-xl p-3 space-y-3 shadow-3xs">
                <div className="flex items-center justify-between gap-2 border-b border-sky-50 pb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden p-0.5 shadow-inner shrink-0">
                      <img src={watermarkImg.src} className="max-w-full max-h-full object-contain" alt="" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-700 truncate block" title={watermarkName || 'Watermark'}>
                      {watermarkName || 'Watermark.png'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveWatermark}
                    className="p-1 hover:bg-rose-50 text-rose-500 hover:text-rose-600 rounded transition-colors cursor-pointer"
                    title="Hapus Watermark"
                  >
                    <Icons.Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Opacity Control */}
                <div>
                  <div className="flex justify-between items-center text-[9px] font-bold text-slate-500 uppercase mb-1">
                    <span>Opasitas Watermark</span>
                    <span className="text-sky-600 font-extrabold">{Math.round(watermarkOpacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.05"
                    value={watermarkOpacity}
                    onChange={(e) => setWatermarkOpacity(parseFloat(e.target.value))}
                    className="w-full accent-sky-500 h-1 cursor-pointer bg-slate-100 rounded-lg outline-none"
                  />
                </div>

                {/* Scale Control */}
                <div>
                  <div className="flex justify-between items-center text-[9px] font-bold text-slate-500 uppercase mb-1">
                    <span>Ukuran Skala</span>
                    <span className="text-sky-600 font-extrabold">{watermarkScale}% dari panel</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="80"
                    step="1"
                    value={watermarkScale}
                    onChange={(e) => setWatermarkScale(parseInt(e.target.value))}
                    className="w-full accent-sky-500 h-1 cursor-pointer bg-slate-100 rounded-lg outline-none"
                  />
                </div>

                {/* Position Control */}
                <div>
                  <span className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Posisi Watermark</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['top-left', 'center', 'bottom-right'] as const).map((pos) => {
                      let label = '';
                      if (pos === 'top-left') label = 'Kiri Atas';
                      if (pos === 'center') label = 'Tengah';
                      if (pos === 'bottom-right') label = 'Kanan Bawah';

                      const isActive = watermarkPosition === pos;

                      return (
                        <button
                          key={pos}
                          type="button"
                          onClick={() => setWatermarkPosition(pos)}
                          className={`py-1 text-[9px] font-bold rounded-lg border transition-all text-center cursor-pointer ${
                            isActive
                              ? 'bg-sky-600 text-white border-sky-600 shadow-3xs'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:border-sky-200'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Menu Opsi Kuantitas / Kemasan Gambar */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 shadow-3xs">
          <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
            <h3 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
              <Icons.Box className="w-4 h-4 text-indigo-500" /> Opsi Label Kuantitas & Kemasan
            </h3>
            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
              {gridLabelPreset === 'none' ? 'Bawaan' : gridLabelPreset === '1_pcs' ? '1 Pcs' : gridLabelPreset === '1_set' ? '1 Set' : gridLabelPreset === '1_roll' ? '1 Roll' : gridLabelPreset === '1_box' ? '1 Box' : 'Kustom'}
            </span>
          </div>

          <p className="text-[10px] text-slate-500 leading-normal">
            Tambahkan label/badge penanda kemasan atau jumlah unit (misal: 1 Pcs, 1 Set, 1 Roll) di sudut gambar potongan grid Anda secara langsung.
          </p>

          {/* Grid of Presets with illustrated thumbnails */}
          <div className="grid grid-cols-5 gap-2">
            {/* Preset 1: Auto/None */}
            <div
              onClick={() => {
                setGridLabelPreset('none');
              }}
              className={`cursor-pointer rounded-lg p-1.5 border-2 text-center transition-all bg-white flex flex-col justify-between min-h-[96px] ${
                gridLabelPreset === 'none' ? 'border-indigo-500 bg-indigo-50/20' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex-1 flex items-center justify-center">
                <svg viewBox="0 0 64 64" className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="32" cy="32" r="14" strokeDasharray="3 3" />
                  <path d="M32 24v12M32 40h.01" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span className="text-[9px] font-bold text-slate-600 mt-1 block truncate">Bawaan</span>
            </div>

            {/* Preset 2: 1 Pcs */}
            <div
              onClick={() => {
                setGridLabelPreset('1_pcs');
                setCustomGridLabel('1 Pcs');
              }}
              className={`cursor-pointer rounded-lg p-1.5 border-2 text-center transition-all bg-white flex flex-col justify-between min-h-[96px] ${
                gridLabelPreset === '1_pcs' ? 'border-indigo-500 bg-indigo-50/20' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex-1 flex items-center justify-center">
                <svg viewBox="0 0 64 64" className="w-10 h-10 text-indigo-500" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="24" y="20" width="16" height="30" rx="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M24 30h16" strokeDasharray="2 2" />
                  <circle cx="32" cy="38" r="5" fill="currentColor" fillOpacity="0.1" />
                  <text x="30" y="40" fill="currentColor" fontSize="7" fontWeight="extrabold">1</text>
                </svg>
              </div>
              <span className="text-[9px] font-bold text-slate-600 mt-1 block truncate">1 Pcs</span>
            </div>

            {/* Preset 3: 1 Set */}
            <div
              onClick={() => {
                setGridLabelPreset('1_set');
                setCustomGridLabel('1 Set');
              }}
              className={`cursor-pointer rounded-lg p-1.5 border-2 text-center transition-all bg-white flex flex-col justify-between min-h-[96px] ${
                gridLabelPreset === '1_set' ? 'border-indigo-500 bg-indigo-50/20' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex-1 flex items-center justify-center">
                <svg viewBox="0 0 64 64" className="w-10 h-10 text-indigo-500" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="18" y="24" width="14" height="24" rx="1.5" stroke="#94a3b8" />
                  <path d="M22 20h6v4h-6z" stroke="#94a3b8" />
                  <rect x="32" y="26" width="14" height="22" rx="1.5" stroke="#94a3b8" />
                  <path d="M36 22h6v4h-6z" stroke="#94a3b8" />
                  <rect x="24" y="18" width="16" height="30" rx="2" fill="white" stroke="currentColor" />
                  <path d="M28 14h8v4h-8z" fill="currentColor" fillOpacity="0.1" />
                  <path d="M16 42h32" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <text x="24" y="36" fill="currentColor" fontSize="6.5" fontWeight="extrabold">SET</text>
                </svg>
              </div>
              <span className="text-[9px] font-bold text-slate-600 mt-1 block truncate">1 Set</span>
            </div>

            {/* Preset 4: 1 Roll */}
            <div
              onClick={() => {
                setGridLabelPreset('1_roll');
                setCustomGridLabel('1 Roll');
              }}
              className={`cursor-pointer rounded-lg p-1.5 border-2 text-center transition-all bg-white flex flex-col justify-between min-h-[96px] ${
                gridLabelPreset === '1_roll' ? 'border-indigo-500 bg-indigo-50/20' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex-1 flex items-center justify-center">
                <svg viewBox="0 0 64 64" className="w-10 h-10 text-indigo-500" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="32" cy="32" r="8" fill="currentColor" fillOpacity="0.1" />
                  <circle cx="32" cy="32" r="20" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="32" cy="32" r="16" strokeDasharray="4 2" stroke="#94a3b8" />
                  <circle cx="32" cy="32" r="12" stroke="#94a3b8" />
                  <path d="M32 52h14c1.1 0 2-.9 2-2v-4" strokeLinecap="round" />
                  <text x="29" y="34" fill="currentColor" fontSize="6.5" fontWeight="extrabold">ROLL</text>
                </svg>
              </div>
              <span className="text-[9px] font-bold text-slate-600 mt-1 block truncate">1 Roll</span>
            </div>

            {/* Preset 5: 1 Box */}
            <div
              onClick={() => {
                setGridLabelPreset('1_box');
                setCustomGridLabel('1 Box');
              }}
              className={`cursor-pointer rounded-lg p-1.5 border-2 text-center transition-all bg-white flex flex-col justify-between min-h-[96px] ${
                gridLabelPreset === '1_box' ? 'border-indigo-500 bg-indigo-50/20' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex-1 flex items-center justify-center">
                <svg viewBox="0 0 64 64" className="w-10 h-10 text-indigo-500" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M32 14 L50 22 L32 30 L14 22 Z" fill="currentColor" fillOpacity="0.1" strokeLinejoin="round" />
                  <path d="M14 22 L14 44 L32 52 L32 30 Z" strokeLinejoin="round" />
                  <path d="M32 30 L32 52 L50 44 L50 22 Z" strokeLinejoin="round" />
                  <text x="24" y="44" fill="currentColor" fontSize="6.5" fontWeight="extrabold">BOX</text>
                </svg>
              </div>
              <span className="text-[9px] font-bold text-slate-600 mt-1 block truncate">1 Box</span>
            </div>

            {/* Preset 6: Custom */}
            <div
              onClick={() => setGridLabelPreset('custom')}
              className={`col-span-5 cursor-pointer rounded-lg p-2 border-2 text-center transition-all bg-white flex items-center justify-between gap-3 ${
                gridLabelPreset === 'custom' ? 'border-indigo-500 bg-indigo-50/20' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <svg viewBox="0 0 64 64" className="w-8 h-8 text-indigo-600 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 24h40v16H12z" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M18 24v5M24 24v3M30 24v5M36 24v3M42 24v5M48 24v3" strokeWidth="1" />
                </svg>
                <div className="text-left">
                  <span className="text-[10px] font-bold text-slate-800 block">Kustom Label Sendiri</span>
                  <span className="text-[9px] text-slate-400 block">Ketik label kemasan atau kuantitas secara bebas</span>
                </div>
              </div>
              <Icons.ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${gridLabelPreset === 'custom' ? 'rotate-90 text-indigo-500' : ''}`} />
            </div>
          </div>

          {gridLabelPreset !== 'none' && (
            <div className="bg-white border border-slate-150 rounded-xl p-3 space-y-3 shadow-3xs">
              {/* Custom input if custom */}
              {gridLabelPreset === 'custom' && (
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wide block">Teks Label Kustom</label>
                  <input
                    type="text"
                    value={customGridLabel}
                    onChange={(e) => setCustomGridLabel(e.target.value)}
                    placeholder="Contoh: 1 set isi 3 pcs, 2 rolls, 10 pcs"
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs text-slate-800 outline-none font-semibold focus:border-indigo-400 focus:bg-white transition-all"
                  />
                </div>
              )}

              {/* Color Themes */}
              <div>
                <span className="text-[9px] font-bold text-slate-500 uppercase block mb-1.5">Warna Badge Label</span>
                <div className="grid grid-cols-5 gap-1.5">
                  {[
                    { key: 'indigo', label: 'Indigo', bg: 'bg-indigo-600' },
                    { key: 'slate', label: 'Slate', bg: 'bg-slate-800' },
                    { key: 'amber', label: 'Amber', bg: 'bg-amber-400' },
                    { key: 'rose', label: 'Rose', bg: 'bg-rose-500' },
                    { key: 'white', label: 'White', bg: 'bg-white border border-slate-200' },
                  ].map((color) => {
                    const isActive = gridLabelColor === color.key;
                    return (
                      <button
                        key={color.key}
                        type="button"
                        onClick={() => setGridLabelColor(color.key as any)}
                        className={`flex items-center justify-center gap-1 py-1 text-[9px] font-bold rounded-lg border transition-all cursor-pointer ${
                          isActive
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-400 shadow-3xs ring-1 ring-indigo-400/20'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                        }`}
                      >
                        <span className={`w-2.5 h-2.5 rounded-full ${color.bg}`} />
                        <span>{color.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Position Corner */}
              <div>
                <span className="text-[9px] font-bold text-slate-500 uppercase block mb-1.5">Sudut Posisi Badge</span>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { key: 'top-left', label: 'Kiri Atas' },
                    { key: 'top-right', label: 'Kanan Atas' },
                    { key: 'bottom-left', label: 'Kiri Bawah' },
                    { key: 'bottom-right', label: 'Kanan Bawah' },
                  ].map((pos) => {
                    const isActive = gridLabelPosition === pos.key;
                    return (
                      <button
                        key={pos.key}
                        type="button"
                        onClick={() => setGridLabelPosition(pos.key as any)}
                        className={`py-1 text-[9px] font-bold rounded-lg border transition-all text-center cursor-pointer ${
                          isActive
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-3xs'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                        }`}
                      >
                        {pos.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Scope (All vs First Slice) */}
              <div>
                <span className="text-[9px] font-bold text-slate-500 uppercase block mb-1.5">Terapkan Pada Panel</span>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'all', label: 'Semua Potongan Grid' },
                    { key: 'first', label: 'Hanya Potongan Pertama (Index 0)' },
                  ].map((scope) => {
                    const isActive = gridLabelScope === scope.key;
                    return (
                      <button
                        key={scope.key}
                        type="button"
                        onClick={() => setGridLabelScope(scope.key as any)}
                        className={`py-1.5 text-[9px] font-bold rounded-lg border transition-all text-center cursor-pointer ${
                          isActive
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-3xs'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {scope.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Optional stickers/watermark section for 9:16 layouts */}
        {gridAspectRatio === '9:16' && (
          <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4 space-y-4 shadow-sm">
            <h3 className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
              <Icons.Sticker className="w-4 h-4 text-purple-600" /> Elemen Khusus 9:16 (Draggable)
            </h3>

            <div className="grid grid-cols-2 gap-3">
              {/* Company watermark logo select */}
              <div className="p-2.5 bg-white border border-purple-200 rounded-xl space-y-2">
                <span className="text-[9px] font-bold text-purple-600 uppercase block text-center">Logo Perusahaan (Kiri)</span>
                <select
                  onChange={(e) => handleLogoDBSelect('company', e.target.value)}
                  className="w-full bg-slate-50 border border-purple-200 text-purple-800 px-2 py-1 rounded text-[11px] font-semibold outline-none cursor-pointer"
                >
                  <option value="">-- Pilih dari Database --</option>
                  {companyLogos.map((c, i) => (
                    <option key={i} value={c.url}>{c.name}</option>
                  ))}
                </select>
                <div className="flex items-center gap-1">
                  <div className="h-px bg-purple-100 flex-1" />
                  <span className="text-[8px] text-purple-400 font-bold uppercase">Atau Upload</span>
                  <div className="h-px bg-purple-100 flex-1" />
                </div>
                <label className="cursor-pointer bg-purple-600 hover:bg-purple-500 text-white px-2 py-1 rounded text-[10px] font-bold block text-center">
                  + Upload Manual
                  <input type="file" accept="image/*" onChange={(e) => handleManualStickerUpload('company', e)} className="hidden" />
                </label>
              </div>

              {/* Brand watermark logo select */}
              <div className="p-2.5 bg-white border border-purple-200 rounded-xl space-y-2">
                <span className="text-[9px] font-bold text-purple-600 uppercase block text-center">Logo Brand (Kanan)</span>
                <select
                  onChange={(e) => handleLogoDBSelect('brand', e.target.value)}
                  className="w-full bg-slate-50 border border-purple-200 text-purple-800 px-2 py-1 rounded text-[11px] font-semibold outline-none cursor-pointer"
                >
                  <option value="">-- Pilih dari Database --</option>
                  {brandLogos.map((b, i) => (
                    <option key={i} value={b.url}>{b.name}</option>
                  ))}
                </select>
                <div className="flex items-center gap-1">
                  <div className="h-px bg-purple-100 flex-1" />
                  <span className="text-[8px] text-purple-400 font-bold uppercase">Atau Upload</span>
                  <div className="h-px bg-purple-100 flex-1" />
                </div>
                <label className="cursor-pointer bg-purple-600 hover:bg-purple-500 text-white px-2 py-1 rounded text-[10px] font-bold block text-center">
                  + Upload Manual
                  <input type="file" accept="image/*" onChange={(e) => handleManualStickerUpload('brand', e)} className="hidden" />
                </label>
              </div>
            </div>

            {/* Instagram Info Overlay controls */}
            <div className="bg-white border border-purple-200 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-purple-600 uppercase flex items-center gap-1">
                  <Icons.Instagram className="w-3.5 h-3.5" /> Instagram Info (Kanan Bawah)
                </span>
                <input
                  type="checkbox"
                  checked={igSticker.active}
                  onChange={(e) => handleIgEnableChange(e.target.checked)}
                  className="w-4 h-4 text-purple-600 border-slate-300 rounded cursor-pointer accent-purple-600"
                />
              </div>

              {igSticker.active && (
                <div className="grid grid-cols-2 gap-2 animate-fade-in text-[11px]">
                  <input
                    type="text"
                    value={igUsername}
                    onChange={(e) => {
                      setIgUsername(e.target.value);
                      setIgSticker((prev) => ({ ...prev, text: e.target.value }));
                    }}
                    placeholder="Username IG"
                    className="w-full bg-slate-50 border border-purple-200 text-purple-800 px-2 py-1 rounded outline-none font-bold"
                  />
                  <select
                    value={igColor}
                    onChange={(e) => {
                      const c = e.target.value as 'white' | 'black';
                      setIgColor(c);
                      setIgSticker((prev) => ({ ...prev, color: c }));
                    }}
                    className="w-full bg-slate-50 border border-purple-200 text-purple-800 px-2 py-1 rounded outline-none font-bold"
                  >
                    <option value="white">Logo Putih</option>
                    <option value="black">Logo Hitam</option>
                  </select>
                </div>
              )}
            </div>

            {/* Sliders for active overlay logo scale */}
            {(logoCompany.active || logoBrand.active) && (
              <div className="bg-white border border-purple-200 rounded-xl p-3 space-y-2">
                {logoCompany.active && (
                  <div>
                    <div className="flex justify-between font-bold text-slate-500 text-[9px] mb-1 uppercase">
                      <span>Ukuran Logo Perusahaan</span>
                      <span>{logoCompany.size}px</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="600"
                      value={logoCompany.size}
                      onChange={(e) => setLogoCompany((prev) => ({ ...prev, size: parseInt(e.target.value) }))}
                      className="w-full accent-purple-600"
                    />
                  </div>
                )}
                {logoBrand.active && (
                  <div>
                    <div className="flex justify-between font-bold text-slate-500 text-[9px] mb-1 uppercase">
                      <span>Ukuran Logo Brand</span>
                      <span>{logoBrand.size}px</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="600"
                      value={logoBrand.size}
                      onChange={(e) => setLogoBrand((prev) => ({ ...prev, size: parseInt(e.target.value) }))}
                      className="w-full accent-purple-600"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Drag Guidelines Interactive Preview */}
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded border border-rose-200 text-center mb-2 shadow-xs">
                Sentuh & Geser Logo di dalam kotak presisi di bawah ini:
              </span>
              <div className="relative rounded-lg overflow-hidden border-2 border-dashed border-purple-300 shadow-md bg-slate-900" style={{ maxHeight: '350px', aspectRatio: '9/16' }}>
                <canvas
                  ref={previewCanvasRef}
                  onMouseDown={startDragLogo}
                  onMouseMove={moveDragLogo}
                  onMouseUp={stopDragLogo}
                  onMouseLeave={stopDragLogo}
                  onTouchStart={startDragLogo}
                  onTouchMove={moveDragLogo}
                  onTouchEnd={stopDragLogo}
                  className="w-full h-full object-contain cursor-move touch-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Workspace Presets (Save & Restore) */}
        <div className="bg-indigo-50/40 border border-indigo-100 rounded-2xl p-4 space-y-3 shadow-3xs">
          <h3 className="text-xs font-extrabold text-indigo-950 flex items-center gap-1.5">
            <Icons.Save className="w-4 h-4 text-indigo-600" /> Workspace Presets (JSON)
          </h3>
          <p className="text-[10px] text-indigo-900/80 font-medium leading-relaxed">
            Simpan semua pengaturan tata letak, urutan gambar utama, kustomisasi watermarking, dan konfigurasi pangkas (zoom/pan) ke berkas JSON untuk digunakan kembali nanti.
          </p>

          <div className="grid grid-cols-2 gap-2">
            {/* Export Button */}
            <button
              type="button"
              onClick={handleExportPreset}
              className="flex items-center justify-center gap-1.5 py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-[11px] transition-all cursor-pointer shadow-3xs"
            >
              <Icons.Download className="w-3.5 h-3.5" />
              <span>Simpan Preset</span>
            </button>

            {/* Import Button */}
            <label className="flex items-center justify-center gap-1.5 py-1.5 px-3 bg-white hover:bg-indigo-50/50 text-indigo-700 border border-indigo-200 hover:border-indigo-300 rounded-xl font-bold text-[11px] transition-all cursor-pointer shadow-3xs text-center">
              <Icons.Upload className="w-3.5 h-3.5 text-indigo-500" />
              <span>Muat Preset</span>
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleImportPreset}
                className="hidden"
              />
            </label>
          </div>
          
          {isPresetLoading && (
            <div className="text-[9px] text-indigo-600 font-bold flex items-center justify-center gap-1 bg-white border border-indigo-100 p-1.5 rounded-lg animate-pulse">
              <Icons.Loader2 className="w-3 h-3 animate-spin" />
              <span>Memproses pemulihan workspace...</span>
            </div>
          )}
        </div>
      </div>

      {/* COLUMN KANAN: Real-time Canvas Grid Workspace (Dark Theme, Spacious, Immersive) */}
      <div className="flex-1 bg-slate-950 flex flex-col text-white p-5 overflow-hidden relative min-w-[300px]">
        {/* Output Tab-Headers for easy viewing & multi-tasking */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4 shrink-0">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab && setActiveTab('visual')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all outline-none ${
                activeTab === 'visual' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/35' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icons.Image className="w-3.5 h-3.5" />
              <span>Visual Prompt</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab && setActiveTab('caption')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all outline-none ${
                activeTab === 'caption' ? 'bg-pink-500/20 text-pink-400 border border-pink-500/35' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icons.MessageSquare className="w-3.5 h-3.5" />
              <span>Caption Prompt</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab && setActiveTab('seo')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all outline-none ${
                activeTab === 'seo' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/35' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icons.ShoppingBag className="w-3.5 h-3.5" />
              <span>SEO Prompt</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab && setActiveTab('grid')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all outline-none ${
                activeTab === 'grid' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/35' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icons.LayoutGrid className="w-3.5 h-3.5" />
              <span>Grid Output</span>
            </button>
          </div>
        </div>

        {/* Workspace Title & Actions Area */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 shadow-md mb-5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600/10 text-indigo-400 rounded-xl flex items-center justify-center border border-indigo-500/20 shadow-inner shrink-0">
              <Icons.LayoutGrid className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm text-white">Interactive Canvas Grid Collage</h3>
                <span className="px-2 py-0.5 bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 rounded text-[9px] font-mono tracking-wider font-extrabold">LIVE_STAGE</span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">Dimensi: {cols}x{rows} • Rasio: {gridAspectRatio === '1:1' ? '1:1 Feed' : gridAspectRatio === '3:4' ? '3:4 Portrait' : '9:16 Story'} • Resolution: 1080x{gridAspectRatio === '9:16' ? 1920 : (gridAspectRatio === '3:4' ? 1440 : 1080)}px per panel</p>
            </div>
          </div>
 
          <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
            {/* Custom ZIP Naming Input */}
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl shrink-0 w-full sm:w-auto">
              <Icons.Edit3 className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Nama/Prefix:</span>
              <input
                type="text"
                value={customZipName}
                onChange={(e) => setCustomZipName(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
                placeholder="Prefix file..."
                className="bg-transparent text-white text-xs font-bold outline-none border-b border-transparent focus:border-indigo-500 w-28 font-mono"
              />
            </div>

            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={openPreviewModal}
                className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-500 hover:scale-102 text-white px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/15 cursor-pointer active:scale-98"
              >
                <Icons.Eye className="w-3.5 h-3.5" />
                <span>Preview Mode</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadCollage}
                className="flex-1 sm:flex-none bg-indigo-600 hover:bg-indigo-500 hover:scale-102 text-white px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/15 cursor-pointer active:scale-98"
              >
                <Icons.Layout className="w-3.5 h-3.5" />
                <span>Download Collage</span>
              </button>
              <button
                type="button"
                onClick={openDownloadZipRenamePopup}
                className="flex-1 sm:flex-none bg-slate-800 hover:bg-slate-700 hover:scale-102 text-slate-200 px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 border border-slate-700 cursor-pointer active:scale-98"
              >
                <Icons.Download className="w-3.5 h-3.5" />
                <span>Download ZIP Potongan</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadVideo}
                className="flex-1 sm:flex-none bg-rose-600 hover:bg-rose-500 hover:scale-102 text-white px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-md shadow-rose-600/15 cursor-pointer active:scale-98"
              >
                <Icons.Video className="w-3.5 h-3.5 animate-pulse" />
                <span>Buat Video Slideshow</span>
              </button>
            </div>
          </div>
        </div>

        {/* Interactive Grid Slices Canvas Area */}
        <div className="flex-1 overflow-y-auto py-6 px-4 bg-slate-950/40 rounded-3xl border border-slate-900 shadow-inner min-h-[250px] flex items-start justify-center">
          <div
            className={`grid gap-4 w-full ${getGridMaxWidth()} mx-auto`}
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: cols * rows }).map((_, idx) => {
              const piece = pieces[idx];
              const aspectClass = gridAspectRatio === '1:1' ? 'aspect-square' : (gridAspectRatio === '3:4' ? 'aspect-[3/4]' : 'aspect-[9/16]');

              return (
                <div
                  key={idx}
                  className={`relative ${aspectClass} border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-2xl overflow-hidden bg-slate-900/60 flex flex-col items-center justify-center group touch-none shadow-md transition-all duration-300`}
                >
                  {(!piece || !piece.img) && (
                    <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-indigo-500/5 transition-colors duration-300">
                      <div className="w-10 h-10 bg-slate-800/80 group-hover:bg-indigo-500/10 text-slate-400 group-hover:text-indigo-400 rounded-xl flex items-center justify-center mb-2 shadow-sm border border-slate-700/50 transition-all duration-300 group-hover:scale-105">
                        <Icons.ImagePlus className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-extrabold text-slate-400 group-hover:text-indigo-400 text-center uppercase tracking-wider transition-colors duration-300">Upload Panel {idx + 1}</span>
                      <input type="file" accept="image/*" onChange={(e) => handleSlotUpload(idx, e)} className="hidden" />
                    </label>
                  )}

                  <canvas
                    ref={(el) => { canvasRefs.current[idx] = el; }}
                    onMouseDown={(e) => handleGridDragStart(idx, e)}
                    onTouchStart={(e) => handleGridDragStart(idx, e)}
                    className={`absolute inset-0 w-full h-full cursor-move touch-none ${(!piece || !piece.img) ? 'hidden' : 'block'}`}
                  />

                  {piece && piece.img && (
                    <>
                      {/* Panel identification label */}
                      <div className="absolute top-3 left-3 bg-slate-950/80 text-indigo-300 text-[10px] font-bold px-2.5 py-1 rounded-lg border border-slate-800 select-none z-10 backdrop-blur-md shadow-md">
                        Panel {idx + 1}
                      </div>

                      {/* Quick download button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadSinglePiece(idx);
                        }}
                        title={`Download Panel ${idx + 1}`}
                        className="absolute top-3 right-3 bg-slate-950/90 hover:bg-emerald-600 text-white p-2 rounded-lg border border-slate-850 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center gap-1 shadow-lg hover:scale-105 z-10 cursor-pointer text-[10px] font-bold backdrop-blur-md"
                      >
                        <Icons.Download className="w-3.5 h-3.5" />
                        <span>Unduh</span>
                      </button>

                      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/95 via-black/70 to-transparent flex items-center gap-3.5 opacity-0 group-hover:opacity-100 transition-all duration-300 z-10">
                        <Icons.ZoomIn className="w-3.5 h-3.5 text-slate-400" />
                        <input
                          type="range"
                          min="0.5"
                          max="3"
                          step="0.01"
                          value={piece.zoom}
                          onChange={(e) => {
                            const nextZoom = parseFloat(e.target.value);
                            setPieces((prev) => {
                              const n = [...prev];
                              if (n[idx]) n[idx].zoom = nextZoom;
                              return n;
                              });
                          }}
                          className="flex-1 accent-indigo-500 h-1 cursor-ew-resize bg-slate-800 rounded-lg outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleDownloadSinglePiece(idx)}
                          title="Unduh slot ini"
                          className="text-emerald-400 hover:text-emerald-300 bg-slate-950/60 p-1.5 rounded-lg hover:bg-slate-950 transition-colors border border-slate-850"
                        >
                          <Icons.Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPieces((prev) => {
                              const n = [...prev];
                              n[idx] = { img: null, zoom: 1, panX: 0, panY: 0, baseScale: 1 };
                              return n;
                            });
                          }}
                          className="text-rose-400 hover:text-rose-300 bg-slate-950/60 p-1.5 rounded-lg hover:bg-slate-950 transition-colors border border-slate-850"
                        >
                          <Icons.Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* PERSISTENT BULK RENAME OVERLAY */}
        <div id="bulk-rename-overlay" className="absolute bottom-6 right-6 z-40 w-80 bg-slate-900/95 backdrop-blur-md border border-indigo-500/40 rounded-2xl p-4 shadow-2xl transition-all duration-300 text-white">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                <Icons.Tag className="w-4 h-4 text-indigo-400" />
              </div>
              <div>
                <h4 className="text-xs font-extrabold tracking-tight text-white uppercase">Bulk Renamer Overlay</h4>
                <p className="text-[9px] text-slate-400 font-medium">Format: [Prefix][Separator][Counter].[Ext]</p>
              </div>
            </div>
            <button
              id="toggle-renamer-btn"
              type="button"
              onClick={() => setIsRenamerOpen(!isRenamerOpen)}
              className="text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              {isRenamerOpen ? <Icons.ChevronDown className="w-4 h-4" /> : <Icons.ChevronUp className="w-4 h-4" />}
            </button>
          </div>

          {isRenamerOpen ? (
            <div className="space-y-3 text-[11px] animate-in fade-in duration-200">
              {/* Custom Prefix */}
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider block">Custom Prefix</label>
                <div className="relative">
                  <input
                    id="rename-prefix-input"
                    type="text"
                    value={renamePrefix}
                    onChange={(e) => setRenamePrefix(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
                    placeholder="e.g. Product"
                    className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-indigo-500 rounded-xl px-3 py-2 text-[11px] text-white font-bold outline-none font-mono transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {/* Separator Select */}
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider block">Separator</label>
                  <select
                    id="rename-separator-select"
                    value={renameSeparator}
                    onChange={(e) => setRenameSeparator(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 text-white rounded-xl px-2 py-2 text-[11px] font-bold outline-none font-mono"
                  >
                    <option value="-">- (Dash)</option>
                    <option value="_">_ (Underscore)</option>
                    <option value="">None</option>
                  </select>
                </div>

                {/* Starting Number */}
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider block">Start Counter</label>
                  <input
                    id="rename-start-counter-input"
                    type="number"
                    min="1"
                    value={renameStartCounter}
                    onChange={(e) => setRenameStartCounter(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 text-white rounded-xl px-2.5 py-1.5 text-[11px] font-bold outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {/* Digit Padding */}
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider block">Padding Format</label>
                  <select
                    id="rename-padding-select"
                    value={renamePadding}
                    onChange={(e) => setRenamePadding(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 text-white rounded-xl px-2 py-2 text-[11px] font-bold outline-none font-mono"
                  >
                    <option value="1">1 (e.g. 1, 2)</option>
                    <option value="2">01 (e.g. 01, 02)</option>
                    <option value="3">001 (e.g. 001)</option>
                  </select>
                </div>

                {/* File Format */}
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider block">Extension</label>
                  <select
                    id="rename-extension-select"
                    value={renameExtension}
                    onChange={(e) => setRenameExtension(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 text-white rounded-xl px-2 py-2 text-[11px] font-bold outline-none font-mono"
                  >
                    <option value=".jpg">.jpg (JPEG)</option>
                    <option value=".png">.png (PNG)</option>
                  </select>
                </div>
              </div>

              {/* Live Preview box */}
              <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-2.5 mt-2.5">
                <div className="flex justify-between text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  <span>Live Preview Nama File</span>
                  <span className="text-emerald-500 font-extrabold animate-pulse">● Aktif</span>
                </div>
                <div className="text-[10px] font-mono font-extrabold text-indigo-300 break-all select-all">
                  {getPieceFilename(0)}
                </div>
                <div className="text-[10px] font-mono text-slate-500 mt-1">
                  Panel berikutnya: {getPieceFilename(1)}
                </div>
              </div>

              {/* Rename Quick Actions */}
              <div className="pt-2 flex gap-2">
                <button
                  id="rename-download-zip-btn"
                  type="button"
                  onClick={() => handleDownloadZip(renamePrefix)}
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-[11px] transition-all flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/15 cursor-pointer"
                >
                  <Icons.Download className="w-3.5 h-3.5" />
                  <span>Download Slices ZIP</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="text-[9px] text-slate-400 font-mono flex items-center justify-between">
              <span>Aktif format:</span>
              <span className="font-bold text-indigo-400 font-mono">{renamePrefix}{renameSeparator}xx{renameExtension}</span>
            </div>
          )}
        </div>
      </div>

      {/* Rename File Output Popup Modal */}
      {renameModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[110] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-5 border-b border-slate-800 bg-slate-950/50 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Icons.Edit3 className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="font-extrabold text-sm text-white tracking-tight">Rename File & Folder Output</h3>
                  <p className="text-[10px] text-slate-400">Atur nama prefix untuk file hasil potong</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRenameModalOpen(false)}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors outline-none cursor-pointer"
              >
                <Icons.X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto scrollbar-thin">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block">Prefix Nama File</label>
                <div className="relative">
                  <input
                    type="text"
                    value={tempZipName}
                    onChange={(e) => setTempZipName(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
                    placeholder="Masukkan prefix nama..."
                    className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-xs text-white font-bold outline-none font-mono transition-all pr-10"
                    autoFocus
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-[9px] font-bold">
                    PNG
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  *Karakter yang diperbolehkan hanya huruf, angka, garis bawah (_), dan tanda hubung (-).
                </p>
              </div>

              {/* Automatic Video Slideshow configuration (Slices & Batch) */}
              <div className="space-y-3 pt-3 border-t border-slate-800/80">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={includeVideoSlideshow}
                      onChange={(e) => setIncludeVideoSlideshow(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-800 bg-slate-950 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">
                      Otomatis Gabung Video Slideshow ke ZIP
                    </span>
                  </label>
                </div>
                
                {includeVideoSlideshow && (
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-end text-[10px] text-slate-400">
                      <div>
                        <p className="font-bold text-slate-300">Pilih panel foto untuk dijadikan video slideshow:</p>
                        <p className="text-[9px] text-slate-500 mt-0.5">Urutan video akan mengikuti urutan pemilihan panel</p>
                      </div>
                      <span className="font-bold text-indigo-400 font-mono shrink-0">
                        ({videoSelectedPanelKeys.length} Terpilih)
                      </span>
                    </div>

                    {/* Quick Selection Actions */}
                    <div className="flex gap-2 text-[9px] font-bold">
                      <button
                        type="button"
                        onClick={() => {
                          const allKeys = getAvailablePanelsForVideo().map(p => p.key);
                          setVideoSelectedPanelKeys(allKeys);
                        }}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors cursor-pointer"
                      >
                        Pilih Semua
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setVideoSelectedPanelKeys([]);
                        }}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors cursor-pointer"
                      >
                        Hapus Semua
                      </button>
                    </div>

                    {/* Scrollable Visual Slices Selection Grid */}
                    <div className="max-h-[220px] overflow-y-auto border border-slate-800 bg-slate-950/50 rounded-2xl p-3 scrollbar-thin">
                      <div className="grid grid-cols-3 gap-2">
                        {getAvailablePanelsForVideo().map((p) => {
                          const isSelected = videoSelectedPanelKeys.includes(p.key);
                          const colCount = cols;
                          const rowCount = rows;
                          // CSS Background-Image technique to render exact slice preview perfectly
                          const bgSizeStyle = `${colCount * 100}% ${rowCount * 100}%`;
                          const bgPosXStyle = colCount > 1 ? `${(p.colIdx / (colCount - 1)) * 100}%` : '50%';
                          const bgPosYStyle = rowCount > 1 ? `${(p.rowIdx / (rowCount - 1)) * 100}%` : '50%';

                          return (
                            <div
                              key={p.key}
                              onClick={() => {
                                setVideoSelectedPanelKeys(prev => {
                                  if (prev.includes(p.key)) {
                                    return prev.filter(k => k !== p.key);
                                  } else {
                                    return [...prev, p.key];
                                  }
                                });
                              }}
                              className={`relative group rounded-xl border p-1 flex flex-col items-center gap-1.5 transition-all duration-200 cursor-pointer select-none ${
                                isSelected 
                                  ? 'bg-indigo-950/30 border-indigo-500 text-white ring-1 ring-indigo-500/50' 
                                  : 'bg-slate-900/40 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:bg-slate-900/70'
                              }`}
                            >
                              {/* Slices representation using the background image trick */}
                              <div 
                                className="w-12 h-12 rounded-lg border border-slate-800 bg-no-repeat overflow-hidden shadow-inner shrink-0"
                                style={{
                                  backgroundImage: `url(${p.imgSrc})`,
                                  backgroundSize: bgSizeStyle,
                                  backgroundPosition: `${bgPosXStyle} ${bgPosYStyle}`
                                }}
                              />
                              <div className="min-w-0 flex flex-col items-center w-full">
                                <p className="text-[9px] font-bold truncate max-w-full text-center tracking-tight leading-none" title={p.label}>
                                  {p.label}
                                </p>
                              </div>

                              {/* Selection overlay indicator */}
                              <div className={`absolute top-1 right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center border transition-all ${
                                isSelected 
                                  ? 'bg-indigo-600 border-indigo-500 text-white' 
                                  : 'border-slate-800 bg-slate-950 text-transparent'
                              }`}>
                                {isSelected && <Icons.Check className="w-2.5 h-2.5 stroke-[3]" />}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Max File Size Constraints Checker & Indicator */}
                    <div className="flex items-center justify-between p-2.5 bg-slate-950/80 rounded-xl border border-slate-850 text-[10px]">
                      <div className="flex items-center gap-2">
                        <Icons.HardDrive className={`w-3.5 h-3.5 ${videoSelectedPanelKeys.length * 0.15 > 30 ? 'text-rose-500 animate-pulse' : (videoSelectedPanelKeys.length * 0.15 > 20 ? 'text-amber-500' : 'text-slate-400')}`} />
                        <span className="text-slate-400 font-bold">Estimasi Ukuran:</span>
                      </div>
                      <div className="font-mono text-right font-black">
                        <span className={videoSelectedPanelKeys.length * 0.15 > 30 ? 'text-rose-500 font-extrabold' : (videoSelectedPanelKeys.length * 0.15 > 20 ? 'text-amber-500 font-extrabold' : 'text-indigo-400')}>
                          {(videoSelectedPanelKeys.length * 0.15).toFixed(2)} MB
                        </span>
                        <span className="text-slate-500"> / 30.00 MB</span>
                      </div>
                    </div>
                    {videoSelectedPanelKeys.length * 0.15 > 30 && (
                      <p className="text-[9px] text-rose-500 font-bold leading-relaxed bg-rose-950/20 p-2 rounded-lg border border-rose-900/30">
                        ⚠️ Ukuran video diperkirakan melebihi 30MB! Silakan batalkan beberapa panel untuk menjaga kualitas dan kompresi tetap optimal.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Dynamic preview of generated file names */}
              <div className="bg-slate-950/60 border border-slate-850 rounded-2xl p-4 space-y-3">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Skema Preview Hasil Nama File</span>
                
                <div className="space-y-2 text-[10px] font-mono leading-relaxed">
                  <div className="flex justify-between border-b border-slate-850/40 pb-1.5">
                    <span className="text-slate-500">Folder ZIP:</span>
                    <span className="text-indigo-300 font-bold">{tempZipName || 'MarketBoost_Grid'}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-850/40 pb-1.5">
                    <span className="text-slate-500">Nama File ZIP:</span>
                    <span className="text-indigo-400 font-bold truncate max-w-[200px]" title={`${tempZipName || 'MarketBoost_Grid'}_${cols}x${rows}.zip`}>
                      {tempZipName || 'MarketBoost_Grid'}_{cols}x{rows}.zip
                    </span>
                  </div>
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-slate-500 shrink-0">Nama Gambar Slice:</span>
                    <div className="text-right text-emerald-400 font-bold break-all">
                      {renameModalType === 'batch' ? (
                        <>
                          {tempZipName || 'Panel'}-1.png, {tempZipName || 'Panel'}-2.png, ...
                          <div className="text-[9px] text-slate-500 font-normal mt-0.5">Slicing {masterImages.length} file sekaligus (Total {masterImages.length * cols * rows} panel)</div>
                          {includeVideoSlideshow && videoSelectedPanelKeys.length > 0 && (
                            <div className="text-[9px] text-indigo-400 font-normal mt-1.5">
                              + Video Slideshow ({videoSelectedPanelKeys.length} slides)
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          {tempZipName || 'Panel'}-1.png, {tempZipName || 'Panel'}-2.png, ...
                          <div className="text-[9px] text-slate-500 font-normal mt-0.5">Slicing canvas grid aktif ({cols * rows} panel)</div>
                          {includeVideoSlideshow && videoSelectedPanelKeys.length > 0 && (
                            <div className="text-[9px] text-indigo-400 font-normal mt-1.5">
                              + Video Slideshow ({videoSelectedPanelKeys.length} slides)
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/40 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRenameModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  const finalName = tempZipName.trim() || 'MarketBoost_Grid';
                  setCustomZipName(finalName);
                  setRenameModalOpen(false);
                  if (renameModalType === 'batch') {
                    handleBatchCutAllToZip(finalName);
                  } else {
                    handleDownloadZip(finalName);
                  }
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-indigo-600/15 cursor-pointer"
              >
                <Icons.Check className="w-3.5 h-3.5" />
                <span>Mulai Potong & Download</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Lightbox Modal */}
      {previewImage && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-[120] flex flex-col items-center justify-center p-4">
          {/* Top Actions bar */}
          <div className="w-full max-w-4xl flex justify-between items-center mb-4 text-white">
            <div className="flex items-center gap-2">
              <Icons.Image className="w-5 h-5 text-indigo-400" />
              <div>
                <h3 className="font-extrabold text-sm text-white tracking-tight">{previewImage.name}</h3>
                <p className="text-[10px] text-slate-400 font-mono">{previewImage.dimensions}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full text-white transition-all cursor-pointer shadow-lg hover:scale-105"
              title="Tutup Pratinjau"
            >
              <Icons.X className="w-5 h-5" />
            </button>
          </div>

          {/* Main Image View */}
          <div className="relative max-w-4xl max-h-[75vh] bg-slate-900 border border-slate-800 rounded-3xl p-2 overflow-hidden flex items-center justify-center shadow-2xl group">
            <img
              src={previewImage.src}
              className="max-w-full max-h-[70vh] object-contain rounded-2xl select-none"
              alt={previewImage.name}
            />
          </div>

          {/* Bottom Info bar / Navigation */}
          <div className="mt-4 flex items-center gap-4 bg-slate-900/80 border border-slate-800/80 px-4 py-2 rounded-2xl shadow-xl">
            <button
              type="button"
              disabled={masterImages.findIndex(m => m.id === previewImage.id) === 0}
              onClick={() => {
                const currentIdx = masterImages.findIndex(m => m.id === previewImage.id);
                if (currentIdx > 0) {
                  setPreviewImage(masterImages[currentIdx - 1]);
                }
              }}
              className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 rounded-xl text-white transition-all cursor-pointer shadow-md disabled:cursor-not-allowed"
              title="Gambar Sebelumnya"
            >
              <Icons.ChevronLeft className="w-5 h-5" />
            </button>

            <span className="text-xs text-slate-400 font-bold font-mono">
              {masterImages.findIndex(m => m.id === previewImage.id) + 1} / {masterImages.length}
            </span>

            <button
              type="button"
              disabled={masterImages.findIndex(m => m.id === previewImage.id) === masterImages.length - 1}
              onClick={() => {
                const currentIdx = masterImages.findIndex(m => m.id === previewImage.id);
                if (currentIdx < masterImages.length - 1) {
                  setPreviewImage(masterImages[currentIdx + 1]);
                }
              }}
              className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 rounded-xl text-white transition-all cursor-pointer shadow-md disabled:cursor-not-allowed"
              title="Gambar Selanjutnya"
            >
              <Icons.ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Full-Screen Preview Mode Modal */}
      {previewModalOpen && (
        <div className="fixed inset-0 bg-slate-950/98 backdrop-blur-xl z-[130] flex flex-col lg:flex-row text-white overflow-hidden animate-in fade-in duration-200">
          
          {/* LEFT SIDE PANEL: Controls, Metadata and Download Actions */}
          <div className="w-full lg:w-[420px] bg-slate-900 border-b lg:border-b-0 lg:border-r border-slate-800 flex flex-col h-[45vh] lg:h-full shrink-0 overflow-y-auto">
            {/* Header */}
            <div className="p-6 border-b border-slate-800 bg-slate-950/30 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center border border-emerald-500/20 shadow-inner">
                  <Icons.Eye className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm tracking-tight text-white uppercase">Preview Mode</h3>
                  <p className="text-[10px] font-mono text-slate-400">Komposisi Kolase Akhir {cols}x{rows}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewModalOpen(false)}
                className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-all cursor-pointer hover:scale-105"
                title="Tutup Pratinjau"
              >
                <Icons.X className="w-5 h-5" />
              </button>
            </div>

            {/* Controls */}
            <div className="p-6 space-y-6 flex-1">
              {/* Layout Info */}
              <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-4 space-y-2.5">
                <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider block font-mono">Spesifikasi Output</span>
                <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                  <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/50">
                    <span className="text-[9px] text-slate-500 block">Formasi Potong</span>
                    <span className="font-bold text-white text-xs">{cols} Kolom × {rows} Baris</span>
                  </div>
                  <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/50">
                    <span className="text-[9px] text-slate-500 block">Total File</span>
                    <span className="font-bold text-white text-xs">{cols * rows} Potongan</span>
                  </div>
                </div>
              </div>

              {/* View/Display Settings */}
              <div className="space-y-4">
                <h4 className="text-xs font-extrabold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Icons.Sliders className="w-4 h-4 text-emerald-400" /> Opsi Tampilan Pratinjau
                </h4>

                {/* Seamless mode */}
                <div className="flex items-center justify-between bg-slate-950/40 p-3 rounded-xl border border-slate-800/60">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-200 block">Tampilan Seamless (Tanpa Jarak)</span>
                    <span className="text-[10px] text-slate-500 block">Lihat sebagai satu gambar utuh tanpa garis pembatas</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPreviewSeamlessMode(!previewSeamlessMode)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 outline-none ${
                      previewSeamlessMode ? 'bg-emerald-500' : 'bg-slate-800'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                        previewSeamlessMode ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Device simulated layout selector */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Mode Simulasi Gadget</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPreviewDeviceMock('none')}
                      className={`py-2 text-xs font-bold rounded-xl border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        previewDeviceMock === 'none'
                          ? 'bg-emerald-600 border-emerald-600 text-white shadow-md'
                          : 'bg-slate-850 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <Icons.Layout className="w-4 h-4" />
                      <span>Kolase Datar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewDeviceMock('mobile')}
                      className={`py-2 text-xs font-bold rounded-xl border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        previewDeviceMock === 'mobile'
                          ? 'bg-emerald-600 border-emerald-600 text-white shadow-md'
                          : 'bg-slate-850 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <Icons.Smartphone className="w-4 h-4" />
                      <span>Instagram Feed</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Downloads inside Modal */}
              <div className="space-y-3 pt-6 border-t border-slate-800/80">
                <h4 className="text-xs font-extrabold text-slate-300 uppercase tracking-wider">
                  Ekspor Hasil Sekarang
                </h4>
                
                <button
                  type="button"
                  onClick={() => {
                    setPreviewModalOpen(false);
                    openDownloadZipRenamePopup();
                  }}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-98 cursor-pointer"
                >
                  <Icons.Download className="w-4 h-4" />
                  <span>Download Semua Potongan (ZIP)</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewModalOpen(false);
                      handleDownloadCollage();
                    }}
                    className="py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
                  >
                    <Icons.Layout className="w-3.5 h-3.5" />
                    <span>Download Kolase</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPreviewModalOpen(false);
                      handleDownloadVideo();
                    }}
                    className="py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-md shadow-rose-600/15 cursor-pointer active:scale-98"
                  >
                    <Icons.Video className="w-3.5 h-3.5" />
                    <span>Buat Video</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Footer with branding */}
            <div className="p-4 border-t border-slate-800 text-center text-[10px] text-slate-500 font-mono shrink-0">
              MarketBoost Precision Grid Slicer • Preview Engine
            </div>
          </div>

          {/* RIGHT SIDE PANEL: Responsive Stage */}
          <div className="flex-1 bg-slate-950 flex flex-col items-center justify-center p-6 lg:p-12 overflow-y-auto relative">
            {/* Ambient Background decoration */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -z-10 pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -z-10 pointer-events-none" />

            {/* Stage Container */}
            <div className="w-full max-w-2xl flex justify-center items-center">
              {previewDeviceMock === 'mobile' ? (
                /* INSTAGRAM DEVICE SIMULATION */
                <div className="w-full max-w-[360px] bg-slate-900 border-[12px] border-slate-800 rounded-[48px] shadow-2xl overflow-hidden aspect-[9/19] flex flex-col border-b-[16px]">
                  {/* Speaker & camera notch */}
                  <div className="h-6 bg-slate-900 flex justify-center items-center shrink-0">
                    <div className="w-16 h-4 bg-slate-800 rounded-full flex items-center justify-end px-3">
                      <div className="w-2 h-2 bg-slate-950 rounded-full" />
                    </div>
                  </div>

                  {/* Mock Instagram Header */}
                  <div className="px-4 py-3 border-b border-slate-800 bg-slate-950 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-500 via-red-500 to-purple-600 p-0.5 shadow-sm">
                        <div className="w-full h-full bg-slate-900 rounded-full flex items-center justify-center text-[10px] font-black font-sans text-white">
                          IG
                        </div>
                      </div>
                      <div>
                        <span className="text-[11px] font-black tracking-tight text-white block">@{igUsername || 'username'}</span>
                        <span className="text-[9px] text-slate-500 block leading-none">Sponsored • {cols}x{rows} Collage Grid</span>
                      </div>
                    </div>
                    <button type="button" className="text-slate-400 hover:text-white transition-colors">
                      <Icons.X className="w-4 h-4 rotate-45" />
                    </button>
                  </div>

                  {/* Device Scrollable Body */}
                  <div className="flex-1 overflow-y-auto scrollbar-none bg-slate-950 flex flex-col">
                    {/* Simulated Stats bar */}
                    <div className="grid grid-cols-4 p-4 text-center border-b border-slate-900 shrink-0">
                      <div>
                        <span className="text-[12px] font-extrabold text-white block">12</span>
                        <span className="text-[8px] text-slate-500 block">Posts</span>
                      </div>
                      <div>
                        <span className="text-[12px] font-extrabold text-white block">4.8K</span>
                        <span className="text-[8px] text-slate-500 block">Followers</span>
                      </div>
                      <div>
                        <span className="text-[12px] font-extrabold text-white block">350</span>
                        <span className="text-[8px] text-slate-500 block">Following</span>
                      </div>
                      <div className="flex items-center justify-center">
                        <button type="button" className="bg-blue-600 text-[9px] font-extrabold text-white px-2 py-1 rounded">
                          Follow
                        </button>
                      </div>
                    </div>

                    {/* Collage Grid itself inside feed */}
                    <div className="p-2 flex-1 flex items-center justify-center">
                      <div 
                        className="grid w-full bg-slate-900 border border-slate-800/40 p-1 rounded-lg overflow-hidden"
                        style={{ 
                          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                          gap: previewSeamlessMode ? '0px' : '3px'
                        }}
                      >
                        {previewCanvasUrls.map((url, idx) => (
                          <div 
                            key={idx} 
                            className={`relative overflow-hidden bg-slate-900 aspect-square ${
                              gridAspectRatio === '3:4' ? 'aspect-[3/4]' : (gridAspectRatio === '9:16' ? 'aspect-[9/16]' : 'aspect-square')
                            }`}
                          >
                            {url ? (
                              <img src={url} alt={`Preview Slice ${idx}`} className="w-full h-full object-cover select-none" />
                            ) : (
                              <div className="w-full h-full border border-dashed border-slate-800 flex items-center justify-center text-slate-600 text-[9px] font-mono">
                                Slot {idx + 1}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Simulated likes/comments section to make it super cute and realistic */}
                    <div className="p-3 bg-slate-950/80 border-t border-slate-900 mt-auto shrink-0 text-left">
                      <div className="flex gap-2 text-slate-300 mb-1">
                        <Icons.Heart className="w-4 h-4 text-red-500 fill-red-500" />
                        <Icons.MessageCircle className="w-4 h-4" />
                        <Icons.Send className="w-4 h-4" />
                      </div>
                      <span className="text-[9px] text-slate-300 font-bold">Liked by 1,294 others</span>
                      <p className="text-[9px] text-slate-400 leading-snug mt-1">
                        <span className="font-extrabold text-white">@{igUsername || 'username'}</span> Look at this seamless grid sliced with MarketBoost. Absolute perfection!
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                /* FLAT COLLAGE PREVIEW */
                <div className="w-full flex flex-col items-center">
                  <div className="flex items-center gap-2 mb-4 bg-slate-900 px-4 py-1.5 rounded-full border border-slate-800/80">
                    <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-xs font-mono font-bold text-slate-300">Pratinjau Hasil Ekspor Potongan</span>
                  </div>

                  <div 
                    className="grid w-full bg-slate-900/60 p-4 rounded-3xl border border-slate-800/80 shadow-2xl"
                    style={{ 
                      gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                      gap: previewSeamlessMode ? '0px' : '8px'
                    }}
                  >
                    {previewCanvasUrls.map((url, idx) => (
                      <div 
                        key={idx} 
                        className={`relative overflow-hidden bg-slate-950 rounded-lg shadow-md border border-slate-800/40 ${
                          gridAspectRatio === '3:4' ? 'aspect-[3/4]' : (gridAspectRatio === '9:16' ? 'aspect-[9/16]' : 'aspect-square')
                        }`}
                      >
                        {url ? (
                          <img src={url} alt={`Preview Slice ${idx}`} className="w-full h-full object-cover select-none" />
                        ) : (
                          <div className="w-full h-full border-2 border-dashed border-slate-800/60 flex flex-col items-center justify-center text-slate-600 p-2 text-center">
                            <Icons.Image className="w-5 h-5 mb-1 opacity-20" />
                            <span className="text-[9px] font-mono font-bold uppercase tracking-wider block">Panel {idx + 1}</span>
                            <span className="text-[8px] text-slate-500 block mt-0.5">Kosong</span>
                          </div>
                        )}
                        
                        {/* Number Indicator in non-seamless mode to visualize sequence */}
                        {!previewSeamlessMode && (
                          <div className="absolute bottom-2 right-2 bg-slate-950/80 backdrop-blur-xs text-[9px] font-mono font-extrabold text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-500/30">
                            #{idx + 1}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <p className="text-[11px] text-slate-500 text-center max-w-md mt-4 leading-normal font-mono">
                    Urutan penomoran ekspor dimulai dari kiri ke kanan, dari baris atas ke bawah sesuai urutan indeks di atas.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
