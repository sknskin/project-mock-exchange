/**
 * @file 관리자 회원관리 페이지
 * @description 회원 목록 조회, 검색, 상태 필터, 페이지네이션을 제공하는 관리자 전용 페이지
 *
 * @file Admin User Management Page
 * @description Admin-only page with user list, search, status filter, and pagination
 */
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Shield, ShieldCheck, User, Users, ChevronDown, Check } from 'lucide-react';
import { useAdminUsers } from '@/hooks/useAdmin';
import { useTranslation } from '@/hooks/useTranslation';
import Pagination from '@/components/ui/Pagination';
import Skeleton from '@/components/ui/Skeleton';
import { cn, formatDate } from '@/lib/format';
import type { AdminUser } from '@/types';

// ===== 역할(권한) 뱃지 — 아이콘 + 배경색으로 구분 / Role badge — differentiated by icon + background color =====
function RoleBadge({ role }: { role: string }) {
  if (role === 'SYSTEM') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-500/15 text-purple-400 border border-purple-500/20">
        <ShieldCheck className="w-3 h-3" />
        {role}
      </span>
    );
  }
  if (role === 'ADMIN') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/20">
        <Shield className="w-3 h-3" />
        {role}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-bg-tertiary text-text-quaternary border border-border">
      <User className="w-3 h-3" />
      {role}
    </span>
  );
}

// ===== 계정 상태 뱃지 — 비활성 > 반려 > 대기 > 승인 우선순위 / Status badge — priority: inactive > rejected > pending > approved =====
function StatusBadge({ user, t }: { user: AdminUser; t: (key: Parameters<ReturnType<typeof useTranslation>['t']>[0]) => string }) {
  if (!user.isActive) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-500/15 text-red-400 border border-red-500/20">
        {t('admin.users.inactive')}
      </span>
    );
  }
  if (user.approvalStatus === 'REJECTED') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-orange-500/15 text-orange-400 border border-orange-500/20">
        {t('admin.users.rejected')}
      </span>
    );
  }
  if (user.approvalStatus === 'PENDING') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-yellow-500/15 text-yellow-400 border border-yellow-500/20">
        {t('admin.users.pending')}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
      {t('admin.users.approved')}
    </span>
  );
}

// ===== Status filter options =====
const STATUS_OPTIONS = [
  { key: '', labelKey: 'admin.users.filterAll' as const },
  { key: 'pending', labelKey: 'admin.users.filterPending' as const },
  { key: 'approved', labelKey: 'admin.users.filterApproved' as const },
  { key: 'rejected', labelKey: 'admin.users.filterRejected' as const },
  { key: 'inactive', labelKey: 'admin.users.filterInactive' as const },
];

