/**
 * @file 커뮤니티 데이터 훅
 * @description TanStack Query로 커뮤니티 게시글 CRUD, 좋아요, 댓글, 첨부파일을 처리합니다
 *
 * @file Community Data Hook
 * @description Handles community posts CRUD, likes, comments, and attachments via TanStack Query
 */
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useToastStore } from '@/stores/toast';

// ===== 타입 정의 (Type Definitions) =====

/** 첨부파일 정보 / Attachment information */
export interface CommunityAttachment {
  id: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

/** 게시글 정보 / Post information */
export interface CommunityPost {
  id: string;
  title: string;
  content: string;
  category: string;
  authorId: string;
  authorName: string;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  // Prisma의 _count 관계 카운트 / Prisma's _count relational count
  _count?: { comments: number; likes: number };
  likeCount?: number;
  commentCount?: number;
  attachmentCount?: number;
  /** 현재 사용자의 좋아요 여부 / Whether current user has liked this post */
  liked?: boolean;
  comments?: CommunityComment[];
  attachments?: CommunityAttachment[];
}

/**
 * 댓글 정보 (대댓글 지원)
 * Comment information (supports nested replies)
 */
export interface CommunityComment {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  postId: string;
  /** null이면 최상위 댓글, 값이 있으면 대댓글 / null = top-level comment, non-null = reply */
  parentId: string | null;
  createdAt: string;
  likeCount?: number;
  liked?: boolean;
  _count?: { likes: number };
  /** 대댓글 목록 (재귀 구조) / Nested replies (recursive structure) */
  replies?: CommunityComment[];
}

/** 게시글 목록 페이지네이션 응답 / Paginated posts list response */
interface PostsResponse {
  data: CommunityPost[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ===== 조회 훅 (Query Hooks) =====

/**
 * 커뮤니티 게시글 목록을 페이지네이션으로 조회하는 훅
 * Hook that fetches paginated community posts list
 *
 * @param page - 페이지 번호 (기본: 1) / Page number (default: 1)
 * @param category - 카테고리 필터 (선택) / Category filter (optional)
 * @param search - 검색어 (선택) / Search keyword (optional)
 * @returns TanStack Query 결과 (PostsResponse) / TanStack Query result (PostsResponse)
 */
export function useCommunityPosts(page = 1, category?: string, search?: string) {
  return useQuery<PostsResponse>({
    // page, category, search를 queryKey에 포함하여 필터 변경 시 자동 리페치
    // Include page, category, search in queryKey for automatic refetch on filter change
    queryKey: ['community', 'posts', page, category, search],
    queryFn: async () => {
      // URL 쿼리 파라미터 조립 / Build URL query parameters
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '10');
      // 'ALL' 카테고리는 필터링하지 않음 / 'ALL' category means no filtering
      if (category && category !== 'ALL') params.set('category', category);
      if (search) params.set('search', search);
      const { data } = await api.get(`/api/community/posts?${params.toString()}`);

      // 백엔드 응답 구조 정규화 (posts/data 키가 다를 수 있음)
      // Normalize backend response structure (posts/data key may differ)
      const res = data.data ?? data;
      return {
        data: res.posts ?? res.data ?? [],
        total: res.total ?? 0,
        page: res.page ?? page,
        limit: res.limit ?? 10,
        totalPages: res.totalPages ?? 1,
      };
    },
  });
}

/**
 * 단일 게시글 상세 조회 훅 (댓글, 첨부파일 포함)
 * Hook that fetches a single post detail (including comments and attachments)
 *
 * @param id - 게시글 ID / Post ID
 * @returns TanStack Query 결과 (CommunityPost) / TanStack Query result (CommunityPost)
 */
export function useCommunityPost(id: string) {
  return useQuery<CommunityPost>({
    queryKey: ['community', 'post', id],
    queryFn: async () => {
      const { data } = await api.get(`/api/community/posts/${id}`);
      return data.data ?? data;
    },
    // id가 없으면 쿼리 비활성화 (초기 렌더링 시 빈 문자열 방지)
    // Disable query when id is empty (prevents initial render with empty string)
    enabled: !!id,
  });
}

// ===== 게시글 뮤테이션 훅 (Post Mutation Hooks) =====

/**
 * 새 게시글 작성 뮤테이션 훅
 * Mutation hook for creating a new post
 *
 * @returns mutate 함수에 { title, content, category? } 전달 / Pass { title, content, category? } to mutate
 */
export function useCreatePost() {
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  return useMutation({
    mutationFn: async (body: { title: string; content: string; category?: string }) => {
      const { data } = await api.post('/api/community/posts', body);
      return data;
    },
    onSuccess: () => {
      // 게시글 목록 캐시 무효화하여 새 글 반영 / Invalidate posts list cache to reflect new post
      queryClient.invalidateQueries({ queryKey: ['community', 'posts'] });
      addToast('게시글이 작성되었습니다.', 'success');
    },
  });
}

/**
 * 게시글 수정 뮤테이션 훅
 * Mutation hook for updating a post
 *
 * @returns mutate 함수에 { id, title?, content?, category? } 전달 / Pass { id, title?, content?, category? } to mutate
 */
export function useUpdatePost() {
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: string; title?: string; content?: string; category?: string }) => {
      const { data } = await api.put(`/api/community/posts/${id}`, body);
      return data;
    },
    onSuccess: (_data, vars) => {
      // 목록과 상세 캐시 모두 무효화 / Invalidate both list and detail cache
      queryClient.invalidateQueries({ queryKey: ['community', 'posts'] });
      queryClient.invalidateQueries({ queryKey: ['community', 'post', vars.id] });
      addToast('게시글이 수정되었습니다.', 'success');
    },
  });
}

