import { inflateRawSync, inflateSync } from 'node:zlib';

export type ExtractedDocument = { text: string; note: string };
function cleanXml(xml: string): string {
  return xml.replace(/<w:tab\b[^>]*\/>/g, '\t').replace(/<w:br\b[^>]*\/>/g, '\n').replace(/<\/w:p>/g, '\n').replace(/<\/row>/g, '\n').replace(/<\/c>/g, '\t').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/[ \t]+/g, ' ').replace(/\n[ \t]+/g, '\n').trim();
}
function zipEntries(buffer: Buffer): Map<string, Buffer> {
  let eocd = -1;
  for (let i = Math.max(0, buffer.length - 65558); i <= buffer.length - 22; i++) if (buffer.readUInt32LE(i) === 0x06054b50) eocd = i;
  if (eocd < 0) throw new Error('The uploaded Office file is not a valid ZIP-based document.');
  const count = buffer.readUInt16LE(eocd + 10); if (count > 5000) throw new Error('The Office document contains too many ZIP entries.'); let totalUncompressed = 0; let offset = buffer.readUInt32LE(eocd + 16); const entries = new Map<string, Buffer>();
  for (let n = 0; n < count; n++) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) break;
    const method = buffer.readUInt16LE(offset + 10), compressed = buffer.readUInt32LE(offset + 20), uncompressed = buffer.readUInt32LE(offset + 24), nameLen = buffer.readUInt16LE(offset + 28), extraLen = buffer.readUInt16LE(offset + 30), commentLen = buffer.readUInt16LE(offset + 32), localOffset = buffer.readUInt32LE(offset + 42);
    totalUncompressed += uncompressed; if (uncompressed > 25000000 || totalUncompressed > 50000000) throw new Error('The Office document contains oversized compressed content.');
    if (localOffset + 30 > buffer.length) throw new Error('The Office document contains an invalid ZIP entry offset.');
    const name = buffer.subarray(offset + 46, offset + 46 + nameLen).toString('utf8'); const localName = buffer.readUInt16LE(localOffset + 26), localExtra = buffer.readUInt16LE(localOffset + 28); const start = localOffset + 30 + localName + localExtra; if (start + compressed > buffer.length) throw new Error('The Office document contains a truncated ZIP entry.'); const bytes = buffer.subarray(start, start + compressed);
    if (method === 0) entries.set(name, Buffer.from(bytes)); else if (method === 8) entries.set(name, inflateRawSync(bytes));
    offset += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}
function extractDocx(buffer: Buffer): string { const entries = zipEntries(buffer); const xml = entries.get('word/document.xml'); if (!xml) throw new Error('The Word document does not contain its main document body.'); return cleanXml(xml.toString('utf8')); }
function extractXlsx(buffer: Buffer): string {
  const entries = zipEntries(buffer); const sharedXml = entries.get('xl/sharedStrings.xml')?.toString('utf8') || ''; const shared = [...sharedXml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map(m => cleanXml(m[1]));
  const sheets = [...entries.entries()].filter(([name]) => /^xl\/worksheets\/sheet\d+\.xml$/.test(name)).sort(([a],[b]) => a.localeCompare(b, undefined, { numeric: true }));
  const output: string[] = [];
  for (const [name, data] of sheets) {
    const xml = data.toString('utf8'); output.push(`SHEET: ${name.split('/').pop()}`);
    for (const row of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
      const cells: string[] = [];
      for (const cell of row[1].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
        const ref = cell[1].match(/\br="([A-Z]+)\d+"/)?.[1] || ''; const raw = cell[2].match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? (cell[2].match(/<is>([\s\S]*?)<\/is>/)?.[1] ?? ''); const isShared = /\bt="s"/.test(cell[1]); const value = isShared ? (shared[Number(raw)] ?? '') : cleanXml(raw); if (value) cells.push(`${ref}:${value}`);
      }
      if (cells.length) output.push(cells.join(' | '));
    }
  }
  return output.join('\n');
}
function extractPdf(buffer: Buffer): ExtractedDocument {
  const raw = buffer.toString('latin1'); const pieces: string[] = [];
  for (const stream of raw.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)) {
    let data = Buffer.from(stream[1], 'latin1'); const before = raw.slice(Math.max(0, (stream.index || 0) - 300), stream.index || 0);
    if (/FlateDecode/.test(before)) { try { data = inflateSync(data, { maxOutputLength: 25000000 }); } catch { try { data = inflateRawSync(data, { maxOutputLength: 25000000 }); } catch { continue; } } }
    const content = data.toString('latin1');
    for (const m of content.matchAll(/\(((?:\\.|[^\\)])*)\)\s*Tj/g)) pieces.push(m[1].replace(/\\([()\\])/g, '$1').replace(/\\n/g, '\n'));
    for (const arr of content.matchAll(/\[((?:.|\n)*?)\]\s*TJ/g)) for (const m of arr[1].matchAll(/\(((?:\\.|[^\\)])*)\)/g)) pieces.push(m[1].replace(/\\([()\\])/g, '$1'));
  }
  const text = pieces.join(' ').replace(/\s+/g, ' ').trim();
  if (!text) return { text: '', note: 'No selectable text was detected. This may be a scanned PDF; OCR is not enabled in this deployment. Please provide a searchable PDF or paste the extracted text for review.' };
  return { text, note: 'PDF text extraction is best-effort. Verify page references and table ordering against the original document.' };
}
export function extractDocument(fileName: string, buffer: Buffer): ExtractedDocument {
  const ext = fileName.toLowerCase().split('.').pop();
  if (ext === 'docx') return { text: extractDocx(buffer), note: 'Word paragraphs and table text extracted. Review formatting and table context before approving records.' };
  if (ext === 'xlsx') return { text: extractXlsx(buffer), note: 'Workbook sheets and cell values extracted. Column references are retained; verify the header mapping and row meaning.' };
  if (ext === 'pdf') return extractPdf(buffer);
  if (ext === 'txt' || ext === 'csv') return { text: buffer.toString('utf8').replace(/^\uFEFF/, ''), note: 'Text content extracted directly.' };
  if (ext === 'doc') throw new Error('Legacy .doc files are not supported by the built-in extractor. Save as .docx or PDF and upload again.');
  if (ext === 'xls') throw new Error('Legacy .xls workbooks are not supported by the built-in extractor. Save as .xlsx or CSV and upload again.');
  throw new Error('Supported formats are .xlsx, .docx, .pdf, .csv and .txt.');
}
