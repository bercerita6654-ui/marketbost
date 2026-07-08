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
  const [draggedImgIdx, setDraggedImgIdx] = useState<number | null>(null);
  const [dragOverImgIdx, setDragOverImgIdx] = useState<number | null>(null);
  const [previewImage, setPreviewImage] = useState<MasterImage | null>(null);
  const [includeVideoSlideshow, setIncludeVideoSlideshow] = useState<boolean>(true);
  const [videoSelectedImageIds, setVideoSelectedImageIds] = useState<string[]>([]);

  // Grid Slices State
  const [pieces, setPieces] = useState<GridPiece[]>([]);

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

  // Redraw canvases when grid pieces change
  useEffect(() => {
    pieces.forEach((piece, idx) => {
      drawPieceCanvas(idx);
    });
    if (gridAspectRatio === '9:16') {
      drawPreviewCanvas();
    }
  }, [pieces, gridAspectRatio, logoCompany, logoBrand, igSticker, draggingSticker, igWhiteImg, igBlackImg]);

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

        newPieces.push({
          img: croppedImg,
          zoom: 1,
          panX: targetWidth / 2,
          panY: targetHeight / 2,
          baseScale: baseScale
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
    applyOverlays: boolean = true
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

    targetCtx.save();
    targetCtx.translate(targetWidth / 2, targetHeight / 2);
    targetCtx.scale(baseScale, baseScale);
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

    return targetCanvas.toDataURL('image/png', 0.9);
  };

  // Batch Crop All Uploaded Images to ZIP with Watermarks
  const handleBatchCutAllToZip = async (nameToUse: string = customZipName) => {
    if (masterImages.length === 0) {
      alert("Harap unggah minimal 1 Gambar Utama terlebih dahulu.");
      return;
    }

    onRecordingStart('Menyiapkan batch potong semua gambar...');

    try {
      const zip = new JSZip();
      const folder = zip.folder(nameToUse || "MarketBoost_Batch_Slices");

      let globalPanelIndex = 1;
      for (let imgIdx = 0; imgIdx < masterImages.length; imgIdx++) {
        const m = masterImages[imgIdx];
        
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const dataUrl = getPieceDataUrlForImage(m.img, c, r, true);
            if (dataUrl) {
              const base64Data = dataUrl.split(',')[1];
              const filename = `${nameToUse || 'Panel'}-${globalPanelIndex}.png`;
              folder?.file(filename, base64Data, { base64: true });
            }
            globalPanelIndex++;
          }
        }
      }

      const zipContent = await zip.generateAsync({ type: 'blob' });
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
    setVideoSelectedImageIds(masterImages.map(m => m.id));
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

      setPieces((prev) => {
        const next = [...prev];
        next[idx] = {
          img,
          zoom: 1,
          panX: targetWidth / 2,
          panY: targetHeight / 2,
          baseScale
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
  const getPieceDataUrl = (idx: number): string | null => {
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

    return canvas.toDataURL('image/png', 0.9);
  };

  // Unified Collage Image Generation
  const handleDownloadCollage = async () => {
    const hasImage = pieces.some((p) => p && p.img);
    if (!hasImage) {
      alert("Harap unggah minimal 1 gambar ke dalam slot grid.");
      return;
    }

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
  };

  // Download a single specific panel slice directly
  const handleDownloadSinglePiece = (idx: number) => {
    const url = getPieceDataUrl(idx);
    if (!url) {
      alert("Belum ada gambar di slot ini.");
      return;
    }
    const link = document.createElement('a');
    link.href = url;
    link.download = `${customZipName || 'Panel'}-${idx + 1}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ZIP Downloader for all Slices as single archive pack
  const handleDownloadZip = async (nameToUse: string = customZipName) => {
    const validPieces = pieces.map((p, idx) => ({ url: getPieceDataUrl(idx), idx })).filter((x) => x.url !== null);

    if (validPieces.length === 0) {
      alert("Harap unggah minimal 1 gambar ke dalam slot grid.");
      return;
    }

    const zip = new JSZip();
    const folder = zip.folder(nameToUse || "MarketBoost_Slices");

    for (const piece of validPieces) {
      if (piece.url) {
        // Strip data:image/png;base64,
        const base64Data = piece.url.split(',')[1];
        folder?.file(`${nameToUse || 'Panel'}-${piece.idx + 1}.png`, base64Data, { base64: true });
      }
    }

    const zipContent = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(zipContent);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${nameToUse || 'MarketBoost_Grid_Slices'}_${cols}x${rows}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const openDownloadZipRenamePopup = () => {
    const validPieces = pieces.map((p, idx) => ({ url: getPieceDataUrl(idx), idx })).filter((x) => x.url !== null);
    if (validPieces.length === 0) {
      alert("Harap unggah minimal 1 gambar ke dalam slot grid.");
      return;
    }
    setTempZipName(customZipName);
    setRenameModalType('slices');
    setRenameModalOpen(true);
  };

  // Video Slideshow Slides Video Generator
  const handleDownloadVideo = async (customImages?: string[]) => {
    const validImages = customImages || (pieces.map((p, idx) => getPieceDataUrl(idx)).filter((x) => x !== null) as string[]);

    if (validImages.length === 0) {
      alert("Harap unggah minimal 1 gambar ke dalam slot grid.");
      return;
    }

    onRecordingStart('Merekam Slideshow Video...');

    try {
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

      let startTime: number | null = null;

      const drawFrame = (timestamp: number) => {
        if (!startTime) startTime = timestamp;
        const elapsed = timestamp - startTime;

        const progressPct = Math.min(100, Math.floor((elapsed / (totalDuration + 200)) * 100));
        onRecordingProgress(progressPct);

        if (elapsed >= totalDuration + 200) {
          recorder.stop();
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
          // Ease-in-out progress
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

        requestAnimationFrame(drawFrame);
      };

      requestAnimationFrame(drawFrame);

      const blob = await recordingPromise;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Slideshow_${Math.floor(10000 + Math.random() * 90000)}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch (error) {
      console.error("Gagal membuat video:", error);
      alert("Terjadi kesalahan saat memproses video. Browser sandbox Anda mungkin membatasi captureStream atau MediaRecorder.");
    } finally {
      onRecordingEnd();
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden h-full w-full bg-slate-900 text-slate-200">
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

              {/* Automatic Video Slideshow configuration (only for batch mode) */}
              {renameModalType === 'batch' && (
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
                        Otomatis Buat & Download Video Slideshow
                      </span>
                    </label>
                  </div>
                  
                  {includeVideoSlideshow && (
                    <div className="space-y-2">
                      <span className="text-[10px] text-slate-400 block leading-relaxed">
                        Pilih gambar utama yang ingin dimasukkan ke dalam video slideshow:
                      </span>
                      <div className="max-h-[160px] overflow-y-auto border border-slate-800 bg-slate-950/40 rounded-2xl p-2 space-y-1.5 scrollbar-thin">
                        {masterImages.map((m) => {
                          const isSelected = videoSelectedImageIds.includes(m.id);
                          return (
                            <div
                              key={m.id}
                              onClick={() => {
                                setVideoSelectedImageIds(prev => 
                                  prev.includes(m.id) 
                                    ? prev.filter(id => id !== m.id) 
                                    : [...prev, m.id]
                                );
                              }}
                              className={`flex items-center gap-3 p-2 rounded-xl border transition-all cursor-pointer ${
                                isSelected 
                                  ? 'bg-indigo-950/20 border-indigo-800/40 text-white' 
                                  : 'bg-transparent border-slate-850 text-slate-400 hover:border-slate-800 hover:text-slate-300'
                              }`}
                            >
                              <div className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${
                                isSelected 
                                  ? 'bg-indigo-600 border-indigo-500 text-white' 
                                  : 'border-slate-700 bg-slate-950 text-transparent'
                              }`}>
                                {isSelected && <Icons.Check className="w-2.5 h-2.5 stroke-[3]" />}
                              </div>
                              <img src={m.src} className="w-8 h-8 object-cover rounded-lg border border-slate-800" alt="" />
                              <div className="min-w-0 flex-1">
                                <p className="text-[10px] font-bold truncate">{m.name}</p>
                                <p className="text-[9px] text-slate-500 font-mono">{m.dimensions}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

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
                          {includeVideoSlideshow && videoSelectedImageIds.length > 0 && (
                            <div className="text-[9px] text-indigo-400 font-normal mt-1.5">
                              + Video Slideshow ({videoSelectedImageIds.length * cols * rows} slides)
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          {tempZipName || 'Panel'}-1.png, {tempZipName || 'Panel'}-2.png, ...
                          <div className="text-[9px] text-slate-500 font-normal mt-0.5">Slicing canvas grid aktif ({cols * rows} panel)</div>
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
                    handleBatchCutAllToZip(finalName).then(() => {
                      if (includeVideoSlideshow && videoSelectedImageIds.length > 0) {
                        const selectedMasters = masterImages.filter(m => videoSelectedImageIds.includes(m.id));
                        const videoSlices: string[] = [];
                        selectedMasters.forEach(m => {
                          for (let r = 0; r < rows; r++) {
                            for (let c = 0; c < cols; c++) {
                              const dataUrl = getPieceDataUrlForImage(m.img, c, r, true);
                              if (dataUrl) {
                                videoSlices.push(dataUrl);
                              }
                            }
                          }
                        });

                        if (videoSlices.length > 0) {
                          setTimeout(() => {
                            handleDownloadVideo(videoSlices);
                          }, 1000);
                        }
                      }
                    });
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
    </div>
  );
};
