/**
 * @file 관리자 API 훅
 * @description 회원관리, 공지사항, 프로필, 알림, 통계 API 훅
 *
 * @file Admin API Hooks
 * @description API hooks for user management, announcements, profile, notifications, statistics
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { useToastStore } from '@/stores/toast';
import { useTranslation } from '@/hooks/useTranslation';
import type {
  AdminUser,
  AdminUserDetail,
  PaginatedResponse,
  AnnouncementListItem,
  AnnouncementDetail,
  AttachmentItem,
  NotificationItem,
  UserProfile,
  StatOverview,
  OverviewTrend,
  TradingStats,
  PopularAnnouncement,
  TimelineEntry,
  TopPage,
  UserStatByRole,
  UserStatByStatus,
} from '@/types';

// ===== 사용자 관리 (User Management) =====

/**
 * 관리자용 사용자 목록 조회 훅 (페이지네이션, 검색, 상태 필터)
 * Admin hook for fetching user list (with pagination, search, and status filter)
 *
 * @param params.page - 페이지 번호 / Page number
 * @param params.limit - 페이지당 항목 수 / Items per page
 * @param params.search - 검색어 (선택) / Search keyword (optional)
 * @param params.status - 상태 필터 (선택) / Status filter (optional)
 * @returns TanStack Query 결과 (PaginatedResponse<AdminUser>) / TanStack Query result
 */
export function useAdminUsers(params: {
  page: number;
  limit: number;
  search?: string;
  status?: string;
}) {
  return useQuery({
    queryKey: ['admin-users', params],
    queryFn: async () => {
      const { data } = await api.get('/api/admin/users', { params });
      return data.data as PaginatedResponse<AdminUser>;
    },
  });
}

/**
 * 관리자용 사용자 상세 정보 조회 훅
 * Admin hook for fetching user detail information
 *
 * @param id - 사용자 ID / User ID
 * @returns TanStack Query 결과 (AdminUserDetail) / TanStack Query result (AdminUserDetail)
 */
export function useAdminUserDetail(id: string) {
  return useQuery({
    queryKey: ['admin-user', id],
    queryFn: async () => {
      const { data } = await api.get(`/api/admin/users/${id}`);
      return data.data as AdminUserDetail;
    },
    enabled: !!id,
  });
}

/** 사용자 가입 승인 뮤테이션 훅 / User approval mutation hook */
export function useApproveUser() {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: async ({ id, note }: { id: string; note?: string }) => {
      const { data } = await api.post(`/api/admin/users/${id}/approve`, { note });
      return data;
    },
    onSuccess: () => {
      // 목록과 상세 양쪽 캐시 갱신 / Invalidate both list and detail cache
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      qc.invalidateQueries({ queryKey: ['admin-user'] });
      useToastStore.getState().addToast(t('toast.userApproved'), 'success');
    },
  });
}

/** 사용자 가입 반려 뮤테이션 훅 / User rejection mutation hook */
export function useRejectUser() {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: async ({ id, note }: { id: string; note?: string }) => {
      const { data } = await api.post(`/api/admin/users/${id}/reject`, { note });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      qc.invalidateQueries({ queryKey: ['admin-user'] });
      useToastStore.getState().addToast(t('toast.userRejected'), 'success');
    },
  });
}

/** 사용자 비활성화 뮤테이션 훅 / User deactivation mutation hook */
export function useDeactivateUser() {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/api/admin/users/${id}/deactivate`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      qc.invalidateQueries({ queryKey: ['admin-user'] });
      useToastStore.getState().addToast(t('toast.userDeactivated'), 'success');
    },
  });
}

/** 사용자 활성화 뮤테이션 훅 / User activation mutation hook */
export function useActivateUser() {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/api/admin/users/${id}/activate`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      qc.invalidateQueries({ queryKey: ['admin-user'] });
      useToastStore.getState().addToast(t('toast.userActivated'), 'success');
    },
  });
}

