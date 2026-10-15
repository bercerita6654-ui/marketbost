import React, { useState, useEffect } from 'react';
import { ActiveTab, CopiedPrompt } from './types';
import { CSV_COMPANY_URL, CSV_BRAND_URL } from './data';
import { fetchCSVDatabase, copyToClipboard, cleanSeoFormatting } from './utils';
import { VisualPanel } from './components/VisualPanel';
import { CaptionPanel } from './components/CaptionPanel';
import { SeoPanel } from './components/SeoPanel';
import { BroadcastPanel } from './components/BroadcastPanel';
import { GridPanel } from './components/GridPanel';
import { BatchPanel } from './components/BatchPanel';
import { GuideModal } from './components/GuideModal';
import * as Icons from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('visual');
  const [guideOpen, setGuideOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [productName, setProductName] = useState<string>(() => {
    try {
      return localStorage.getItem('marketboost_autosave_productName') || 'Sepatu sneakers kulit putih pria';
    } catch {
      return 'Sepatu sneakers kulit putih pria';
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
  const [broadcastPrompt, setBroadcastPrompt] = useState<string>(() => {
    try {
      return localStorage.getItem('marketboost_autosave_broadcast') || '';
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

  useEffect(() => {
    try {
      localStorage.setItem('marketboost_autosave_broadcast', broadcastPrompt);
    } catch (e) {
      console.error('Failed to auto-save broadcast prompt', e);
    }
  }, [broadcastPrompt]);

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
  const [broadcastCopied, setBroadcastCopied] = useState(false);
  const [seoFormattedToast, setSeoFormattedToast] = useState(false);

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
  const handleCopyText = async (text: string, type: 'visual' | 'caption' | 'seo' | 'broadcast') => {
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
      } else if (type === 'broadcast') {
        setBroadcastCopied(true);
        setTimeout(() => setBroadcastCopied(false), 2000);
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

  const samplePresets = [
    { label: '👟 Sneakers Pria', name: 'Sepatu sneakers kulit putih pria casual', kw: ['sepatu sneakers', 'sneakers pria', 'sepatu kasual', 'alas kaki lokal'] },
    { label: '✨ Serum Glowing', name: 'Serum wajah brightening vitamin C booster glow', kw: ['serum wajah', 'brightening serum', 'skincare glowing', 'anti aging'] },
    { label: '👔 Kemeja Flanel', name: 'Kemeja flanel katun motif kotak lengan panjang', kw: ['kemeja flanel', 'kemeja pria', 'outfit kasual', 'atasan katun'] },
    { label: '🎒 Tas Ransel', name: 'Tas ransel backpack waterproof laptop 15 inch', kw: ['tas ransel', 'backpack waterproof', 'tas laptop', 'tas kuliah'] }
  ];

  const handleApplyPreset = (preset: typeof samplePresets[0]) => {
    setProductName(preset.name);
    setKeywords(preset.kw);
  };

  const navItems: { id: ActiveTab; label: string; sub: string; icon: any; color: string; activeColor: string }[] = [
    { id: 'visual', label: 'Visual AI Prompt', sub: 'Midjourney & Flux', icon: Icons.Sparkles, color: 'text-blue-400', activeColor: 'bg-blue-600 text-white shadow-lg shadow-blue-500/25' },
    { id: 'caption', label: 'Caption Sosmed', sub: 'Instagram & TikTok', icon: Icons.MessageSquareText, color: 'text-pink-400', activeColor: 'bg-pink-600 text-white shadow-lg shadow-pink-500/25' },
    { id: 'seo', label: 'SEO Copywriter', sub: 'Shopee & Tokopedia', icon: Icons.ShoppingBag, color: 'text-emerald-400', activeColor: 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/25' },
    { id: 'broadcast', label: 'Broadcast Chat', sub: 'Keranjang, Promo & Baru', icon: Icons.Radio, color: 'text-purple-400', activeColor: 'bg-purple-600 text-white shadow-lg shadow-purple-500/25' },
    { id: 'grid', label: '9-Grid Splitter', sub: '1000px, Kolase & Video', icon: Icons.LayoutGrid, color: 'text-indigo-400', activeColor: 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25' },
    { id: 'batch', label: 'Batch Processor', sub: 'Multi-Foto Max 148KB', icon: Icons.Layers, color: 'text-amber-400', activeColor: 'bg-amber-600 text-white shadow-lg shadow-amber-500/25' }
  ];

  return (
    <div className="flex flex-col h-screen bg-[#f8fafc] text-slate-800 font-sans overflow-hidden select-none">
      
      {/* Top Application Header */}
      <header className="h-14 bg-[#0f172a] border-b border-slate-800 flex items-center justify-between px-4 text-white shrink-0 shadow-sm z-30">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-indigo-500 via-blue-500 to-teal-400 p-2 rounded-xl flex items-center justify-center shadow-md shadow-indigo-500/20">
            <Icons.Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-black tracking-tight text-white flex items-center gap-1.5">
                MARKETBOOST <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-400 font-extrabold text-xs">STUDIO AI</span>
              </h1>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                v2.5 PRO
              </span>
            </div>
            <p className="text-[10px] text-slate-400 -mt-0.5 hidden sm:block">
              {activeTab === 'visual' && 'Generator Prompt Visual Fotorealistik Midjourney & Flux'}
              {activeTab === 'caption' && 'Generator Caption Persuasif dengan Hook & CTA Penjualan'}
              {activeTab === 'seo' && 'Generator Judul 100-125 Karakter & Deskripsi Tokopedia/Shopee'}
              {activeTab === 'broadcast' && 'Pesan Siaran Pengingat Keranjang, Produk Baru & Promo 9.9'}
              {activeTab === 'grid' && 'Pemotong 9 Grid Feed 1:1, Kolase Banner, & Video Slideshow'}
              {activeTab === 'batch' && 'Kompresi & Optimasi Multi-Gambar Otomatis Maks 148KB'}
            </p>
          </div>
        </div>

        {/* Global Product Presets Quick Bar (Center) */}
        <div className="hidden lg:flex items-center gap-2 bg-slate-900/90 border border-slate-800/80 rounded-xl px-3 py-1.5">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold">
            <Icons.Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[11px] text-slate-400">Contoh Cepat:</span>
          </div>
          <div className="flex items-center gap-1.5">
            {samplePresets.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleApplyPreset(preset)}
                className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer border border-slate-700/50"
                title={`Gunakan contoh "${preset.name}"`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Action buttons on the right */}
        <div className="flex items-center gap-2.5">
          {/* Guide Modal Trigger */}
          <button
            type="button"
            onClick={() => setGuideOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/90 hover:bg-indigo-600 text-slate-200 hover:text-white rounded-xl text-xs font-bold transition-all outline-none border border-slate-700/80 cursor-pointer shadow-xs"
            title="Panduan penggunaan fitur"
          >
            <Icons.BookOpen className="w-3.5 h-3.5 text-indigo-400 group-hover:text-white" />
            <span className="hidden md:inline text-[11px]">Panduan</span>
          </button>

          {/* Recent Copies Drawer Trigger */}
          <button
            type="button"
            onClick={() => setHistoryDrawerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold transition-all outline-none border border-slate-700/80 cursor-pointer shadow-xs relative"
            title="Lihat riwayat salinan"
          >
            <Icons.ClipboardList className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden md:inline text-[11px]">Riwayat Salin</span>
            {recentCopies.length > 0 && (
              <span className="bg-rose-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-extrabold leading-none">
                {recentCopies.length}
              </span>
            )}
          </button>

          {/* Server / Engine Status indicator */}
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium bg-emerald-950/40 px-2.5 py-1 rounded-xl border border-emerald-800/40">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Studio Siap</span>
          </div>
        </div>
      </header>

      {/* Main interface: Sidebar navigation + dashboard body */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Navigation Sidebar */}
        <nav className={`${sidebarCollapsed ? 'w-16' : 'w-60'} bg-[#0f172a] flex flex-col justify-between py-3 border-r border-slate-800 shrink-0 transition-all duration-300 select-none z-20`}>
          
          <div className="space-y-1 px-2">
            {/* Collapse toggle */}
            <div className="flex items-center justify-between px-2 py-1 mb-2 text-slate-400">
              {!sidebarCollapsed && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Alat & Fitur
                </span>
              )}
              <button
                type="button"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer ml-auto"
                title={sidebarCollapsed ? 'Perluas Menu' : 'Persempit Menu'}
              >
                <Icons.PanelLeft className={`w-4 h-4 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {navItems.map((item, idx) => {
              const IconComp = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  title={item.label + ' - ' + item.sub}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer outline-none relative group text-left ${
                    isActive
                      ? item.activeColor
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <div className={`p-1.5 rounded-lg shrink-0 ${isActive ? 'bg-white/20' : 'bg-slate-800/80 text-slate-300'}`}>
                    <IconComp className="w-4 h-4" />
                  </div>
                  
                  {!sidebarCollapsed && (
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold truncate">{item.label}</span>
                        <span className="text-[9px] font-mono opacity-60">0{idx + 1}</span>
                      </div>
                      <p className={`text-[10px] truncate ${isActive ? 'text-white/80' : 'text-slate-400'}`}>
                        {item.sub}
                      </p>
                    </div>
                  )}

                  {/* Tooltip in collapsed mode */}
                  {sidebarCollapsed && (
                    <div className="absolute left-16 top-1/2 -translate-y-1/2 bg-slate-900 text-white text-xs px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 shadow-xl border border-slate-700">
                      <div className="font-bold">{item.label}</div>
                      <div className="text-[10px] text-slate-400">{item.sub}</div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Bottom Sidebar Info */}
          {!sidebarCollapsed ? (
            <div className="p-3 mx-2 bg-slate-900/80 border border-slate-800/80 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                <Icons.ShieldCheck className="w-4 h-4 text-teal-400 shrink-0" />
                <span>Format Standar 1:1</span>
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Rasio 1000x1000px & batas download dioptimalkan &le; 148KB per gambar.
              </p>
              <button
                type="button"
                onClick={() => setGuideOpen(true)}
                className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-[11px] font-semibold transition-colors flex items-center justify-center gap-1 cursor-pointer"
              >
                <Icons.HelpCircle className="w-3 h-3 text-indigo-400" />
                <span>Pelajari Tips</span>
              </button>
            </div>
          ) : (
            <div className="px-2">
              <button
                type="button"
                onClick={() => setGuideOpen(true)}
                className="w-full p-2.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors flex justify-center cursor-pointer"
                title="Buka Panduan"
              >
                <Icons.HelpCircle className="w-5 h-5 text-indigo-400" />
              </button>
            </div>
          )}

        </nav>

        {/* Dynamic Workspace Container */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Two-column master grid */}
          <div className="flex-1 flex overflow-hidden relative">
            
            {activeTab === 'batch' ? (
              <BatchPanel
                activeTab={activeTab}
                setActiveTab={setActiveTab}
              />
            ) : activeTab === 'grid' ? (
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
                <aside className="w-[360px] lg:w-[380px] bg-white border-r border-slate-200 flex flex-col overflow-y-auto shrink-0 p-4 space-y-4 shadow-xs">
              
                  {/* Product Global Identifier input - disembunyikan saat tab Broadcast Chat */}
                  {activeTab !== 'broadcast' && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 shadow-2xs">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <Icons.Package className="w-4 h-4 text-indigo-600" />
                          <span>Nama Utama Produk</span>
                        </div>
                        <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1 font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Sinkron Otomatis
                        </span>
                      </div>
                      
                      <input
                        type="text"
                        value={productName}
                        onChange={(e) => setProductName(e.target.value)}
                        placeholder="Contoh: Sepatu sneakers putih pria"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-xs font-semibold text-slate-800 shadow-2xs transition-all"
                      />

                      {/* Quick Preset helper pills */}
                      <div className="flex items-center gap-1.5 pt-1 overflow-x-auto pb-0.5 text-[10px]">
                        <span className="text-slate-400 shrink-0 font-medium">Contoh:</span>
                        {samplePresets.slice(0, 3).map((p, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleApplyPreset(p)}
                            className="px-2 py-0.5 rounded-md bg-white border border-slate-200 hover:border-indigo-400 hover:text-indigo-600 text-slate-600 font-medium transition-all shrink-0 cursor-pointer"
                          >
                            {p.label.split(' ')[1]}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

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
                        onSetKeywords={setKeywords}
                        onGenerate={setSeoPrompt}
                      />
                    )}
                    {activeTab === 'broadcast' && (
                      <BroadcastPanel
                        onGenerate={setBroadcastPrompt}
                      />
                    )}
                  </div>
                </aside>

                {/* PANEL KANAN: Real-time Snapshot Outputs / Workspace Result */}
                <main className="flex-1 bg-[#0b1120] flex flex-col text-white p-5 overflow-y-auto relative min-w-[300px]">
                  
                  {/* Output Tab-Headers & Actions Toolbar */}
                  <div className="flex flex-wrap justify-between items-center gap-3 border-b border-slate-800 pb-3 mb-4">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveTab('visual')}
                        className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all outline-none cursor-pointer ${
                          activeTab === 'visual'
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40 shadow-sm'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                        }`}
                      >
                        <Icons.Sparkles className="w-3.5 h-3.5" />
                        <span>Prompt Visual</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveTab('caption')}
                        className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all outline-none cursor-pointer ${
                          activeTab === 'caption'
                            ? 'bg-pink-500/20 text-pink-400 border border-pink-500/40 shadow-sm'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                        }`}
                      >
                        <Icons.MessageSquareText className="w-3.5 h-3.5" />
                        <span>Prompt Caption</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveTab('seo')}
                        className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all outline-none cursor-pointer ${
                          activeTab === 'seo'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                        }`}
                      >
                        <Icons.ShoppingBag className="w-3.5 h-3.5" />
                        <span>Prompt SEO</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveTab('broadcast')}
                        className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all outline-none cursor-pointer ${
                          activeTab === 'broadcast'
                            ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40 shadow-sm'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                        }`}
                      >
                        <Icons.Radio className="w-3.5 h-3.5" />
                        <span>Prompt Broadcast</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveTab('grid')}
                        className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all outline-none cursor-pointer ${
                          activeTab === 'grid'
                            ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 shadow-sm'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                        }`}
                      >
                        <Icons.LayoutGrid className="w-3.5 h-3.5" />
                        <span>Grid & Video</span>
                      </button>
                    </div>

                    {/* Action buttons mapped based on active workspace tab */}
                    <div className="flex items-center gap-2">
                      {/* External AI Launchers */}
                      <a
                        href="https://chatgpt.com"
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-medium transition-colors border border-slate-700/60"
                        title="Buka ChatGPT di tab baru untuk paste prompt"
                      >
                        <Icons.ExternalLink className="w-3 h-3 text-emerald-400" />
                        <span className="hidden sm:inline">ChatGPT</span>
                      </a>

                      <a
                        href="https://gemini.google.com"
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-medium transition-colors border border-slate-700/60"
                        title="Buka Google Gemini di tab baru untuk paste prompt"
                      >
                        <Icons.Sparkles className="w-3 h-3 text-blue-400" />
                        <span className="hidden sm:inline">Gemini</span>
                      </a>

                      {/* Instant copy button mapped based on active workspace tab */}
                      {activeTab === 'visual' && visualPrompt && (
                        <button
                          type="button"
                          onClick={() => handleCopyText(visualPrompt, 'visual')}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-blue-500/20 cursor-pointer active:scale-95"
                        >
                          {visualCopied ? (
                            <>
                              <Icons.CheckCircle className="w-3.5 h-3.5 text-white" />
                              <span>Tersalin!</span>
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
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-pink-500/20 cursor-pointer active:scale-95"
                        >
                          {captionCopied ? (
                            <>
                              <Icons.CheckCircle className="w-3.5 h-3.5 text-white" />
                              <span>Tersalin!</span>
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
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-emerald-500/20 cursor-pointer active:scale-95"
                        >
                          {seoCopied ? (
                            <>
                              <Icons.CheckCircle className="w-3.5 h-3.5 text-white" />
                              <span>Tersalin!</span>
                            </>
                          ) : (
                            <>
                              <Icons.Copy className="w-3.5 h-3.5" />
                              <span>Salin Prompt</span>
                            </>
                          )}
                        </button>
                      )}

                      {activeTab === 'broadcast' && broadcastPrompt && (
                        <button
                          type="button"
                          onClick={() => handleCopyText(broadcastPrompt, 'broadcast')}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-purple-500/20 cursor-pointer active:scale-95"
                        >
                          {broadcastCopied ? (
                            <>
                              <Icons.CheckCircle className="w-3.5 h-3.5 text-white" />
                              <span>Tersalin!</span>
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
                  </div>

                  {/* OVERLAY: Loading and recording statuses */}
                  {recordingStatus && (
                    <div className="absolute inset-0 z-50 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center animate-fade-in space-y-4">
                      <Icons.Loader2 className="w-12 h-12 text-rose-500 animate-spin" />
                      <div>
                        <h3 className="text-lg font-black text-white">{recordingStatus}</h3>
                        <p className="text-sm text-slate-400 mt-1 max-w-sm">
                          {recordingStatus.toLowerCase().includes('video')
                            ? 'Sedang merender dan merekam video slideshow...'
                            : 'Sedang memproses dan mengompresi berkas potongan gambar ke ZIP...'}
                        </p>

                        {/* Highly Polished Progress Bar */}
                        <div className="mt-5 max-w-xs w-72 mx-auto space-y-2">
                          <div className="flex justify-between text-[11px] font-mono font-bold tracking-wide uppercase">
                            <span className="text-slate-400">Progres Proses</span>
                            <span className="text-rose-400 font-black">{recordingProgress}%</span>
                          </div>
                          <div className="w-full bg-slate-900/90 rounded-full h-4 p-0.5 border border-slate-800 shadow-inner overflow-hidden">
                            <div 
                              className="bg-gradient-to-r from-rose-500 via-pink-500 to-indigo-500 h-full rounded-full transition-all duration-300 ease-out relative shadow-md"
                              style={{ width: `${recordingProgress}%` }}
                            >
                              {/* Shimmer overlay */}
                              <div className="absolute inset-0 bg-white/10 bg-gradient-to-r from-transparent via-white/25 to-transparent animate-pulse" style={{ backgroundSize: '200% 100%' }} />
                            </div>
                          </div>
                        </div>
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
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                              <Icons.Sparkles className="w-3.5 h-3.5 text-blue-400" />
                              Prompt Visual Hasil Racikan Studio
                            </span>
                            <button
                              type="button"
                              onClick={() => setVisualPrompt('')}
                              className="text-[11px] text-slate-500 hover:text-rose-400 transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <Icons.Trash2 className="w-3 h-3" />
                              <span>Bersihkan</span>
                            </button>
                          </div>

                          <textarea
                            value={visualPrompt}
                            onChange={(e) => setVisualPrompt(e.target.value)}
                            className="w-full flex-1 min-h-[350px] bg-slate-900/80 text-slate-100 border border-slate-800 rounded-xl p-4 focus:outline-none font-mono text-[12px] leading-relaxed resize-none shadow-inner focus:border-blue-500/50"
                          />

                          <div className="flex flex-wrap justify-between items-center text-[10px] text-slate-400 font-mono mt-1 bg-slate-950/50 px-3 py-2 rounded-xl border border-slate-800/60 gap-2">
                            <div className="flex gap-4">
                              <span>Characters: <strong className="text-blue-400 font-bold">{visualPrompt.length}</strong></span>
                              <span>Words: <strong className="text-blue-400 font-bold">{visualPrompt.trim() ? visualPrompt.trim().split(/\s+/).length : 0}</strong></span>
                            </div>
                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider bg-slate-800/60 px-2 py-0.5 rounded border border-slate-700">
                              Midjourney &bull; Flux &bull; Bing Image Creator
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-500 space-y-4 py-12">
                          <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                            <Icons.Wand2 className="w-12 h-12 animate-pulse" />
                          </div>
                          <div className="text-center max-w-sm">
                            <h4 className="text-base font-bold text-slate-200">Belum Ada Prompt Visual</h4>
                            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                              Atur gaya fotografi, background estetik, atau model pada form di sebelah kiri lalu klik tombol <strong>Generate Prompt</strong>.
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                const sampleName = productName.trim() || 'Sepatu sneakers kulit putih pria casual';
                                setVisualPrompt(`Commercial product photography of ${sampleName}, placed elegantly on a luxurious minimalist marble pedestal, surrounded by subtle natural palm shadows, soft studio lighting with warm golden hour highlights, eye-level shot, ultra sharp focus, 8k resolution, photorealistic texture, masterpiece --ar 1:1 --v 6.0 --style raw`);
                              }}
                              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/25 inline-flex items-center gap-1.5 cursor-pointer"
                            >
                              <Icons.Sparkles className="w-3.5 h-3.5" />
                              <span>Muat Contoh Prompt Visual</span>
                            </button>
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
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                              <Icons.MessageSquareText className="w-3.5 h-3.5 text-pink-400" />
                              Prompt Caption Hasil Racikan Studio
                            </span>
                            <button
                              type="button"
                              onClick={() => setCaptionPrompt('')}
                              className="text-[11px] text-slate-500 hover:text-rose-400 transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <Icons.Trash2 className="w-3 h-3" />
                              <span>Bersihkan</span>
                            </button>
                          </div>

                          <textarea
                            value={captionPrompt}
                            onChange={(e) => setCaptionPrompt(e.target.value)}
                            className="w-full flex-1 min-h-[350px] bg-slate-900/80 text-slate-100 border border-slate-800 rounded-xl p-4 focus:outline-none font-mono text-[12px] leading-relaxed resize-none shadow-inner focus:border-pink-500/50"
                          />

                          <div className="flex flex-wrap justify-between items-center text-[10px] text-slate-400 font-mono mt-1 bg-slate-950/50 px-3 py-2 rounded-xl border border-slate-800/60 gap-2">
                            <div className="flex gap-4">
                              <span>Characters: <strong className="text-pink-400 font-bold">{captionPrompt.length}</strong></span>
                              <span>Words: <strong className="text-pink-400 font-bold">{captionPrompt.trim() ? captionPrompt.trim().split(/\s+/).length : 0}</strong></span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={`px-2 py-0.5 rounded font-bold ${captionPrompt.length > 2200 ? 'bg-rose-950/50 text-rose-400 border border-rose-800/50' : 'bg-emerald-950/50 text-emerald-400 border border-emerald-800/50'}`}>
                                {captionPrompt.length > 2200 ? '⚠️ Instagram Melebihi Batas' : '✓ Instagram Pas (Max 2.200)'}
                              </span>
                              <span className={`px-2 py-0.5 rounded font-bold ${captionPrompt.length > 2000 ? 'bg-rose-950/50 text-rose-400 border border-rose-800/50' : 'bg-emerald-950/50 text-emerald-400 border border-emerald-800/50'}`}>
                                {captionPrompt.length > 2000 ? '⚠️ TikTok Melebihi Batas' : '✓ TikTok Pas (Max 2.000)'}
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-500 space-y-4 py-12">
                          <div className="p-4 rounded-2xl bg-pink-500/10 border border-pink-500/20 text-pink-400">
                            <Icons.MessageSquareDashed className="w-12 h-12 animate-pulse" />
                          </div>
                          <div className="text-center max-w-sm">
                            <h4 className="text-base font-bold text-slate-200">Belum Ada Prompt Caption</h4>
                            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                              Tentukan platform target, gaya bahasa, dan promo pada form di sebelah kiri lalu klik tombol <strong>Generate Prompt</strong>.
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                const sampleName = productName.trim() || 'Sepatu Sneakers Pria Premium';
                                setCaptionPrompt(`🔥 UPGRADE GAYA KAMU HARI INI!\n\nLagi cari ${sampleName} yang super empuk, anti-pegal dipakai seharian, tapi tetap kelihatan maskulin dan stylish? Ini pilihan paling tepat buat kamu!\n\n✨ Kenapa Kamu Wajib Punya:\n- Bahan breathable, kaki tetap adem bebas gerah\n- Sol anti-slip kokoh & fleksibel di segala permukaan\n- Jahitan rapi presisi standar pabrik ekspor\n\n⚡ SPECIAL OFFER BULAN INI:\nKlaim diskon s.d 40% + Voucher Gratis Ongkir Ekstra! Stok warna favorit cepat habis, yuk checkout sekarang sebelum kehabisan promo.\n\n👉 Klik link di bio / keranjang kuning di bawah!\n\n#sneakerspria #sepatukasual #ootdindo #racuntiktok #promospesial`);
                              }}
                              className="mt-4 px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-pink-500/25 inline-flex items-center gap-1.5 cursor-pointer"
                            >
                              <Icons.Sparkles className="w-3.5 h-3.5" />
                              <span>Muat Contoh Prompt Caption</span>
                            </button>
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
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                              <Icons.ShoppingBag className="w-3.5 h-3.5 text-emerald-400" />
                              Prompt SEO Hasil Racikan Studio
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  if (seoPrompt) {
                                    const cleaned = cleanSeoFormatting(seoPrompt);
                                    setSeoPrompt(cleaned);
                                    setSeoFormattedToast(true);
                                    setTimeout(() => setSeoFormattedToast(false), 2500);
                                  }
                                }}
                                className="text-[11px] bg-emerald-950/80 hover:bg-emerald-900/90 text-emerald-300 border border-emerald-700/60 hover:border-emerald-500 px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer font-semibold shadow-xs"
                                title="Rapikan otomatis: hilangkan tanda bintang (**), bersihkan bullet (•/-/*), dan rapatkan baris Spesifikasi serta Catatan Toko"
                              >
                                <Icons.Sparkles className="w-3 h-3 text-emerald-400" />
                                <span>{seoFormattedToast ? '✓ Format Rapi!' : 'Rapikan Format'}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setSeoPrompt('')}
                                className="text-[11px] text-slate-500 hover:text-rose-400 transition-colors flex items-center gap-1 cursor-pointer px-1.5 py-1"
                              >
                                <Icons.Trash2 className="w-3 h-3" />
                                <span>Bersihkan</span>
                              </button>
                            </div>
                          </div>

                          <textarea
                            value={seoPrompt}
                            onChange={(e) => setSeoPrompt(e.target.value)}
                            className="w-full flex-1 min-h-[350px] bg-slate-900/80 text-slate-100 border border-slate-800 rounded-xl p-4 focus:outline-none font-mono text-[12px] leading-relaxed resize-none shadow-inner focus:border-emerald-500/50"
                          />

                          <div className="flex flex-wrap justify-between items-center text-[10px] text-slate-400 font-mono mt-1 bg-slate-950/50 px-3 py-2 rounded-xl border border-slate-800/60 gap-2">
                            <div className="flex gap-4">
                              <span>Characters: <strong className="text-emerald-400 font-bold">{seoPrompt.length}</strong></span>
                              <span>Words: <strong className="text-emerald-400 font-bold">{seoPrompt.trim() ? seoPrompt.trim().split(/\s+/).length : 0}</strong></span>
                            </div>
                            <span className={`px-2 py-0.5 rounded font-bold ${seoPrompt.length > 3000 ? 'bg-rose-950/50 text-rose-400 border border-rose-800/50' : 'bg-emerald-950/50 text-emerald-400 border border-emerald-800/50'}`}>
                              {seoPrompt.length > 3000 ? '⚠️ Tokopedia / Shopee Melebihi Batas' : '✓ Tokopedia & Shopee Pas (Max 3.000)'}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-500 space-y-4 py-12">
                          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                            <Icons.ShoppingBag className="w-12 h-12 animate-pulse" />
                          </div>
                          <div className="text-center max-w-sm">
                            <h4 className="text-base font-bold text-slate-200">Belum Ada Prompt SEO</h4>
                            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                              Lengkapi spesifikasi produk, keunggulan USP, dan keyword pencarian di sebelah kiri lalu klik tombol <strong>Generate Prompt</strong>.
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                setSeoPrompt(`REKOMENDASI JUDUL SEO:\n\nName Tag Holder Plastik jepit/ ID Card Nametag Plastik Jepit Multi/Sakura No. 101 / 30-A/301 9x5.5cm name holder murah\n\nName Tag Holder Plastik jepit/ ID Card Nametag Plastik Jepit Multi/Sakura No. 101 / 30-A/301 9x5.5cm name jepit bening\n\nName Tag Holder Plastik jepit/ ID Card Nametag Plastik Jepit Multi/Sakura No. 101 / 30-A/301 9x5.5cm tag holder kantor\n\nDETAIL SPESIFIKASI:\nMerk   : Multi/Sakura\nTipe   : No. 101 / 30-A/301\nHarga  : Harga Tertera (1 PCS)\nUkuran : 9x5.5cm\n\nKEUNGGULAN UTAMA:\nTerbuat dari material plastik transparan yang tebal sehingga kartu identitas tetap aman, tidak mudah terlipat, dan terbaca jelas.\n\nDilengkapi dengan klip jepit yang kuat dan kokoh, memastikan name holder terpasang aman di saku baju tanpa takut mudah lepas.\n\nDesain simpel dan ringan yang sangat praktis digunakan untuk pemakaian harian tanpa membuat kain pakaian rusak atau tertarik.\n\nPENGALAMAN PEMAKAIAN:\nPernah ngerasa repot karena name tag sering jatuh atau posisinya miring saat lagi sibuk kerja? Dengan name tag holder plastik jepit ini, urusan identitas diri jadi super rapi dan aman seharian penuh. Jepitannya benar-benar mencengkeram kuat di saku atau kerah baju, jadi kamu bisa bebas beraktivitas, jalan cepat, atau sibuk di lapangan tanpa perlu bolak-balik membetulkan posisi ID card. Selain itu, bahan plastiknya yang bening bikin kartu kamu selalu bersih dari debu atau cipratan air, menjaga penampilan kamu tetap profesional dan meyakinkan di depan klien atau atasan.\n\nSANGAT COCOK UNTUK:\nKebutuhan identitas karyawan kantoran, panitia event, guru, mahasiswa, atau tenaga medis yang butuh kartu selalu terlihat jelas.\nMelindungi kartu akses gedung, kartu peserta seminar, atau kartu pelajar agar tidak cepat kusam, patah, atau hilang saat beraktivitas.\n\nCATATAN TOKO:\nProduk yang kami jual dijamin Original & Baru.\nCover/kemasan/motif/warna dikirim sesuai stock yang tersedia.\nMohon sertakan video unboxing untuk klaim produk.`);
                              }}
                              className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-500/25 inline-flex items-center gap-1.5 cursor-pointer"
                            >
                              <Icons.Sparkles className="w-3.5 h-3.5" />
                              <span>Muat Contoh Prompt SEO</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB CONTENT: Broadcast Chat Copywriting Prompt Textarea */}
                  {activeTab === 'broadcast' && (
                    <div className="flex-1 flex flex-col">
                      {broadcastPrompt ? (
                        <div className="flex-1 flex flex-col space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                              <Icons.Radio className="w-3.5 h-3.5 text-purple-400" />
                              Prompt Broadcast Chat Hasil Racikan Studio
                            </span>
                            <button
                              type="button"
                              onClick={() => setBroadcastPrompt('')}
                              className="text-[11px] text-slate-500 hover:text-rose-400 transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <Icons.Trash2 className="w-3 h-3" />
                              <span>Bersihkan</span>
                            </button>
                          </div>

                          <textarea
                            value={broadcastPrompt}
                            onChange={(e) => setBroadcastPrompt(e.target.value)}
                            className="w-full flex-1 min-h-[350px] bg-slate-900/80 text-slate-100 border border-slate-800 rounded-xl p-4 focus:outline-none font-mono text-[12px] leading-relaxed resize-none shadow-inner focus:border-purple-500/50"
                          />

                          <div className="flex flex-wrap justify-between items-center text-[10px] text-slate-400 font-mono mt-1 bg-slate-950/50 px-3 py-2 rounded-xl border border-slate-800/60 gap-2">
                            <div className="flex gap-4">
                              <span>Characters: <strong className="text-purple-400 font-bold">{broadcastPrompt.length}</strong></span>
                              <span>Words: <strong className="text-purple-400 font-bold">{broadcastPrompt.trim() ? broadcastPrompt.trim().split(/\s+/).length : 0}</strong></span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] text-purple-300 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-800/50 font-bold">
                                3 Variasi Pesan Siaran (Ringkas & CTR Tinggi)
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-500 space-y-4 py-12">
                          <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                            <Icons.Radio className="w-12 h-12 animate-pulse" />
                          </div>
                          <div className="text-center max-w-sm">
                            <h4 className="text-base font-bold text-slate-200">Belum Ada Prompt Broadcast Chat</h4>
                            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                              Pilih template (Pengingat Keranjang, Update Produk Baru, atau Promo), tentukan tema seperti <strong>Event 9.9</strong>, lalu klik <strong>Generate Prompt Broadcast Chat</strong>.
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                setBroadcastPrompt(`📢 REKOMENDASI 3 VARIASI PESAN BROADCAST CHAT (EVENT 9.9 SUPER SHOPPING DAY)\nKategori: Pengingat Keranjang Belanja (Abandoned Cart) | Platform: SHOPEE & TOKOPEDIA\n═════════════════════════════════════════════════════\n\n🎯 VARIASI 1: PENDEK, PADAT & LANGSUNG PADA INTI (Punchy & Direct)\n\nAda yang ketinggalan di keranjangmu nih! 🛒\n\nKhusus event 9.9 hari ini, nikmati DISKON EKSTRA 25% + GRATIS ONGKIR XTRA untuk barang impian yang ada di keranjang belanjamu!\n\n⚡ Masukkan Kode: HEMAT99 saat checkout.\nSisa 15 kuota lagi sebelum promo berakhir malam ini pukul 23:59 WIB!\n\n👉 Amankan sekarang sebelum kehabisan!\n\n─────────────────────────────────────────────────────\n\n❤️ VARIASI 2: RAMAH & PERSONAL (Friendly & Engaging)\n\nHalo kak! Masih naksir sama produk pilihan yang masih tersimpan di keranjang belanjamu? 😊\n\nKabar baik! Sekarang lagi berlangsung Promo 9.9 Super Shopping Day di toko kami. Kamu bisa checkout dengan Diskon Tambahan 25% + Potongan Ongkir langsung!\n\nYuk checkout sekarang selagi stok & varian incaranmu masih ready ya kak ✨\n\n─────────────────────────────────────────────────────\n\n⚡ VARIASI 3: URGENSI TINGGI & KUOTA MENIPIS (FOMO Booster)\n\n⚠️ PERINGATAN PROMO 9.9 SEGERA BERAKHIR!\n\nStok produk pilihan di keranjang belanjamu tinggal tersisa sedikit lagi kak!\n\nGunakan Voucher: HEMAT99 untuk hemat hingga 25% sekarang juga. Kesempatan hanya sampai 23:59 WIB hari ini!\n\n🔥 Jangan sampai keduluan pembeli lain ya!`);
                              }}
                              className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-purple-500/25 inline-flex items-center gap-1.5 cursor-pointer"
                            >
                              <Icons.Sparkles className="w-3.5 h-3.5" />
                              <span>Muat Contoh Prompt Broadcast</span>
                            </button>
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

      {/* Modern Status Footer */}
      <footer className="h-7 bg-[#0b1329] border-t border-slate-800 text-slate-400 text-[11px] px-4 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            MarketBoost Ready
          </span>
          <span className="text-slate-600 hidden sm:inline">•</span>
          <span className="text-slate-400 hidden sm:inline">
            Optimasi E-Commerce: Shopee, Tokopedia, TikTok Shop & Instagram
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-slate-400 flex items-center gap-1 text-[10px]">
            <Icons.Check className="w-3 h-3 text-emerald-400" /> Auto-Save Lokal Aktif
          </span>
          <span className="text-slate-600 hidden md:inline">•</span>
          <span className="text-slate-400 font-mono text-[10px] hidden md:inline">{systemTime || 'LIVE'}</span>
        </div>
      </footer>

      {/* Guide Modal */}
      <GuideModal
        isOpen={guideOpen}
        onClose={() => setGuideOpen(false)}
        onSelectTab={(tab) => setActiveTab(tab)}
      />

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
                  const isSeo = item.type === 'seo';
                  const badgeBg = isVisual
                    ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                    : isCaption
                    ? 'bg-pink-500/15 text-pink-400 border-pink-500/30'
                    : isSeo
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    : 'bg-purple-500/15 text-purple-400 border-purple-500/30';
                  const badgeLabel = isVisual ? 'Visual AI' : isCaption ? 'Caption' : isSeo ? 'SEO Copy' : 'Broadcast';

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
