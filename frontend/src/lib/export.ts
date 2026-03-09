/**
 * @file CSV 내보내기 유틸리티
 * @description 데이터를 CSV 파일로 변환하고 다운로드를 트리거합니다
 *
 * @file CSV Export Utility
 * @description Converts data to CSV file and triggers download
 */

/**
 * CSV 셀 값을 이스케이프 처리 (쉼표, 따옴표, 줄바꿈, 공백 포함 시 큰따옴표로 감싸기)
 * Escapes a CSV cell value, wrapping in double-quotes when needed.
 */
function escapeCSVValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // Wrap in quotes if value contains comma, double-quote, newline, or leading/trailing whitespace
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r') || str !== str.trim()) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * 객체 배열을 CSV 문자열로 변환 (헤더는 첫 객체 키 또는 customHeaders 사용)
 * Converts an array of objects to a CSV string (headers from first object keys or customHeaders).
 */
function toCSVString(
  data: Record<string, unknown>[],
  customHeaders?: { key: string; label: string }[],
): string {
  if (data.length === 0) return '';

  const headers = customHeaders
    ? customHeaders
    : Object.keys(data[0]).map((key) => ({ key, label: key }));

  const headerRow = headers.map((h) => escapeCSVValue(h.label)).join(',');

  const rows = data.map((row) =>
    headers.map((h) => escapeCSVValue(row[h.key])).join(','),
  );

  // BOM 추가: Excel에서 한글 깨짐 방지 / BOM for Excel compatibility with Korean characters
  return '\uFEFF' + [headerRow, ...rows].join('\r\n');
}

/**
 * 객체 배열을 CSV 파일로 변환하여 다운로드 트리거
 * Exports an array of objects as a CSV file download.
 *
 * @param data - 내보낼 데이터 배열 / Array of record objects to export
 * @param filename - 파일명 (.csv 확장자 제외) / File name (without .csv extension)
 * @param headers - 커스텀 헤더 매핑 (선택) / Optional custom headers mapping { key, label }
 */
export function exportToCSV(
  data: Record<string, unknown>[],
  filename: string,
  headers?: { key: string; label: string }[],
): void {
  if (data.length === 0) return;

  const csv = toCSVString(data, headers);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();

  // 임시 요소 정리 / Cleanup temporary elements
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
