/**
 * @file 관리자 감사 보고서 페이지
 * @description 시스템 감사 보고서 PDF를 확인하는 관리자 전용 페이지
 *
 * @file Admin Audit Report Page
 * @description Admin-only page for viewing system audit report PDFs
 */
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Eye, Calendar, Download } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { useAuthStore } from '@/stores/auth';

interface ReportItem {
  name: string;
  path: string;
  label: string;
  date: string;
}

const REPORTS: ReportItem[] = [
  {
    name: 'audit-report-6.pdf',
    path: '/docs/report/audit-report-6.pdf',
    label: 'VirtuEx 시스템 감사 보고서 (6차)',
    date: '2026-03-02',
  },
  {
    name: 'audit-report-5.pdf',
    path: '/docs/report/audit-report-5.pdf',
    label: 'VirtuEx 시스템 감사 보고서 (5차)',
    date: '2026-03-02',
  },
  {
    name: 'audit-report-4.pdf',
    path: '/docs/report/audit-report-4.pdf',
    label: 'VirtuEx 시스템 감사 보고서 (4차)',
    date: '2026-03-02',
  },
  {
    name: 'audit-report-3.pdf',
    path: '/docs/report/audit-report-3.pdf',
    label: 'VirtuEx 시스템 감사 보고서 (3차)',
    date: '2026-03-02',
  },
  {
    name: 'audit-report-2.pdf',
    path: '/docs/report/audit-report-2.pdf',
    label: 'VirtuEx 시스템 감사 보고서 (2차)',
    date: '2026-03-01',
  },
  {
    name: 'audit-report-1.pdf',
    path: '/docs/report/audit-report-1.pdf',
    label: 'VirtuEx 시스템 감사 보고서 (1차)',
    date: '2026-03-01',
  },
];

export default function AdminAuditPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);

  // Non-admin redirect
  useEffect(() => {
    if (user && user.role !== 'SYSTEM' && user.role !== 'ADMIN') {
      router.replace('/dashboard');
    }
  }, [user, router]);

  if (user && user.role !== 'SYSTEM' && user.role !== 'ADMIN') {
    return null;
  }

  const handleView = (report: ReportItem) => {
    window.open(report.path, '_blank');
  };

  const handleDownload = (report: ReportItem) => {
    const a = document.createElement('a');
    a.href = report.path;
    a.download = report.name;
    a.click();
  };

  return (
    <div className="pb-16">
      {/* Page header */}
      <div className="py-6 flex items-center gap-2.5">
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
        {REPORTS.length === 0 ? (
          <div className="text-center py-12 text-text-quaternary text-[14px]">
            {t('admin.audit.noReports')}
          </div>
        ) : (
          REPORTS.map((report) => (
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
