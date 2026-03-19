/**
 * @file 커뮤니티 페이지
 * @description 자유게시판(실제 API), 전략 공유(실제 API), 트레이더 랭킹을 보여주는 소셜/커뮤니티 페이지
 *
 * @file Community Page
 * @description Community page with real discussion board, real strategy sharing, and trader rankings
 *
 * PF-M-01 / BD-M-01: 950-line monolith split into lazy-loaded tab components
 */
'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import LoginRequiredModal from '@/components/ui/LoginRequiredModal';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { useAuthStore } from '@/stores/auth';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/format';
import { Users } from 'lucide-react';

/* ───────── 동적 임포트 — 탭별 코드 스플리팅 / Dynamic imports — per-tab code splitting ───────── */

const DiscussionsTab = dynamic(() => import('@/components/community/DiscussionsTab'), { ssr: false });
const StrategiesTab = dynamic(() => import('@/components/community/StrategiesTab'), { ssr: false });
const TradersTab = dynamic(() => import('@/components/community/TradersTab'), { ssr: false });
const ActivityFeed = dynamic(() => import('@/components/trading/ActivityFeed'), { ssr: false });

/* ───────── 메인 페이지 / Main Page ───────── */

/** Suspense 래퍼 — useSearchParams 사용을 위해 필요
 * Suspense wrapper — required for useSearchParams usage in Next.js 15 */
export default function CommunityPageWrapper() {
  return (
    <Suspense fallback={<div className="py-24 text-center text-text-quaternary animate-pulse">Loading...</div>}>
      <CommunityPage />
    </Suspense>
  );
}

/** 커뮤니티 페이지 컴포넌트 — 자유게시판/전략 공유/트레이더 랭킹 탭
 * Community page component — discussions, strategies, and trader rankings tabs */
function CommunityPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL 파라미터에서 초기 탭 결정 / Determine initial tab from URL param
  const initialTab = (() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'strategies' || tabParam === 'traders' || tabParam === 'feed') return tabParam;
    return 'discussions' as const;
  })();

  const [tab, setTabRaw] = useState<'discussions' | 'strategies' | 'traders' | 'feed'>(initialTab);
  const setTab = useCallback((v: typeof tab) => { setTabRaw(v); window.scrollTo({ top: 0, behavior: 'smooth' }); }, []);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { data: leaderboardData } = useLeaderboard();

  // 로그인 필요 모달 상태 / Login required modal state
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [loginModalMessage, setLoginModalMessage] = useState<string | undefined>();

  /** 로그인 모달 표시 헬퍼 / Show login modal helper */
  const showLoginModal = useCallback((message?: string) => {
    setLoginModalMessage(message);
    setLoginModalOpen(true);
  }, []);

  /** 전략 글쓰기 자격 확인 — 시스템관리자 무조건 허용, 일반 사용자는 수익률 5% 이상 또는 자산 상위 20%
   * Check strategy write eligibility — always allowed for SYSTEM/ADMIN, otherwise return rate >= 5% or top 20% assets */
  const canWriteStrategy = useMemo(() => {
    if (!isAuthenticated) return false;
    const userAuth = useAuthStore.getState().user;
    // 시스템관리자/관리자는 무조건 글쓰기 가능 / SYSTEM/ADMIN can always write strategies
    if (userAuth && (userAuth.role === 'SYSTEM' || userAuth.role === 'ADMIN')) return true;
    if (!leaderboardData || leaderboardData.length === 0) return false;
    const userEntry = leaderboardData.find((e) => e.isMe || (userAuth && e.id === userAuth.id));
    if (!userEntry) return false;
    if (userEntry.pnlPercent >= 5) return true;
    const sorted = [...leaderboardData].sort((a, b) => b.totalValue - a.totalValue);
    const userIndex = sorted.findIndex((e) => e.id === userEntry.id);
    if (userIndex >= 0 && userIndex < sorted.length * 0.2) return true;
    return false;
  }, [isAuthenticated, leaderboardData]);

  /** 트레이더 탭 클릭 핸들러 — 비로그인 시 로그인 모달 표시
   * Traders tab click handler — shows login modal for non-authenticated users */
  const handleTabClick = useCallback((tabKey: 'discussions' | 'strategies' | 'traders' | 'feed') => {
    if ((tabKey === 'traders' || tabKey === 'feed') && !isAuthenticated) {
      showLoginModal(t('community.tradersLoginRequired'));
      return;
    }
    setTab(tabKey);
  }, [isAuthenticated, setTab, showLoginModal, t]);

  /** 게시글 클릭 핸들러 — 회원 전용 게시글 비로그인 시 로그인 모달 표시
   * Post click handler — shows login modal for members-only posts when not logged in */
  const handlePostClick = useCallback((postId: string, visibility?: string) => {
    if (visibility === 'MEMBERS_ONLY' && !isAuthenticated) {
      showLoginModal(t('community.membersOnlyPost'));
      return;
    }
    router.push(`/community/${postId}`);
  }, [isAuthenticated, router, showLoginModal, t]);

  /** 전략 카드 클릭 핸들러 — 비로그인 시 로그인 모달, 로그인 시 상세 페이지로 이동
   * Strategy card click handler — login modal for non-auth, navigate to detail for auth */
  const handleStrategyClick = useCallback((strategyId: string) => {
    if (!isAuthenticated) {
      showLoginModal(t('community.strategyLoginRequired'));
      return;
    }
    router.push(`/community/strategy/${strategyId}`);
  }, [isAuthenticated, router, showLoginModal, t]);

  /** 전략 좋아요 토글 — 비로그인 시 로그인 모달
   * Toggle strategy like — login modal for non-auth */
  const handleStrategyLike = useCallback((_strategyId: string) => {
    if (!isAuthenticated) {
      showLoginModal(t('community.strategyLoginRequired'));
      return;
    }
    // Like is handled inside StrategiesTab via useLikeStrategy — this is a guard only
  }, [isAuthenticated, showLoginModal, t]);

  /** 글쓰기 버튼 클릭 핸들러 — 비로그인 시 로그인 모달 표시
   * Write button click handler — shows login modal for non-authenticated users */
  const handleWriteClick = useCallback(() => {
    if (!isAuthenticated) {
      showLoginModal();
      return;
    }
    router.push('/community/new');
  }, [isAuthenticated, router, showLoginModal]);

  /** 전략 글쓰기 핸들러 — 비로그인 시 로그인 모달, 자격 미달 시 무시
   * Strategy write handler — login modal for non-auth, ignore if not eligible */
  const handleStrategyWriteClick = useCallback(() => {
    if (!isAuthenticated) {
      showLoginModal();
      return;
    }
    if (!canWriteStrategy) return;
    router.push('/community/strategy/new');
  }, [isAuthenticated, canWriteStrategy, router, showLoginModal]);

  return (
      <div>
        {/* 로그인 필요 모달 / Login Required Modal */}
        <LoginRequiredModal
          isOpen={loginModalOpen}
          onClose={() => setLoginModalOpen(false)}
          message={loginModalMessage}
        />

        {/* 헤더 / Header */}
        <div className="py-6 flex items-center gap-2.5 h-[88px]">
          <Users className="w-5 h-5 text-accent" />
          <h1 className="text-[20px] font-extrabold text-text-primary">
            {t('community.title')}
          </h1>
        </div>

        {/* 탭 네비게이션 / Tab navigation */}
        <div className="flex items-center border-b border-border mb-5">
          {([
            { key: 'discussions' as const, label: t('community.discussions') },
            { key: 'strategies' as const, label: t('community.strategies') },
            { key: 'traders' as const, label: t('community.traders') },
            { key: 'feed' as const, label: t('feed.title') },
          ]).map((item) => (
            <button
              key={item.key}
              onClick={() => handleTabClick(item.key)}
              className={cn(
                'relative px-4 py-2.5 text-[14px] font-semibold transition-colors',
                tab === item.key
                  ? 'text-accent'
                  : 'text-text-tertiary hover:text-text-primary',
              )}
            >
              {item.label}
              {tab === item.key && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-accent rounded-t" />
              )}
            </button>
          ))}
        </div>

        {/* 자유게시판 탭 / Discussions Tab */}
        {tab === 'discussions' && (
          <DiscussionsTab
            onPostClick={handlePostClick}
            onWriteClick={handleWriteClick}
          />
        )}

        {/* 전략 공유 탭 / Strategies Tab */}
        {tab === 'strategies' && (
          <StrategiesTab
            isAuthenticated={isAuthenticated}
            canWriteStrategy={canWriteStrategy}
            onStrategyClick={handleStrategyClick}
            onStrategyLike={handleStrategyLike}
            onWriteClick={handleStrategyWriteClick}
          />
        )}

        {/* 트레이더 탭 / Traders Tab */}
        {tab === 'traders' && (
          <TradersTab showLoginModal={showLoginModal} />
        )}

        {/* 활동 피드 탭 / Activity Feed Tab */}
        {tab === 'feed' && (
          <ActivityFeed />
        )}
      </div>
  );
}
