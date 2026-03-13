/* global console */
/**
 * 감사 보고서 매니페스트 자동 생성 스크립트
 * public/docs/report/ 디렉토리의 PDF + MD 파일을 스캔하여 manifest.json 생성
 *
 * Audit report manifest generator
 * Scans public/docs/report/ for PDF + MD files and generates manifest.json
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPORT_DIR = join(__dirname, '..', 'public', 'docs', 'report');
const MANIFEST_PATH = join(REPORT_DIR, 'manifest.json');

const PDF_PATTERN = /^(audit-report|perf-audit)-(\d+)\.pdf$/;
const MD_ONLY_PATTERN = /^(audit-report|perf-audit)-(\d+)\.md$/;

function extractDateFromMd(mdPath) {
  try {
    const content = readFileSync(mdPath, 'utf-8');
    // **작성일:** 또는 - 감사일: 형식에서 날짜 추출
    // Extract date from **작성일:** or - 감사일: format
    const match = content.match(/(?:\*\*작성일:\*\*|감사일:)\s*(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
  } catch { /* 파일 없으면 무시 */ }
  return null;
}

function extractLabelFromMd(mdPath) {
  try {
    const content = readFileSync(mdPath, 'utf-8');
    // # VirtuEx 시스템 감사 보고서 (N차) 형식에서 부제 추출
    const match = content.match(/^#\s+(.+)$/m);
    if (match) return match[1].trim();
  } catch { /* 파일 없으면 무시 */ }
  return null;
}

const files = readdirSync(REPORT_DIR);
const reports = [];
const pdfNums = new Set();

// 1) PDF 파일 처리 / Process PDF files
for (const file of files) {
  const match = file.match(PDF_PATTERN);
  if (!match) continue;

  const prefix = match[1]; // 'audit-report' or 'perf-audit'
  const num = parseInt(match[2], 10);
  const key = `${prefix}-${num}`;
  pdfNums.add(key);
  const pdfPath = join(REPORT_DIR, file);
  const mdPath = join(REPORT_DIR, `${prefix}-${num}.md`);

  // MD에서 날짜와 라벨 추출, 실패 시 파일 수정일 사용
  const date = extractDateFromMd(mdPath) ||
    statSync(pdfPath).mtime.toISOString().split('T')[0];
  const label = extractLabelFromMd(mdPath) ||
    (prefix === 'perf-audit'
      ? `VirtuEx 성능 개선 감사 보고서 (${num}차)`
      : `VirtuEx 시스템 감사 보고서 (${num}차)`);

  // 성능 감사는 일반 감사 뒤에 정렬 (perf: 10000+N, audit: N)
  const order = (prefix === 'perf-audit' ? 10000 : 0) + num;

  const type = prefix === 'perf-audit' ? 'performance' : 'general';

  reports.push({
    name: file,
    path: `/docs/report/${file}`,
    label,
    date,
    type,
    order,
  });
}

// 2) PDF 없이 MD만 있는 보고서 처리 / Process MD-only reports (no corresponding PDF)
for (const file of files) {
  const match = file.match(MD_ONLY_PATTERN);
  if (!match) continue;

  const prefix = match[1];
  const num = parseInt(match[2], 10);
  const key = `${prefix}-${num}`;
  if (pdfNums.has(key)) continue; // PDF가 이미 있으면 건너뛰기

  const mdPath = join(REPORT_DIR, file);
  const date = extractDateFromMd(mdPath) ||
    statSync(mdPath).mtime.toISOString().split('T')[0];
  const label = extractLabelFromMd(mdPath) ||
    (prefix === 'perf-audit'
      ? `VirtuEx 성능 개선 감사 보고서 (${num}차)`
      : `VirtuEx 시스템 감사 보고서 (${num}차)`);

  const order = (prefix === 'perf-audit' ? 10000 : 0) + num;
  const type = prefix === 'perf-audit' ? 'performance' : 'general';

  reports.push({
    name: file,
    path: `/docs/report/${file}`,
    label,
    date,
    type,
    order,
  });
}

// 최신(높은 차수)이 위로 정렬
reports.sort((a, b) => b.order - a.order);

// order 필드 제거 후 저장
// eslint-disable-next-line no-unused-vars
const manifest = reports.map(({ order, ...rest }) => rest);
writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');

console.log(`Generated audit manifest: ${manifest.length} reports`);