/** 사용자 삭제 뮤테이션 훅 / User deletion mutation hook */
export function useDeleteUser() {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/api/admin/users/${id}`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      useToastStore.getState().addToast(t('toast.userDeleted'), 'success');
    },
  });
}

/**
 * 사용자 역할 변경 뮤테이션 훅
 * Mutation hook for changing a user's role
 *
 * @returns mutate 함수에 { id, role } 전달 / Pass { id, role } to mutate
 */
export function useUpdateRole() {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => {
      const { data } = await api.patch(`/api/admin/users/${id}/role`, { role });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      qc.invalidateQueries({ queryKey: ['admin-user'] });
      useToastStore.getState().addToast(t('toast.roleChanged'), 'success');
    },
  });
}

// ===== 공지사항 (Announcements) =====

/**
 * 공지사항 목록 조회 훅 (페이지네이션, 검색)
 * Hook for fetching announcements list (with pagination and search)
 *
 * @param params.page - 페이지 번호 / Page number
 * @param params.limit - 페이지당 항목 수 / Items per page
 * @param params.search - 검색어 (선택) / Search keyword (optional)
 */
export function useAnnouncements(params: { page: number; limit: number; search?: string }) {
  return useQuery({
    queryKey: ['announcements', params],
    queryFn: async () => {
      const { data } = await api.get('/api/announcements', { params });
      return data.data as PaginatedResponse<AnnouncementListItem>;
    },
  });
}

/**
 * 공지사항 상세 조회 훅 (댓글, 첨부파일, 좋아요 상태 포함)
 * Hook for fetching announcement detail (including comments, attachments, like status)
 *
 * @param id - 공지사항 ID / Announcement ID
 */
export function useAnnouncementDetail(id: string) {
  return useQuery({
    queryKey: ['announcement', id],
    queryFn: async () => {
      const { data } = await api.get(`/api/announcements/${id}`);
      return data.data as AnnouncementDetail;
    },
    enabled: !!id,
  });
}

/** 공지사항 작성 뮤테이션 훅 / Announcement creation mutation hook */
export function useCreateAnnouncement() {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: async (body: { title: string; content: string; isPinned?: boolean }) => {
      const { data } = await api.post('/api/announcements', body);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['announcements'] });
      useToastStore.getState().addToast(t('toast.announcementCreated'), 'success');
    },
  });
}

/** 공지사항 수정 뮤테이션 훅 / Announcement update mutation hook */
export function useUpdateAnnouncement() {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: string; title: string; content: string; isPinned?: boolean }) => {
      const { data } = await api.put(`/api/announcements/${id}`, body);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['announcements'] });
      qc.invalidateQueries({ queryKey: ['announcement'] });
      useToastStore.getState().addToast(t('toast.announcementUpdated'), 'success');
    },
  });
}

/** 공지사항 고정/고정해제 토글 뮤테이션 훅 / Announcement pin/unpin toggle mutation hook */
export function useTogglePin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/api/announcements/${id}/pin`);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['announcements'] });
      qc.invalidateQueries({ queryKey: ['announcement'] });
    },
  });
}

/**
 * 공지사항 첨부파일 업로드 뮤테이션 훅
 * File → ArrayBuffer → base64 → JSON 방식으로 전송합니다.
 *
 * Announcement attachment upload mutation hook.
 * Sends as File → ArrayBuffer → base64 → JSON.
 */
export function useUploadAttachment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ announcementId, file }: { announcementId: string; file: File }) => {
      // ArrayBuffer → Uint8Array → 바이트별 문자 변환 → btoa로 base64 인코딩
      // ArrayBuffer → Uint8Array → per-byte char conversion → base64 encode via btoa
      const buffer = await file.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), ''),
      );
      const { data } = await api.post(`/api/announcements/${announcementId}/attachments`, {
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
        data: base64,
      });
      return data.data as AttachmentItem;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['announcement'] }),
  });
}

/** 공지사항 첨부파일 삭제 뮤테이션 훅 / Announcement attachment deletion mutation hook */
export function useDeleteAttachment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (attachmentId: string) => {
      const { data } = await api.delete(`/api/announcements/attachments/${attachmentId}`);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['announcement'] }),
  });
}

