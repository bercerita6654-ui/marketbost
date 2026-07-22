import React, { useState, useEffect } from 'react';
import { ActiveTab, CopiedPrompt } from './types';
import { CSV_COMPANY_URL, CSV_BRAND_URL } from './data';
import { fetchCSVDatabase, copyToClipboard } from './utils';
import { VisualPanel } from './components/VisualPanel';
import { CaptionPanel } from './components/CaptionPanel';
import { SeoPanel } from './components/SeoPanel';
import { GridPanel } from './components/GridPanel';
import * as Icons from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('visual');
  const [productName, setProductName] = useState<string>(() => {
    try {
      return localStorage.getItem('marketboost_autosave_productName') || 'this product';
    } catch {
      return 'this product';
    }
  });
  
  // Shared Keywords state
  const [keywords, setKeywords] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('marketboost_autosave_keywords');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Recent copies state for cross-session tracking
  const [recentCopies, setRecentCopies] = useState<CopiedPrompt[]>([]);
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Generated results
  const [visualPrompt, setVisualPrompt] = useState<string>(() => {
    try {
      return localStorage.getItem('marketboost_autosave_visual') || '';
    } catch {
      return '';
    }
  });
  const [captionPrompt, setCaptionPrompt] = useState<string>(() => {
    try {
      return localStorage.getItem('marketboost_autosave_caption') || '';
    } catch {
      return '';
    }
  });
  const [seoPrompt, setSeoPrompt] = useState<string>(() => {
    try {
      return localStorage.getItem('marketboost_autosave_seo') || '';
    } catch {
      return '';
    }
  });

  // Auto-save prompts, product name, and keywords on change
  useEffect(() => {
    try {
      localStorage.setItem('marketboost_autosave_productName', productName);
    } catch (e) {
      console.error('Failed to auto-save product name', e);
    }
  }, [productName]);

  useEffect(() => {
    try {
      localStorage.setItem('marketboost_autosave_keywords', JSON.stringify(keywords));
    } catch (e) {
      console.error('Failed to auto-save keywords', e);
    }
  }, [keywords]);

  useEffect(() => {
    try {
      localStorage.setItem('marketboost_autosave_visual', visualPrompt);
    } catch (e) {
      console.error('Failed to auto-save visual prompt', e);
    }
  }, [visualPrompt]);

  useEffect(() => {
    try {
      localStorage.setItem('marketboost_autosave_caption', captionPrompt);
    } catch (e) {
      console.error('Failed to auto-save caption prompt', e);
    }
  }, [captionPrompt]);

  useEffect(() => {
    try {
      localStorage.setItem('marketboost_autosave_seo', seoPrompt);
    } catch (e) {
      console.error('Failed to auto-save seo prompt', e);
    }
  }, [seoPrompt]);

  // Loading/Video Recording overlay
  const [recordingStatus, setRecordingStatus] = useState<string | null>(null);
  const [recordingProgress, setRecordingProgress] = useState<number>(0);

  // Logo Databases fetched from Google Sheets CSVs
  const [companyLogos, setCompanyLogos] = useState<{ name: string; url: string }[]>([]);
  const [brandLogos, setBrandLogos] = useState<{ name: string; url: string }[]>([]);

  // Clipboard Copied confirmation states
  const [visualCopied, setVisualCopied] = useState(false);
  const [captionCopied, setCaptionCopied] = useState(false);
  const [seoCopied, setSeoCopied] = useState(false);

  // Time & Latency indicators for Terminal Style
  const [systemTime, setSystemTime] = useState('');
  const [serverLatency] = useState('14ms');

  // Load spreadsheet data at start
  useEffect(() => {
    const loadDatabases = async () => {
      const companies = await fetchCSVDatabase(CSV_COMPANY_URL);
      if (companies && companies.length > 0) {
        setCompanyLogos(companies);
      } else {
        // Safe fallbacks in case of proxy / cors blocks
        setCompanyLogos([
          { name: 'GlobalMart ID', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&h=100&fit=crop' },
          { name: 'IndoRetail Logo', url: 'https://images.unsplash.com/photo-1599305445671-ac291c95aba9?w=100&h=100&fit=crop' },
          { name: 'Star E-Commerce', url: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=100&h=100&fit=crop' }
        ]);
      }

      const brands = await fetchCSVDatabase(CSV_BRAND_URL);
      if (brands && brands.length > 0) {
        setBrandLogos(brands);
      } else {
        // Safe fallbacks
        setBrandLogos([
          { name: 'Erigo Active', url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=100&h=100&fit=crop' },
          { name: 'Eiger Outdoors', url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=100&h=100&fit=crop' },
          { name: 'Aerostreet Premium', url: 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=100&h=100&fit=crop' }
        ]);
      }
    };

    loadDatabases();

    // System Time ticker
    const timer = setInterval(() => {
      const now = new Date();
      setSystemTime(now.toUTCString().replace('GMT', 'UTC'));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Shared keyword sync modifiers
  const handleAddKeyword = (kw: string) => {
    if (keywords.length < 5 && !keywords.includes(kw)) {
      setKeywords([...keywords, kw]);
    }
  };

  const handleRemoveKeyword = (idx: number) => {
    setKeywords(keywords.filter((_, i) => i !== idx));
  };

  // Load recent copies on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('marketboost_recent_copies');
      if (stored) {
        setRecentCopies(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load recent copies', e);
    }
  }, []);

  const saveRecentCopies = (items: CopiedPrompt[]) => {
    setRecentCopies(items);
    try {
      localStorage.setItem('marketboost_recent_copies', JSON.stringify(items));
    } catch (e) {
      console.error('Failed to save recent copies', e);
    }
  };

  // Copy helper
  const handleCopyText = async (text: string, type: 'visual' | 'caption' | 'seo') => {
    const success = await copyToClipboard(text);
    if (success) {
      const newItem: CopiedPrompt = {
        id: Math.random().toString(36).substring(2, 9),
        text,
        type,
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      };
      
      // Filter out existing exact duplicates to keep unique recent copies, and keep at most 3
      const filtered = recentCopies.filter(item => item.text.trim() !== text.trim());
      const updated = [newItem, ...filtered].slice(0, 3);
      saveRecentCopies(updated);

      if (type === 'visual') {
        setVisualCopied(true);
        setTimeout(() => setVisualCopied(false), 2000);
      } else if (type === 'caption') {
        setCaptionCopied(true);
        setTimeout(() => setCaptionCopied(false), 2000);
      } else if (type === 'seo') {
        setSeoCopied(true);
        setTimeout(() => setSeoCopied(false), 2000);
      }
    }
  };

  const handleCopyFromHistory = async (text: string, id: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    }
  };

  const handleDeleteHistoryItem = (id: string) => {
    const updated = recentCopies.filter(item => item.id !== id);
    saveRecentCopies(updated);
  };

  return (
    <div className="flex flex-col h-screen bg-[#f0f1f3] text-[#1a1a1b] font-sans overflow-hidden select-none">
      
      {/* High-density top bar */}
      <header className="h-12 bg-[#1e2329] border-b border-gray-800 flex items-center justify-between px-4 text-white shrink-0">
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-1.5 rounded flex items-center justify-center shadow-md">
            <Icons.Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-tight text-white flex items-center gap-1.5">
              MARKETBOOST <span className="text-blue-400 font-medium text-xs">AI Workspace</span>
            </h1>
            <p className="text-[10px] text-gray-400 -mt-0.5 hidden sm:block">Integrated Sales Booster Terminal</p>
          </div>
          <div className="h-4 w-[1px] bg-gray-700 hidden sm:block" />
          <span className="text-[10px] text-gray-400 font-mono hidden sm:block">STATION: MB-PRO-IND-42</span>
        </div>

        {/* User metrics or current status */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setHistoryDrawerOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-bold transition-all outline-none border border-slate-700/60 cursor-pointer"
            title="Lihat riwayat salinan"
          >
            <Icons.ClipboardList className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden md:inline text-[11px]">Recent Copies</span>
            {recentCopies.length > 0 && (
              <span className="bg-rose-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-extrabold leading-none">
                {recentCopies.length}
              </span>
            )}
          </button>

          <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1 bg-emerald-950/50 px-2 py-1 rounded border border-emerald-900/50">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            ENGINE_STABLE
          </span>
          <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-[10px] text-white font-bold uppercase shadow-sm">
            AI
          </div>
        </div>
      </header>

      {/* Main interface: left navigation rail + dashboard body */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Navigation Rail (Dark mode, High Density Style) */}
        <nav className="w-14 bg-[#1e2329] flex flex-col items-center py-4 gap-4 border-r border-gray-800 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('visual')}
            title="Visual AI Prompt"
            className={`p-2.5 rounded transition-all cursor-pointer outline-none relative group ${
              activeTab === 'visual' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25' : 'text-gray-400 hover:text-white hover:bg-gray-800/40'
            }`}
          >
            <Icons.Image className="w-5 h-5" />
            <div className="absolute left-16 top-1/2 -translate-y-1/2 bg-slate-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 shadow-md">
              Visual AI
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('caption')}
            title="Caption Sosmed"
            className={`p-2.5 rounded transition-all cursor-pointer outline-none relative group ${
              activeTab === 'caption' ? 'bg-pink-600 text-white shadow-lg shadow-pink-500/25' : 'text-gray-400 hover:text-white hover:bg-gray-800/40'
            }`}
          >
            <Icons.MessageSquare className="w-5 h-5" />
            <div className="absolute left-16 top-1/2 -translate-y-1/2 bg-slate-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 shadow-md">
              Caption Generator
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('seo')}
            title="SEO Copywriting"
            className={`p-2.5 rounded transition-all cursor-pointer outline-none relative group ${
              activeTab === 'seo' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/25' : 'text-gray-400 hover:text-white hover:bg-gray-800/40'
            }`}
          >
            <Icons.ShoppingBag className="w-5 h-5" />
            <div className="absolute left-16 top-1/2 -translate-y-1/2 bg-slate-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 shadow-md">
              SEO Copywriter
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('grid')}
            title="Grid Collage Maker"
            className={`p-2.5 rounded transition-all cursor-pointer outline-none relative group ${
              activeTab === 'grid' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25' : 'text-gray-400 hover:text-white hover:bg-gray-800/40'
            }`}
          >
            <Icons.LayoutGrid className="w-5 h-5" />
            <div className="absolute left-16 top-1/2 -translate-y-1/2 bg-slate-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 shadow-md">
              Grid Collage Maker
            </div>
          </button>

          <div className="mt-auto p-2 text-gray-500 hover:text-gray-300 cursor-pointer">
            <Icons.Settings className="w-5 h-5" />
          </div>
        </nav>

        {/* Dynamic Workspace Container */}
        <div className="flex-1 flex flex-col overflow-hidden">
          
          {/* Quick Metrics Statistics Row */}
          <div className="grid grid-cols-4 gap-[1px] bg-gray-300 border-b border-gray-300 shrink-0">
            <div className="bg-white p-2.5 px-4 flex flex-col">
              <span className="text-[9px] uppercase font-bold text-gray-400 tracking-wider">Active Workspace Tab</span>
              <span className="text-xs font-bold text-gray-900 flex items-center gap-1 mt-0.5">
                <span className={`w-1.5 h-1.5 rounded-full ${
                  activeTab === 'visual' ? 'bg-blue-500' : activeTab === 'caption' ? 'bg-pink-500' : activeTab === 'seo' ? 'bg-emerald-500' : 'bg-indigo-500'
                }`} />
                {activeTab.toUpperCase()} ENGINE
              </span>
            </div>

            <div className="bg-white p-2.5 px-4 flex flex-col">
              <span className="text-[9px] uppercase font-bold text-gray-400 tracking-wider">Sync Keywords (Max 5)</span>
              <span className="text-xs font-bold text-gray-900 mt-0.5 font-mono">{keywords.length} OF 5</span>
            </div>

            <div className="bg-white p-2.5 px-4 flex flex-col">
              <span className="text-[9px] uppercase font-bold text-gray-400 tracking-wider">Target Products Loaded</span>
              <span className="text-xs font-bold text-gray-900 mt-0.5 truncate">{productName.trim() ? productName : 'NONE (PENDING_INPUT)'}</span>
            </div>

            <div className="bg-white p-2.5 px-4 flex flex-col">
              <span className="text-[9px] uppercase font-bold text-gray-400 tracking-wider">Active Databases</span>
              <span className="text-xs font-bold text-emerald-600 mt-0.5 font-mono">OK ({companyLogos.length + brandLogos.length} ITEMS)</span>
            </div>
          </div>

          {/* Two-column master grid */}
          <div className="flex-1 flex overflow-hidden relative">
            
            {activeTab === 'grid' ? (
              <GridPanel
                companyLogos={companyLogos}
                brandLogos={brandLogos}
                onRecordingStart={(msg) => setRecordingStatus(msg)}
                onRecordingEnd={() => setRecordingStatus(null)}
                onRecordingProgress={(pct) => setRecordingProgress(pct)}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
              />
            ) : (
              <>
                {/* PANEL KIRI: Controls & Form */}
                <aside className="w-[320px] bg-white border-r border-gray-200 flex flex-col overflow-y-auto shrink-0 p-4 space-y-4">
              
              {/* Product Global Identifier input */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1.5 shadow-2xs">
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <div className="flex items-center gap-1">
                    <Icons.Package className="w-3.5 h-3.5 text-blue-500" />
                    <span>Nama Utama Produk</span>
                  </div>
                  <span className="text-[9px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md flex items-center gap-1 font-bold font-sans tracking-normal normal-case">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                    Auto-Draft
                  </span>
                </div>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="Contoh: Sepatu sneakers putih pria"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-xs font-semibold text-slate-800 shadow-3xs"
                />
              </div>

              {/* Dynamic Sub-form panel rendering depending on currently active left rail tab */}
              <div className="flex-1">
                {activeTab === 'visual' && (
                  <VisualPanel
                    productName={productName}
                    onGenerate={setVisualPrompt}
                  />
                )}
                {activeTab === 'caption' && (
                  <CaptionPanel
                    productName={productName}
                    keywords={keywords}
                    onAddKeyword={handleAddKeyword}
                    onRemoveKeyword={handleRemoveKeyword}
                    onGenerate={setCaptionPrompt}
                  />
                )}
                {activeTab === 'seo' && (
                  <SeoPanel
                    productName={productName}
                    keywords={keywords}
                    onAddKeyword={handleAddKeyword}
                    onRemoveKeyword={handleRemoveKeyword}
                    onGenerate={setSeoPrompt}
                  />
                )}
              </div>
            </aside>

            {/* PANEL KANAN: Real-time Snapshot Outputs / Workspace Result */}
            <main className="flex-1 bg-slate-900 flex flex-col text-white p-5 overflow-y-auto relative min-w-[300px]">
              
              {/* Output Tab-Headers for easy viewing */}
              <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('visual')}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all outline-none ${
                      activeTab === 'visual' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/35' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Icons.Image className="w-3.5 h-3.5" />
                    <span>Visual Prompt</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('caption')}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all outline-none ${
                      activeTab === 'caption' ? 'bg-pink-500/20 text-pink-400 border border-pink-500/35' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Icons.MessageSquare className="w-3.5 h-3.5" />
                    <span>Caption Prompt</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('seo')}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all outline-none ${
                      activeTab === 'seo' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/35' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Icons.ShoppingBag className="w-3.5 h-3.5" />
                    <span>SEO Prompt</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('grid')}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all outline-none ${
                      activeTab === 'grid' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/35' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Icons.LayoutGrid className="w-3.5 h-3.5" />
                    <span>Grid Output</span>
                  </button>
                </div>

                {/* Instant copy button mapped based on active workspace tab */}
                {activeTab === 'visual' && visualPrompt && (
                  <button
                    type="button"
                    onClick={() => handleCopyText(visualPrompt, 'visual')}
                    className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition-colors outline-none"
                  >
                    {visualCopied ? (
                      <>
                        <Icons.CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Tersalin!</span>
                      </>
                    ) : (
                      <>
                        <Icons.Copy className="w-3.5 h-3.5" />
                        <span>Salin Prompt</span>
                      </>
                    )}
                  </button>
                )}

                {activeTab === 'caption' && captionPrompt && (
                  <button
                    type="button"
                    onClick={() => handleCopyText(captionPrompt, 'caption')}
                    className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition-colors outline-none"
                  >
                    {captionCopied ? (
                      <>
                        <Icons.CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Tersalin!</span>
                      </>
                    ) : (
                      <>
                        <Icons.Copy className="w-3.5 h-3.5" />
                        <span>Salin Prompt</span>
                      </>
                    )}
                  </button>
                )}

                {activeTab === 'seo' && seoPrompt && (
                  <button
                    type="button"
                    onClick={() => handleCopyText(seoPrompt, 'seo')}
                    className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition-colors outline-none"
                  >
                    {seoCopied ? (
                      <>
                        <Icons.CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Tersalin!</span>
                      </>
                    ) : (
                      <>
                        <Icons.Copy className="w-3.5 h-3.5" />
                        <span>Salin Prompt</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* OVERLAY: Loading and recording statuses */}
              {recordingStatus && (
                <div className="absolute inset-0 z-50 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center animate-fade-in space-y-4">
                  <Icons.Loader2 className="w-12 h-12 text-rose-500 animate-spin" />
                  <div>
                    <h3 className="text-lg font-black text-white">{recordingStatus}</h3>
                    <p className="text-sm text-slate-400 mt-1 max-w-sm">
                      Proses sedang berjalan: <span className="font-extrabold text-rose-400 font-mono">{recordingProgress}%</span>.
                      {recordingStatus.toLowerCase().includes('video')
                        ? ' Sedang merender dan merekam video slideshow...'
                        : ' Sedang memproses dan mengompresi berkas potongan gambar ke ZIP...'}
                    </p>
                    <p className="text-xs text-rose-500/80 bg-rose-950/20 px-3 py-1.5 rounded-full border border-rose-900/30 inline-block mt-4 font-bold tracking-wide uppercase">
                      Proses tetap berjalan meski browser Anda di-minimize
                    </p>
                  </div>
                </div>
              )}

              {/* TAB CONTENT: Visual AI Prompt Textarea */}
              {activeTab === 'visual' && (
                <div className="flex-1 flex flex-col">
                  {visualPrompt ? (
                    <div className="flex-1 flex flex-col space-y-2">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Prompt Visual Hasil Racikan Engine</div>
                      <textarea
                        value={visualPrompt}
                        onChange={(e) => setVisualPrompt(e.target.value)}
                        className="w-full flex-1 min-h-[350px] bg-slate-800/45 text-slate-200 border border-slate-800 rounded-xl p-4 focus:outline-none font-mono text-[12px] leading-relaxed resize-none shadow-inner focus:border-blue-500/50"
                      />
                      <div className="flex flex-wrap justify-between items-center text-[10px] text-slate-400 font-mono mt-1 bg-slate-950/40 px-3 py-1.5 rounded-lg border border-slate-800/40 gap-2">
                        <div className="flex gap-4">
                          <span>Characters: <strong className="text-blue-400 font-extrabold">{visualPrompt.length}</strong></span>
                          <span>Words: <strong className="text-blue-400 font-extrabold">{visualPrompt.trim() ? visualPrompt.trim().split(/\s+/).length : 0}</strong></span>
                        </div>
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Midjourney / Flux Optimized</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-500 space-y-4">
                      <div className="relative">
                        <div className="absolute inset-0 bg-blue-500/25 rounded-full blur-xl opacity-20 animate-pulse" />
                        <Icons.Wand2 className="w-14 h-12 text-slate-600 relative z-10" />
                      </div>
                      <div className="text-center">
                        <h4 className="text-sm font-bold text-slate-300">Belum Ada Prompt Visual</h4>
                        <p className="text-[11px] text-slate-500 max-w-xs mt-1">Konfigurasikan gaya, background, dan model pada form visual di sebelah kiri lalu klik Generate.</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB CONTENT: Social Media Caption Prompt Textarea */}
              {activeTab === 'caption' && (
                <div className="flex-1 flex flex-col">
                  {captionPrompt ? (
                    <div className="flex-1 flex flex-col space-y-2">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Prompt Caption Hasil Racikan Engine</div>
                      <textarea
                        value={captionPrompt}
                        onChange={(e) => setCaptionPrompt(e.target.value)}
                        className="w-full flex-1 min-h-[350px] bg-slate-800/45 text-slate-200 border border-slate-800 rounded-xl p-4 focus:outline-none font-mono text-[12px] leading-relaxed resize-none shadow-inner focus:border-pink-500/50"
                      />
                      <div className="flex flex-wrap justify-between items-center text-[10px] text-slate-400 font-mono mt-1 bg-slate-950/40 px-3 py-1.5 rounded-lg border border-slate-800/40 gap-2">
                        <div className="flex gap-4">
                          <span>Characters: <strong className="text-pink-400 font-extrabold">{captionPrompt.length}</strong></span>
                          <span>Words: <strong className="text-pink-400 font-extrabold">{captionPrompt.trim() ? captionPrompt.trim().split(/\s+/).length : 0}</strong></span>
                        </div>
                        <div className="flex gap-3">
                          <span className="text-[9px] font-bold">
                            {captionPrompt.length > 2200 ? (
                              <span className="text-rose-400 font-bold">⚠️ Instagram Over (Max 2,200)</span>
                            ) : (
                              <span className="text-emerald-400">✓ Instagram OK</span>
                            )}
                          </span>
                          <span className="text-slate-700">|</span>
                          <span className="text-[9px] font-bold">
                            {captionPrompt.length > 2000 ? (
                              <span className="text-rose-400 font-bold">⚠️ TikTok Over (Max 2,000)</span>
                            ) : (
                              <span className="text-emerald-400">✓ TikTok OK</span>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-500 space-y-4">
                      <div className="relative">
                        <div className="absolute inset-0 bg-pink-500/25 rounded-full blur-xl opacity-20 animate-pulse" />
                        <Icons.MessageSquareDashed className="w-14 h-12 text-slate-600 relative z-10" />
                      </div>
                      <div className="text-center">
                        <h4 className="text-sm font-bold text-slate-300">Belum Ada Prompt Caption</h4>
                        <p className="text-[11px] text-slate-500 max-w-xs mt-1">Isi target platform, gaya bahasa, dan promo pada form caption di sebelah kiri lalu klik Generate.</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB CONTENT: Marketplace SEO Copywriting Prompt Textarea */}
              {activeTab === 'seo' && (
                <div className="flex-1 flex flex-col">
                  {seoPrompt ? (
                    <div className="flex-1 flex flex-col space-y-2">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Prompt SEO Hasil Racikan Engine</div>
                      <textarea
                        value={seoPrompt}
                        onChange={(e) => setSeoPrompt(e.target.value)}
                        className="w-full flex-1 min-h-[350px] bg-slate-800/45 text-slate-200 border border-slate-800 rounded-xl p-4 focus:outline-none font-mono text-[12px] leading-relaxed resize-none shadow-inner focus:border-emerald-500/50"
                      />
                      <div className="flex flex-wrap justify-between items-center text-[10px] text-slate-400 font-mono mt-1 bg-slate-950/40 px-3 py-1.5 rounded-lg border border-slate-800/40 gap-2">
                        <div className="flex gap-4">
                          <span>Characters: <strong className="text-emerald-400 font-extrabold">{seoPrompt.length}</strong></span>
                          <span>Words: <strong className="text-emerald-400 font-extrabold">{seoPrompt.trim() ? seoPrompt.trim().split(/\s+/).length : 0}</strong></span>
                        </div>
                        <div className="flex gap-3">
                          <span className="text-[9px] font-bold">
                            {seoPrompt.length > 3000 ? (
                              <span className="text-rose-400 font-bold">⚠️ Tokopedia/Shopee Over (Max 3,000)</span>
                            ) : (
                              <span className="text-emerald-400">✓ Tokopedia/Shopee OK</span>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-500 space-y-4">
                      <div className="relative">
                        <div className="absolute inset-0 bg-emerald-500/25 rounded-full blur-xl opacity-20 animate-pulse" />
                        <Icons.ShoppingBag className="w-14 h-12 text-slate-600 relative z-10" />
                      </div>
                      <div className="text-center">
                        <h4 className="text-sm font-bold text-slate-300">Belum Ada Prompt SEO</h4>
                        <p className="text-[11px] text-slate-500 max-w-xs mt-1">Masukkan data spesifikasi, USP, dan keyword SEO di sebelah kiri lalu klik Generate.</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

            </main>
          </>
        )}
      </div>
        </div>
      </div>

      {/* High Density Status Footer (Terminal style) */}
      <footer className="h-6 bg-[#1e2329] border-t border-gray-800 text-gray-400 text-[9px] font-mono px-3 flex items-center justify-between shrink-0">
        <div className="flex gap-4">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            SERVER_STATE: ONLINE
          </span>
          <span>LATENCY: {serverLatency}</span>
          <span className="text-blue-400 font-semibold">CLIENT_STATE: IDLE</span>
        </div>
        <div className="flex gap-4">
          <span>FRAMEWORK: REACT 19 + VITE + TAILWIND</span>
          <span className="text-white font-bold">{systemTime || 'STABLE'}</span>
        </div>
      </footer>

      {/* Recent Copies Drawer Overlay */}
      {historyDrawerOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[100] transition-opacity duration-300"
            onClick={() => setHistoryDrawerOpen(false)}
          />
          {/* Drawer Container */}
          <div className="fixed right-0 top-0 h-full w-[380px] max-w-[90vw] bg-slate-900 border-l border-slate-800 text-white z-[101] flex flex-col shadow-2xl transition-all duration-300 transform translate-x-0">
            {/* Header */}
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950">
              <div className="flex items-center gap-2">
                <Icons.ClipboardList className="w-5 h-5 text-blue-400" />
                <div>
                  <h3 className="font-black text-sm text-white tracking-tight">Recent Copies</h3>
                  <p className="text-[10px] text-slate-400">Riwayat salinan prompt lintas sesi</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setHistoryDrawerOpen(false)}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors outline-none cursor-pointer"
              >
                <Icons.X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {recentCopies.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 py-12 text-center space-y-3">
                  <Icons.ClipboardCopy className="w-12 h-12 text-slate-700 animate-pulse" />
                  <div>
                    <p className="text-xs font-bold text-slate-400">Belum Ada Riwayat Salinan</p>
                    <p className="text-[10px] text-slate-500 max-w-[240px] mt-1 mx-auto leading-relaxed">
                      Prompt yang Anda salin menggunakan tombol <span className="font-bold text-slate-400">"Salin Prompt"</span> akan muncul di sini secara otomatis.
                    </p>
                  </div>
                </div>
              ) : (
                recentCopies.map((item) => {
                  const isVisual = item.type === 'visual';
                  const isCaption = item.type === 'caption';
                  const badgeBg = isVisual ? 'bg-blue-500/15 text-blue-400 border-blue-500/30' : isCaption ? 'bg-pink-500/15 text-pink-400 border-pink-500/30' : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
                  const badgeLabel = isVisual ? 'Visual AI' : isCaption ? 'Caption' : 'SEO Copy';

                  return (
                    <div key={item.id} className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 space-y-3 shadow-xs hover:border-slate-700 transition-all duration-200 relative group">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded border uppercase tracking-wider ${badgeBg}`}>
                            {badgeLabel}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {item.timestamp}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleCopyFromHistory(item.text, item.id)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-md transition-colors outline-none cursor-pointer flex items-center justify-center"
                            title="Salin ulang"
                          >
                            {copiedId === item.id ? (
                              <Icons.Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Icons.Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteHistoryItem(item.id)}
                            className="p-1.5 bg-slate-800/40 hover:bg-red-950/40 text-slate-500 hover:text-red-400 rounded-md transition-colors outline-none cursor-pointer flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100"
                            title="Hapus"
                          >
                            <Icons.Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Custom Prompt Label */}
                      <div className="flex items-center gap-2 px-2 py-1 bg-slate-900/60 rounded-lg border border-slate-800/50">
                        <Icons.Bookmark className="w-3 h-3 text-blue-400 shrink-0" />
                        <input
                          type="text"
                          value={item.customName || ''}
                          placeholder="Beri nama prompt agar mudah diingat..."
                          onChange={(e) => {
                            const updated = recentCopies.map(r => r.id === item.id ? { ...r, customName: e.target.value } : r);
                            saveRecentCopies(updated);
                          }}
                          className="w-full bg-transparent border-none text-[11px] font-bold text-slate-200 focus:text-white outline-none placeholder:text-slate-600 placeholder:font-normal py-0.5"
                        />
                      </div>

                      <div className="text-[11px] text-slate-300 bg-slate-900/50 p-2.5 rounded-lg border border-slate-800/50 font-mono break-words max-h-32 overflow-y-auto whitespace-pre-wrap leading-relaxed shadow-inner">
                        {item.text}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950 text-center flex flex-col gap-2">
              <p className="text-[10px] text-slate-500 font-medium">Menampilkan hingga 3 salinan terbaru</p>
              {recentCopies.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Hapus semua riwayat salinan?')) {
                      saveRecentCopies([]);
                    }
                  }}
                  className="text-[10px] text-red-400 hover:text-red-300 hover:underline font-bold transition-colors py-1 outline-none cursor-pointer"
                >
                  Bersihkan Semua Riwayat
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