/**
 * 게시글 삭제 뮤테이션 훅
 * Mutation hook for deleting a post
 *
 * @returns mutate 함수에 게시글 ID 전달 / Pass post ID to mutate
 */
export function useDeletePost() {
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/api/community/posts/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community', 'posts'] });
      addToast('게시글이 삭제되었습니다.', 'success');
    },
  });
}

// ===== 좋아요 / 댓글 훅 (Like / Comment Hooks) =====

/**
 * 게시글 좋아요 토글 뮤테이션 훅 (좋아요 ↔ 좋아요 취소)
 * Mutation hook for toggling post like (like ↔ unlike)
 *
 * @returns mutate 함수에 게시글 ID 전달 / Pass post ID to mutate
 */
export function useLikePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/api/community/posts/${id}/like`);
      return data;
    },
    onSuccess: (_data, id) => {
      // 목록과 상세 양쪽의 좋아요 수를 업데이트하기 위해 캐시 무효화
      // Invalidate both list and detail caches to update like counts
      queryClient.invalidateQueries({ queryKey: ['community', 'posts'] });
      queryClient.invalidateQueries({ queryKey: ['community', 'post', id] });
    },
  });
}

/**
 * 댓글 작성 뮤테이션 훅 (대댓글 지원: parentId 전달 시)
 * Mutation hook for creating a comment (supports replies via parentId)
 *
 * @returns mutate 함수에 { postId, content, parentId? } 전달 / Pass { postId, content, parentId? } to mutate
 */
export function useCreateComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ postId, content, parentId }: { postId: string; content: string; parentId?: string }) => {
      const { data } = await api.post(`/api/community/posts/${postId}/comments`, { content, parentId });
      return data;
    },
    onSuccess: (_data, vars) => {
      // 게시글 상세(댓글 목록)와 목록(댓글 수 카운트) 모두 갱신
      // Refresh both post detail (comment list) and posts list (comment count)
      queryClient.invalidateQueries({ queryKey: ['community', 'post', vars.postId] });
      queryClient.invalidateQueries({ queryKey: ['community', 'posts'] });
    },
  });
}

/**
 * 댓글 삭제 뮤테이션 훅
 * Mutation hook for deleting a comment
 *
 * @returns mutate 함수에 { commentId, postId } 전달 / Pass { commentId, postId } to mutate
 */
export function useDeleteComment() {
  const queryClient = useQueryClient();
  return useMutation({
    // postId는 mutationFn에서는 사용하지 않지만, onSuccess에서 캐시 무효화에 필요
    // postId is unused in mutationFn but needed for cache invalidation in onSuccess
    mutationFn: async ({ commentId }: { commentId: string; postId: string }) => {
      const { data } = await api.delete(`/api/community/comments/${commentId}`);
      return data;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['community', 'post', vars.postId] });
      queryClient.invalidateQueries({ queryKey: ['community', 'posts'] });
    },
  });
}

/**
 * 댓글 좋아요 토글 뮤테이션 훅
 * Mutation hook for toggling comment like
 *
 * @returns mutate 함수에 { commentId, postId } 전달 / Pass { commentId, postId } to mutate
 */
export function useLikeComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ commentId }: { commentId: string; postId: string }) => {
      const { data } = await api.post(`/api/community/comments/${commentId}/like`);
      return data;
    },
    onSuccess: (_data, vars) => {
      // 댓글 좋아요 변경은 게시글 상세에만 반영하면 충분
      // Comment like change only needs to be reflected in post detail
      queryClient.invalidateQueries({ queryKey: ['community', 'post', vars.postId] });
    },
  });
}

// ===== 첨부파일 훅 (Attachment Hooks) =====

/**
 * 게시글 첨부파일 업로드 뮤테이션 훅
 * FileReader로 파일을 base64로 변환한 뒤 JSON body로 전송합니다.
 * (multipart/form-data 대신 base64 JSON 방식 사용)
 *
 * Mutation hook for uploading a post attachment.
 * Converts file to base64 via FileReader, then sends as JSON body.
 * (Uses base64 JSON approach instead of multipart/form-data)
 *
 * @returns mutate 함수에 { postId, file } 전달 / Pass { postId, file } to mutate
 */
export function useUploadCommunityAttachment() {
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  return useMutation({
    mutationFn: async ({ postId, file }: { postId: string; file: File }) => {
      // FileReader를 사용하여 File → base64 문자열로 변환
      // Convert File to base64 string using FileReader
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // data:mime;base64, 접두사를 제거하고 순수 base64 데이터만 추출
          // Strip data:mime;base64, prefix to extract pure base64 data
          resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const { data } = await api.post(`/api/community/posts/${postId}/attachments`, {
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
        data: base64,
      });
      return data;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['community', 'post', vars.postId] });
      addToast('첨부파일이 업로드되었습니다.', 'success');
    },
  });
}

/**
 * 게시글 첨부파일 삭제 뮤테이션 훅
 * Mutation hook for deleting a post attachment
 *
 * @returns mutate 함수에 { attachmentId, postId } 전달 / Pass { attachmentId, postId } to mutate
 */
export function useDeleteCommunityAttachment() {
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  return useMutation({
    // postId는 mutationFn에서 미사용, onSuccess 캐시 무효화용
    // postId unused in mutationFn, needed for onSuccess cache invalidation
    mutationFn: async ({ attachmentId }: { attachmentId: string; postId: string }) => {
      const { data } = await api.delete(`/api/community/attachments/${attachmentId}`);
      return data;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['community', 'post', vars.postId] });
      addToast('첨부파일이 삭제되었습니다.', 'success');
    },
  });
}
