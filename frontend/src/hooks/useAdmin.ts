/**
 * @file 관리자 API 훅
 * @description 회원관리, 공지사항, 프로필, 알림, 통계 API 훅
 *
 * @file Admin API Hooks
 * @description API hooks for user management, announcements, profile, notifications, statistics
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
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

// ===== User Management =====
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

export function useApproveUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, note }: { id: string; note?: string }) => {
      const { data } = await api.post(`/api/admin/users/${id}/approve`, { note });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      qc.invalidateQueries({ queryKey: ['admin-user'] });
    },
  });
}

export function useRejectUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, note }: { id: string; note?: string }) => {
      const { data } = await api.post(`/api/admin/users/${id}/reject`, { note });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      qc.invalidateQueries({ queryKey: ['admin-user'] });
    },
  });
}

export function useDeactivateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/api/admin/users/${id}/deactivate`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      qc.invalidateQueries({ queryKey: ['admin-user'] });
    },
  });
}

export function useActivateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/api/admin/users/${id}/activate`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      qc.invalidateQueries({ queryKey: ['admin-user'] });
    },
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/api/admin/users/${id}`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });
}

// ===== Announcements =====
export function useAnnouncements(params: { page: number; limit: number; search?: string }) {
  return useQuery({
    queryKey: ['announcements', params],
    queryFn: async () => {
      const { data } = await api.get('/api/announcements', { params });
      return data.data as PaginatedResponse<AnnouncementListItem>;
    },
  });
}

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

export function useCreateAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { title: string; content: string; isPinned?: boolean }) => {
      const { data } = await api.post('/api/announcements', body);
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['announcements'] }),
  });
}

export function useUpdateAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: string; title: string; content: string; isPinned?: boolean }) => {
      const { data } = await api.put(`/api/announcements/${id}`, body);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['announcements'] });
      qc.invalidateQueries({ queryKey: ['announcement'] });
    },
  });
}

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

export function useUploadAttachment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ announcementId, file }: { announcementId: string; file: File }) => {
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

export function useDeleteAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/api/announcements/${id}`);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['announcements'] }),
  });
}

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

export function useIncrementViewCount() {
  return useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/api/announcements/${id}/view`);
    },
  });
}

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

// ===== Profile =====
export function useProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data } = await api.get('/api/profile');
      return data.data as UserProfile;
    },
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Partial<UserProfile>) => {
      const { data } = await api.put('/api/profile', body);
      return data.data as UserProfile;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profile'] }),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (body: {
      currentPassword: string;
      newPassword: string;
      confirmPassword: string;
    }) => {
      const { data } = await api.post('/api/profile/change-password', body);
      return data;
    },
  });
}

// ===== Notifications =====
export function useNotifications(params: { page: number; limit: number }) {
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
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: ['unread-count'],
    queryFn: async () => {
      const { data } = await api.get('/api/notifications/unread-count');
      return data.data.count as number;
    },
    refetchInterval: 30000,
  });
}

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

// ===== Statistics =====
export function useStatOverview() {
  return useQuery({
    queryKey: ['stat-overview'],
    queryFn: async () => {
      const { data } = await api.get('/api/statistics/overview');
      return data.data as StatOverview;
    },
  });
}

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

export function useStatOverviewTrend() {
  return useQuery({
    queryKey: ['stat-overview-trend'],
    queryFn: async () => {
      const { data } = await api.get('/api/statistics/overview-trend');
      return data.data as OverviewTrend;
    },
  });
}

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

export function useStatPopularAnnouncements() {
  return useQuery({
    queryKey: ['stat-popular-announcements'],
    queryFn: async () => {
      const { data } = await api.get('/api/statistics/popular-announcements');
      return data.data as PopularAnnouncement[];
    },
  });
}

// ===== Page View Tracking =====
export function useTrackPageView() {
  return useMutation({
    mutationFn: async (path: string) => {
      await api.post('/api/statistics/page-view', { path }).catch(() => {});
    },
  });
}
