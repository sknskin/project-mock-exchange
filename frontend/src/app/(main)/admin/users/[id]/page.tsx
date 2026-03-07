/**
 * @file 관리자 회원 상세 페이지
 * @description 회원 정보 조회, 승인/반려/활성화/비활성화/삭제 관리, 거래 내역 탭을 포함하는 관리자 전용 페이지
 *
 * @file Admin User Detail Page
 * @description Admin page for viewing user info, managing actions, and viewing user trade history
 */
'use client';

import { use, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Info, ShoppingCart } from 'lucide-react';
import {
  useAdminUserDetail,
  useApproveUser,
  useRejectUser,
  useDeactivateUser,
  useActivateUser,
  useDeleteUser,
  useUpdateRole,
} from '@/hooks/useAdmin';
import { useTranslation } from '@/hooks/useTranslation';
import { useAuthStore } from '@/stores/auth';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { cn } from '@/lib/format';

type ModalType = 'approve' | 'reject' | 'deactivate' | 'activate' | 'delete' | 'changeRole' | null;
type TabKey = 'info' | 'trades';

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 py-2.5">
      <span className="text-[13px] text-text-tertiary sm:w-28 sm:shrink-0">{label}</span>
      <span className="text-[14px] text-text-primary font-medium break-all">{children}</span>
    </div>
  );
}

// ===== Trade History Tab Content =====
function TradeHistoryTab({ userId, t }: { userId: string; t: ReturnType<typeof useTranslation>['t'] }) {
  return (
    <div className="mt-4">
      {/* Backend required notice */}
      <div className="flex items-start gap-2.5 mb-6 px-4 py-3 rounded-xl bg-accent/5 border border-accent/20">
        <Info className="w-4 h-4 text-accent mt-0.5 shrink-0" />
        <span className="text-[13px] text-text-secondary">
          {t('admin.users.tradeHistory.backendRequired')}
        </span>
      </div>

      {/* Placeholder table showing structure */}
      <div className="bg-bg-secondary rounded-2xl border border-border overflow-hidden">
        {/* Desktop table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-border/80">
                <th className="px-4 py-2.5 text-left text-[11px] font-medium text-text-quaternary">
                  {t('admin.users.tradeHistory.symbol')}
                </th>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium text-text-quaternary">
                  {t('admin.users.tradeHistory.side')}
                </th>
                <th className="px-4 py-2.5 text-right text-[11px] font-medium text-text-quaternary">
                  {t('admin.users.tradeHistory.quantity')}
                </th>
                <th className="px-4 py-2.5 text-right text-[11px] font-medium text-text-quaternary">
                  {t('admin.users.tradeHistory.price')}
                </th>
                <th className="px-4 py-2.5 text-right text-[11px] font-medium text-text-quaternary">
                  {t('admin.users.tradeHistory.total')}
                </th>
                <th className="px-4 py-2.5 text-center text-[11px] font-medium text-text-quaternary">
                  {t('admin.users.tradeHistory.status')}
                </th>
                <th className="px-4 py-2.5 text-right text-[11px] font-medium text-text-quaternary">
                  {t('admin.users.tradeHistory.date')}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={7} className="px-4 py-16 text-center text-[14px] text-text-quaternary">
                  {t('admin.users.tradeHistory.noData')}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Mobile view */}
        <div className="sm:hidden px-4 py-16 text-center text-[14px] text-text-quaternary">
          {t('admin.users.tradeHistory.noData')}
        </div>
      </div>
    </div>
  );
}

