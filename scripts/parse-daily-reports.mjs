import { promises as fs } from 'fs';
import path from 'path';

const OUTPUT_DIR = path.resolve('output');
const ANALYSIS_DIR = path.join(OUTPUT_DIR, 'task-analysis');
const OUTPUT_JSON = path.join(ANALYSIS_DIR, 'daily_reports.json');

const SECTION_MAP = {
  '本日の業務内容': 'work',
  '本日の成果': 'achievements',
  '課題・反省点': 'issues',
  '明日の予定': 'plans',
};

const CHECKLIST_SECTIONS = new Set(['work', 'plans']);

function normalizeDate(jpDate) {
  if (!jpDate) return null;
  const match = jpDate.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (!match) return jpDate.trim();
  const [, year, month, day] = match;
  const mm = month.padStart(2, '0');
  const dd = day.padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

function parseChecklistLine(line) {
  const match = line.match(/^[-\*]\s*\[(x|X| )\]\s*(.+)$/);
  if (!match) return null;
  const [, flag, text] = match;
  return {
    done: flag.toLowerCase() === 'x',
    text: text.trim(),
  };
}

function parseBulletLine(line) {
  const match = line.match(/^[-\*]\s*(.+)$/);
  if (!match) return null;
  return match[1].trim();
}

function parseReport(content, fileName) {
  const lines = content.split(/\r?\n/);
  const report = {
    sourceFile: fileName,
    date: null,
    name: null,
    sections: {
      work: [],
      achievements: [],
      issues: [],
      plans: [],
    },
  };

  let currentSectionKey = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith('- **日付**')) {
      const dateText = line.split(':')[1]?.trim();
      report.date = normalizeDate(dateText);
      continue;
    }

    if (line.startsWith('- **氏名**')) {
      const nameText = line.split(':')[1]?.trim();
      report.name = nameText && nameText !== '（未記入。ご指示ください）' ? nameText : null;
      continue;
    }

    const sectionMatch = line.match(/^###\s+(.+)$/);
    if (sectionMatch) {
      const title = sectionMatch[1].trim();
      currentSectionKey = SECTION_MAP[title] ?? null;
      continue;
    }

    if (!currentSectionKey) continue;

    if (CHECKLIST_SECTIONS.has(currentSectionKey)) {
      const checklistItem = parseChecklistLine(line);
      if (checklistItem) {
        report.sections[currentSectionKey].push(checklistItem);
        continue;
      }
    }

    const bullet = parseBulletLine(line);
    if (bullet) {
      report.sections[currentSectionKey].push(bullet);
    }
  }

  if (!report.date) {
    console.warn(`日付が見つかりません: ${fileName}`);
    return null;
  }

  return report;
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function main() {
  await ensureDir(ANALYSIS_DIR);
  const files = await fs.readdir(OUTPUT_DIR);
  const reportFiles = files.filter((file) => /-日報\.md$/.test(file));
  reportFiles.sort();

  const reports = [];
  for (const file of reportFiles) {
    const filePath = path.join(OUTPUT_DIR, file);
    const content = await fs.readFile(filePath, 'utf8');
    const parsed = parseReport(content, file);
    if (parsed) {
      reports.push(parsed);
    }
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    reportCount: reports.length,
    reports,
  };

  await fs.writeFile(OUTPUT_JSON, JSON.stringify(payload, null, 2), 'utf8');
  console.log(`分析データを出力しました: ${OUTPUT_JSON}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
