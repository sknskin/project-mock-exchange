/**
 * @file 관리자 감사 보고서 페이지
 * @description 시스템 감사 보고서 PDF를 확인하는 관리자 전용 페이지. manifest.json에서 목록 자동 로드.
 *
 * @file Admin Audit Report Page
 * @description Admin-only page for viewing system audit report PDFs. Auto-loads list from manifest.json.
 */
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Eye, Calendar, Download, Loader2 } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { useAuthStore } from '@/stores/auth';

// 감사 보고서 항목 타입 / Audit report item type
interface ReportItem {
  name: string;
  path: string;
  label: string;
  date: string;
}

/** 관리자 감사 보고서 페이지 컴포넌트 — PDF 보고서 목록 조회/다운로드/열기
 * Admin audit report page component — view, download, and open PDF reports */
export default function AdminAuditPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);

  // manifest.json에서 보고서 목록 로드 / Load report list from manifest.json
  useEffect(() => {
    fetch('/docs/report/manifest.json')
      .then((res) => res.json())
      .then((data: ReportItem[]) => setReports(data))
      .catch(() => setReports([]))
      .finally(() => setLoading(false));
  }, []);

  // Non-admin redirect
  useEffect(() => {
    if (user && user.role !== 'SYSTEM' && user.role !== 'ADMIN') {
      router.replace('/dashboard');
    }
  }, [user, router]);

  if (user && user.role !== 'SYSTEM' && user.role !== 'ADMIN') {
    return null;
  }

  // 새 탭에서 PDF 보기 / View PDF in new tab
  const handleView = (report: ReportItem) => {
    window.open(report.path, '_blank');
  };

  // 프로그래매틱 다운로드 — 임시 <a> 태그 생성으로 download 속성 활용 / Programmatic download — creates temporary <a> tag to use download attribute
  const handleDownload = (report: ReportItem) => {
    const a = document.createElement('a');
    a.href = report.path;
    a.download = report.name;
    a.click();
  };

  return (
    <div className="pb-16">
      {/* Page header */}
      <div className="py-6 flex items-center gap-2.5 h-[88px]">
        <FileText className="w-5 h-5 text-accent" />
        <h1 className="text-[20px] font-extrabold text-text-primary">
          {t('admin.audit.title')}
        </h1>
      </div>

      <p className="text-[13px] text-text-tertiary mb-6">
        {t('admin.audit.desc')}
      </p>

      {/* Report list */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-text-quaternary">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-12 text-text-quaternary text-[14px]">
            {t('admin.audit.noReports')}
          </div>
        ) : (
          reports.map((report) => (
            <div
              key={report.name}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-bg-secondary rounded-2xl px-4 py-3.5 sm:px-5 sm:py-4"
            >
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="w-5 h-5 text-text-tertiary shrink-0" />
                <div className="min-w-0">
                  <p className="text-[14px] font-medium text-text-primary truncate">
                    {report.label}
                  </p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="flex items-center gap-1 text-[12px] text-text-quaternary">
                      <Calendar className="w-3 h-3" />
                      {report.date}
                    </span>
                    <span className="text-[11px] text-text-quaternary hidden sm:inline">
                      {report.name}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:shrink-0 pl-8 sm:pl-0">
                <button
                  onClick={() => handleDownload(report)}
                  className="flex items-center justify-center gap-1.5 h-10 sm:h-9 px-3 rounded-xl bg-bg-tertiary hover:bg-bg-quaternary text-text-secondary text-[13px] font-medium transition-colors"
                  aria-label={t('admin.audit.download')}
                >
                  <Download className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                  <span className="sm:hidden">{t('admin.audit.download')}</span>
                </button>
                <button
                  onClick={() => handleView(report)}
                  className="flex items-center justify-center gap-1.5 h-10 sm:h-9 px-4 rounded-xl bg-accent/10 hover:bg-accent/20 text-accent text-[13px] font-semibold transition-colors"
                >
                  <Eye className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                  {t('admin.audit.viewReport')}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
