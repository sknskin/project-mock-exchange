/**
 * @file CSV 내보내기 유틸리티
 * @description 데이터를 CSV 파일로 변환하고 다운로드를 트리거합니다
 *
 * @file CSV Export Utility
 * @description Converts data to CSV file and triggers download
 */

/**
 * Escapes a CSV cell value, wrapping in double-quotes when needed.
 * Handles commas, double-quotes, newlines, and leading/trailing whitespace.
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
 * Converts an array of objects to a CSV string.
 * Headers are derived from the keys of the first object,
 * or from customHeaders if provided.
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

  // BOM for Excel compatibility with Korean characters
  return '\uFEFF' + [headerRow, ...rows].join('\r\n');
}

/**
 * Exports an array of objects as a CSV file download.
 *
 * @param data - Array of record objects to export
 * @param filename - File name for the download (without .csv extension)
 * @param headers - Optional custom headers mapping { key, label }
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

  // Cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
