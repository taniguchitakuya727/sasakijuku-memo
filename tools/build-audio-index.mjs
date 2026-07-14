import fs from 'node:fs';
import path from 'node:path';

const AUDIO_DIR = '差取り塾音声';
const OUTPUT_FILE = 'audio-index.json';
const AUDIO_EXTENSIONS = new Set(['mp3', 'm4a', 'wav', 'aac', 'flac', 'ogg', 'opus', 'webm', 'mp4', 'mov']);

function buildDateKey(year, month, day) {
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  const date = new Date(y, m - 1, d);
  if (
    date.getFullYear() !== y ||
    date.getMonth() !== m - 1 ||
    date.getDate() !== d
  ) return '';
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function extractDateFromFileName(fileName) {
  const shortDate = fileName.match(/(?:^|[^\d])(\d{2})(\d{2})(\d{2})(?:[^\d]|$)/);
  if (shortDate) {
    const dateKey = buildDateKey(2000 + Number(shortDate[1]), shortDate[2], shortDate[3]);
    if (dateKey) return dateKey;
  }

  const patterns = [
    /(\d{4})[-_.](\d{1,2})[-_.](\d{1,2})/,
    /(\d{4})年(\d{1,2})月(\d{1,2})日?/,
    /(?:^|[^\d])(\d{4})(\d{2})(\d{2})(?:[^\d]|$)/
  ];

  for (const pattern of patterns) {
    const match = fileName.match(pattern);
    if (!match) continue;
    const dateKey = buildDateKey(match[1], match[2], match[3]);
    if (dateKey) return dateKey;
  }
  return '';
}

function isAudioFile(fileName) {
  const ext = path.extname(fileName).slice(1).toLowerCase();
  return AUDIO_EXTENSIONS.has(ext);
}

if (!fs.existsSync(AUDIO_DIR)) {
  throw new Error(`${AUDIO_DIR} が見つかりません`);
}

const grouped = {};
const fileNames = fs.readdirSync(AUDIO_DIR, {withFileTypes: true})
  .filter(entry => entry.isFile())
  .map(entry => entry.name)
  .filter(isAudioFile)
  .sort((a, b) => a.localeCompare(b, 'ja'));

for (const fileName of fileNames) {
  const dateKey = extractDateFromFileName(fileName);
  if (!dateKey) continue;
  if (!grouped[dateKey]) grouped[dateKey] = [];
  grouped[dateKey].push(fileName);
}

const dates = {};
for (const dateKey of Object.keys(grouped).sort()) {
  const names = grouped[dateKey];
  dates[dateKey] = {
    fileName: names[0],
    fileNames: names,
    count: names.length
  };
}

const index = {
  generatedAt: new Date().toISOString(),
  folderName: AUDIO_DIR,
  scope: 'root-files-only',
  totalFiles: fileNames.length,
  datedFiles: Object.values(grouped).reduce((sum, names) => sum + names.length, 0),
  dates
};

fs.writeFileSync(OUTPUT_FILE, `${JSON.stringify(index, null, 2)}\n`);
console.log(`${OUTPUT_FILE} を作成しました: ${index.datedFiles}/${index.totalFiles} 件`);