/** 공지사항 삭제 뮤테이션 훅 / Announcement deletion mutation hook */
export function useDeleteAnnouncement() {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/api/announcements/${id}`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['announcements'] });
      useToastStore.getState().addToast(t('toast.announcementDeleted'), 'success');
    },
  });
}

/**
 * 공지사항 댓글 작성 뮤테이션 훅 (대댓글 지원: parentId 전달 시)
 * Announcement comment creation mutation hook (supports replies via parentId)
 */
export function useAddComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      announcementId,
      content,
      parentId,
    }: {
      announcementId: string;
      content: string;
      /** 대댓글일 경우 부모 댓글 ID / Parent comment ID for replies */
      parentId?: string;
    }) => {
      const { data } = await api.post(`/api/announcements/${announcementId}/comments`, {
        content,
        parentId,
      });
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['announcement'] }),
  });
}

/** 공지사항 댓글 삭제 뮤테이션 훅 / Announcement comment deletion mutation hook */
export function useDeleteComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (commentId: string) => {
      const { data } = await api.delete(`/api/announcements/comments/${commentId}`);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['announcement'] }),
  });
}

/** 공지사항 좋아요 토글 뮤테이션 훅 / Announcement like toggle mutation hook */
export function useToggleAnnouncementLike() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/api/announcements/${id}/like`);
      return data.data as { liked: boolean };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['announcement'] });
      qc.invalidateQueries({ queryKey: ['announcements'] });
    },
  });
}

/** 공지사항 댓글 좋아요 토글 뮤테이션 훅 / Announcement comment like toggle mutation hook */
export function useToggleCommentLike() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (commentId: string) => {
      const { data } = await api.post(`/api/announcements/comments/${commentId}/like`);
      return data.data as { liked: boolean };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['announcement'] }),
  });
}

/**
 * 공지사항 조회수 증가 뮤테이션 훅 (fire-and-forget 패턴)
 * Announcement view count increment mutation hook (fire-and-forget pattern)
 */
export function useIncrementViewCount() {
  return useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/api/announcements/${id}/view`);
    },
  });
}

/**
 * 이전/다음 공지사항 네비게이션 정보를 조회하는 훅
 * Hook that fetches previous/next announcement navigation info
 *
 * @param id - 현재 공지사항 ID / Current announcement ID
 * @returns { prev, next } — 이전/다음 공지 { id, title } 또는 null / Previous/next announcement { id, title } or null
 */
export function useAdjacentAnnouncements(id: string) {
  return useQuery({
    queryKey: ['announcement-adjacent', id],
    queryFn: async () => {
      const { data } = await api.get(`/api/announcements/${id}/adjacent`);
      return data.data as {
        prev: { id: string; title: string } | null;
        next: { id: string; title: string } | null;
      };
    },
    enabled: !!id,
  });
}

// ===== 프로필 (Profile) =====

/** 현재 사용자 프로필 조회 훅 / Hook for fetching current user profile */
export function useProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data } = await api.get('/api/profile');
      return data.data as UserProfile;
    },
  });
}

/** 프로필 수정 뮤테이션 훅 / Profile update mutation hook */
export function useUpdateProfile() {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: async (body: Partial<UserProfile>) => {
      const { data } = await api.put('/api/profile', body);
      return data.data as UserProfile;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile'] });
      useToastStore.getState().addToast(t('toast.profileUpdated'), 'success');
    },
  });
}

/** 비밀번호 변경 뮤테이션 훅 / Password change mutation hook */
export function useChangePassword() {
  const { t } = useTranslation();
  return useMutation({
    mutationFn: async (body: {
      currentPassword: string;
      newPassword: string;
      confirmPassword: string;
    }) => {
      const { data } = await api.post('/api/profile/change-password', body);
      return data;
    },
    onSuccess: () => {
      useToastStore.getState().addToast(t('toast.passwordChanged'), 'success');
    },
  });
}

// ===== 알림 (Notifications) =====

/**
 * 알림 목록 조회 훅 (페이지네이션)
 * Hook for fetching notifications list (with pagination)
 *
 * @param params.page - 페이지 번호 / Page number
 * @param params.limit - 페이지당 항목 수 / Items per page
 */
export function useNotifications(params: { page: number; limit: number }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['notifications', params],
    queryFn: async () => {
      const { data } = await api.get('/api/notifications', { params });
      return data.data as {
        items: NotificationItem[];
        total: number;
        unreadCount: number;
        page: number;
        limit: number;
        totalPages: number;
      };
    },
    enabled: isAuthenticated,
  });
}

/**
 * 읽지 않은 알림 수를 조회하는 훅 (헤더 뱃지용)
 * Hook that fetches unread notification count (for header badge)
 *
 * @returns TanStack Query 결과 (number) / TanStack Query result (number)
 */
export function useUnreadCount() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['unread-count'],
    queryFn: async () => {
      const { data } = await api.get('/api/notifications/unread-count');
      return data.data.count as number;
    },
    // 30초마다 폴링하여 실시간에 가깝게 뱃지 갱신
    // Poll every 30s for near-real-time badge updates
    refetchInterval: 30000,
    enabled: isAuthenticated,
  });
}

/** 개별 알림 읽음 처리 뮤테이션 훅 / Single notification mark-as-read mutation hook */
export function useMarkAsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/api/notifications/${id}/read`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['unread-count'] });
    },
  });
}

