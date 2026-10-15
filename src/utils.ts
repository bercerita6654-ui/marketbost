export function parseCSV(str: string): string[][] {
  const arr: string[][] = [];
  let quote = false;
  let row = 0, col = 0;
  for (let c = 0; c < str.length; c++) {
    const cc = str[c];
    const nc = str[c + 1];
    arr[row] = arr[row] || [];
    arr[row][col] = arr[row][col] || '';
    if (cc === '"' && quote && nc === '"') {
      arr[row][col] += cc;
      c++;
      continue;
    }
    if (cc === '"') {
      quote = !quote;
      continue;
    }
    if (cc === ',' && !quote) {
      col++;
      continue;
    }
    if (cc === '\r' && nc === '\n' && !quote) {
      row++;
      col = 0;
      c++;
      continue;
    }
    if (cc === '\n' && !quote) {
      row++;
      col = 0;
      continue;
    }
    if (cc === '\r' && !quote) {
      row++;
      col = 0;
      continue;
    }
    arr[row][col] += cc;
  }
  return arr;
}

export async function fetchCSVDatabase(url: string): Promise<{ name: string; url: string }[]> {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Gagal mengambil data database');
    const text = await res.text();
    const rows = parseCSV(text);
    const result: { name: string; url: string }[] = [];
    
    // Assume Header is row 0: [Name, URL/Link]
    for (let i = 1; i < rows.length; i++) {
      if (rows[i] && rows[i].length >= 2) {
        const name = rows[i][0].trim();
        const link = rows[i][1].trim();
        if (name && link) {
          result.push({ name, url: link });
        }
      }
    }
    return result;
  } catch (e) {
    console.error('Error fetching database:', e);
    return [];
  }
}

export function fallbackCopyToClipboard(text: string): Promise<boolean> {
  return new Promise((resolve) => {
    const tempTextArea = document.createElement('textarea');
    tempTextArea.value = text;
    tempTextArea.style.position = 'fixed';
    tempTextArea.style.top = '-9999px';
    tempTextArea.style.left = '-9999px';
    tempTextArea.style.opacity = '0';
    document.body.appendChild(tempTextArea);
    tempTextArea.focus({ preventScroll: true });
    tempTextArea.select();
    let success = false;
    try {
      success = document.execCommand('copy');
    } catch (e) {
      success = false;
    }
    document.body.removeChild(tempTextArea);
    resolve(success);
  });
}

export async function copyToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      return fallbackCopyToClipboard(text);
    }
  } else {
    return fallbackCopyToClipboard(text);
  }
}

/**
 * Intelligent keyword extractor for Indonesian e-commerce marketplace SEO.
 * Automatically generates 3-5 high-converting search keywords from a product name.
 */
