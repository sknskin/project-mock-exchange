/**
 * MD → PDF 변환 스크립트
 * Puppeteer를 사용하여 마크다운 감사 보고서를 실제 PDF로 변환
 *
 * MD to PDF conversion script
 * Converts markdown audit reports to real PDF using Puppeteer
 *
 * Usage:
 *   node scripts/md-to-pdf.mjs                  # 모든 MD 중 PDF 없는 것만 변환
 *   node scripts/md-to-pdf.mjs 12               # 특정 차수만 변환
 *   node scripts/md-to-pdf.mjs --force           # 기존 PDF 덮어쓰기
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPORT_DIR = join(__dirname, '..', 'public', 'docs', 'report');

/** 마크다운을 간단한 HTML로 변환 / Convert markdown to simple HTML */
function mdToHtml(md) {
  let html = md
    // 테이블 처리 / Tables
    .replace(/^\|(.+)\|$/gm, (match) => {
      const cells = match.split('|').filter(Boolean).map((c) => c.trim());
      return '<tr>' + cells.map((c) => `<td>${c}</td>`).join('') + '</tr>';
    })
    // 구분선 테이블 행 제거 / Remove separator rows
    .replace(/<tr>(<td>[-:| ]+<\/td>)+<\/tr>/g, '')
    // 헤더 / Headers
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // 굵게 / Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // 수평선 / Horizontal rules
    .replace(/^---$/gm, '<hr/>')
    // 리스트 / Lists
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    // 인라인 코드 / Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // 줄바꿈 / Line breaks
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br/>');

  // 테이블 래핑 / Wrap consecutive table rows
  html = html.replace(/((<tr>.*?<\/tr>\s*<br\/>?\s*)+)/g, '<table>$1</table>');

  return html;
}

/** PDF 생성 / Generate PDF */
async function generatePdf(mdPath, pdfPath) {
  const md = readFileSync(mdPath, 'utf-8');
  const htmlContent = mdToHtml(md);

  const fullHtml = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8"/>
<style>
  @page { margin: 20mm 15mm; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif;
    font-size: 11px;
    line-height: 1.7;
    color: #1a1a1a;
    max-width: 100%;
  }
  h1 { font-size: 20px; margin: 0 0 4px; border-bottom: 2px solid #2563eb; padding-bottom: 8px; }
  h2 { font-size: 16px; margin: 20px 0 8px; color: #1e40af; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
  h3 { font-size: 13px; margin: 14px 0 4px; color: #333; }
  hr { border: none; border-top: 1px solid #e5e5e5; margin: 16px 0; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 10.5px; }
  td, th { border: 1px solid #ddd; padding: 5px 8px; text-align: left; vertical-align: top; }
  tr:first-child td { background: #f0f4ff; font-weight: 600; }
  li { margin: 2px 0; padding-left: 4px; list-style: none; }
  li::before { content: "• "; color: #2563eb; font-weight: bold; }
  code { background: #f3f4f6; padding: 1px 4px; border-radius: 3px; font-size: 10px; font-family: 'SF Mono', Menlo, monospace; }
  strong { color: #111; }
  p { margin: 4px 0; }
</style>
</head>
<body><p>${htmlContent}</p></body>
</html>`;

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setContent(fullHtml, { waitUntil: 'networkidle0' });
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
  });
  await browser.close();
}

// CLI 실행 / CLI execution
const args = process.argv.slice(2);
const force = args.includes('--force');
const targetNum = args.find((a) => /^\d+$/.test(a));

const mdFiles = readdirSync(REPORT_DIR).filter((f) => /^(audit-report|perf-audit)-\d+\.md$/.test(f));

let converted = 0;
for (const mdFile of mdFiles) {
  const mdMatch = mdFile.match(/^(audit-report|perf-audit)-(\d+)\.md$/);
  const prefix = mdMatch[1];
  const num = mdMatch[2];
  if (targetNum && num !== targetNum) continue;

  const mdPath = join(REPORT_DIR, mdFile);
  const pdfPath = join(REPORT_DIR, `${prefix}-${num}.pdf`);

  // 기존 PDF가 진짜 PDF인지 확인 / Check if existing PDF is a real PDF
  let needsConvert = force || !existsSync(pdfPath);
  if (!needsConvert && existsSync(pdfPath)) {
    const header = readFileSync(pdfPath, { encoding: null }).subarray(0, 5).toString();
    if (!header.startsWith('%PDF-')) {
      needsConvert = true; // 가짜 PDF → 재생성 / Fake PDF → regenerate
    }
  }

  if (!needsConvert) continue;

  console.log(`  Converting: ${mdFile} → ${prefix}-${num}.pdf`);
  await generatePdf(mdPath, pdfPath);
  converted++;
}

console.log(converted > 0 ? `Done: ${converted} PDF(s) generated` : 'All PDFs are up to date');