/** 모든 알림 읽음 처리 뮤테이션 훅 / Mark all notifications as read mutation hook */
export function useMarkAllAsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await api.post('/api/notifications/read-all');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['unread-count'] });
    },
  });
}

/** 알림 삭제 뮤테이션 훅 / Notification deletion mutation hook */
export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/api/notifications/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
    },
  });
}

// ===== 통계 (Statistics) =====
// 모든 통계 훅은 관리자 대시보드에서 사용됩니다.
// All statistics hooks are used in the admin dashboard.

/** 전체 통계 개요 조회 훅 (사용자 수, 주문 수 등) / Overview statistics hook (user count, order count, etc.) */
export function useStatOverview() {
  return useQuery({
    queryKey: ['stat-overview'],
    queryFn: async () => {
      const { data } = await api.get('/api/statistics/overview');
      return data.data as StatOverview;
    },
  });
}

/**
 * 가입 신청 통계 (타임라인) 조회 훅
 * Registration statistics (timeline) hook
 *
 * @param period - 집계 단위 ('day', 'week', 'month') / Aggregation unit
 * @param days - 조회 기간 (일 수) / Query period (number of days)
 */
export function useStatRegistrations(period: string, days: number) {
  return useQuery({
    queryKey: ['stat-registrations', period, days],
    queryFn: async () => {
      const { data } = await api.get('/api/statistics/registrations', {
        params: { period, days },
      });
      return data.data as TimelineEntry[];
    },
  });
}

/** 승인된 가입 통계 (타임라인) 조회 훅 / Approved registration statistics (timeline) hook */
export function useStatRegistrationsApproved(period: string, days: number) {
  return useQuery({
    queryKey: ['stat-registrations-approved', period, days],
    queryFn: async () => {
      const { data } = await api.get('/api/statistics/registrations-approved', {
        params: { period, days },
      });
      return data.data as TimelineEntry[];
    },
  });
}

/** 로그인 통계 (타임라인) 조회 훅 / Login statistics (timeline) hook */
export function useStatLogins(period: string, days: number) {
  return useQuery({
    queryKey: ['stat-logins', period, days],
    queryFn: async () => {
      const { data } = await api.get('/api/statistics/logins', {
        params: { period, days },
      });
      return data.data as TimelineEntry[];
    },
  });
}

/** 페이지 뷰 통계 조회 훅 (타임라인 + 인기 페이지) / Page view statistics hook (timeline + top pages) */
export function useStatPageViews(period: string, days: number) {
  return useQuery({
    queryKey: ['stat-page-views', period, days],
    queryFn: async () => {
      const { data } = await api.get('/api/statistics/page-views', {
        params: { period, days },
      });
      return data.data as { timeline: TimelineEntry[]; topPages: TopPage[] };
    },
  });
}