// ===== 커스텀 상태 드롭다운 — 외부 클릭 닫기 포함 / Custom status dropdown — with outside click dismiss =====
function StatusDropdown({
  value,
  onChange,
  options,
  t,
}: {
  value: string;
  onChange: (v: string) => void;
  options: typeof STATUS_OPTIONS;
  t: (key: Parameters<ReturnType<typeof useTranslation>['t']>[0]) => string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const selectedLabel = options.find((o) => o.key === value);

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-1.5 bg-bg-secondary border border-border rounded-xl pl-3 pr-2 sm:pl-4 sm:pr-3 py-2.5',
          'text-[13px] sm:text-[14px] font-medium transition-colors',
          open && 'border-accent/60',
          value ? 'text-text-primary' : 'text-text-tertiary',
        )}
      >
        <span className="whitespace-nowrap">{selectedLabel ? t(selectedLabel.labelKey) : ''}</span>
        <ChevronDown className={cn('w-4 h-4 text-text-quaternary transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-50 min-w-[140px] bg-bg-secondary border border-border rounded-xl shadow-2xl overflow-hidden">
          {options.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => { onChange(opt.key); setOpen(false); }}
              className={cn(
                'flex items-center justify-between w-full px-3.5 py-2.5 text-left text-[13px] sm:text-[14px] font-medium transition-colors',
                opt.key === value
                  ? 'text-accent bg-accent/10'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary',
              )}
            >
              {t(opt.labelKey)}
              {opt.key === value && <Check className="w-3.5 h-3.5 text-accent shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ===== Table skeleton rows =====
function TableSkeleton({ limit }: { limit: number }) {
  return (
    <>
      {Array.from({ length: limit }).map((_, i) => (
        <tr key={i}>
          <td className="px-4 py-3">
            <Skeleton className="h-4 w-24 rounded" />
          </td>
          <td className="px-4 py-3">
            <Skeleton className="h-4 w-36 rounded" />
          </td>
          <td className="px-4 py-3">
            <Skeleton className="h-4 w-20 rounded" />
          </td>
          <td className="px-4 py-3">
            <Skeleton className="h-5 w-16 rounded-full" />
          </td>
          <td className="px-4 py-3">
            <Skeleton className="h-5 w-16 rounded-full" />
          </td>
          <td className="px-4 py-3">
            <Skeleton className="h-4 w-28 rounded" />
          </td>
        </tr>
      ))}
    </>
  );
}

export default function AdminUsersPage() {
  const router = useRouter();
  const { t } = useTranslation();

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [searchInput, setSearchInput] = useState('');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Reset page when status changes
  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus);
    setPage(1);
  };

  const { data, isLoading } = useAdminUsers({ page, limit, search: search || undefined, status: status || undefined });

  const users = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  return (
    <div>
      {/* Page header */}
      <div className="py-6 flex items-center gap-2.5 h-[88px]">
        <Users className="w-5 h-5 text-accent" />
        <h1 className="text-[20px] font-extrabold text-text-primary">
          {t('admin.users.title')}
        </h1>
      </div>

      {/* Search + Status filter bar */}
      <div className="flex gap-2 sm:gap-3 mb-5">
        {/* Search input */}
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-quaternary pointer-events-none" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t('admin.users.search')}
            className="w-full bg-bg-secondary border border-border rounded-xl pl-9 pr-4 py-2.5 text-[14px] text-text-primary placeholder:text-text-quaternary focus:outline-none focus:border-accent/60 transition-colors"
          />
        </div>
        {/* Status filter – custom dropdown */}
        <StatusDropdown
          value={status}
          onChange={handleStatusChange}
          options={STATUS_OPTIONS}
          t={t}
        />
      </div>

      {/* 모바일 카드 뷰 — sm 미만에서 표시, 테이블 대신 카드 레이아웃 / Mobile card view — shown below sm breakpoint, card layout instead of table */}
      <div className="sm:hidden space-y-3">
        {isLoading ? (
          Array.from({ length: limit }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-bg-secondary animate-pulse" />
          ))
        ) : users.length === 0 ? (
          <div className="py-20 text-center text-[14px] text-text-quaternary">
            {t('admin.users.noUsers')}
          </div>
        ) : (
          users.map((u) => (
            <div
              key={u.id}
              tabIndex={0}
              role="button"
              onClick={() => router.push(`/admin/users/${u.id}`)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); router.push(`/admin/users/${u.id}`); } }}
              className="p-4 rounded-xl border border-border bg-bg-secondary hover:bg-bg-tertiary hover:border-accent/40 cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-accent/60 focus:ring-offset-1"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[14px] font-semibold text-text-primary">{u.name}</span>
                <StatusBadge user={u} t={t} />
              </div>
              <div className="flex items-center gap-2 mb-1.5">
                <RoleBadge role={u.role} />
                <span className="text-[12px] text-text-tertiary font-mono">{u.username}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-text-quaternary truncate mr-2">{u.email}</span>
                <span className="text-[11px] text-text-quaternary tabular-nums shrink-0">
                  {formatDate(u.createdAt)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 데스크톱 테이블 뷰 — sm 이상에서만 표시, 행 클릭으로 상세 이동 / Desktop table view — shown sm+, row click navigates to detail */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead>
            <tr className="border-b border-border/80">
              <th className="px-4 py-2.5 text-left text-[11px] font-medium text-text-quaternary">
                {t('admin.users.name')}
              </th>
              <th className="px-4 py-2.5 text-left text-[11px] font-medium text-text-quaternary">
                {t('admin.users.email')}
              </th>
              <th className="px-4 py-2.5 text-left text-[11px] font-medium text-text-quaternary">
                {t('admin.users.username')}
              </th>
              <th className="px-4 py-2.5 text-left text-[11px] font-medium text-text-quaternary">
                {t('admin.users.role')}
              </th>
              <th className="px-4 py-2.5 text-left text-[11px] font-medium text-text-quaternary">
                {t('admin.users.status')}
              </th>
              <th className="px-4 py-2.5 text-left text-[11px] font-medium text-text-quaternary">
                {t('admin.users.joinDate')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {isLoading ? (
              <TableSkeleton limit={limit} />
            ) : users.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-20 text-center text-[14px] text-text-quaternary"
                >
                  {t('admin.users.noUsers')}
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr
                  key={u.id}
                  tabIndex={0}
                  role="link"
                  aria-label={`${u.name} - ${u.email}`}
                  onClick={() => router.push(`/admin/users/${u.id}`)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); router.push(`/admin/users/${u.id}`); } }}
                  className="hover:bg-bg-secondary/60 cursor-pointer transition-colors focus:outline-none focus:bg-bg-secondary/60"
                >
                  <td className="px-4 py-3">
                    <span className="text-[14px] font-semibold text-text-primary">
                      {u.name}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[13px] text-text-secondary">
                      {u.email}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[13px] text-text-tertiary font-mono">
                      {u.username}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <RoleBadge role={u.role} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge user={u} t={t} />
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[12px] text-text-quaternary tabular-nums">
                      {formatDate(u.createdAt)}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <Pagination
        page={page}
        totalPages={totalPages}
        total={total}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={(newLimit) => {
          setLimit(newLimit);
          setPage(1);
        }}
      />
    </div>
  );
}
