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

  // ADMIN cannot manage SYSTEM or ADMIN users; SYSTEM can manage anyone
  const isCurrentUserAdmin = currentUser?.role === 'ADMIN';
  const isTargetPrivileged = user?.role === 'SYSTEM' || user?.role === 'ADMIN';
  const canManage = !(isCurrentUserAdmin && isTargetPrivileged);

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

  return (
    <div className="pb-24">
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
        <div className="flex flex-col gap-5">
          {/* Basic Info */}
          <div className="bg-bg-secondary rounded-2xl p-5">
            <h2 className="text-[14px] font-bold text-text-tertiary uppercase tracking-wide mb-4">
              {t('admin.users.basicInfo')}
            </h2>
            <div className="flex flex-col divide-y divide-border/50">
              {[
                { label: t('admin.users.name'), value: user.name || '-' },
                { label: t('admin.users.email'), value: user.email || '-' },
                { label: t('admin.users.username'), value: user.username || '-' },
                { label: t('admin.users.phone'), value: user.phone || '-' },
                {
                  label: t('admin.users.address'),
                  value: [user.address, user.addressDetail].filter(Boolean).join(' ') || '-',
                },
              ].map((item) => (
                <div key={item.label} className="flex justify-between py-3">
                  <span className="text-[14px] text-text-tertiary">{item.label}</span>
                  <span className="text-[14px] text-text-primary font-medium text-right max-w-[60%] break-all">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Account Info */}
          <div className="bg-bg-secondary rounded-2xl p-5">
            <h2 className="text-[14px] font-bold text-text-tertiary uppercase tracking-wide mb-4">
              {t('admin.users.accountInfo')}
            </h2>
            <div className="flex flex-col divide-y divide-border/50">
              {/* Role */}
              <div className="flex justify-between items-center py-3">
                <span className="text-[14px] text-text-tertiary">{t('admin.users.role')}</span>
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
              </div>

              {/* isActive */}
              <div className="flex justify-between items-center py-3">
                <span className="text-[14px] text-text-tertiary">{t('admin.users.status')}</span>
                <span
                  className={cn(
                    'text-[13px] font-semibold px-2.5 py-0.5 rounded-full',
                    user.isActive
                      ? 'bg-green-500/15 text-green-400'
                      : 'bg-danger/15 text-danger',
                  )}
                >
                  {user.isActive ? t('admin.users.approved') : t('admin.users.inactive')}
                </span>
              </div>

              {/* isApproved */}
              <div className="flex justify-between items-center py-3">
                <span className="text-[14px] text-text-tertiary">{t('admin.users.approve')}</span>
                <span
                  className={cn(
                    'text-[13px] font-semibold px-2.5 py-0.5 rounded-full',
                    user.isApproved
                      ? 'bg-green-500/15 text-green-400'
                      : 'bg-yellow-500/15 text-yellow-400',
                  )}
                >
                  {user.isApproved ? t('admin.users.approved') : t('admin.users.pending')}
                </span>
              </div>

              {/* approvedAt */}
              <div className="flex justify-between py-3">
                <span className="text-[14px] text-text-tertiary">{t('admin.users.approvedAt')}</span>
                <span className="text-[14px] text-text-primary font-medium">
                  {formatDateValue(user.approvedAt)}
                </span>
              </div>

              {/* approvedBy */}
              <div className="flex justify-between py-3">
                <span className="text-[14px] text-text-tertiary">{t('admin.users.approvedBy')}</span>
                <span className="text-[14px] text-text-primary font-medium">
                  {user.approvedBy || '-'}
                </span>
              </div>

              {/* approvalNote */}
              <div className="flex justify-between py-3">
                <span className="text-[14px] text-text-tertiary">{t('admin.users.approvalNote')}</span>
                <span className="text-[14px] text-text-primary font-medium text-right max-w-[60%] break-all">
                  {user.approvalNote || '-'}
                </span>
              </div>

              {/* createdAt */}
              <div className="flex justify-between py-3">
                <span className="text-[14px] text-text-tertiary">{t('admin.users.joinDate')}</span>
                <span className="text-[14px] text-text-primary font-medium">
                  {formatDateValue(user.createdAt)}
                </span>
              </div>

              {/* updatedAt */}
              <div className="flex justify-between py-3">
                <span className="text-[14px] text-text-tertiary">{t('admin.users.updatedAt')}</span>
                <span className="text-[14px] text-text-primary font-medium">
                  {formatDateValue(user.updatedAt)}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          {canManage && (
            <div className="bg-bg-secondary rounded-2xl p-5">
              <h2 className="text-[14px] font-bold text-text-tertiary uppercase tracking-wide mb-4">
                {t('admin.users.actions')}
              </h2>
              <div className="flex flex-col gap-3">
                {/* Approve — only when not yet approved */}
                {!user.isApproved && (
                  <button
                    onClick={() => openModal('approve')}
                    className="w-full h-11 rounded-xl bg-green-600 hover:bg-green-600/85 text-white text-[14px] font-semibold transition-colors"
                  >
                    {t('admin.users.approve')}
                  </button>
                )}

                {/* Reject — only when not yet approved */}
                {!user.isApproved && (
                  <button
                    onClick={() => openModal('reject')}
                    className="w-full h-11 rounded-xl bg-orange-500 hover:bg-orange-500/85 text-white text-[14px] font-semibold transition-colors"
                  >
                    {t('admin.users.reject')}
                  </button>
                )}

                {/* Deactivate — only when currently active */}
                {user.isActive && (
                  <button
                    onClick={() => openModal('deactivate')}
                    className="w-full h-11 rounded-xl bg-yellow-500 hover:bg-yellow-500/85 text-white text-[14px] font-semibold transition-colors"
                  >
                    {t('admin.users.deactivate')}
                  </button>
                )}

                {/* Activate — only when currently inactive */}
                {!user.isActive && (
                  <button
                    onClick={() => openModal('activate')}
                    className="w-full h-11 rounded-xl bg-yellow-500 hover:bg-yellow-500/85 text-white text-[14px] font-semibold transition-colors"
                  >
                    {t('admin.users.activate')}
                  </button>
                )}

                {/* Delete */}
                <button
                  onClick={() => openModal('delete')}
                  className="w-full h-11 rounded-xl bg-danger hover:bg-danger/85 text-white text-[14px] font-semibold transition-colors"
                >
                  {t('admin.users.delete')}
                </button>
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
          {/* Overlay */}
          <div
            className="fixed inset-0 z-[60] bg-black/60"
            onClick={closeModal}
          />
          {/* Modal body */}
          <div className="fixed inset-0 z-[61] flex items-center justify-center pointer-events-none">
            <div className="relative bg-bg-primary border border-border rounded-2xl p-6 w-[320px] shadow-2xl pointer-events-auto">
              <h3 className="text-[16px] font-bold text-text-primary text-center">
                {getModalTitle()}
              </h3>
              <p className="text-[14px] text-text-secondary text-center mt-3 whitespace-pre-line">
                {getModalMessage()}
              </p>

              {/* Optional note textarea */}
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

              {/* Buttons: confirm (left) + cancel (right) */}
              <div className="flex gap-3 mt-5">
                <button
                  onClick={handleConfirm}
                  disabled={isActionLoading}
                  className="flex-1 h-11 rounded-xl bg-accent hover:bg-accent/85 text-white text-[14px] font-semibold transition-colors disabled:opacity-50"
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
