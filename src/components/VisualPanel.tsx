import React, { useState } from 'react';
import { SubjectMode, VisualOption } from '../types';
import {
  VISUAL_STYLES,
  VISUAL_VIBES,
  VISUAL_BACKGROUNDS,
  VISUAL_LIGHTINGS,
  VISUAL_COLORS,
  VISUAL_ANGLES,
  MODEL_GENDERS,
  MODEL_AGES,
  MODEL_ETHNICITIES,
  MODEL_PLACEMENTS,
  POSTER_TEMPLATES
} from '../data';
import * as Icons from 'lucide-react';

// Dynamic Icon Renderer
const IconRenderer = ({ name, className = "w-4 h-4" }: { name: string; className?: string }) => {
  const LucideIcon = (Icons as any)[name] || Icons.HelpCircle;
  return <LucideIcon className={className} />;
};

interface DropdownProps {
  label: string;
  options: VisualOption[];
  selectedValue: string;
  onSelect: (val: string) => void;
  accentColor: 'rose' | 'blue';
}

const Dropdown: React.FC<DropdownProps> = ({ label, options, selectedValue, onSelect, accentColor }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOpt = options.find(o => o.value === selectedValue) || options[0];

  const iconColor = accentColor === 'rose' ? 'text-rose-600' : 'text-blue-600';
  const activeBg = accentColor === 'rose' ? 'bg-rose-50/50' : 'bg-blue-50/50';
  const activeText = accentColor === 'rose' ? 'text-rose-700' : 'text-blue-700';

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white flex items-center justify-between focus:ring-2 focus:ring-blue-500 outline-none hover:border-blue-400 transition-colors"
      >
        <div className="flex items-center space-x-2">
          <IconRenderer name={selectedOpt.icon} className={`w-3.5 h-3.5 ${iconColor}`} />
          <span className="text-slate-700 font-medium text-xs truncate">{selectedOpt.label}</span>
        </div>
        <Icons.ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto py-1">
            {options.map((opt) => {
              const isSelected = selectedValue === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onSelect(opt.value);
                    setIsOpen(false);
                  }}
                  className={`w-full px-3 py-2 text-left flex items-center space-x-2 hover:bg-slate-50 transition-colors ${
                    isSelected ? `${activeBg} ${activeText} font-bold` : 'text-slate-700'
                  }`}
                >
                  <IconRenderer name={opt.icon} className={`w-3.5 h-3.5 ${isSelected ? iconColor : 'text-slate-400'}`} />
                  <span className="text-xs">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

interface VisualPanelProps {
  productName: string;
  onGenerate: (prompt: string) => void;
}

export const VisualPanel: React.FC<VisualPanelProps> = ({ productName, onGenerate }) => {
  const [subjectMode, setSubjectMode] = useState<SubjectMode>('product');
  const [style, setStyle] = useState(VISUAL_STYLES[0].value);
  const [vibe, setVibe] = useState(VISUAL_VIBES[0].value);
  const [background, setBackground] = useState(VISUAL_BACKGROUNDS[0].value);
  const [lighting, setLighting] = useState(VISUAL_LIGHTINGS[0].value);
  const [color, setColor] = useState(VISUAL_COLORS[0].value);
  const [angle, setAngle] = useState(VISUAL_ANGLES[0].value);

  // Template Options for auto-fill
  const TEMPLATE_OPTIONS = [
    { label: '--- Pilih Template Prompt ---', value: '' },
    { label: '💍 Prewedding Couple (Consistent Faces & Bodies)', value: 'prewedding' },
    { label: '💼 Professional (Sleek & Clean)', value: 'professional' },
    { label: '☕ Casual / Lifestyle (Warm & Cozy)', value: 'casual' },
    { label: '🔥 Urgent Sales / Bold (Vibrant & Catchy)', value: 'urgent' },
    { label: '⚡ Cyberpunk Tech (Futuristic & Moody)', value: 'cyber' }
  ];

  const handleTemplateSelect = (val: string) => {
    if (val === 'prewedding') {
      setSubjectMode('model');
      setStyle('luxury and elegant');
      setVibe('realistic Lifestyle');
      setBackground('beautiful outdoor nature, greenery');
      setLighting('soft natural light');
      setColor('warm color tones, golden hour hues');
      setAngle('eye-level shot');
      setPropsVal('romantic couple (one man and one woman) in elegant wedding dress and modern custom suit, holding hands together, intimate gentle smiling expressions, looking at each other, absolute face and body shape consistency, matching luxury prewedding outfits, photorealistic details');
    } else if (val === 'professional') {
      setStyle('minimalist and clean');
      setVibe('premium look');
      setBackground('white plain background');
      setLighting('studio lighting');
      setColor('neutral color palette');
      setAngle('eye-level shot');
    } else if (val === 'casual') {
      setStyle('natural and organic');
      setVibe('realistic Lifestyle');
      setBackground('aesthetic cozy coffee shop interior');
      setLighting('soft natural light');
      setColor('warm color tones, golden hour hues');
      setAngle('eye-level shot');
    } else if (val === 'urgent') {
      setStyle('minimalist and clean');
      setVibe('premium look');
      setBackground('luxurious minimalist marble background');
      setLighting('dramatic lighting');
      setColor('vibrant and highly saturated colors');
      setAngle('top view flat lay shot');
    } else if (val === 'cyber') {
      setStyle('futuristic cyberpunk');
      setVibe('premium look');
      setBackground('simple neutral background');
      setLighting('dramatic lighting');
      setColor('cold color tones, cool blue hues');
      setAngle('front angle shot');
    }
  };

  // Poster Inputs
  const [posterText, setPosterText] = useState('');
  const [posterColorTheme, setPosterColorTheme] = useState('default');

  // Human Model Inputs
  const [modelEnable, setModelEnable] = useState(false);
  const [modelGender, setModelGender] = useState(MODEL_GENDERS[0].value);
  const [modelAge, setModelAge] = useState(MODEL_AGES[0].value);
  const [modelEthnicity, setModelEthnicity] = useState(MODEL_ETHNICITIES[0].value);
  const [modelPlacement, setModelPlacement] = useState(MODEL_PLACEMENTS[0].value);

  // 4 Angles Grid Collage
  const [multiAngle, setMultiAngle] = useState(false);
  const [useProductFlow, setUseProductFlow] = useState(false);
  const [angle1, setAngle1] = useState(VISUAL_ANGLES[1].value); // Default Panel 1: Front Angle
  const [angle2, setAngle2] = useState(VISUAL_ANGLES[3].value); // Default Panel 2: Close-Up
  const [angle3, setAngle3] = useState(VISUAL_ANGLES[0].value); // Default Panel 3: Eye-Level
  const [angle4, setAngle4] = useState(VISUAL_ANGLES[2].value); // Default Panel 4: Top View

  const [propsVal, setPropsVal] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('ugly, deformed, noisy, blurry, distorted, out of focus, bad anatomy, extra limbs, bad hands, mutated fingers, poorly drawn hands, poorly drawn face, disfigured, mutated face, mutated body');

  const handleGenerate = () => {
    const isCouple = propsVal.toLowerCase().includes('couple') || propsVal.toLowerCase().includes('prewedding') || productName.toLowerCase().includes('couple') || productName.toLowerCase().includes('prewedding');
    
    if (!isCouple && !productName.trim()) {
      alert("Mohon isi Nama Utama Produk terlebih dahulu.");
      return;
    }

    let modelContext = "";
    if (modelEnable && subjectMode === 'product') {
      const g = MODEL_GENDERS.find(x => x.value === modelGender)?.label.toLowerCase() || modelGender;
      const a = MODEL_AGES.find(x => x.value === modelAge)?.label.toLowerCase() || modelAge;
      const e = MODEL_ETHNICITIES.find(x => x.value === modelEthnicity)?.label.toLowerCase() || modelEthnicity;
      const p = MODEL_PLACEMENTS.find(x => x.value === modelPlacement)?.label.toLowerCase() || modelPlacement;
      modelContext = `The product is being used/worn by a ${a} ${e} ${g} model. The product is prominently featured on the ${p}. `;
    }

    const stLabel = VISUAL_STYLES.find(x => x.value === style)?.label || style;
    const vbLabel = VISUAL_VIBES.find(x => x.value === vibe)?.label || vibe;
    const bgLabel = VISUAL_BACKGROUNDS.find(x => x.value === background)?.label || background;
    const ltLabel = VISUAL_LIGHTINGS.find(x => x.value === lighting)?.label || lighting;
    const clLabel = VISUAL_COLORS.find(x => x.value === color)?.label || color;
    const agLabel = VISUAL_ANGLES.find(x => x.value === angle)?.label || angle;

    let finalPrompt = "";

    if (subjectMode === 'model') {
      const isCouple = propsVal.toLowerCase().includes('couple') || propsVal.toLowerCase().includes('prewedding') || productName.toLowerCase().includes('couple') || productName.toLowerCase().includes('prewedding');
      if (multiAngle) {
        if (isCouple) {
          const showcasingText = productName.trim() ? ` showcasing ${productName}` : "";
          finalPrompt = `Create a 4-panel grid photo collage of a beautiful romantic couple${showcasingText}. CRITICAL INSTRUCTION FOR CONSISTENCY: Maintain 100% absolute character, face, and body consistency for BOTH individuals across all 4 panels. You MUST strictly PRESERVE the exact original facial structure, facial features, hair, heights, and body shapes perfectly. The faces and clothing styles MUST remain absolutely identical and consistent in every panel. DO NOT morph or alter their facial identities. The face angle, head rotation, and gaze direction MUST strictly follow and match the original reference photo.\n\n`;
          finalPrompt += `1. Panel 1: Use a ${angle1}. Couple standing together in a ${background}, soft romantic pose, looking natural.\n`;
          finalPrompt += `2. Panel 2: Use a ${angle2}. Medium close-up on the couple showing their elegant expressions and outfits.\n`;
          finalPrompt += `3. Panel 3: Use a ${angle3}. Couple walking or interacting in a ${background}, accompanied by ${propsVal ? propsVal : 'minimalist aesthetic elements'}.\n`;
          finalPrompt += `4. Panel 4: Use a ${angle4}. Cinematic wide shot with dramatic lighting to provide a premium cinematic feel.\n\n`;
          finalPrompt += `General aesthetic: Style is ${style}, Vibe is ${vibe}, Color palette is ${color}. Highly detailed, 8k resolution, photorealistic prewedding masterpiece.`;
        } else {
          finalPrompt = `Create a 4-panel grid photo collage of a person showcasing ${productName}. CRITICAL INSTRUCTION: Maintain 100% absolute character consistency. You MUST strictly PRESERVE the exact original facial structure, eye shape, nose, mouth, jawline, hair, and body shape perfectly from the source image. The face MUST remain absolutely identical to the original input. DO NOT morph, beautify, or alter the person's facial identity in any way. The face angle, head rotation, and gaze direction MUST strictly follow and match the original reference photo.\n\n`;
          finalPrompt += `1. Panel 1: Use a ${angle1}. Standing in a ${background}, even soft lighting, looking natural.\n`;
          finalPrompt += `2. Panel 2: Use a ${angle2}. Close-up on the ${productName} worn by the person, shallow depth of field.\n`;
          finalPrompt += `3. Panel 3: Use a ${angle3}. Person interacting in a ${background}, accompanied by ${propsVal ? propsVal : 'minimalist aesthetic elements'}. Natural window sunlight lighting.\n`;
          finalPrompt += `4. Panel 4: Use a ${angle4}. Dynamic layout, dramatic lighting to provide a premium feel.\n\n`;
          finalPrompt += `General aesthetic: Style is ${style}, Vibe is ${vibe}, Color palette is ${color}. Highly detailed, 8k resolution, photorealistic commercial photography masterpiece.`;
        }
      } else {
        if (isCouple) {
          const showcasingText = productName.trim() ? ` showcasing ${productName}` : "";
          finalPrompt = `Photorealistic prewedding portrait of a romantic couple${showcasingText}. CRITICAL INSTRUCTION FOR CONSISTENCY: Maintain 100% absolute character, face, and body consistency for BOTH individuals. You MUST strictly PRESERVE the exact original facial structure, facial features, hair, and body shapes perfectly. The faces MUST remain absolutely identical and consistent. DO NOT morph or alter their identities in any way. The face angle, head rotation, and gaze direction MUST strictly follow and match the original reference photo. Camera Angle: ${angle}. `;
          finalPrompt += `Style: ${style}. Vibe: ${vibe}. Setting: Placed in a ${background}. Lighting: Illuminated by ${lighting}. Color Palette: ${color}. `;
          if (propsVal) finalPrompt += `Additional elements & pose details: Featuring ${propsVal}. `;
          finalPrompt += `Highly detailed, 8k resolution, photorealistic masterpiece, realistic skin texture, beautiful prewedding photography style, raw photo.`;
        } else {
          finalPrompt = `Photorealistic portrait of a person showcasing ${productName}. CRITICAL INSTRUCTION: Maintain 100% absolute character consistency. You MUST strictly PRESERVE the exact original facial structure, eye shape, nose, mouth, jawline, hair, and skin tone perfectly. The face MUST remain absolutely identical to the original input. DO NOT morph, beautify, or alter the person's facial identity in any way. The face angle, head rotation, and gaze direction MUST strictly follow and match the original reference photo. Camera Angle: ${angle}. `;
          finalPrompt += `Style: ${style}. Vibe: ${vibe}. Setting: Placed in a ${background}. Lighting: Illuminated by ${lighting}. Color Palette: ${color}. `;
          if (propsVal) finalPrompt += `Additional elements: Featuring ${propsVal}. `;
          finalPrompt += `Highly detailed, 8k resolution, photorealistic masterpiece, realistic skin texture, raw photo.`;
        }
      }
    } else if (subjectMode === 'poster') {
      const paletteContext = posterColorTheme === 'palette_ceria' 
        ? `STRICT COLOR PALETTE: You MUST strictly use the following hex colors: Cyan Blue (#00ACDF), Pale Cyan (#D4F6FF), Royal Blue (#2696E4), Yellow (#FFEA86), and Pale Yellow (#FFF8DB).`
        : `Color Palette is ${color}.`;

      const txt = posterText || 'SALE';

      if (multiAngle) {
        finalPrompt = `Create a 4-panel grid of different commercial promotional poster designs for "${productName}". CRITICAL INSTRUCTION: All 4 panels MUST feature the exact text/typography: "${txt}" seamlessly integrated into the graphic design.\n\n`;
        finalPrompt += `1. Panel 1 (${angle1}): Minimalist Layout, clean ${background} with lots of negative space for the text "${txt}".\n`;
        finalPrompt += `2. Panel 2 (${angle2}): Dynamic Layout, bold text overlay "${txt}".\n`;
        finalPrompt += `3. Panel 3 (${angle3}): Lifestyle Context, product on a ${background} with ${propsVal ? propsVal : 'aesthetic elements'}. The text "${txt}" interacts with the scene.\n`;
        finalPrompt += `4. Panel 4 (${angle4}): Macro Detail, elegant subtle typography displaying "${txt}".\n\n`;
        if (modelEnable) finalPrompt += `Include a ${modelAge} ${modelEthnicity} ${modelGender} model presenting the product.\n`;
        finalPrompt += `General aesthetic: Style is ${style}, Vibe is ${vibe}, ${paletteContext} 8k, masterpiece, professional advertising graphic design, visually striking.`;
      } else {
        finalPrompt = `A stunning, high-quality commercial promotional poster for "${productName}". CRITICAL INSTRUCTION: The poster prominently features the typography/text: "${txt}" written in a stylish, bold, and readable font that seamlessly blends with the composition. `;
        if (modelEnable) finalPrompt += `The poster includes a ${modelAge} ${modelEthnicity} ${modelGender} model holding or presenting the product. `;
        finalPrompt += `Camera Angle: ${angle}. Style: ${style}. Vibe: ${vibe}. Setting: Placed in a ${background}. Lighting: ${lighting}. ${paletteContext} `;
        if (propsVal) finalPrompt += `Additional elements: Featuring ${propsVal}. `;
        finalPrompt += `Masterpiece, 8k resolution, professional advertising photography, highly striking graphic design layout.`;
      }
    } else {
      // product mode
      if (multiAngle) {
        if (useProductFlow) {
          finalPrompt = `Create a structured 4-panel grid photo collage demonstrating ${productName} in a professional commercial format. The 4 panels MUST strictly follow this precise sequential presentation:\n\n`;
          finalPrompt += `1. Panel 1 (Gambar Produk): Use a ${angle1}. Showcase the entire ${productName} clearly as the main hero product. Clean solid background with soft even lighting.\n`;
          finalPrompt += `2. Panel 2 (Penggunaan Produk): Use a ${angle2}. Demonstrate the ${productName} in active use. ${modelEnable ? `A model is actively using the product naturally` : `Close-up action shot showing the product being used`} in a suitable ${background} environment.\n`;
          finalPrompt += `3. Panel 3 (Cara Penggunaan): Use a ${angle3}. Step-by-step visual presentation on how to operate or apply the ${productName}. Detail-focused shot displaying usage instructions or hand interaction with the product.\n`;
          finalPrompt += `4. Panel 4 (Angle Produk Lainnya): Use a ${angle4}. Showcase an alternative aesthetic angle or secondary detailed perspective of ${productName} with premium lighting to highlight its quality.\n\n`;
          if (modelEnable) finalPrompt += `Model details for relevant panels: ${modelAge} ${modelEthnicity} ${modelGender} model.\n`;
          finalPrompt += `General aesthetic: Style is ${style}, Vibe is ${vibe}, Color palette is ${color}. Highly detailed, 8k resolution, photorealistic commercial advertising presentation.`;
        } else {
          finalPrompt = `Create a 4-panel grid photo collage of ${productName} featuring 4 completely different compositions:\n\n`;
          finalPrompt += `1. Panel 1: Use a ${angle1}. Clean solid background, even soft lighting with no harsh shadows, full focus on the entire product. ${modelEnable ? `Model is posing naturally.` : ''}\n`;
          finalPrompt += `2. Panel 2: Use a ${angle2}. Highlighting the texture and fine details, shallow depth of field with a beautiful bokeh background. ${modelEnable ? `Focusing closely on the model's ${modelPlacement}.` : ''}\n`;
          finalPrompt += `3. Panel 3: Use a ${angle3}. Product placed on a ${background}, accompanied by props like ${propsVal ? propsVal : 'minimalist aesthetic elements'}. Natural window sunlight lighting. ${modelEnable ? `Model interacting with the product in a lifestyle setting.` : ''}\n`;
          finalPrompt += `4. Panel 4: Use a ${angle4}. Dramatic lighting with harsh shadows to provide a premium and elegant feel. ${modelEnable ? `Creative framing emphasizing the product on the model.` : ''}\n\n`;
          if (modelEnable) finalPrompt += `Model details: ${modelAge} ${modelEthnicity} ${modelGender} model.\n`;
          finalPrompt += `General aesthetic: Style is ${style}, Vibe is ${vibe}, Color palette is ${color}. Highly detailed, 8k resolution, photorealistic commercial photography masterpiece.`;
        }
      } else {
        finalPrompt = `Professional product photography of ${productName}. Camera Angle: ${angle}. `;
        finalPrompt += modelContext;
        finalPrompt += `Style: ${style}. Vibe: ${vibe}. Setting: Placed on a ${background}. Lighting: Illuminated by ${lighting}. Color Palette: ${color}. `;
        if (propsVal) finalPrompt += `Additional elements: Featuring ${propsVal}. `;
        finalPrompt += `Highly detailed, 8k resolution, photorealistic, commercial photography masterpiece, unreal engine 5 render style.`;
      }
    }

    if (negativePrompt.trim()) {
      finalPrompt += `\n\nNegative Prompt: ${negativePrompt.trim()}`;
    }

    onGenerate(finalPrompt);
  };

  return (
    <div className="space-y-4">
      {/* Subject Mode Switcher */}
      <div className="flex p-1 bg-slate-100 rounded-xl gap-1 border border-slate-200">
        <button
          type="button"
          onClick={() => setSubjectMode('product')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
            subjectMode === 'product' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Icons.Box className="w-4 h-4" /> Fokus Produk
        </button>
        <button
          type="button"
          onClick={() => setSubjectMode('model')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
            subjectMode === 'model' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Icons.UserSquare2 className="w-4 h-4" /> Fokus Model
        </button>
        <button
          type="button"
          onClick={() => setSubjectMode('poster')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
            subjectMode === 'poster' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Icons.LayoutTemplate className="w-4 h-4" /> Fokus Poster
        </button>
      </div>

      {/* Template Prompt Dropdown */}
      <div className="bg-blue-50/40 p-3 rounded-xl border border-blue-100 space-y-1.5 shadow-3xs">
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-blue-600 uppercase tracking-widest">
          <Icons.LayoutTemplate className="w-3.5 h-3.5" />
          <span>Template Parameter (Auto-Fill)</span>
        </div>
        <select
          onChange={(e) => handleTemplateSelect(e.target.value)}
          defaultValue=""
          className="w-full px-2.5 py-1.5 bg-white border border-blue-200 text-slate-800 rounded-lg outline-none text-xs font-semibold hover:border-blue-300 focus:ring-1 focus:ring-blue-400 transition-colors"
        >
          {TEMPLATE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Poster Specific Container */}
      {subjectMode === 'poster' && (
        <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 space-y-3">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Teks Pada Poster (Typografi)</label>
            <input
              type="text"
              value={posterText}
              onChange={(e) => setPosterText(e.target.value)}
              placeholder="Contoh: BIG SALE 50%, NEW ARRIVAL..."
              className="w-full px-3 py-2 bg-white border border-indigo-200 text-indigo-900 rounded-lg outline-none text-xs placeholder-indigo-300 font-semibold"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Inspirasi Gaya Teks (Klik untuk pakai)</label>
            <div className="grid grid-cols-2 gap-2">
              {POSTER_TEMPLATES.map((tpl, idx) => (
                <div
                  key={idx}
                  onClick={() => setPosterText(tpl.text)}
                  className="cursor-pointer group relative rounded-lg overflow-hidden border-2 border-transparent hover:border-indigo-500 transition-all aspect-[4/3] shadow-sm bg-slate-900"
                >
                  <img src={tpl.img} className="absolute inset-0 w-full h-full object-cover z-0 group-hover:scale-105 transition-transform duration-300 opacity-60" alt={tpl.title} />
                  <div className="absolute inset-0 z-10 bg-black/30 flex flex-col items-center justify-center text-center p-1">
                    <span className="text-white font-black text-[10px] tracking-wide uppercase leading-tight drop-shadow-md whitespace-pre-line">{tpl.previewText}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Template Warna Poster</label>
            <div className="flex gap-2">
              <label className="cursor-pointer flex-1">
                <input
                  type="radio"
                  name="posterColorTheme"
                  value="default"
                  checked={posterColorTheme === 'default'}
                  onChange={() => setPosterColorTheme('default')}
                  className="peer hidden"
                />
                <div className="border border-slate-200 peer-checked:border-indigo-500 peer-checked:bg-indigo-50 rounded-lg p-2 text-center text-xs font-bold text-slate-500 peer-checked:text-indigo-700 transition-all bg-white">
                  Ikuti Tema Bawaan
                </div>
              </label>
              <label className="cursor-pointer flex-1">
                <input
                  type="radio"
                  name="posterColorTheme"
                  value="palette_ceria"
                  checked={posterColorTheme === 'palette_ceria'}
                  onChange={() => setPosterColorTheme('palette_ceria')}
                  className="peer hidden"
                />
                <div className="border border-slate-200 peer-checked:border-indigo-500 peer-checked:bg-indigo-50 rounded-lg p-2 flex flex-col items-center justify-center gap-1 transition-all bg-white">
                  <span className="text-[10px] font-bold text-slate-500 peer-checked:text-indigo-700">Palet Ceria</span>
                  <div className="flex -space-x-1">
                    <div className="w-3.5 h-3.5 rounded-full bg-[#00ACDF] border border-white shadow-sm z-10" />
                    <div className="w-3.5 h-3.5 rounded-full bg-[#D4F6FF] border border-white shadow-sm z-20" />
                    <div className="w-3.5 h-3.5 rounded-full bg-[#2696E4] border border-white shadow-sm z-30" />
                    <div className="w-3.5 h-3.5 rounded-full bg-[#FFEA86] border border-white shadow-sm z-40" />
                  </div>
                </div>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Main Parameters Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Gaya Visual</label>
          <Dropdown label="Style" options={VISUAL_STYLES} selectedValue={style} onSelect={setStyle} accentColor="blue" />
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Nuansa (Vibe)</label>
          <Dropdown label="Vibe" options={VISUAL_VIBES} selectedValue={vibe} onSelect={setVibe} accentColor="blue" />
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Latar Belakang</label>
          <Dropdown label="Background" options={VISUAL_BACKGROUNDS} selectedValue={background} onSelect={setBackground} accentColor="blue" />
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Pencahayaan</label>
          <Dropdown label="Lighting" options={VISUAL_LIGHTINGS} selectedValue={lighting} onSelect={setLighting} accentColor="blue" />
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Palet Warna</label>
          <Dropdown label="Color Palette" options={VISUAL_COLORS} selectedValue={color} onSelect={setColor} accentColor="blue" />
        </div>
        {!multiAngle && (
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Sudut Kamera</label>
            <Dropdown label="Angle" options={VISUAL_ANGLES} selectedValue={angle} onSelect={setAngle} accentColor="blue" />
          </div>
        )}
      </div>

      {/* Toggle Model Manusia */}
      {subjectMode !== 'model' && (
        <div className="flex items-center p-3 bg-rose-50 border border-rose-100 rounded-xl transition-all">
          <input
            type="checkbox"
            id="modelEnable"
            checked={modelEnable}
            onChange={(e) => setModelEnable(e.target.checked)}
            className="w-5 h-5 text-rose-600 bg-white border-slate-300 rounded cursor-pointer accent-rose-600"
          />
          <label htmlFor="modelEnable" className="ml-3 cursor-pointer select-none">
            <span className="text-sm font-bold text-rose-900 flex items-center">
              <Icons.UserCheck className="w-4 h-4 mr-1.5" /> Gunakan Model Manusia
            </span>
          </label>
        </div>
      )}

      {/* Model Parameters (Only when using Model) */}
      {(modelEnable || subjectMode === 'model') && (
        <div className="p-4 border border-rose-100 bg-rose-50/50 rounded-xl space-y-3 transition-all duration-300">
          <p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest block mb-1 border-b border-rose-100 pb-2">Karakter & Detail Model AI</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Gender</label>
              <Dropdown label="Gender" options={MODEL_GENDERS} selectedValue={modelGender} onSelect={setModelGender} accentColor="rose" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Usia</label>
              <Dropdown label="Age" options={MODEL_AGES} selectedValue={modelAge} onSelect={setModelAge} accentColor="rose" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Etnis</label>
              <Dropdown label="Ethnicity" options={MODEL_ETHNICITIES} selectedValue={modelEthnicity} onSelect={setModelEthnicity} accentColor="rose" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Dipakai di Area</label>
              <Dropdown label="Placement" options={MODEL_PLACEMENTS} selectedValue={modelPlacement} onSelect={setModelPlacement} accentColor="rose" />
            </div>
          </div>
        </div>
      )}

      {/* Additional Props */}
      <div>
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Properti Tambahan (Opsional)</label>
        <input
          type="text"
          value={propsVal}
          onChange={(e) => setPropsVal(e.target.value)}
          placeholder="Contoh: Cipratan air, Daun monstera, ..."
          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-xs text-slate-800"
        />
      </div>

      {/* Negative Prompt */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Negative Prompt (Anti-Distorsi)</label>
          <span className="text-[9px] font-semibold text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded-sm">Anti-Face & Body Distortion</span>
        </div>
        <textarea
          value={negativePrompt}
          onChange={(e) => setNegativePrompt(e.target.value)}
          placeholder="Contoh: ugly, deformed, blurry, bad anatomy, distorted..."
          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-xs text-slate-800 font-mono h-16 resize-none"
        />
      </div>

      {/* Multi Angle Toggle (Not available for poster mode usually, but in original script, it has conditional checks) */}
      {subjectMode !== 'poster' && (
        <>
          <div className="flex flex-col gap-2 p-3 bg-blue-50 border border-blue-100 rounded-xl transition-all">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="multiAngle"
                checked={multiAngle}
                onChange={(e) => setMultiAngle(e.target.checked)}
                className="w-5 h-5 text-blue-600 bg-white border-slate-300 rounded cursor-pointer accent-blue-600"
              />
              <label htmlFor="multiAngle" className="ml-3 cursor-pointer select-none flex-1">
                <span className="text-sm font-bold text-blue-900 flex items-center">
                  Generate 4 Angle (Grid Collage)
                </span>
              </label>
            </div>

            {multiAngle && subjectMode === 'product' && (
              <div className="ml-8 mt-1 border-t border-blue-200/50 pt-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="useProductFlow"
                  checked={useProductFlow}
                  onChange={(e) => setUseProductFlow(e.target.checked)}
                  className="w-4.5 h-4.5 text-blue-600 bg-white border-slate-300 rounded cursor-pointer accent-blue-600"
                />
                <label htmlFor="useProductFlow" className="cursor-pointer select-none flex-1">
                  <span className="text-[11px] font-bold text-blue-800 flex items-center gap-1">
                    <Icons.PlayCircle className="w-3.5 h-3.5 text-blue-600" />
                    Alur Presentasi (Gambar, Penggunaan, Cara Pakai, Angle Lain)
                  </span>
                </label>
              </div>
            )}
          </div>

          {multiAngle && (
            <div className="grid grid-cols-2 gap-3 p-4 bg-blue-50/30 border border-blue-100 rounded-xl">
              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest block col-span-2 border-b border-blue-100 pb-2">Pilih Sudut Kamera (Angle) Grid</p>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">
                  {useProductFlow && subjectMode === 'product' ? 'Panel 1: Gambar Produk' : 'Panel 1 (Kiri Atas)'}
                </label>
                <Dropdown label="Angle 1" options={VISUAL_ANGLES} selectedValue={angle1} onSelect={setAngle1} accentColor="blue" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">
                  {useProductFlow && subjectMode === 'product' ? 'Panel 2: Penggunaan Produk' : 'Panel 2 (Kanan Atas)'}
                </label>
                <Dropdown label="Angle 2" options={VISUAL_ANGLES} selectedValue={angle2} onSelect={setAngle2} accentColor="blue" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">
                  {useProductFlow && subjectMode === 'product' ? 'Panel 3: Cara Penggunaan' : 'Panel 3 (Kiri Bawah)'}
                </label>
                <Dropdown label="Angle 3" options={VISUAL_ANGLES} selectedValue={angle3} onSelect={setAngle3} accentColor="blue" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">
                  {useProductFlow && subjectMode === 'product' ? 'Panel 4: Angle Lainnya' : 'Panel 4 (Kanan Bawah)'}
                </label>
                <Dropdown label="Angle 4" options={VISUAL_ANGLES} selectedValue={angle4} onSelect={setAngle4} accentColor="blue" />
              </div>
            </div>
          )}
        </>
      )}

      {/* Button Generate */}
      <button
        type="button"
        onClick={handleGenerate}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-2 group outline-none"
      >
        <Icons.Sparkles className="w-5 h-5 group-hover:animate-pulse" />
        <span>Generate Prompt Visual</span>
      </button>
    </div>
  );
};