/** 공지사항/댓글 통계 조회 훅 / Announcement/comment statistics hook */
export function useStatAnnouncements(days: number) {
  return useQuery({
    queryKey: ['stat-announcements', days],
    queryFn: async () => {
      const { data } = await api.get('/api/statistics/announcements', {
        params: { days },
      });
      return data.data as {
        announcements: TimelineEntry[];
        comments: TimelineEntry[];
        totalAnnouncements: number;
        totalComments: number;
      };
    },
  });
}

/** 사용자 통계 조회 훅 (역할별, 상태별 분류) / User statistics hook (by role, by status) */
export function useStatUsers() {
  return useQuery({
    queryKey: ['stat-users'],
    queryFn: async () => {
      const { data } = await api.get('/api/statistics/users');
      return data.data as {
        byRole: UserStatByRole[];
        byStatus: UserStatByStatus[];
      };
    },
  });
}

/** 통계 개요 추이 조회 훅 (전일 대비 변화량 등) / Overview trend statistics hook (change vs. previous day, etc.) */
export function useStatOverviewTrend() {
  return useQuery({
    queryKey: ['stat-overview-trend'],
    queryFn: async () => {
      const { data } = await api.get('/api/statistics/overview-trend');
      return data.data as OverviewTrend;
    },
  });
}

/** 거래 통계 조회 훅 (거래량, 체결 수 등) / Trading statistics hook (volume, trade count, etc.) */
export function useStatTrading(days: number) {
  return useQuery({
    queryKey: ['stat-trading', days],
    queryFn: async () => {
      const { data } = await api.get('/api/orders/stats/trading', {
        params: { days },
      });
      return data.data as TradingStats;
    },
  });
}

/** 인기 공지사항 조회 훅 (조회수/좋아요 기준) / Popular announcements hook (by views/likes) */
export function useStatPopularAnnouncements() {
  return useQuery({
    queryKey: ['stat-popular-announcements'],
    queryFn: async () => {
      const { data } = await api.get('/api/statistics/popular-announcements');
      return data.data as PopularAnnouncement[];
    },
  });
}

/** 좋아요 통계 조회 훅 (공지/댓글별 좋아요 추이) / Like statistics hook (announcement/comment like trends) */
export function useStatLikes(days: number) {
  return useQuery({
    queryKey: ['stat-likes', days],
    queryFn: async () => {
      const { data } = await api.get('/api/statistics/likes', { params: { days } });
      return data.data as {
        announcementLikes: TimelineEntry[];
        commentLikes: TimelineEntry[];
        totalAnnouncementLikes: number;
        totalCommentLikes: number;
        topLikedAnnouncements: PopularAnnouncement[];
      };
    },
  });
}

/** 채팅 통계 조회 훅 (방 수, 메시지 수, 일별 추이 등) / Chat statistics hook (room count, message count, daily trends, etc.) */
export function useStatChat(days: number) {
  return useQuery({
    queryKey: ['stat-chat', days],
    queryFn: async () => {
      const { data } = await api.get('/api/statistics/chat', { params: { days } });
      return data.data as {
        totalRooms: number;
        dmCount: number;
        groupCount: number;
        totalMessages: number;
        todayMessages: number;
        yesterdayMessages: number;
        activeParticipants: number;
        dailyMessages: TimelineEntry[];
        topRooms: { roomId: string; name: string; type: string; messageCount: number }[];
      };
    },
  });
}

// ===== 페이지 뷰 추적 (Page View Tracking) =====

/**
 * 페이지 뷰 추적 뮤테이션 훅
 * 오류 발생 시 조용히 무시합니다 (분석용이므로 사용자 경험에 영향 없음).
 *
 * Page view tracking mutation hook.
 * Silently ignores errors (analytics-only, no impact on user experience).
 *
 * @returns mutate 함수에 현재 페이지 경로 전달 / Pass current page path to mutate
 */
export function useTrackPageView() {
  return useMutation({
    mutationFn: async (path: string) => {
      // catch(() => {})로 오류 무시 — 분석 실패가 사용자 플로우를 방해하면 안 됨
      // Ignore errors with catch(() => {}) — analytics failure should not interrupt user flow
      await api.post('/api/statistics/page-view', { path }).catch(() => {});
    },
  });
}