export default function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { t } = useTranslation();
  const { user: currentUser } = useAuthStore();

  const { data: user, isLoading } = useAdminUserDetail(id);

  const approveUser = useApproveUser();
  const rejectUser = useRejectUser();
  const deactivateUser = useDeactivateUser();
  const activateUser = useActivateUser();
  const deleteUser = useDeleteUser();
  const updateRole = useUpdateRole();

  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [note, setNote] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [activeTab, setActiveTabRaw] = useState<TabKey>('info');
  const setActiveTab = useCallback((v: TabKey) => { setActiveTabRaw(v); window.scrollTo({ top: 0, behavior: 'smooth' }); }, []);
  const noteModalRef = useRef<HTMLDivElement>(null);
  // 승인/반려 메모 모달 포커스 트랩 / Focus trap for approve/reject note modal
  useFocusTrap(noteModalRef, activeModal === 'approve' || activeModal === 'reject');

  // Redirect non-admin users
  if (currentUser && currentUser.role !== 'ADMIN' && currentUser.role !== 'SYSTEM') {
    router.replace('/dashboard');
    return null;
  }

  /**
   * 역할 계층 구조: SYSTEM(0) > ADMIN(1) > USER(2)
   * 자신보다 낮은 역할만 관리 가능 — SYSTEM은 ADMIN/USER 관리, ADMIN은 USER만 관리
   *
   * Role hierarchy: SYSTEM(0) > ADMIN(1) > USER(2)
   * Can only manage users with strictly lower role — SYSTEM manages ADMIN/USER, ADMIN manages USER only
   */
  const ROLE_LEVEL: Record<string, number> = { SYSTEM: 0, ADMIN: 1, USER: 2 };
  const currentLevel = ROLE_LEVEL[currentUser?.role ?? ''] ?? 99;
  const targetLevel = ROLE_LEVEL[user?.role ?? ''] ?? 99;
  const canManage = user ? currentLevel < targetLevel : false;

  // 메모 입력란이 있는 모달: 승인, 반려 (사유 기록용) / Modals with note textarea: approve, reject (for recording reasons)
  const hasNoteField = activeModal === 'approve' || activeModal === 'reject';

  // 단순 확인 모달: 비활성화, 활성화, 삭제, 역할변경 / Simple confirm modals: deactivate, activate, delete, changeRole
  const isSimpleModal = activeModal === 'deactivate' || activeModal === 'activate' || activeModal === 'delete' || activeModal === 'changeRole';

  const openModal = (type: ModalType) => {
    setNote('');
    setActiveModal(type);
  };

  const closeModal = () => {
    setActiveModal(null);
    setNote('');
    setSelectedRole('');
  };

  const handleConfirm = async () => {
    if (!user) return;
    try {
      if (activeModal === 'approve') {
        await approveUser.mutateAsync({ id: user.id, note: note || undefined });
      } else if (activeModal === 'reject') {
        await rejectUser.mutateAsync({ id: user.id, note: note || undefined });
      } else if (activeModal === 'deactivate') {
        await deactivateUser.mutateAsync(user.id);
      } else if (activeModal === 'activate') {
        await activateUser.mutateAsync(user.id);
      } else if (activeModal === 'delete') {
        await deleteUser.mutateAsync(user.id);
      } else if (activeModal === 'changeRole' && selectedRole) {
        await updateRole.mutateAsync({ id: user.id, role: selectedRole });
      }
      const wasChangeRole = activeModal === 'changeRole';
      closeModal();
      if (!wasChangeRole) router.push('/admin/users');
    } catch {
      // errors are handled by mutation state
    }
  };

  const isActionLoading =
    approveUser.isPending ||
    rejectUser.isPending ||
    deactivateUser.isPending ||
    activateUser.isPending ||
    deleteUser.isPending ||
    updateRole.isPending;

  const formatDateValue = (value: string | null | undefined): string => {
    if (!value) return '-';
    return new Date(value).toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getModalTitle = (): string => {
    if (activeModal === 'approve') return t('admin.users.approve');
    if (activeModal === 'reject') return t('admin.users.reject');
    if (activeModal === 'deactivate') return t('admin.users.deactivate');
    if (activeModal === 'activate') return t('admin.users.activate');
    if (activeModal === 'delete') return t('admin.users.delete');
    if (activeModal === 'changeRole') return t('admin.changeRole');
    return '';
  };

  const getModalMessage = (): string => {
    if (activeModal === 'approve') return t('admin.users.approveConfirm');
    if (activeModal === 'reject') return t('admin.users.rejectConfirm');
    if (activeModal === 'deactivate') return t('admin.users.deactivateConfirm');
    if (activeModal === 'activate') return t('admin.users.activateConfirm');
    if (activeModal === 'delete') return t('admin.users.deleteConfirm');
    if (activeModal === 'changeRole') return `${user?.name || user?.username}${t('admin.changeRoleConfirm')} ${selectedRole}`;
    return '';
  };

  const getModalConfirmLabel = (): string => {
    if (activeModal === 'approve') return t('admin.users.approve');
    if (activeModal === 'reject') return t('admin.users.reject');
    if (activeModal === 'deactivate') return t('admin.users.deactivate');
    if (activeModal === 'activate') return t('admin.users.activate');
    if (activeModal === 'delete') return t('admin.users.delete');
    if (activeModal === 'changeRole') return t('admin.changeRole');
    return t('common.confirm');
  };

  const roleBadge = user && (
    <span
      className={cn(
        'text-[13px] font-semibold px-2.5 py-0.5 rounded-full',
        user.role === 'SYSTEM'
          ? 'bg-purple-500/15 text-purple-400'
          : user.role === 'ADMIN'
            ? 'bg-accent/15 text-accent'
            : 'bg-bg-tertiary text-text-secondary',
      )}
    >
      {user.role === 'SYSTEM'
        ? t('common.system')
        : user.role === 'ADMIN'
          ? t('common.admin')
          : t('common.user')}
    </span>
  );

  const statusBadge = user && (() => {
    if (!user.isActive) {
      return (
        <span className="text-[13px] font-semibold px-2.5 py-0.5 rounded-full bg-danger/15 text-danger">
          {t('admin.users.inactive')}
        </span>
      );
    }
    if (user.approvalStatus === 'REJECTED') {
      return (
        <span className="text-[13px] font-semibold px-2.5 py-0.5 rounded-full bg-orange-500/15 text-orange-400">
          {t('admin.users.rejected')}
        </span>
      );
    }
    if (user.approvalStatus === 'PENDING') {
      return (
        <span className="text-[13px] font-semibold px-2.5 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400">
          {t('admin.users.pending')}
        </span>
      );
    }
    return (
      <span className="text-[13px] font-semibold px-2.5 py-0.5 rounded-full bg-green-500/15 text-green-400">
        {t('admin.users.approved')}
      </span>
    );
  })();

  const approvalBadge = user && (() => {
    if (user.approvalStatus === 'REJECTED') {
      return (
        <span className="text-[13px] font-semibold px-2.5 py-0.5 rounded-full bg-orange-500/15 text-orange-400">
          {t('admin.users.rejected')}
        </span>
      );
    }
    if (user.approvalStatus === 'APPROVED') {
      return (
        <span className="text-[13px] font-semibold px-2.5 py-0.5 rounded-full bg-green-500/15 text-green-400">
          {t('admin.users.approved')}
        </span>
      );
    }
    return (
      <span className="text-[13px] font-semibold px-2.5 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400">
        {t('admin.users.pending')}
      </span>
    );
  })();

  // Tab definitions
  const tabs: { key: TabKey; label: string; icon: typeof Info }[] = [
    { key: 'info', label: t('admin.users.tab.info'), icon: Info },
    { key: 'trades', label: t('admin.users.tab.trades'), icon: ShoppingCart },
  ];

  return (
    <div className="pb-16">
      {/* Back button + title */}
      <div className="flex items-center gap-3 py-4">
        <Link
          href="/admin/users"
          className="p-1.5 -ml-1.5 text-text-tertiary hover:text-text-primary transition-colors rounded-lg hover:bg-bg-secondary/60"
        >
          <ArrowLeft className="w-5 h-5" strokeWidth={2} />
        </Link>
        <h1 className="text-[17px] font-bold text-text-primary">
          {t('admin.users.detail')}
          {user && (
            <span className="ml-2 text-[14px] font-medium text-text-tertiary">
              ({user.name || user.username})
            </span>
          )}
        </h1>
      </div>

      {isLoading && (
        <div className="py-20 text-center text-text-quaternary text-[14px]">
          {t('common.loading')}
        </div>
      )}

      {!isLoading && !user && (
        <div className="py-20 text-center text-text-quaternary text-[14px]">
          {t('common.noData')}
        </div>
      )}

      {user && (
        <>
          {/* Tab navigation */}
          <div className="flex gap-1 mb-5 border-b border-border">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-3 text-[13px] font-semibold transition-colors relative',
                  activeTab === tab.key
                    ? 'text-text-primary'
                    : 'text-text-quaternary hover:text-text-tertiary',
                )}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {activeTab === tab.key && (
                  <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-accent rounded-full" />
                )}
              </button>
            ))}
          </div>

          {/* User Info Tab */}
          {activeTab === 'info' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Basic Info */}
              <div className="bg-bg-secondary rounded-2xl px-5 py-4">
                <h2 className="text-[13px] font-bold text-text-tertiary uppercase tracking-wide mb-2">
                  {t('admin.users.basicInfo')}
                </h2>
                <div className="flex flex-col divide-y divide-border/40">
                  <InfoRow label={t('admin.users.name')}>{user.name || '-'}</InfoRow>
                  <InfoRow label={t('admin.users.email')}>{user.email || '-'}</InfoRow>
                  <InfoRow label={t('admin.users.username')}>{user.username || '-'}</InfoRow>
                  <InfoRow label={t('admin.users.phone')}>{user.phone || '-'}</InfoRow>
                  <InfoRow label={t('admin.users.address')}>
                    {user.address || user.addressDetail ? (
                      <span className="flex flex-col gap-0.5">
                        {user.address && <span>{user.address}{user.zipCode ? ` (${user.zipCode})` : ''}</span>}
                        {user.addressDetail && <span className="text-text-secondary">{user.addressDetail}</span>}
                      </span>
                    ) : '-'}
                  </InfoRow>
                </div>
              </div>

              {/* Account Info */}
              <div className="bg-bg-secondary rounded-2xl px-5 py-4">
                <h2 className="text-[13px] font-bold text-text-tertiary uppercase tracking-wide mb-2">
                  {t('admin.users.accountInfo')}
                </h2>
                <div className="flex flex-col divide-y divide-border/40">
                  <InfoRow label={t('admin.users.role')}>{roleBadge}</InfoRow>
                  <InfoRow label={t('admin.users.status')}>{statusBadge}</InfoRow>
                  <InfoRow label={t('admin.users.approve')}>{approvalBadge}</InfoRow>
                  <InfoRow label={t('admin.users.approvedAt')}>{formatDateValue(user.approvedAt)}</InfoRow>
                  <InfoRow label={t('admin.users.approvedBy')}>{user.approvedByUsername || user.approvedBy || '-'}</InfoRow>
                  <InfoRow label={t('admin.users.approvalNote')}>{user.approvalNote || '-'}</InfoRow>
                  {user.approvalStatus === 'REJECTED' && (
                    <>
                      <InfoRow label={t('admin.users.rejectedAt')}>{formatDateValue(user.rejectedAt)}</InfoRow>
                      <InfoRow label={t('admin.users.rejectedBy')}>{user.rejectedByUsername || user.rejectedBy || '-'}</InfoRow>
                      <InfoRow label={t('admin.users.rejectionNote')}>{user.rejectionNote || '-'}</InfoRow>
                    </>
                  )}
                  <InfoRow label={t('admin.users.joinDate')}>{formatDateValue(user.createdAt)}</InfoRow>
                  <InfoRow label={t('admin.users.updatedAt')}>{formatDateValue(user.updatedAt)}</InfoRow>
                </div>
              </div>

              {/* Action Buttons */}
              {canManage && (
                <div className="bg-bg-secondary rounded-2xl px-5 py-4 lg:col-span-2">
                  <h2 className="text-[13px] font-bold text-text-tertiary uppercase tracking-wide mb-3">
                    {t('admin.users.actions')}
                  </h2>
                  <div className="flex flex-wrap gap-3">
                    {user.approvalStatus !== 'APPROVED' && (
                      <button
                        onClick={() => openModal('approve')}
                        className="px-5 py-2.5 rounded-xl text-[14px] font-semibold text-green-600 border border-green-600/30 hover:bg-green-600/10 transition-colors"
                      >
                        {t('admin.users.approve')}
                      </button>
                    )}
                    {user.approvalStatus !== 'REJECTED' && user.approvalStatus !== 'APPROVED' && (
                      <button
                        onClick={() => openModal('reject')}
                        className="px-5 py-2.5 rounded-xl text-[14px] font-semibold text-orange-500 border border-orange-500/30 hover:bg-orange-500/10 transition-colors"
                      >
                        {t('admin.users.reject')}
                      </button>
                    )}
                    {user.approvalStatus === 'APPROVED' && user.isActive && (
                      <button
                        onClick={() => openModal('deactivate')}
                        className="px-5 py-2.5 rounded-xl text-[14px] font-semibold text-yellow-600 border border-yellow-600/30 hover:bg-yellow-600/10 transition-colors"
                      >
                        {t('admin.users.deactivate')}
                      </button>
                    )}
                    {user.approvalStatus === 'APPROVED' && !user.isActive && (
                      <button
                        onClick={() => openModal('activate')}
                        className="px-5 py-2.5 rounded-xl text-[14px] font-semibold text-green-600 border border-green-600/30 hover:bg-green-600/10 transition-colors"
                      >
                        {t('admin.users.activate')}
                      </button>
                    )}
                    {user.approvalStatus === 'APPROVED' && (
                      <button
                        onClick={() => openModal('delete')}
                        className="px-5 py-2.5 rounded-xl text-[14px] font-semibold text-danger border border-danger/30 hover:bg-danger/10 transition-colors"
                      >
                        {t('admin.users.delete')}
                      </button>
                    )}
                    {currentUser?.role === 'SYSTEM' && user.role !== 'SYSTEM' && (
                      <button
                        onClick={() => {
                          setSelectedRole(user.role === 'ADMIN' ? 'USER' : 'ADMIN');
                          setActiveModal('changeRole');
                        }}
                        className="px-5 py-2.5 rounded-xl text-[14px] font-semibold text-purple-500 border border-purple-500/30 hover:bg-purple-500/10 transition-colors"
                      >
                        {t('admin.changeRole')}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Trade History Tab */}
          {activeTab === 'trades' && (
            <TradeHistoryTab userId={id} t={t} />
          )}
        </>
      )}

      {/* 단순 확인 모달 — 비활성화/활성화/삭제/역할변경용 (메모 없음) / Simple confirm modal — for deactivate/activate/delete/changeRole (no note field) */}
      <ConfirmModal
        isOpen={isSimpleModal}
        onClose={closeModal}
        onConfirm={handleConfirm}
        title={getModalTitle()}
        message={getModalMessage()}
        confirmLabel={getModalConfirmLabel()}
        cancelLabel={t('modal.cancel')}
        confirmVariant={activeModal === 'delete' ? 'danger' : 'primary'}
        loading={isActionLoading}
      />

      {/* 메모 모달 — 승인/반려 시 사유 입력용 (선택적 textarea) / Note modal — for approve/reject with optional reason textarea */}
      {hasNoteField && (
        <div ref={noteModalRef} role="dialog" aria-modal="true">
          <div
            className="fixed inset-0 z-[60] bg-black/60"
            onClick={closeModal}
          />
          <div className="fixed inset-0 z-[61] flex items-center justify-center pointer-events-none">
            <div className="relative bg-bg-primary border border-border rounded-2xl p-6 w-[320px] max-w-[calc(100vw-2rem)] shadow-2xl pointer-events-auto">
              <h3 className="text-[16px] font-bold text-text-primary text-center">
                {getModalTitle()}
              </h3>
              <p className="text-[14px] text-text-secondary text-center mt-3 whitespace-pre-line">
                {getModalMessage()}
              </p>
              <div className="mt-4">
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  className="w-full bg-bg-secondary border border-border rounded-xl px-3 py-2.5 text-[14px] text-text-primary placeholder:text-text-quaternary resize-none focus:outline-none focus:border-accent transition-colors"
                  placeholder={t('admin.users.noteLabel')}
                />
              </div>
              <div className="flex gap-3 mt-5">
                <button
                  onClick={handleConfirm}
                  disabled={isActionLoading}
                  className="flex-1 h-11 rounded-xl bg-accent hover:bg-accent/90 text-white text-[14px] font-semibold transition-colors disabled:opacity-50"
                >
                  {isActionLoading ? '...' : getModalConfirmLabel()}
                </button>
                <button
                  onClick={closeModal}
                  disabled={isActionLoading}
                  className="flex-1 h-11 rounded-xl border border-border text-[14px] font-semibold text-text-secondary hover:bg-bg-secondary transition-colors"
                >
                  {t('modal.cancel')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
