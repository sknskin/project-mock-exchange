/**
 * @file 도움말 페이지
 * @description 각 메뉴별 탭으로 나눈 자세한 가이드
 *
 * @file Help Page
 * @description Comprehensive help page with tab-based navigation for each menu
 */
'use client';

import { useState } from 'react';
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
} from 'lucide-react';
import type { TranslationKey } from '@/lib/i18n';

interface HelpSection {
  icon: React.ReactNode;
  title: TranslationKey;
  description: TranslationKey;
  items: { icon: React.ReactNode; text: TranslationKey }[];
}

function HelpTab({
  section,
  t,
}: {
  section: HelpSection;
  t: (key: TranslationKey) => string;
}) {
  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-bg-secondary/60 border border-border/60 rounded-2xl p-5 sm:p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent shrink-0">
            {section.icon}
          </div>
          <div>
            <h2 className="text-[16px] font-bold text-text-primary">{t(section.title)}</h2>
            <p className="text-[13px] text-text-tertiary mt-0.5">{t(section.description)}</p>
          </div>
        </div>
      </div>

      {/* Feature Items */}
      <div className="space-y-3">
        <h3 className="text-[13px] font-bold text-text-secondary px-1">{t('help.features')}</h3>
        {section.items.map((item, i) => (
          <div
            key={i}
            className="flex items-start gap-3 bg-bg-secondary/40 border border-border/40 rounded-xl px-4 py-3"
          >
            <div className="w-7 h-7 rounded-lg bg-accent/8 flex items-center justify-center text-accent shrink-0 mt-0.5">
              {item.icon}
            </div>
            <p className="text-[13px] text-text-primary leading-relaxed">{t(item.text)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HelpPage() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'SYSTEM' || user?.role === 'ADMIN';
  const [activeTab, setActiveTab] = useState('dashboard');

  const tabs: { key: string; label: TranslationKey; icon: React.ReactNode; adminOnly?: boolean }[] = [
    { key: 'dashboard', label: 'help.tab.dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { key: 'portfolio', label: 'help.tab.portfolio', icon: <Briefcase className="w-4 h-4" /> },
    { key: 'orders', label: 'help.tab.orders', icon: <ClipboardList className="w-4 h-4" /> },
    { key: 'leaderboard', label: 'help.tab.leaderboard', icon: <Trophy className="w-4 h-4" /> },
    { key: 'announcements', label: 'help.tab.announcements', icon: <Megaphone className="w-4 h-4" /> },
    { key: 'news', label: 'help.tab.news', icon: <Newspaper className="w-4 h-4" /> },
    { key: 'chat', label: 'help.tab.chat', icon: <MessageCircle className="w-4 h-4" /> },
    { key: 'adminStats', label: 'help.tab.adminStats', icon: <BarChart3 className="w-4 h-4" />, adminOnly: true },
    { key: 'adminUsers', label: 'help.tab.adminUsers', icon: <Users className="w-4 h-4" />, adminOnly: true },
  ];

  const visibleTabs = tabs.filter((tab) => !tab.adminOnly || isAdmin);

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
      ],
    },
    portfolio: {
      icon: <Briefcase className="w-5 h-5" />,
      title: 'help.portfolio.title',
      description: 'help.portfolio.desc',
      items: [
        { icon: <DollarSign className="w-4 h-4" />, text: 'help.portfolio.balance' },
        { icon: <DollarSign className="w-4 h-4" />, text: 'help.portfolio.deposit' },
        { icon: <Eye className="w-4 h-4" />, text: 'help.portfolio.holdings' },
        { icon: <TrendingUp className="w-4 h-4" />, text: 'help.portfolio.pnl' },
      ],
    },
    orders: {
      icon: <ClipboardList className="w-5 h-5" />,
      title: 'help.orders.title',
      description: 'help.orders.desc',
      items: [
        { icon: <ShoppingCart className="w-4 h-4" />, text: 'help.orders.step1' },
        { icon: <ShoppingCart className="w-4 h-4" />, text: 'help.orders.step2' },
        { icon: <ShoppingCart className="w-4 h-4" />, text: 'help.orders.step3' },
        { icon: <CheckCircle className="w-4 h-4" />, text: 'help.orders.step4' },
        { icon: <XCircle className="w-4 h-4" />, text: 'help.orders.cancel' },
        { icon: <Filter className="w-4 h-4" />, text: 'help.orders.filter' },
      ],
    },
    leaderboard: {
      icon: <Trophy className="w-5 h-5" />,
      title: 'help.leaderboard.title',
      description: 'help.leaderboard.desc',
      items: [
        { icon: <TrendingUp className="w-4 h-4" />, text: 'help.leaderboard.ranking' },
        { icon: <RefreshCw className="w-4 h-4" />, text: 'help.leaderboard.refresh' },
      ],
    },
    announcements: {
      icon: <Megaphone className="w-5 h-5" />,
      title: 'help.announcements.title',
      description: 'help.announcements.desc',
      items: [
        { icon: <Eye className="w-4 h-4" />, text: 'help.announcements.view' },
        { icon: <MessageCircle className="w-4 h-4" />, text: 'help.announcements.comment' },
        { icon: <Heart className="w-4 h-4" />, text: 'help.announcements.like' },
        { icon: <Paperclip className="w-4 h-4" />, text: 'help.announcements.attachment' },
      ],
    },
    news: {
      icon: <Newspaper className="w-5 h-5" />,
      title: 'help.news.title',
      description: 'help.news.desc',
      items: [
        { icon: <Filter className="w-4 h-4" />, text: 'help.news.category' },
        { icon: <Link className="w-4 h-4" />, text: 'help.news.link' },
      ],
    },
    chat: {
      icon: <MessageCircle className="w-5 h-5" />,
      title: 'help.chat.title',
      description: 'help.chat.desc',
      items: [
        { icon: <MessageCircle className="w-4 h-4" />, text: 'help.chat.dm' },
        { icon: <Users className="w-4 h-4" />, text: 'help.chat.group' },
        { icon: <UserPlus className="w-4 h-4" />, text: 'help.chat.invite' },
        { icon: <Ban className="w-4 h-4" />, text: 'help.chat.kick' },
        { icon: <PanelRightOpen className="w-4 h-4" />, text: 'help.chat.pin' },
      ],
    },
    adminStats: {
      icon: <BarChart3 className="w-5 h-5" />,
      title: 'help.adminStats.title',
      description: 'help.adminStats.desc',
      items: [
        { icon: <FileText className="w-4 h-4" />, text: 'help.adminStats.overview' },
        { icon: <TrendingUp className="w-4 h-4" />, text: 'help.adminStats.chart' },
      ],
    },
    adminUsers: {
      icon: <Users className="w-5 h-5" />,
      title: 'help.adminUsers.title',
      description: 'help.adminUsers.desc',
      items: [
        { icon: <Search className="w-4 h-4" />, text: 'help.adminUsers.search' },
        { icon: <CheckCircle className="w-4 h-4" />, text: 'help.adminUsers.approve' },
        { icon: <Eye className="w-4 h-4" />, text: 'help.adminUsers.detail' },
      ],
    },
  };

  return (
    <div>
      <div className="py-6 flex items-center gap-2.5">
        <HelpCircle className="w-5 h-5 text-accent" />
        <div>
          <h1 className="text-[20px] font-extrabold text-text-primary">{t('help.title')}</h1>
          <p className="text-[13px] text-text-tertiary">{t('help.subtitle')}</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-4 -mx-1 px-1">
        {visibleTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-xl text-[13px] font-medium transition-colors whitespace-nowrap shrink-0',
              activeTab === tab.key
                ? 'bg-accent/15 text-accent font-bold'
                : 'text-text-quaternary hover:text-text-tertiary hover:bg-bg-secondary/50',
              tab.adminOnly && 'border border-accent/20',
            )}
          >
            {tab.icon}
            {t(tab.label)}
            {tab.adminOnly && (
              <span className="text-[9px] font-bold text-accent/70 ml-0.5">{t('help.adminOnly')}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="pb-10">
        {sections[activeTab] && <HelpTab section={sections[activeTab]} t={t} />}
      </div>
    </div>
  );
}
