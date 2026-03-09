/**
 * @file 도움말 페이지
 * @description 각 메뉴별 탭 + 클릭 시 손그림 일러스트레이션으로 기능 설명
 *
 * @file Help Page
 * @description Tab-based help with hand-drawn illustrations on feature click
 */
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/format';
import {
  HelpCircle,
  LayoutDashboard,
  Briefcase,
  ClipboardList,
  Trophy,
  Megaphone,
  Newspaper,
  MessageCircle,
  BarChart3,
  Users,
  Star,
  Search,
  ArrowUpDown,
  Clock,
  DollarSign,
  TrendingUp,
  ShoppingCart,
  XCircle,
  Filter,
  RefreshCw,
  Eye,
  Heart,
  Paperclip,
  Link,
  UserPlus,
  Ban,
  PanelRightOpen,
  CheckCircle,
  FileText,
  ChevronDown,
  MousePointerClick,
  BarChart,
  PieChart,
  History,
  Scale,
  Calculator,
  Medal,
  Target,
  PenTool,
  Trash2,
  Bell,
  Maximize2,
  Layers,
  Shield,
  ListFilter,
  CandlestickChart,
  BookOpen,
  Settings,
  Activity,
  User,
  Lock,
  BellRing,
  MessagesSquare,
  Lightbulb,
  Award,
  Server,
  Cpu,
  Gauge,
  FileCheck,
  Download,
} from 'lucide-react';
import type { TranslationKey } from '@/lib/i18n';

/* ─── SVG 일러스트레이션 동적 임포트 — 번들 분할을 위해 별도 파일로 추출 / Dynamic import of SVG illustrations — extracted to separate file for bundle splitting ─── */
import {
  illustrationMap,
  tipMap,
  faqIllustrationMap,
  faqTipMap,
} from '@/components/help/HelpIllustrations';

/* ─── Feature item with expand/collapse ─── */
interface FeatureItemData {
  icon: React.ReactNode;
  text: TranslationKey;
}

/** 기능 항목 — 클릭 시 SVG 일러스트 + 팁 펼침/접힘
 * Feature item — expands/collapses SVG illustration + tips on click */