export function extractKeywordsFromProductName(name: string): string[] {
  if (!name || !name.trim()) return [];

  // Clean special characters and lowercase
  const clean = name
    .toLowerCase()
    .replace(/[^\w\s-]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const words = clean.split(' ').filter(w => w.length > 1);
  if (words.length === 0) return [];

  const stopWords = new Set([
    'dan', 'yang', 'untuk', 'dengan', 'di', 'ke', 'dari', 'buat', 'atau', 'pada', 
    'ini', 'itu', 'bisa', 'ada', 'yg', 'dgn', 'utk', 'karena', 'agar', 'oleh',
    'dalam', 'atas', 'bawah', 'serta', 'pun', 'juga', 'saat', 'sudah', 'telah',
    'promo', 'diskon', 'terlaris', 'murah', 'grosir', 'resmi', 'original', 'ori',
    'asli', 'premium', 'terbaik', 'terbaru', 'new', 'sale', 'hot', 'ready', 'stock'
  ]);

  const activeWords = words.filter(w => !stopWords.has(w));
  const pool = activeWords.length >= 2 ? activeWords : words;

  const result: string[] = [];
  const addKw = (kw: string) => {
    const trimmed = kw.trim();
    if (trimmed && trimmed.length >= 3 && !result.includes(trimmed) && result.length < 5) {
      result.push(trimmed);
    }
  };

  // 1. Primary bigram (first two words)
  if (pool.length >= 2) {
    addKw(`${pool[0]} ${pool[1]}`);
  }

  // 2. Secondary bigram (first word + third word, or second + third)
  if (pool.length >= 3) {
    addKw(`${pool[0]} ${pool[2]}`);
    addKw(`${pool[1]} ${pool[2]}`);
  }

  // 3. Category + Last attribute (e.g. "sepatu pria", "serum glowing")
  if (pool.length >= 4) {
    addKw(`${pool[0]} ${pool[pool.length - 1]}`);
    addKw(`${pool[pool.length - 2]} ${pool[pool.length - 1]}`);
  }

  // 4. Consecutive pairs
  for (let i = 0; i < pool.length - 1; i++) {
    if (result.length >= 5) break;
    addKw(`${pool[i]} ${pool[i + 1]}`);
  }

  // 5. Full phrase if concise (3 words or less)
  if (words.length >= 2 && words.length <= 4) {
    addKw(clean);
  }

  // 6. Fallback single high-priority words if fewer than 4 keywords
  for (const w of pool) {
    if (result.length >= 5) break;
    addKw(w);
  }

  return result.slice(0, 5);
}

/**
 * Cleans and standardizes raw copy or AI output (e.g. from Gemini) to match
 * the clean plain text marketplace standard requested by users:
 * - Strips Markdown bold (**) and headers (###)
 * - Removes bullets (•, -, *, +, numbers) from titles, specs, advantages, and store notes
 * - Ensures DETAIL SPESIFIKASI and CATATAN TOKO are tightly packed with single newlines
 * - Ensures 1 blank line between titles, advantages, and major sections
 */
export function cleanSeoFormatting(input: string): string {
  if (!input || !input.trim()) return input;

  // 1. Remove markdown bold/italic asterisks, hash headers & divider lines
  let text = input
    .replace(/\r\n/g, '\n')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^-{3,}\s*$/gm, '');

  const stripBullet = (line: string): string => {
    return line.replace(/^[\s•\-*+]+/, '').replace(/^\d+[\.\)]\s+/, '').trim();
  };

  // Normalize known section headers
  text = text.replace(/REKOMENDASI JUDUL SEO(\s*\([^)]*\))?:?/gi, 'REKOMENDASI JUDUL SEO:');
  text = text.replace(/DETAIL SPESIFIKASI:?/gi, 'DETAIL SPESIFIKASI:');
  text = text.replace(/KEUNGGULAN UTAMA:?/gi, 'KEUNGGULAN UTAMA:');
  text = text.replace(/PENGALAMAN PEMAKAIAN:?/gi, 'PENGALAMAN PEMAKAIAN:');
  text = text.replace(/SANGAT COCOK UNTUK:?/gi, 'SANGAT COCOK UNTUK:');
  text = text.replace(/CATATAN TOKO:?/gi, 'CATATAN TOKO:');

  const getSectionContent = (startHeader: string, nextHeaders: string[]): string => {
    const idx = text.indexOf(startHeader);
    if (idx === -1) return '';
    const startPos = idx + startHeader.length;
    let endPos = text.length;
    for (const nh of nextHeaders) {
      const nIdx = text.indexOf(nh, startPos);
      if (nIdx !== -1 && nIdx < endPos) {
        endPos = nIdx;
      }
    }
    return text.substring(startPos, endPos).trim();
  };

  const rawJudul = getSectionContent('REKOMENDASI JUDUL SEO:', ['DETAIL SPESIFIKASI:', 'KEUNGGULAN UTAMA:']);
  const rawSpesifikasi = getSectionContent('DETAIL SPESIFIKASI:', ['KEUNGGULAN UTAMA:', 'PENGALAMAN PEMAKAIAN:']);
  const rawKeunggulan = getSectionContent('KEUNGGULAN UTAMA:', ['PENGALAMAN PEMAKAIAN:', 'SANGAT COCOK UNTUK:']);
  const rawPengalaman = getSectionContent('PENGALAMAN PEMAKAIAN:', ['SANGAT COCOK UNTUK:', 'CATATAN TOKO:']);
  const rawCocok = getSectionContent('SANGAT COCOK UNTUK:', ['CATATAN TOKO:']);
  const rawCatatan = getSectionContent('CATATAN TOKO:', []);

  const hasAnySection = [rawJudul, rawSpesifikasi, rawKeunggulan, rawPengalaman, rawCocok, rawCatatan].some(Boolean);
  if (!hasAnySection) {
    return text
      .split('\n')
      .map(l => stripBullet(l))
      .join('\n')
      .trim();
  }

  // Format Judul SEO: separated by 1 blank line, no bullets
  const cleanJudul = rawJudul
    ? rawJudul
        .split('\n')
        .map(l => stripBullet(l))
        .filter(l => l.length > 0)
        .join('\n\n')
    : '';

  // Format Detail Spesifikasi: tightly packed (single newline), no bullets
  const cleanSpesifikasi = rawSpesifikasi
    ? rawSpesifikasi
        .split('\n')
        .map(l => stripBullet(l))
        .filter(l => l.length > 0)
        .join('\n')
    : '';

  // Format Keunggulan Utama: separated by 1 blank line, no bullets
  const cleanKeunggulan = rawKeunggulan
    ? rawKeunggulan
        .split('\n')
        .map(l => stripBullet(l))
        .filter(l => l.length > 0)
        .join('\n\n')
    : '';

  // Format Pengalaman Pemakaian: single flowing paragraph / paragraphs
  const cleanPengalaman = rawPengalaman
    ? rawPengalaman
        .split('\n')
        .map(l => stripBullet(l))
        .filter(l => l.length > 0)
        .join('\n\n')
    : '';

  // Format Sangat Cocok Untuk: tightly packed
  const cleanCocok = rawCocok
    ? rawCocok
        .split('\n')
        .map(l => stripBullet(l))
        .filter(l => l.length > 0)
        .join('\n')
    : '';

  // Format Catatan Toko: tightly packed (single newline), no bullets
  const cleanCatatan = rawCatatan
    ? rawCatatan
        .split('\n')
        .map(l => stripBullet(l))
        .filter(l => l.length > 0)
        .join('\n')
    : '';

  const blocks: string[] = [];
  if (cleanJudul) {
    blocks.push(`REKOMENDASI JUDUL SEO:\n\n${cleanJudul}`);
  }
  if (cleanSpesifikasi) {
    blocks.push(`DETAIL SPESIFIKASI:\n${cleanSpesifikasi}`);
  }
  if (cleanKeunggulan) {
    blocks.push(`KEUNGGULAN UTAMA:\n${cleanKeunggulan}`);
  }
  if (cleanPengalaman) {
    blocks.push(`PENGALAMAN PEMAKAIAN:\n${cleanPengalaman}`);
  }
  if (cleanCocok) {
    blocks.push(`SANGAT COCOK UNTUK:\n${cleanCocok}`);
  }
  if (cleanCatatan) {
    blocks.push(`CATATAN TOKO:\n${cleanCatatan}`);
  }

  return blocks.length > 0 ? blocks.join('\n\n') : text.trim();
}
