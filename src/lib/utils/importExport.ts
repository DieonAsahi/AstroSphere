/**
 * Utilitas Export & Bulk Import (JSON & CSV RFC-4180) untuk Panel Admin AstroSphere.
 */

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_REGEX.test(value.trim());
}

/**
 * Memicu unduhan file di browser secara aman.
 */
export function triggerFileDownload(
  content: string,
  filename: string,
  mimeType: string
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

/**
 * Mengunduh array objek sebagai file JSON terformat rapi.
 */
export function exportAsJson<T>(data: T[], filename: string): void {
  const jsonText = JSON.stringify(data, null, 2);
  triggerFileDownload(jsonText, filename, 'application/json;charset=utf-8;');
}

function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Mengonversi array objek ke CSV berstandar RFC-4180 (dengan UTF-8 BOM untuk Excel) dan mengunduhnya.
 */
export function exportAsCsv(
  headers: string[],
  rows: Array<Record<string, unknown>>,
  filename: string
): void {
  const headerLine = headers.map(escapeCsvCell).join(',');
  const dataLines = rows.map((row) =>
    headers.map((key) => escapeCsvCell(row[key])).join(',')
  );
  const csvContent = `\uFEFF${[headerLine, ...dataLines].join('\r\n')}`;
  triggerFileDownload(csvContent, filename, 'text/csv;charset=utf-8;');
}

function detectDelimiter(headerSample: string): ',' | ';' {
  let inQuotes = false;
  let commaCount = 0;
  let semicolonCount = 0;
  for (let i = 0; i < headerSample.length; i += 1) {
    const ch = headerSample[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (!inQuotes) {
      if (ch === ',') commaCount += 1;
      if (ch === ';') semicolonCount += 1;
    }
  }
  return semicolonCount > 0 && commaCount === 0 ? ';' : ',';
}

/**
 * Parser CSV RFC-4180 yang mendukung tanda kutip ganda, kutip bertingkat (""), dan newline di dalam sel.
 */
export function parseCsvToRecords(rawText: string): Array<Record<string, string>> {
  const cleanText = rawText.replace(/^\uFEFF/, '');
  if (!cleanText.trim()) return [];

  const firstNewline = cleanText.search(/\r?\n/);
  const firstLine = firstNewline === -1 ? cleanText : cleanText.slice(0, firstNewline);
  const delimiter = detectDelimiter(firstLine);

  const matrix: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  for (let i = 0; i < cleanText.length; i += 1) {
    const ch = cleanText[i];
    const next = cleanText[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        currentCell += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        currentCell += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      currentRow.push(currentCell);
      currentCell = '';
    } else if (ch === '\r' && next === '\n') {
      currentRow.push(currentCell);
      matrix.push(currentRow);
      currentRow = [];
      currentCell = '';
      i += 1;
    } else if (ch === '\n' || ch === '\r') {
      currentRow.push(currentCell);
      matrix.push(currentRow);
      currentRow = [];
      currentCell = '';
    } else {
      currentCell += ch;
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell);
    matrix.push(currentRow);
  }

  const nonEmptyRows = matrix.filter((row) => row.some((cell) => cell.trim() !== ''));
  if (nonEmptyRows.length < 2) return [];

  const headers = nonEmptyRows[0].map((h) => h.trim().toLowerCase());
  const records: Array<Record<string, string>> = [];

  for (let r = 1; r < nonEmptyRows.length; r += 1) {
    const cells = nonEmptyRows[r];
    const obj: Record<string, string> = {};
    headers.forEach((header, idx) => {
      if (header) {
        obj[header] = (cells[idx] ?? '').trim();
      }
    });
    records.push(obj);
  }

  return records;
}

/**
 * Mengurai teks file JSON atau CSV menjadi array record mentah untuk validasi import.
 */
export function parseImportFileContent(
  fileName: string,
  text: string
): Array<Record<string, unknown>> {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.json') || text.trim().startsWith('[') || text.trim().startsWith('{')) {
    const parsed: unknown = JSON.parse(text);
    const items = Array.isArray(parsed)
      ? parsed
      : parsed && typeof parsed === 'object' && 'data' in parsed && Array.isArray((parsed as { data: unknown }).data)
      ? (parsed as { data: unknown[] }).data
      : null;

    if (!items) {
      throw new Error('Format JSON harus berupa array objek ([{...}, ...]).');
    }
    return items.filter(
      (item): item is Record<string, unknown> => Boolean(item && typeof item === 'object')
    );
  }

  if (lower.endsWith('.csv')) {
    const rows = parseCsvToRecords(text);
    if (rows.length === 0) {
      throw new Error('File CSV kosong atau tidak memiliki baris data di bawah header.');
    }
    return rows;
  }

  throw new Error('Format file tidak didukung. Harap unggah file .json atau .csv.');
}