function FeatureItem({
  item,
  index,
  tabKey,
  expanded,
  onToggle,
  t,
}: {
  item: FeatureItemData;
  index: number;
  tabKey: string;
  expanded: boolean;
  onToggle: () => void;
  t: (key: TranslationKey) => string;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (expanded && contentRef.current) {
      setHeight(contentRef.current.scrollHeight);
    } else {
      setHeight(0);
    }
  }, [expanded]);

  const hasIllust = !!illustrationMap[tabKey]?.[index];
  const tips = tipMap[tabKey]?.[index];

  return (
    <div className="rounded-xl border border-border/40 overflow-hidden transition-colors hover:border-border/80">
      <button
        onClick={hasIllust ? onToggle : undefined}
        className={cn(
          'w-full flex items-start gap-3 px-4 py-3 text-left transition-colors',
          hasIllust ? 'cursor-pointer hover:bg-bg-secondary/60' : 'cursor-default',
          expanded && 'bg-bg-secondary/40',
        )}
      >
        <div className="w-7 h-7 rounded-lg bg-accent/8 flex items-center justify-center text-accent shrink-0 mt-0.5">
          {item.icon}
        </div>
        <p className="flex-1 text-[13px] text-text-primary leading-relaxed">{t(item.text)}</p>
        {hasIllust && (
          <ChevronDown className={cn('w-4 h-4 text-text-quaternary shrink-0 mt-1 transition-transform duration-300', expanded && 'rotate-180')} />
        )}
      </button>
      <div
        style={{ maxHeight: height }}
        className="overflow-hidden transition-[max-height] duration-400 ease-in-out"
      >
        <div ref={contentRef} className="px-4 pb-4 pt-1">
          <div className={cn('flex flex-col gap-4', tips?.length ? 'lg:flex-row' : '')}>
            <div className={cn('min-w-0', tips?.length ? 'lg:flex-[3]' : 'w-full')}>
              <div className="bg-bg-secondary/30 border border-border/30 rounded-xl p-3 sm:p-4">
                {illustrationMap[tabKey]?.[index]?.()}
              </div>
            </div>
            {tips && tips.length > 0 && (
              <div className="lg:flex-[2] shrink-0">
                <div className="bg-bg-secondary/20 border border-border/20 rounded-xl p-4 h-full">
                  <p className="text-[12px] font-bold text-accent mb-3 flex items-center gap-1.5">
                    💡 {t('help.tips')}
                  </p>
                  <div className="space-y-2.5">
                    {tips.map((tip, i) => (
                      <p key={i} className="text-[12px] text-text-tertiary leading-relaxed flex gap-2">
                        <span className="text-accent/70 shrink-0 font-bold">•</span>
                        <span>{t(tip)}</span>
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Section data ─── */
interface HelpSection {
  icon: React.ReactNode;
  title: TranslationKey;
  description: TranslationKey;
  items: FeatureItemData[];
  loginRequired?: boolean;
  adminOnly?: boolean;
}

/** 도움말 탭 콘텐츠 — 섹션 헤더 + 기능 목록
 * Help tab content — section header + feature list */
function HelpTab({
  section,
  tabKey,
  t,
}: {
  section: HelpSection;
  tabKey: string;
  t: (key: TranslationKey) => string;
}) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  // 탭 전환 시 펼쳐진 항목 닫기 (Close expanded item on tab change)
  useEffect(() => {
    setExpandedIndex(null);
  }, [tabKey]);

  return (
    <div className="space-y-6">
      <div className="bg-bg-secondary/60 border border-border/60 rounded-2xl p-5 sm:p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent shrink-0">
            {section.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-[16px] font-bold text-text-primary">{t(section.title)}</h2>
              {section.adminOnly && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20">
                  {t('help.badge.adminOnly' as TranslationKey)}
                </span>
              )}
              {section.loginRequired && !section.adminOnly && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-warning/10 text-warning border border-warning/20">
                  {t('help.badge.loginRequired' as TranslationKey)}
                </span>
              )}
            </div>
            <p className="text-[13px] text-text-tertiary mt-0.5">{t(section.description)}</p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-[13px] font-bold text-text-secondary px-1">{t('help.features')}</h3>
        {section.items.map((item, i) => (
          <FeatureItem
            key={i}
            item={item}
            index={i}
            tabKey={tabKey}
            expanded={expandedIndex === i}
            onToggle={() => setExpandedIndex(expandedIndex === i ? null : i)}
            t={t}
          />
        ))}
      </div>
    </div>
  );
}

/* ─── FAQ Feature Item (illustration + tips, like FeatureItem) ─── */
/** FAQ 항목 — 질문 클릭 시 일러스트 + 팁 펼침/접힘
 * FAQ item — expands/collapses illustration + tips on question click */
function FaqFeatureItem({
  id,
  tabKey,
  expanded,
  onToggle,
  t,
}: {
  id: string;
  tabKey: string;
  expanded: boolean;
  onToggle: () => void;
  t: (key: TranslationKey) => string;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (expanded && contentRef.current) {
      setHeight(contentRef.current.scrollHeight);
    } else {
      setHeight(0);
    }
  }, [expanded]);

  const illustRenderer = faqIllustrationMap[tabKey]?.[id];
  const hasIllust = !!illustRenderer;
  const tips = faqTipMap[tabKey]?.[id] ?? faqTipMap.common?.[id];

  return (
    <div className="rounded-xl border border-border/40 overflow-hidden transition-colors hover:border-border/80">
      <button
        onClick={onToggle}
        className={cn(
          'w-full flex items-start gap-3 px-4 py-3 text-left transition-colors cursor-pointer hover:bg-bg-secondary/60',
          expanded && 'bg-bg-secondary/40',
        )}
      >
        <div className="w-7 h-7 rounded-lg bg-warning/8 flex items-center justify-center text-warning shrink-0 mt-0.5">
          <HelpCircle className="w-4 h-4" />
        </div>
        <p className="flex-1 text-[14px] font-semibold text-text-primary leading-relaxed">
          {t(`help.faq.${id}.q` as TranslationKey)}
        </p>
        <ChevronDown className={cn('w-4 h-4 text-text-quaternary shrink-0 mt-1 transition-transform duration-300', expanded && 'rotate-180')} />
      </button>
      <div
        style={{ maxHeight: height }}
        className="overflow-hidden transition-[max-height] duration-400 ease-in-out"
      >
        <div ref={contentRef} className="px-4 pb-4 pt-1">
          <div className={cn('flex flex-col gap-4', hasIllust && tips?.length ? 'lg:flex-row' : '')}>
            {hasIllust && (
              <div className={cn('min-w-0', tips?.length ? 'lg:flex-[3]' : 'w-full')}>
                <div className="bg-bg-secondary/30 border border-border/30 rounded-xl p-3 sm:p-4">
                  {illustRenderer()}
                </div>
              </div>
            )}
            {tips && tips.length > 0 && (
              <div className={hasIllust ? 'lg:flex-[2] shrink-0' : 'w-full'}>
                <div className="bg-bg-secondary/20 border border-border/20 rounded-xl p-4 h-full">
                  <p className="text-[12px] font-bold text-accent mb-3 flex items-center gap-1.5">
                    💡 {t('help.tips')}
                  </p>
                  <div className="space-y-2.5">
                    {tips.map((tip, i) => (
                      <p key={i} className="text-[12px] text-text-tertiary leading-relaxed flex gap-2">
                        <span className="text-accent/70 shrink-0 font-bold">•</span>
                        <span>{t(tip as TranslationKey)}</span>
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── FAQ Section with expandable items ─── */
/** FAQ 섹션 — 탭별 FAQ + 공통 FAQ 표시
 * FAQ section — displays tab-specific FAQs + common FAQs */
function FaqSection({ tabFaqs, commonFaqs, activeTab, t }: {
  tabFaqs: string[];
  commonFaqs: string[];
  activeTab: string;
  t: (key: TranslationKey) => string;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    setExpandedId(null);
  }, [activeTab]);

  return (
    <div className="border-t border-border/60 pt-8 pb-10">
      <h2 className="text-[16px] font-bold text-text-primary mb-4 flex items-center gap-2">
        <HelpCircle className="w-5 h-5 text-accent" />
        {t('help.faq.title')}
      </h2>
      {tabFaqs.length > 0 && (
        <div className="space-y-2 mb-6">
          {tabFaqs.map((id) => (
            <FaqFeatureItem
              key={id}
              id={id}
              tabKey={activeTab}
              expanded={expandedId === id}
              onToggle={() => setExpandedId(expandedId === id ? null : id)}
              t={t}
            />
          ))}
        </div>
      )}
      {commonFaqs.length > 0 && (
        <div className="space-y-2">
          {tabFaqs.length > 0 && (
            <p className="text-[12px] text-text-quaternary font-medium uppercase mt-4 mb-2">{t('help.faq.commonTitle' as TranslationKey)}</p>
          )}
          {commonFaqs.map((id) => (
            <FaqFeatureItem
              key={id}
              id={id}
              tabKey="common"
              expanded={expandedId === `common-${id}`}
              onToggle={() => setExpandedId(expandedId === `common-${id}` ? null : `common-${id}`)}
              t={t}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── 메인 도움말 페이지 — 16개 탭(일반 11 + 관리자 5), 각 탭마다 기능 목록 + SVG 와이어프레임 일러스트 / Main help page — 16 tabs (11 normal + 5 admin), each tab has feature list + SVG wireframe illustrations ─── */
/** 도움말 페이지 컴포넌트 — 16개 탭별 기능 설명 + SVG 일러스트 + FAQ
 * Help page component — 16 tabbed feature guides with SVG illustrations + FAQ */
export default function HelpPage() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'SYSTEM' || user?.role === 'ADMIN';
  const [activeTab, setActiveTabRaw] = useState('dashboard');
  const setActiveTab = useCallback((v: string) => { setActiveTabRaw(v); window.scrollTo({ top: 0, behavior: 'smooth' }); }, []);

  // 탭 목록 — adminOnly: true인 탭은 관리자에게만 표시 / Tab list — tabs with adminOnly: true only shown to admins
  const tabs: { key: string; label: TranslationKey; icon: React.ReactNode; adminOnly?: boolean }[] = [
    { key: 'dashboard', label: 'help.tab.dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { key: 'assetDetail', label: 'help.tab.assetDetail', icon: <BarChart className="w-4 h-4" /> },
    { key: 'portfolio', label: 'help.tab.portfolio', icon: <Briefcase className="w-4 h-4" /> },
    { key: 'orders', label: 'help.tab.orders', icon: <ClipboardList className="w-4 h-4" /> },
    { key: 'leaderboard', label: 'help.tab.leaderboard', icon: <Trophy className="w-4 h-4" /> },
    { key: 'announcements', label: 'help.tab.announcements', icon: <Megaphone className="w-4 h-4" /> },
    { key: 'news', label: 'help.tab.news', icon: <Newspaper className="w-4 h-4" /> },
    { key: 'chat', label: 'help.tab.chat', icon: <MessageCircle className="w-4 h-4" /> },
    { key: 'notifications', label: 'help.tab.notifications' as TranslationKey, icon: <Bell className="w-4 h-4" /> },
    { key: 'community', label: 'help.tab.community' as TranslationKey, icon: <MessagesSquare className="w-4 h-4" /> },
    { key: 'mypage', label: 'help.tab.mypage' as TranslationKey, icon: <User className="w-4 h-4" /> },
    { key: 'adminStats', label: 'help.tab.adminStats', icon: <BarChart3 className="w-4 h-4" />, adminOnly: true },
    { key: 'adminUsers', label: 'help.tab.adminUsers', icon: <Users className="w-4 h-4" />, adminOnly: true },
    { key: 'adminSettings', label: 'help.tab.adminSettings' as TranslationKey, icon: <Settings className="w-4 h-4" />, adminOnly: true },
    { key: 'adminHealth', label: 'help.tab.adminHealth' as TranslationKey, icon: <Activity className="w-4 h-4" />, adminOnly: true },
    { key: 'adminAudit', label: 'help.tab.adminAudit' as TranslationKey, icon: <FileCheck className="w-4 h-4" />, adminOnly: true },
  ];

  // 일반 탭/관리자 탭 분리 — 사이드바에서 구분선으로 나뉨 / Separate normal/admin tabs — divided by separator in sidebar
  const normalTabs = tabs.filter((tab) => !tab.adminOnly);
  const adminTabs = tabs.filter((tab) => tab.adminOnly && isAdmin);
  const _visibleTabs = tabs.filter((tab) => !tab.adminOnly || isAdmin);

  /**
   * 각 탭의 콘텐츠 정의 — 아이콘, 제목, 설명, 기능 목록(items)
   * items 클릭 시 해당 기능의 SVG 와이어프레임 일러스트가 표시됨
   *
   * Content definition for each tab — icon, title, description, feature list (items)
   * Clicking an item displays its SVG wireframe illustration
   */
  const sections: Record<string, HelpSection> = {
    dashboard: {
      icon: <LayoutDashboard className="w-5 h-5" />,
      title: 'help.dashboard.title',
      description: 'help.dashboard.desc',
      items: [
        { icon: <TrendingUp className="w-4 h-4" />, text: 'help.dashboard.chart' },
        { icon: <Filter className="w-4 h-4" />, text: 'help.dashboard.filter' },
        { icon: <ArrowUpDown className="w-4 h-4" />, text: 'help.dashboard.sort' },
        { icon: <Clock className="w-4 h-4" />, text: 'help.dashboard.period' },
        { icon: <Star className="w-4 h-4" />, text: 'help.dashboard.watchlist' },
        { icon: <Search className="w-4 h-4" />, text: 'help.dashboard.search' },
        { icon: <MousePointerClick className="w-4 h-4" />, text: 'help.dashboard.detail' },
        { icon: <BarChart className="w-4 h-4" />, text: 'help.dashboard.marketInfo' },
      ],
    },
    assetDetail: {
      icon: <BarChart className="w-5 h-5" />,
      title: 'help.assetDetail.title',
      description: 'help.assetDetail.desc',
      items: [
        { icon: <ShoppingCart className="w-4 h-4" />, text: 'help.assetDetail.buySell' },
        { icon: <Clock className="w-4 h-4" />, text: 'help.assetDetail.chartInterval' },
        { icon: <CandlestickChart className="w-4 h-4" />, text: 'help.assetDetail.chartType' },
        { icon: <Star className="w-4 h-4" />, text: 'help.assetDetail.watchlist' },
        { icon: <Bell className="w-4 h-4" />, text: 'help.assetDetail.priceAlert' },
        { icon: <BarChart3 className="w-4 h-4" />, text: 'help.assetDetail.metrics' },
        { icon: <BookOpen className="w-4 h-4" />, text: 'help.assetDetail.orderbook' },
      ],
    },
    portfolio: {
      icon: <Briefcase className="w-5 h-5" />,
      title: 'help.portfolio.title',
      description: 'help.portfolio.desc',
      loginRequired: true,
      items: [
        { icon: <DollarSign className="w-4 h-4" />, text: 'help.portfolio.balance' },
        { icon: <DollarSign className="w-4 h-4" />, text: 'help.portfolio.deposit' },
        { icon: <Eye className="w-4 h-4" />, text: 'help.portfolio.holdings' },
        { icon: <TrendingUp className="w-4 h-4" />, text: 'help.portfolio.pnl' },
        { icon: <PieChart className="w-4 h-4" />, text: 'help.portfolio.ratio' },
        { icon: <History className="w-4 h-4" />, text: 'help.portfolio.history' },
      ],
    },
    orders: {
      icon: <ClipboardList className="w-5 h-5" />,
      title: 'help.orders.title',
      description: 'help.orders.desc',
      loginRequired: true,
      items: [
        { icon: <ShoppingCart className="w-4 h-4" />, text: 'help.orders.step1' },
        { icon: <ShoppingCart className="w-4 h-4" />, text: 'help.orders.step2' },
        { icon: <ShoppingCart className="w-4 h-4" />, text: 'help.orders.step3' },
        { icon: <CheckCircle className="w-4 h-4" />, text: 'help.orders.step4' },
        { icon: <XCircle className="w-4 h-4" />, text: 'help.orders.cancel' },
        { icon: <Filter className="w-4 h-4" />, text: 'help.orders.filter' },
        { icon: <Scale className="w-4 h-4" />, text: 'help.orders.marketVsLimit' },
        { icon: <Calculator className="w-4 h-4" />, text: 'help.orders.orderCalc' },
      ],
    },
    leaderboard: {
      icon: <Trophy className="w-5 h-5" />,
      title: 'help.leaderboard.title',
      description: 'help.leaderboard.desc',
      loginRequired: true,
      items: [
        { icon: <TrendingUp className="w-4 h-4" />, text: 'help.leaderboard.ranking' },
        { icon: <RefreshCw className="w-4 h-4" />, text: 'help.leaderboard.refresh' },
        { icon: <Medal className="w-4 h-4" />, text: 'help.leaderboard.myRank' },
        { icon: <Target className="w-4 h-4" />, text: 'help.leaderboard.scoring' },
      ],
    },
    announcements: {
      icon: <Megaphone className="w-5 h-5" />,
      title: 'help.announcements.title',
      description: 'help.announcements.desc',
      loginRequired: true,
      items: [
        { icon: <Eye className="w-4 h-4" />, text: 'help.announcements.view' },
        { icon: <MessageCircle className="w-4 h-4" />, text: 'help.announcements.comment' },
        { icon: <Heart className="w-4 h-4" />, text: 'help.announcements.like' },
        { icon: <Paperclip className="w-4 h-4" />, text: 'help.announcements.attachment' },
        { icon: <PenTool className="w-4 h-4" />, text: 'help.announcements.write' },
      ],
    },
    news: {
      icon: <Newspaper className="w-5 h-5" />,
      title: 'help.news.title',
      description: 'help.news.desc',
      items: [
        { icon: <Filter className="w-4 h-4" />, text: 'help.news.category' },
        { icon: <Link className="w-4 h-4" />, text: 'help.news.link' },
        { icon: <RefreshCw className="w-4 h-4" />, text: 'help.news.refresh' },
      ],
    },
    chat: {
      icon: <MessageCircle className="w-5 h-5" />,
      title: 'help.chat.title',
      description: 'help.chat.desc',
      loginRequired: true,
      items: [
        { icon: <MessageCircle className="w-4 h-4" />, text: 'help.chat.dm' },
        { icon: <Users className="w-4 h-4" />, text: 'help.chat.group' },
        { icon: <UserPlus className="w-4 h-4" />, text: 'help.chat.invite' },
        { icon: <Ban className="w-4 h-4" />, text: 'help.chat.kick' },
        { icon: <PanelRightOpen className="w-4 h-4" />, text: 'help.chat.pin' },
        { icon: <Trash2 className="w-4 h-4" />, text: 'help.chat.delete' },
        { icon: <Bell className="w-4 h-4" />, text: 'help.chat.unread' },
        { icon: <Maximize2 className="w-4 h-4" />, text: 'help.chat.resize' },
      ],
    },
    notifications: {
      icon: <Bell className="w-5 h-5" />,
      title: 'help.notifications.title' as TranslationKey,
      description: 'help.notifications.desc' as TranslationKey,
      loginRequired: true,
      items: [
        { icon: <Bell className="w-4 h-4" />, text: 'help.notifications.bell' as TranslationKey },
        { icon: <Eye className="w-4 h-4" />, text: 'help.notifications.unread' as TranslationKey },
        { icon: <CheckCircle className="w-4 h-4" />, text: 'help.notifications.markAll' as TranslationKey },
        { icon: <Trash2 className="w-4 h-4" />, text: 'help.notifications.delete' as TranslationKey },
        { icon: <RefreshCw className="w-4 h-4" />, text: 'help.notifications.realtime' as TranslationKey },
      ],
    },
    community: {
      icon: <MessagesSquare className="w-5 h-5" />,
      title: 'help.community.title' as TranslationKey,
      description: 'help.community.desc' as TranslationKey,
      loginRequired: true,
      items: [
        { icon: <MessagesSquare className="w-4 h-4" />, text: 'help.community.discussions' as TranslationKey },
        { icon: <Lightbulb className="w-4 h-4" />, text: 'help.community.strategies' as TranslationKey },
        { icon: <Award className="w-4 h-4" />, text: 'help.community.traders' as TranslationKey },
      ],
    },
    mypage: {
      icon: <User className="w-5 h-5" />,
      title: 'help.mypage.title' as TranslationKey,
      description: 'help.mypage.desc' as TranslationKey,
      loginRequired: true,
      items: [
        { icon: <User className="w-4 h-4" />, text: 'help.mypage.profile' as TranslationKey },
        { icon: <BarChart className="w-4 h-4" />, text: 'help.mypage.tradingStats' as TranslationKey },
        { icon: <Lock className="w-4 h-4" />, text: 'help.mypage.security' as TranslationKey },
        { icon: <BellRing className="w-4 h-4" />, text: 'help.mypage.notificationSettings' as TranslationKey },
      ],
    },
    adminStats: {
      icon: <BarChart3 className="w-5 h-5" />,
      title: 'help.adminStats.title',
      description: 'help.adminStats.desc',
      loginRequired: true,
      adminOnly: true,
      items: [
        { icon: <FileText className="w-4 h-4" />, text: 'help.adminStats.overview' },
        { icon: <TrendingUp className="w-4 h-4" />, text: 'help.adminStats.chart' },
        { icon: <Clock className="w-4 h-4" />, text: 'help.adminStats.period' },
        { icon: <Layers className="w-4 h-4" />, text: 'help.adminStats.service' },
      ],
    },
    adminUsers: {
      icon: <Users className="w-5 h-5" />,
      title: 'help.adminUsers.title',
      description: 'help.adminUsers.desc',
      loginRequired: true,
      adminOnly: true,
      items: [
        { icon: <Search className="w-4 h-4" />, text: 'help.adminUsers.search' },
        { icon: <CheckCircle className="w-4 h-4" />, text: 'help.adminUsers.approve' },
        { icon: <Eye className="w-4 h-4" />, text: 'help.adminUsers.detail' },
        { icon: <Shield className="w-4 h-4" />, text: 'help.adminUsers.role' },
        { icon: <ListFilter className="w-4 h-4" />, text: 'help.adminUsers.statusFilter' },
      ],
    },
    adminSettings: {
      icon: <Settings className="w-5 h-5" />,
      title: 'help.adminSettings.title' as TranslationKey,
      description: 'help.adminSettings.desc' as TranslationKey,
      loginRequired: true,
      adminOnly: true,
      items: [
        { icon: <DollarSign className="w-4 h-4" />, text: 'help.adminSettings.initialFund' as TranslationKey },
        { icon: <Clock className="w-4 h-4" />, text: 'help.adminSettings.operatingHours' as TranslationKey },
        { icon: <Shield className="w-4 h-4" />, text: 'help.adminSettings.riskLimits' as TranslationKey },
        { icon: <Lock className="w-4 h-4" />, text: 'help.adminSettings.sessionSecurity' as TranslationKey },
      ],
    },
    adminHealth: {
      icon: <Activity className="w-5 h-5" />,
      title: 'help.adminHealth.title' as TranslationKey,
      description: 'help.adminHealth.desc' as TranslationKey,
      loginRequired: true,
      adminOnly: true,
      items: [
        { icon: <Server className="w-4 h-4" />, text: 'help.adminHealth.serviceStatus' as TranslationKey },
        { icon: <Cpu className="w-4 h-4" />, text: 'help.adminHealth.architecture' as TranslationKey },
        { icon: <Gauge className="w-4 h-4" />, text: 'help.adminHealth.metrics' as TranslationKey },
      ],
    },
    adminAudit: {
      icon: <FileCheck className="w-5 h-5" />,
      title: 'help.adminAudit.title' as TranslationKey,
      description: 'help.adminAudit.desc' as TranslationKey,
      loginRequired: true,
      adminOnly: true,
      items: [
        { icon: <FileText className="w-4 h-4" />, text: 'help.adminAudit.reportList' as TranslationKey },
        { icon: <Download className="w-4 h-4" />, text: 'help.adminAudit.viewDownload' as TranslationKey },
      ],
    },
  };

  return (
    <div>
      <div className="py-6 flex items-center gap-2.5 h-[88px]">
        <HelpCircle className="w-5 h-5 text-accent" />
        <h1 className="text-[20px] font-extrabold text-text-primary">{t('help.title')}</h1>
      </div>

      <div className="flex overflow-x-auto scrollbar-hide items-center gap-1 pb-4">
        {normalTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[12px] sm:text-[13px] font-medium transition-colors shrink-0',
              activeTab === tab.key
                ? 'bg-accent/15 text-accent font-bold'
                : 'text-text-quaternary hover:text-text-tertiary hover:bg-bg-secondary/50',
            )}
          >
            {tab.icon}
            {t(tab.label)}
          </button>
        ))}
        {adminTabs.length > 0 && (
          <>
            <div className="w-px h-5 bg-border/60 mx-1" />
            {adminTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[12px] sm:text-[13px] font-medium transition-colors border border-accent/20 shrink-0 whitespace-nowrap',
                  activeTab === tab.key
                    ? 'bg-accent/15 text-accent font-bold'
                    : 'text-text-quaternary hover:text-text-tertiary hover:bg-bg-secondary/50',
                )}
              >
                {tab.icon}
                {t(tab.label)}
              </button>
            ))}
          </>
        )}
      </div>

      <div className="pb-10">
        {sections[activeTab] && <HelpTab section={sections[activeTab]} tabKey={activeTab} t={t} />}
      </div>

      {/* FAQ Section — grouped by active tab */}
      {(() => {
        const faqByTab: Record<string, string[]> = {
          dashboard: ['d1', 'd2', 'd3', 'd4', 'd5', 'd6'],
          assetDetail: ['ad1', 'ad2', 'ad3', 'ad4'],
          portfolio: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'],
          orders: ['o1', 'o2', 'o3', 'o4', 'o5', 'o6'],
          leaderboard: ['l1', 'l2', 'l3', 'l4'],
          announcements: ['n1', 'n2', 'n3'],
          news: ['w1', 'w2', 'w3'],
          chat: ['c1', 'c2', 'c3', 'c4', 'c5'],
          notifications: ['noti1', 'noti2', 'noti3'],
          community: ['cm1', 'cm2', 'cm3'],
          mypage: ['mp1', 'mp2', 'mp3'],
          adminStats: ['a1', 'a2'],
          adminUsers: ['u1', 'u2'],
          adminSettings: ['as1', 'as2'],
          adminHealth: ['ah1', 'ah2'],
          adminAudit: ['aa1'],
        };
        const tabFaqs = faqByTab[activeTab] ?? [];
        const commonFaqs = ['g1', 'g2', 'g3', 'g4', 'g5'];
        return <FaqSection tabFaqs={tabFaqs} commonFaqs={commonFaqs} activeTab={activeTab} t={t} />;
      })()}
    </div>
  );
}
