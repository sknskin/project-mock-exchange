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

const PDF_PATTERN = /^audit-report-(\d+)\.pdf$/;

function extractDateFromMd(mdPath) {
  try {
    const content = readFileSync(mdPath, 'utf-8');
    // **작성일:** 2026-03-07 형식에서 날짜 추출
    const match = content.match(/\*\*작성일:\*\*\s*(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
  } catch {}
  return null;
}

function extractLabelFromMd(mdPath) {
  try {
    const content = readFileSync(mdPath, 'utf-8');
    // # VirtuEx 시스템 감사 보고서 (N차) 형식에서 부제 추출
    const match = content.match(/^#\s+(.+)$/m);
    if (match) return match[1].trim();
  } catch {}
  return null;
}

const files = readdirSync(REPORT_DIR);
const reports = [];

for (const file of files) {
  const match = file.match(PDF_PATTERN);
  if (!match) continue;

  const num = parseInt(match[1], 10);
  const pdfPath = join(REPORT_DIR, file);
  const mdPath = join(REPORT_DIR, `audit-report-${num}.md`);

  // MD에서 날짜와 라벨 추출, 실패 시 파일 수정일 사용
  const date = extractDateFromMd(mdPath) ||
    statSync(pdfPath).mtime.toISOString().split('T')[0];
  const label = extractLabelFromMd(mdPath) ||
    `VirtuEx 시스템 감사 보고서 (${num}차)`;

  reports.push({
    name: file,
    path: `/docs/report/${file}`,
    label,
    date,
    order: num,
  });
}

// 최신(높은 차수)이 위로 정렬
reports.sort((a, b) => b.order - a.order);

// order 필드 제거 후 저장
const manifest = reports.map(({ order, ...rest }) => rest);
writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');

console.log(`Generated audit manifest: ${manifest.length} reports`);
