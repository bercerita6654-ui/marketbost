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
