/**
 * @file 관리자 회원관리 페이지
 * @description 회원 목록 조회, 검색, 상태 필터, 페이지네이션을 제공하는 관리자 전용 페이지
 *
 * @file Admin User Management Page
 * @description Admin-only page with user list, search, status filter, and pagination
 */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Shield, ShieldCheck, User, ChevronDown } from 'lucide-react';
import { useAdminUsers } from '@/hooks/useAdmin';
import { useTranslation } from '@/hooks/useTranslation';
import { useAuthStore } from '@/stores/auth';
import Pagination from '@/components/ui/Pagination';
import Skeleton from '@/components/ui/Skeleton';
import { cn, formatDate } from '@/lib/format';
import type { AdminUser } from '@/types';

// ===== Role badge =====
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

// ===== Status badge =====
function StatusBadge({ user, t }: { user: AdminUser; t: (key: Parameters<ReturnType<typeof useTranslation>['t']>[0]) => string }) {
  if (!user.isActive) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-500/15 text-red-400 border border-red-500/20">
        {t('admin.users.inactive')}
      </span>
    );
  }
  if (!user.isApproved) {
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
  { key: 'inactive', labelKey: 'admin.users.filterInactive' as const },
];

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
  const user = useAuthStore((s) => s.user);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [searchInput, setSearchInput] = useState('');

  // Non-admin redirect
  useEffect(() => {
    if (user && user.role !== 'SYSTEM' && user.role !== 'ADMIN') {
      router.replace('/dashboard');
    }
  }, [user, router]);

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

  // Guard: if user is not yet loaded or not admin, render nothing
  if (user && user.role !== 'SYSTEM' && user.role !== 'ADMIN') {
    return null;
  }

  return (
    <div>
      {/* Page header */}
      <div className="py-6 flex items-center gap-2.5">
        <Shield className="w-5 h-5 text-accent" />
        <h1 className="text-[20px] font-extrabold text-text-primary">
          {t('admin.users.title')}
        </h1>
      </div>

      {/* Search + Status filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-quaternary pointer-events-none" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t('admin.users.search')}
            className="w-full bg-bg-secondary border border-border rounded-xl pl-9 pr-4 py-2.5 text-[14px] text-text-primary placeholder:text-text-quaternary focus:outline-none focus:border-accent/60 transition-colors"
          />
        </div>
        {/* Status filter select */}
        <div className="relative shrink-0">
          <select
            value={status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className={cn(
              'appearance-none bg-bg-secondary border border-border rounded-xl pl-4 pr-9 py-2.5',
              'text-[14px] font-medium transition-colors cursor-pointer',
              'focus:outline-none focus:border-accent/60',
              status ? 'text-text-primary' : 'text-text-tertiary',
            )}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.key} value={opt.key}>
                {t(opt.labelKey)}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-quaternary pointer-events-none" />
        </div>
      </div>

      {/* Table - horizontal scroll on mobile */}
      <div className="overflow-x-auto -mx-4 sm:mx-0">
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
                  onClick={() => router.push(`/admin/users/${u.id}`)}
                  className="hover:bg-bg-secondary/60 cursor-pointer transition-colors"
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
