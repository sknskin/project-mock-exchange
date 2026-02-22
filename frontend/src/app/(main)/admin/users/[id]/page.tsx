/**
 * @file 관리자 회원 상세 페이지
 * @description 회원 정보 조회 및 승인/반려/활성화/비활성화/삭제 관리 페이지
 *
 * @file Admin User Detail Page
 * @description Page for viewing user info and managing approve/reject/activate/deactivate/delete actions
 */
'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import {
  useAdminUserDetail,
  useApproveUser,
  useRejectUser,
  useDeactivateUser,
  useActivateUser,
  useDeleteUser,
} from '@/hooks/useAdmin';
import { useTranslation } from '@/hooks/useTranslation';
import { useAuthStore } from '@/stores/auth';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { cn } from '@/lib/format';

type ModalType = 'approve' | 'reject' | 'deactivate' | 'activate' | 'delete' | null;

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 py-2.5">
      <span className="text-[13px] text-text-tertiary sm:w-28 sm:shrink-0">{label}</span>
      <span className="text-[14px] text-text-primary font-medium break-all">{children}</span>
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

  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [note, setNote] = useState('');

  // Redirect non-admin users
  if (currentUser && currentUser.role !== 'ADMIN' && currentUser.role !== 'SYSTEM') {
    router.replace('/dashboard');
    return null;
  }

  // Role hierarchy: SYSTEM(0) > ADMIN(1) > USER(2)
  // Can only manage users with strictly lower role
  const ROLE_LEVEL: Record<string, number> = { SYSTEM: 0, ADMIN: 1, USER: 2 };
  const currentLevel = ROLE_LEVEL[currentUser?.role ?? ''] ?? 99;
  const targetLevel = ROLE_LEVEL[user?.role ?? ''] ?? 99;
  const canManage = user ? currentLevel < targetLevel : false;

  // Modals with a note textarea: approve, reject
  const hasNoteField = activeModal === 'approve' || activeModal === 'reject';

  // Simple modals (no note): deactivate, activate, delete
  const isSimpleModal = activeModal === 'deactivate' || activeModal === 'activate' || activeModal === 'delete';

  const openModal = (type: ModalType) => {
    setNote('');
    setActiveModal(type);
  };

  const closeModal = () => {
    setActiveModal(null);
    setNote('');
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
      }
      closeModal();
      router.push('/admin/users');
    } catch {
      // errors are handled by mutation state
    }
  };

  const isActionLoading =
    approveUser.isPending ||
    rejectUser.isPending ||
    deactivateUser.isPending ||
    activateUser.isPending ||
    deleteUser.isPending;

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
    return '';
  };

  const getModalMessage = (): string => {
    if (activeModal === 'approve') return t('admin.users.approveConfirm');
    if (activeModal === 'reject') return t('admin.users.rejectConfirm');
    if (activeModal === 'deactivate') return t('admin.users.deactivateConfirm');
    if (activeModal === 'activate') return t('admin.users.activateConfirm');
    if (activeModal === 'delete') return t('admin.users.deleteConfirm');
    return '';
  };

  const getModalConfirmLabel = (): string => {
    if (activeModal === 'approve') return t('admin.users.approve');
    if (activeModal === 'reject') return t('admin.users.reject');
    if (activeModal === 'deactivate') return t('admin.users.deactivate');
    if (activeModal === 'activate') return t('admin.users.activate');
    if (activeModal === 'delete') return t('admin.users.delete');
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
              </div>
            </div>
          )}
        </div>
      )}

      {/* Simple Confirm Modal — for deactivate, activate, delete (no note field) */}
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

      {/* Note Modal — for approve and reject (with optional textarea) */}
      {hasNoteField && (
        <>
          <div
            className="fixed inset-0 z-[60] bg-black/60"
            onClick={closeModal}
          />
          <div className="fixed inset-0 z-[61] flex items-center justify-center pointer-events-none">
            <div className="relative bg-bg-primary border border-border rounded-2xl p-6 w-[320px] shadow-2xl pointer-events-auto">
              <h3 className="text-[16px] font-bold text-text-primary text-center">
                {getModalTitle()}
              </h3>
              <p className="text-[14px] text-text-secondary text-center mt-3 whitespace-pre-line">
                {getModalMessage()}
              </p>
              <div className="mt-4">
                <label className="text-[13px] text-text-tertiary block mb-1.5">
                  {t('admin.users.noteLabel')}
                </label>
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
        </>
      )}
    </div>
  );
}
