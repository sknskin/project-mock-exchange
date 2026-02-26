/**
 * @file 도움말 페이지
 * @description 각 메뉴별 탭 + 클릭 시 손그림 일러스트레이션으로 기능 설명
 *
 * @file Help Page
 * @description Tab-based help with hand-drawn illustrations on feature click
 */
'use client';

import { useState, useRef, useEffect } from 'react';
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
} from 'lucide-react';
import type { TranslationKey } from '@/lib/i18n';

/* ─── Hand-drawn SVG filter ─── */
const SketchFilter = () => (
  <defs>
    <filter id="sketch">
      <feTurbulence type="turbulence" baseFrequency="0.025" numOctaves="4" seed="3" result="noise" />
      <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.2" xChannelSelector="R" yChannelSelector="G" />
    </filter>
  </defs>
);

/* ─── Rough shapes ─── */
function RoughRect({ x, y, w, h, fill = 'none', stroke = '#555', sw = 1.5 }: { x: number; y: number; w: number; h: number; fill?: string; stroke?: string; sw?: number }) {
  const d = `M${x + 1},${y + 2} L${x + w - 2},${y + 1} L${x + w - 1},${y + h - 1} L${x + 2},${y + h} Z`;
  return <path d={d} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />;
}
function RoughLine({ x1, y1, x2, y2, stroke = '#555', sw = 1.5 }: { x1: number; y1: number; x2: number; y2: number; stroke?: string; sw?: number }) {
  const mx = (x1 + x2) / 2 + (Math.random() - 0.5) * 2;
  const my = (y1 + y2) / 2 + (Math.random() - 0.5) * 2;
  return <path d={`M${x1},${y1} Q${mx},${my} ${x2},${y2}`} fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />;
}
function RoughCircle({ cx, cy, r, stroke = '#ef4444', sw = 2.5, fill = 'none' }: { cx: number; cy: number; r: number; stroke?: string; sw?: number; fill?: string }) {
  const d = `M${cx - r},${cy} C${cx - r},${cy - r * 0.6} ${cx - r * 0.5},${cy - r + 1} ${cx + 1},${cy - r} C${cx + r * 0.5},${cy - r - 1} ${cx + r + 1},${cy - r * 0.5} ${cx + r},${cy + 1} C${cx + r - 1},${cy + r * 0.5} ${cx + r * 0.5},${cy + r + 1} ${cx - 1},${cy + r} C${cx - r * 0.5},${cy + r - 1} ${cx - r - 1},${cy + r * 0.5} ${cx - r},${cy}`;
  return <path d={d} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinecap="round" />;
}
function RoughArrow({ x1, y1, x2, y2, stroke = '#ef4444', sw = 2 }: { x1: number; y1: number; x2: number; y2: number; stroke?: string; sw?: number }) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const headLen = 8;
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
      <line x1={x2} y1={y2} x2={x2 - headLen * Math.cos(angle - 0.5)} y2={y2 - headLen * Math.sin(angle - 0.5)} stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
      <line x1={x2} y1={y2} x2={x2 - headLen * Math.cos(angle + 0.5)} y2={y2 - headLen * Math.sin(angle + 0.5)} stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
    </g>
  );
}
function SketchText({ x, y, children, size = 10, fill = '#aaa', anchor = 'start' }: { x: number; y: number; children: string; size?: number; fill?: string; anchor?: 'start' | 'middle' | 'end' }) {
  return <text x={x} y={y} fontSize={size} fill={fill} fontFamily="sans-serif" textAnchor={anchor} style={{ fontStyle: 'italic' }}>{children}</text>;
}
function RedLabel({ x, y, children }: { x: number; y: number; children: string }) {
  return <text x={x} y={y} fontSize={11} fill="#ef4444" fontWeight="bold" fontFamily="sans-serif" style={{ fontStyle: 'italic' }}>{children}</text>;
}

/* ─── Base screen wireframes ─── */
function ScreenFrame({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 660 440" className="w-full" style={{ filter: 'url(#sketch)' }}>
      <SketchFilter />
      {/* Browser chrome */}
      <RoughRect x={5} y={5} w={650} h={430} fill="#1a1a1e" stroke="#444" sw={2} />
      {/* Header bar */}
      <RoughRect x={5} y={5} w={650} h={40} fill="#111114" stroke="#444" />
      <SketchText x={18} y={32} size={15} fill="#7c7cff">VirtuEx</SketchText>
      {/* Nav items */}
      <SketchText x={100} y={30} size={9}>대시보드</SketchText>
      <SketchText x={160} y={30} size={9}>내 투자</SketchText>
      <SketchText x={210} y={30} size={9}>주문</SketchText>
      <SketchText x={250} y={30} size={9}>리더보드</SketchText>
      <SketchText x={310} y={30} size={9}>공지</SketchText>
      <SketchText x={350} y={30} size={9}>뉴스</SketchText>
      {/* User area */}
      <SketchText x={580} y={30} size={9} fill="#666">🔔</SketchText>
      <RoughCircle cx={620} cy={25} r={10} stroke="#555" sw={1} fill="#333" />
      {/* Chat button */}
      <RoughCircle cx={635} cy={418} r={16} stroke="#7c7cff" sw={1.5} fill="#2a2a3e" />
      <SketchText x={627} y={424} size={14}>💬</SketchText>
      {children}
    </svg>
  );
}

/* ─── Dashboard illustrations ─── */
function DashboardChartIllust() {
  return (
    <ScreenFrame>
      {/* Filter buttons */}
      <RoughRect x={20} y={55} w={55} h={20} fill="#2a2a2e" stroke="#555" sw={1} />
      <RoughRect x={80} y={55} w={65} h={20} fill="#2a2a2e" stroke="#555" sw={1} />
      <RoughRect x={150} y={55} w={65} h={20} fill="#2a2a2e" stroke="#555" sw={1} />
      <SketchText x={30} y={69} size={9}>전체</SketchText>
      <SketchText x={90} y={69} size={9}>암호화폐</SketchText>
      <SketchText x={160} y={69} size={9}>국내주식</SketchText>
      {/* Asset table */}
      <RoughRect x={20} y={85} w={340} h={26} fill="#222" stroke="#444" sw={1} />
      <SketchText x={30} y={102} size={9}>BTC/KRW</SketchText>
      <SketchText x={140} y={102} size={9}>55,230,000</SketchText>
      <SketchText x={240} y={102} size={9} fill="#22c55e">+2.3%</SketchText>
      <SketchText x={300} y={102} size={8} fill="#888">Vol 1.2B</SketchText>
      <RoughRect x={20} y={111} w={340} h={26} fill="#1e1e22" stroke="#444" sw={1} />
      <SketchText x={30} y={128} size={9}>ETH/KRW</SketchText>
      <SketchText x={140} y={128} size={9}>3,850,000</SketchText>
      <SketchText x={240} y={128} size={9} fill="#ef4444">-1.1%</SketchText>
      <RoughRect x={20} y={137} w={340} h={26} fill="#222" stroke="#444" sw={1} />
      <SketchText x={30} y={154} size={9}>XRP/KRW</SketchText>
      <SketchText x={140} y={154} size={9}>890</SketchText>
      <SketchText x={240} y={154} size={9} fill="#22c55e">+5.7%</SketchText>
      <RoughRect x={20} y={163} w={340} h={26} fill="#1e1e22" stroke="#444" sw={1} />
      <RoughRect x={20} y={189} w={340} h={26} fill="#222" stroke="#444" sw={1} />
      {/* Chart area */}
      <RoughRect x={380} y={55} w={265} h={250} fill="#1a1a1e" stroke="#444" sw={1.5} />
      <SketchText x={395} y={75} size={10} fill="#ccc">BTC/KRW</SketchText>
      <SketchText x={395} y={92} size={14} fill="#fff">55,230,000</SketchText>
      <SketchText x={520} y={92} size={10} fill="#22c55e">+2.3%</SketchText>
      {/* Chart line */}
      <path d="M395,260 L420,240 L445,250 L470,210 L495,220 L520,175 L545,185 L570,155 L595,140 L620,150 L635,130" fill="none" stroke="#22c55e" strokeWidth={2} strokeLinecap="round" />
      {/* Grid lines */}
      <RoughLine x1={395} y1={150} x2={635} y2={150} stroke="#333" sw={0.5} />
      <RoughLine x1={395} y1={200} x2={635} y2={200} stroke="#333" sw={0.5} />
      <RoughLine x1={395} y1={250} x2={635} y2={250} stroke="#333" sw={0.5} />
      <SketchText x={395} y={280} size={7} fill="#555">09:00</SketchText>
      <SketchText x={480} y={280} size={7} fill="#555">12:00</SketchText>
      <SketchText x={570} y={280} size={7} fill="#555">15:00</SketchText>
      {/* Period buttons */}
      <RoughRect x={395} y={290} w={40} h={16} fill="#3b3bff20" stroke="#7c7cff" sw={1} />
      <RoughRect x={440} y={290} w={35} h={16} fill="#2a2a2e" stroke="#555" sw={1} />
      <RoughRect x={480} y={290} w={35} h={16} fill="#2a2a2e" stroke="#555" sw={1} />
      <SketchText x={400} y={302} size={7} fill="#7c7cff">실시간</SketchText>
      <SketchText x={448} y={302} size={7}>1일</SketchText>
      <SketchText x={488} y={302} size={7}>1주</SketchText>
      {/* Highlight */}
      <RoughCircle cx={510} cy={200} r={85} />
      <RoughArrow x1={510} y1={290} x2={510} y2={330} />
      <RedLabel x={420} y={350}>실시간 차트 영역</RedLabel>
      <RedLabel x={420} y={368}>종목 선택 시 가격 추이 표시</RedLabel>
    </ScreenFrame>
  );
}

function DashboardFilterIllust() {
  return (
    <ScreenFrame>
      <RoughRect x={20} y={55} w={55} h={22} fill="#3b3bff20" stroke="#7c7cff" sw={2} />
      <RoughRect x={80} y={55} w={65} h={22} fill="#2a2a2e" stroke="#555" sw={1} />
      <RoughRect x={150} y={55} w={65} h={22} fill="#2a2a2e" stroke="#555" sw={1} />
      <RoughRect x={220} y={55} w={65} h={22} fill="#2a2a2e" stroke="#555" sw={1} />
      <SketchText x={30} y={70} size={9} fill="#7c7cff">전체</SketchText>
      <SketchText x={90} y={70} size={9}>암호화폐</SketchText>
      <SketchText x={160} y={70} size={9}>국내주식</SketchText>
      <SketchText x={230} y={70} size={9}>해외주식</SketchText>
      {/* Asset table */}
      <RoughRect x={20} y={90} w={440} h={28} fill="#222" stroke="#444" sw={1} />
      <SketchText x={30} y={108} size={9}>BTC/KRW</SketchText>
      <SketchText x={150} y={108} size={9}>55,230,000</SketchText>
      <SketchText x={270} y={108} size={9} fill="#22c55e">+2.3%</SketchText>
      <RoughRect x={20} y={118} w={440} h={28} fill="#1e1e22" stroke="#444" sw={1} />
      <SketchText x={30} y={136} size={9}>ETH/KRW</SketchText>
      <RoughRect x={20} y={146} w={440} h={28} fill="#222" stroke="#444" sw={1} />
      <RoughRect x={20} y={174} w={440} h={28} fill="#1e1e22" stroke="#444" sw={1} />
      <RoughRect x={20} y={202} w={440} h={28} fill="#222" stroke="#444" sw={1} />
      {/* Highlight */}
      <RoughCircle cx={160} cy={66} r={100} sw={2.5} />
      <RoughArrow x1={290} y1={66} x2={370} y2={66} />
      <RedLabel x={380} y={60}>카테고리 필터</RedLabel>
      <RedLabel x={380} y={78}>원하는 종목군만 표시</RedLabel>
    </ScreenFrame>
  );
}

function DashboardSortIllust() {
  return (
    <ScreenFrame>
      <RoughRect x={20} y={55} w={130} h={22} fill="#2a2a2e" stroke="#555" sw={1} />
      {/* Sort buttons */}
      <RoughRect x={330} y={55} w={65} h={22} fill="#3b3bff20" stroke="#7c7cff" sw={2} />
      <RoughRect x={400} y={55} w={55} h={22} fill="#2a2a2e" stroke="#555" sw={1} />
      <RoughRect x={460} y={55} w={55} h={22} fill="#2a2a2e" stroke="#555" sw={1} />
      <RoughRect x={520} y={55} w={65} h={22} fill="#2a2a2e" stroke="#555" sw={1} />
      <SketchText x={340} y={70} size={9} fill="#7c7cff">거래량</SketchText>
      <SketchText x={410} y={70} size={9}>급상승</SketchText>
      <SketchText x={470} y={70} size={9}>급하락</SketchText>
      <SketchText x={530} y={70} size={9}>거래대금</SketchText>
      {/* Sorted list */}
      <RoughRect x={20} y={90} w={600} h={28} fill="#222" stroke="#444" sw={1} />
      <SketchText x={30} y={108} size={9}>XRP/KRW</SketchText>
      <SketchText x={200} y={108} size={8} fill="#888">Vol: 5.2B</SketchText>
      <RoughRect x={20} y={118} w={600} h={28} fill="#1e1e22" stroke="#444" sw={1} />
      <SketchText x={30} y={136} size={9}>BTC/KRW</SketchText>
      <SketchText x={200} y={136} size={8} fill="#888">Vol: 3.8B</SketchText>
      <RoughRect x={20} y={146} w={600} h={28} fill="#222" stroke="#444" sw={1} />
      <RoughRect x={20} y={174} w={600} h={28} fill="#1e1e22" stroke="#444" sw={1} />
      {/* Highlight */}
      <RoughCircle cx={440} cy={66} r={105} />
      <RoughArrow x1={440} y1={90} x2={440} y2={220} />
      <RedLabel x={350} y={240}>정렬 옵션으로 종목 순서 변경</RedLabel>
    </ScreenFrame>
  );
}

function DashboardPeriodIllust() {
  return (
    <ScreenFrame>
      {/* Chart area - large */}
      <RoughRect x={20} y={55} w={620} h={280} fill="#1a1a1e" stroke="#444" sw={1.5} />
      <SketchText x={35} y={78} size={11} fill="#ccc">BTC/KRW</SketchText>
      <SketchText x={35} y={98} size={15} fill="#fff">55,230,000</SketchText>
      {/* Chart line */}
      <path d="M40,300 L100,270 L160,280 L220,230 L280,240 L340,190 L400,200 L460,160 L520,150 L580,120 L620,135" fill="none" stroke="#22c55e" strokeWidth={2.5} strokeLinecap="round" />
      {/* Grid */}
      <RoughLine x1={40} y1={160} x2={620} y2={160} stroke="#333" sw={0.5} />
      <RoughLine x1={40} y1={220} x2={620} y2={220} stroke="#333" sw={0.5} />
      <RoughLine x1={40} y1={280} x2={620} y2={280} stroke="#333" sw={0.5} />
      {/* Period buttons */}
      <RoughRect x={170} y={340} w={50} h={20} fill="#3b3bff20" stroke="#7c7cff" sw={1.5} />
      <RoughRect x={225} y={340} w={40} h={20} fill="#2a2a2e" stroke="#555" sw={1} />
      <RoughRect x={270} y={340} w={40} h={20} fill="#2a2a2e" stroke="#555" sw={1} />
      <RoughRect x={315} y={340} w={50} h={20} fill="#2a2a2e" stroke="#555" sw={1} />
      <RoughRect x={370} y={340} w={50} h={20} fill="#2a2a2e" stroke="#555" sw={1} />
      <RoughRect x={425} y={340} w={50} h={20} fill="#2a2a2e" stroke="#555" sw={1} />
      <SketchText x={178} y={354} size={8} fill="#7c7cff">실시간</SketchText>
      <SketchText x={235} y={354} size={8}>1일</SketchText>
      <SketchText x={280} y={354} size={8}>1주</SketchText>
      <SketchText x={325} y={354} size={8}>1개월</SketchText>
      <SketchText x={380} y={354} size={8}>3개월</SketchText>
      <SketchText x={435} y={354} size={8}>6개월</SketchText>
      {/* Highlight */}
      <RoughCircle cx={350} cy={350} r={80} />
      <RedLabel x={490} y={348}>기간 필터로 차트 변경</RedLabel>
      <RedLabel x={490} y={366}>최대 6개월 조회 가능</RedLabel>
    </ScreenFrame>
  );
}

function DashboardWatchlistIllust() {
  return (
    <ScreenFrame>
      <SketchText x={25} y={70} size={12} fill="#ccc">⭐ 관심종목</SketchText>
      {/* Table header */}
      <RoughRect x={20} y={80} w={440} h={24} fill="#2a2a2e" stroke="#444" sw={1} />
      <SketchText x={30} y={96} size={8} fill="#888">종목</SketchText>
      <SketchText x={150} y={96} size={8} fill="#888">현재가</SketchText>
      <SketchText x={260} y={96} size={8} fill="#888">변동률</SketchText>
      <SketchText x={370} y={96} size={8} fill="#888">관심</SketchText>
      {/* Row 1 - starred */}
      <RoughRect x={20} y={104} w={440} h={30} fill="#222" stroke="#444" sw={1} />
      <SketchText x={30} y={124} size={10}>BTC/KRW</SketchText>
      <SketchText x={150} y={124} size={10}>55,230,000</SketchText>
      <SketchText x={260} y={124} size={10} fill="#22c55e">+2.3%</SketchText>
      <SketchText x={385} y={126} size={16}>⭐</SketchText>
      {/* Row 2 - not starred */}
      <RoughRect x={20} y={134} w={440} h={30} fill="#1e1e22" stroke="#444" sw={1} />
      <SketchText x={30} y={154} size={10}>ETH/KRW</SketchText>
      <SketchText x={150} y={154} size={10}>3,850,000</SketchText>
      <SketchText x={260} y={154} size={10} fill="#ef4444">-1.1%</SketchText>
      <SketchText x={385} y={156} size={16}>☆</SketchText>
      {/* Row 3 */}
      <RoughRect x={20} y={164} w={440} h={30} fill="#222" stroke="#444" sw={1} />
      <SketchText x={30} y={184} size={10}>SOL/KRW</SketchText>
      <SketchText x={385} y={186} size={16}>☆</SketchText>
      {/* Highlight star */}
      <RoughCircle cx={393} cy={120} r={22} />
      <RoughArrow x1={420} y1={120} x2={490} y2={120} />
      <RedLabel x={495} y={115}>별표 클릭으로</RedLabel>
      <RedLabel x={495} y={133}>관심종목 등록/해제</RedLabel>
    </ScreenFrame>
  );
}

function DashboardSearchIllust() {
  return (
    <ScreenFrame>
      {/* Search bar overlay */}
      <RoughRect x={120} y={100} w={420} h={44} fill="#222228" stroke="#7c7cff" sw={2} />
      <SketchText x={140} y={128} size={12} fill="#666">🔍 종목 검색...</SketchText>
      {/* Results */}
      <RoughRect x={120} y={144} w={420} h={34} fill="#2a2a2e" stroke="#444" sw={1} />
      <SketchText x={140} y={166} size={10}>BTC/KRW - 비트코인</SketchText>
      <SketchText x={370} y={166} size={9} fill="#22c55e">55,230,000</SketchText>
      <RoughRect x={120} y={178} w={420} h={34} fill="#252528" stroke="#444" sw={1} />
      <SketchText x={140} y={200} size={10}>ETH/KRW - 이더리움</SketchText>
      <SketchText x={370} y={200} size={9} fill="#ef4444">3,850,000</SketchText>
      <RoughRect x={120} y={212} w={420} h={34} fill="#2a2a2e" stroke="#444" sw={1} />
      <SketchText x={140} y={234} size={10}>BCH/KRW - 비트코인캐시</SketchText>
      {/* Highlight */}
      <RoughCircle cx={330} cy={122} r={55} />
      {/* Keyboard hint */}
      <RoughRect x={220} y={280} w={220} h={30} fill="#2a2a2e" stroke="#555" sw={1} />
      <SketchText x={240} y={300} size={10} fill="#888">키보드 "/" 키로 빠른 검색</SketchText>
      <RoughArrow x1={330} y1={260} x2={330} y2={280} />
    </ScreenFrame>
  );
}

function DashboardDetailIllust() {
  return (
    <ScreenFrame>
      <SketchText x={25} y={70} size={13} fill="#ccc">BTC/KRW 상세</SketchText>
      <SketchText x={25} y={92} size={16} fill="#fff">55,230,000</SketchText>
      <SketchText x={200} y={92} size={11} fill="#22c55e">+2.3%</SketchText>
      {/* Chart */}
      <RoughRect x={20} y={105} w={380} h={200} fill="#1a1a1e" stroke="#444" sw={1.5} />
      <path d="M35,270 L80,250 L130,260 L180,220 L230,230 L280,180 L330,190 L370,160" fill="none" stroke="#22c55e" strokeWidth={2} strokeLinecap="round" />
      <SketchText x={160} y={125} size={9} fill="#666">가격 차트</SketchText>
      {/* Order panel */}
      <RoughRect x={420} y={55} w={220} h={310} fill="#222228" stroke="#444" sw={1.5} />
      <SketchText x={490} y={78} size={11} fill="#ccc" anchor="middle">주문</SketchText>
      {/* Tabs */}
      <RoughRect x={430} y={88} w={100} h={24} fill="#22c55e20" stroke="#22c55e" sw={1} />
      <RoughRect x={530} y={88} w={100} h={24} fill="#ef444420" stroke="#ef4444" sw={1} />
      <SketchText x={462} y={105} size={10} fill="#22c55e">매수</SketchText>
      <SketchText x={562} y={105} size={10} fill="#ef4444">매도</SketchText>
      {/* Order type */}
      <RoughRect x={430} y={125} w={95} h={22} fill="#3b3bff20" stroke="#7c7cff" sw={1} />
      <RoughRect x={530} y={125} w={95} h={22} fill="#2a2a2e" stroke="#555" sw={1} />
      <SketchText x={455} y={140} size={8} fill="#7c7cff">시장가</SketchText>
      <SketchText x={555} y={140} size={8}>지정가</SketchText>
      {/* Quantity input */}
      <SketchText x={435} y={170} size={8} fill="#888">수량</SketchText>
      <RoughRect x={430} y={175} w={200} h={28} fill="#1a1a1e" stroke="#555" sw={1} />
      <SketchText x={445} y={194} size={9} fill="#666">0.00</SketchText>
      {/* Buy button */}
      <RoughRect x={430} y={220} w={200} h={36} fill="#22c55e30" stroke="#22c55e" sw={2} />
      <SketchText x={500} y={243} size={12} fill="#22c55e" anchor="middle">매수하기</SketchText>
      {/* Highlight order panel */}
      <RoughRect x={415} y={50} w={235} h={320} fill="none" stroke="#ef4444" sw={2.5} />
      <RoughArrow x1={415} y1={380} x2={350} y2={380} />
      <RedLabel x={100} y={375}>종목 상세에서 바로 주문 가능</RedLabel>
    </ScreenFrame>
  );
}

function DashboardMarketInfoIllust() {
  return (
    <ScreenFrame>
      {/* Market info cards */}
      <SketchText x={25} y={70} size={11} fill="#ccc">시장 정보</SketchText>
      {/* Exchange rate */}
      <RoughRect x={20} y={80} w={195} h={70} fill="#222228" stroke="#444" sw={1.5} />
      <SketchText x={30} y={100} size={9} fill="#888">USD/KRW 환율</SketchText>
      <SketchText x={30} y={120} size={14} fill="#fff">1,380.50</SketchText>
      <SketchText x={140} y={120} size={9} fill="#22c55e">+0.3%</SketchText>
      {/* Market index */}
      <RoughRect x={225} y={80} w={195} h={70} fill="#222228" stroke="#444" sw={1.5} />
      <SketchText x={235} y={100} size={9} fill="#888">KOSPI</SketchText>
      <SketchText x={235} y={120} size={14} fill="#fff">2,680.12</SketchText>
      <SketchText x={345} y={120} size={9} fill="#ef4444">-0.5%</SketchText>
      {/* Top 5 turnover */}
      <RoughRect x={430} y={80} w={210} h={70} fill="#222228" stroke="#444" sw={1.5} />
      <SketchText x={440} y={100} size={9} fill="#888">거래대금 Top 5</SketchText>
      <SketchText x={440} y={116} size={8}>1. BTC  2. ETH  3. XRP</SketchText>
      <SketchText x={440} y={132} size={8}>4. SOL  5. DOGE</SketchText>
      {/* More rows */}
      <RoughRect x={20} y={165} w={620} h={28} fill="#222" stroke="#444" sw={1} />
      <SketchText x={30} y={183} size={9}>실시간 시세 목록...</SketchText>
      <RoughRect x={20} y={193} w={620} h={28} fill="#1e1e22" stroke="#444" sw={1} />
      <RoughRect x={20} y={221} w={620} h={28} fill="#222" stroke="#444" sw={1} />
      {/* Highlight */}
      <RoughRect x={15} y={75} w={630} h={80} fill="none" stroke="#ef4444" sw={2.5} />
      <RoughArrow x1={330} y1={160} x2={330} y2={270} />
      <RedLabel x={200} y={290}>환율, 지수, 거래대금 Top 5 한눈에 확인</RedLabel>
    </ScreenFrame>
  );
}

/* ─── Portfolio illustrations ─── */
function PortfolioBalanceIllust() {
  return (
    <ScreenFrame>
      <SketchText x={25} y={70} size={14} fill="#ccc">내 투자</SketchText>
      {/* Balance card */}
      <RoughRect x={20} y={85} w={300} h={120} fill="#222228" stroke="#444" sw={1.5} />
      <SketchText x={35} y={110} size={10} fill="#888">총 자산</SketchText>
      <SketchText x={35} y={135} size={18} fill="#fff">₩ 12,500,000</SketchText>
      <RoughLine x1={35} y1={148} x2={300} y2={148} stroke="#333" sw={0.5} />
      <SketchText x={35} y={168} size={10} fill="#888">예수금</SketchText>
      <SketchText x={100} y={168} size={10} fill="#fff">₩ 5,000,000</SketchText>
      <SketchText x={35} y={188} size={10} fill="#888">투자금</SketchText>
      <SketchText x={100} y={188} size={10} fill="#fff">₩ 7,500,000</SketchText>
      {/* PnL card */}
      <RoughRect x={340} y={85} w={300} h={120} fill="#222228" stroke="#444" sw={1.5} />
      <SketchText x={355} y={110} size={10} fill="#888">투자 수익</SketchText>
      <SketchText x={355} y={135} size={16} fill="#22c55e">+₩ 2,500,000</SketchText>
      <SketchText x={355} y={158} size={12} fill="#22c55e">+25.0%</SketchText>
      {/* Highlight */}
      <RoughCircle cx={170} cy={140} r={80} />
      <RoughArrow x1={255} y1={140} x2={330} y2={250} />
      <RedLabel x={200} y={270}>잔고 카드에서 총 자산, 예수금, 투자금 확인</RedLabel>
    </ScreenFrame>
  );
}

function PortfolioDepositIllust() {
  return (
    <ScreenFrame>
      <RoughRect x={20} y={85} w={300} h={120} fill="#222228" stroke="#444" sw={1.5} />
      <SketchText x={35} y={110} size={10} fill="#888">총 자산</SketchText>
      <SketchText x={35} y={135} size={16} fill="#fff">₩ 12,500,000</SketchText>
      <SketchText x={35} y={160} size={10} fill="#888">예수금: ₩ 5,000,000</SketchText>
      {/* Deposit button */}
      <RoughRect x={200} y={173} w={100} h={26} fill="#7c7cff20" stroke="#7c7cff" sw={1.5} />
      <SketchText x={218} y={191} size={10} fill="#7c7cff">+ 입금하기</SketchText>
      {/* Deposit modal */}
      <RoughRect x={370} y={100} w={260} h={180} fill="#222228" stroke="#7c7cff" sw={2} />
      <SketchText x={460} y={125} size={12} fill="#ccc" anchor="middle">입금</SketchText>
      <RoughRect x={385} y={140} w={230} h={32} fill="#1a1a1e" stroke="#555" sw={1} />
      <SketchText x={400} y={162} size={10} fill="#666">금액 입력...</SketchText>
      <RoughRect x={385} y={185} w={230} h={32} fill="#7c7cff30" stroke="#7c7cff" sw={1.5} />
      <SketchText x={470} y={207} size={11} fill="#7c7cff" anchor="middle">입금하기</SketchText>
      <SketchText x={400} y={245} size={8} fill="#666">초기 자금: ₩10,000,000</SketchText>
      {/* Highlight */}
      <RoughCircle cx={250} cy={186} r={30} />
      <RoughArrow x1={283} y1={186} x2={365} y2={186} />
      <RedLabel x={200} y={310}>입금 버튼 → 모달에서 충전</RedLabel>
    </ScreenFrame>
  );
}

function PortfolioHoldingsIllust() {
  return (
    <ScreenFrame>
      <SketchText x={25} y={70} size={12} fill="#ccc">보유 자산</SketchText>
      {/* Table header */}
      <RoughRect x={20} y={80} w={620} h={28} fill="#2a2a2e" stroke="#444" sw={1} />
      <SketchText x={30} y={99} size={9} fill="#888">종목</SketchText>
      <SketchText x={130} y={99} size={9} fill="#888">수량</SketchText>
      <SketchText x={220} y={99} size={9} fill="#888">평균단가</SketchText>
      <SketchText x={340} y={99} size={9} fill="#888">현재가</SketchText>
      <SketchText x={450} y={99} size={9} fill="#888">평가금액</SketchText>
      <SketchText x={560} y={99} size={9} fill="#888">수익률</SketchText>
      {/* Row 1 */}
      <RoughRect x={20} y={108} w={620} h={30} fill="#222" stroke="#444" sw={1} />
      <SketchText x={30} y={128} size={10}>BTC</SketchText>
      <SketchText x={130} y={128} size={10}>0.5</SketchText>
      <SketchText x={220} y={128} size={10}>50,000,000</SketchText>
      <SketchText x={340} y={128} size={10}>55,000,000</SketchText>
      <SketchText x={450} y={128} size={10}>27,500,000</SketchText>
      <SketchText x={560} y={128} size={10} fill="#22c55e">+10.0%</SketchText>
      {/* Row 2 */}
      <RoughRect x={20} y={138} w={620} h={30} fill="#1e1e22" stroke="#444" sw={1} />
      <SketchText x={30} y={158} size={10}>ETH</SketchText>
      <SketchText x={130} y={158} size={10}>2.0</SketchText>
      <SketchText x={220} y={158} size={10}>4,000,000</SketchText>
      <SketchText x={340} y={158} size={10}>3,850,000</SketchText>
      <SketchText x={450} y={158} size={10}>7,700,000</SketchText>
      <SketchText x={560} y={158} size={10} fill="#ef4444">-3.8%</SketchText>
      {/* Row 3 */}
      <RoughRect x={20} y={168} w={620} h={30} fill="#222" stroke="#444" sw={1} />
      <SketchText x={30} y={188} size={10}>SOL</SketchText>
      <SketchText x={130} y={188} size={10}>10</SketchText>
      <SketchText x={560} y={188} size={10} fill="#22c55e">+15.2%</SketchText>
      {/* Highlight */}
      <RoughRect x={15} y={75} w={630} h={128} fill="none" stroke="#ef4444" sw={2.5} />
      <RedLabel x={200} y={230}>보유 종목별 수량, 평균단가, 현재가, 수익률 상세 확인</RedLabel>
    </ScreenFrame>
  );
}

function PortfolioPnlIllust() {
  return (
    <ScreenFrame>
      <RoughRect x={20} y={55} w={300} h={140} fill="#222228" stroke="#444" sw={1.5} />
      <SketchText x={35} y={80} size={10} fill="#888">총 자산</SketchText>
      <SketchText x={35} y={105} size={18} fill="#fff">₩ 12,500,000</SketchText>
      <RoughLine x1={35} y1={118} x2={300} y2={118} stroke="#333" sw={0.5} />
      <SketchText x={35} y={140} size={10} fill="#888">투자 수익</SketchText>
      <SketchText x={35} y={165} size={15} fill="#22c55e">+₩ 2,500,000 (+25%)</SketchText>
      {/* Formula explanation */}
      <RoughRect x={350} y={80} w={280} h={120} fill="#1e1e22" stroke="#555" sw={1.5} />
      <SketchText x={365} y={105} size={10} fill="#888">수익률 계산법</SketchText>
      <SketchText x={365} y={130} size={11} fill="#ccc">(현재가 - 평균단가)</SketchText>
      <SketchText x={365} y={150} size={11} fill="#ccc">÷ 평균단가 × 100</SketchText>
      <SketchText x={365} y={175} size={10} fill="#22c55e">= 수익률 (%)</SketchText>
      {/* Highlight */}
      <RoughCircle cx={160} cy={155} r={45} />
      <RoughArrow x1={210} y1={155} x2={340} y2={155} />
      <RedLabel x={200} y={240}>수익 금액과 수익률을 함께 표시</RedLabel>
    </ScreenFrame>
  );
}

function PortfolioRatioIllust() {
  return (
    <ScreenFrame>
      <SketchText x={25} y={70} size={12} fill="#ccc">투자 비중</SketchText>
      {/* Ratio bar */}
      <RoughRect x={20} y={85} w={620} h={40} fill="#1e1e22" stroke="#444" sw={1} />
      <RoughRect x={20} y={85} w={248} h={40} fill="#7c7cff30" stroke="#7c7cff" sw={1.5} />
      <RoughRect x={268} y={85} w={372} h={40} fill="#22c55e20" stroke="#22c55e" sw={1.5} />
      <SketchText x={100} y={110} size={11} fill="#7c7cff" anchor="middle">현금 40%</SketchText>
      <SketchText x={454} y={110} size={11} fill="#22c55e" anchor="middle">투자 60%</SketchText>
      {/* Detail breakdown */}
      <RoughRect x={20} y={140} w={200} h={80} fill="#222228" stroke="#444" sw={1.5} />
      <SketchText x={35} y={163} size={9} fill="#888">예수금 (현금)</SketchText>
      <SketchText x={35} y={183} size={13} fill="#7c7cff">₩ 5,000,000</SketchText>
      <SketchText x={35} y={205} size={9} fill="#888">40.0%</SketchText>
      <RoughRect x={230} y={140} w={200} h={80} fill="#222228" stroke="#444" sw={1.5} />
      <SketchText x={245} y={163} size={9} fill="#888">투자자산 (평가액)</SketchText>
      <SketchText x={245} y={183} size={13} fill="#22c55e">₩ 7,500,000</SketchText>
      <SketchText x={245} y={205} size={9} fill="#888">60.0%</SketchText>
      {/* Highlight */}
      <RoughRect x={15} y={80} w={630} h={50} fill="none" stroke="#ef4444" sw={2.5} />
      <RedLabel x={200} y={260}>현금 vs 투자자산 비중을 시각적으로 확인</RedLabel>
    </ScreenFrame>
  );
}

function PortfolioHistoryIllust() {
  return (
    <ScreenFrame>
      <SketchText x={25} y={70} size={12} fill="#ccc">최근 거래 내역</SketchText>
      {/* Table header */}
      <RoughRect x={20} y={80} w={620} h={28} fill="#2a2a2e" stroke="#444" sw={1} />
      <SketchText x={30} y={99} size={9} fill="#888">일시</SketchText>
      <SketchText x={150} y={99} size={9} fill="#888">종목</SketchText>
      <SketchText x={250} y={99} size={9} fill="#888">유형</SketchText>
      <SketchText x={330} y={99} size={9} fill="#888">수량</SketchText>
      <SketchText x={420} y={99} size={9} fill="#888">가격</SketchText>
      <SketchText x={540} y={99} size={9} fill="#888">금액</SketchText>
      {/* Row 1 */}
      <RoughRect x={20} y={108} w={620} h={28} fill="#222" stroke="#444" sw={1} />
      <SketchText x={30} y={127} size={9}>02-25 14:30</SketchText>
      <SketchText x={150} y={127} size={9}>BTC</SketchText>
      <RoughRect x={245} y={112} w={35} h={18} fill="#22c55e20" stroke="#22c55e" sw={1} />
      <SketchText x={250} y={126} size={8} fill="#22c55e">매수</SketchText>
      <SketchText x={330} y={127} size={9}>0.1</SketchText>
      <SketchText x={420} y={127} size={9}>55,230,000</SketchText>
      <SketchText x={540} y={127} size={9}>5,523,000</SketchText>
      {/* Row 2 */}
      <RoughRect x={20} y={136} w={620} h={28} fill="#1e1e22" stroke="#444" sw={1} />
      <SketchText x={30} y={155} size={9}>02-25 11:00</SketchText>
      <SketchText x={150} y={155} size={9}>ETH</SketchText>
      <RoughRect x={245} y={140} w={35} h={18} fill="#ef444420" stroke="#ef4444" sw={1} />
      <SketchText x={250} y={154} size={8} fill="#ef4444">매도</SketchText>
      <SketchText x={330} y={155} size={9}>1.0</SketchText>
      <SketchText x={420} y={155} size={9}>3,900,000</SketchText>
      <SketchText x={540} y={155} size={9}>3,900,000</SketchText>
      {/* Row 3 */}
      <RoughRect x={20} y={164} w={620} h={28} fill="#222" stroke="#444" sw={1} />
      <SketchText x={30} y={183} size={9}>02-24 09:15</SketchText>
      <SketchText x={150} y={183} size={9}>SOL</SketchText>
      <RoughRect x={245} y={168} w={35} h={18} fill="#22c55e20" stroke="#22c55e" sw={1} />
      <SketchText x={250} y={182} size={8} fill="#22c55e">매수</SketchText>
      {/* Highlight */}
      <RoughRect x={15} y={75} w={630} h={122} fill="none" stroke="#ef4444" sw={2.5} />
      <RedLabel x={200} y={230}>매수/매도/입금 내역을 시간순으로 확인</RedLabel>
    </ScreenFrame>
  );
}

/* ─── Orders illustrations ─── */
function OrdersStepIllust({ step }: { step: number }) {
  const highlights: Record<number, React.ReactNode> = {
    1: (
      <>
        {/* Asset list */}
        <RoughRect x={20} y={55} w={440} h={30} fill="#2a2a2e" stroke="#444" sw={1} />
        <SketchText x={30} y={75} size={10}>BTC/KRW</SketchText>
        <SketchText x={150} y={75} size={10}>55,230,000</SketchText>
        <SketchText x={280} y={75} size={10} fill="#22c55e">+2.3%</SketchText>
        <SketchText x={370} y={75} size={9} fill="#888">Vol 1.2B</SketchText>
        <RoughRect x={20} y={85} w={440} h={30} fill="#222" stroke="#444" sw={1} />
        <SketchText x={30} y={105} size={10}>ETH/KRW</SketchText>
        <SketchText x={150} y={105} size={10}>3,850,000</SketchText>
        <SketchText x={280} y={105} size={10} fill="#ef4444">-1.1%</SketchText>
        <RoughRect x={20} y={115} w={440} h={30} fill="#2a2a2e" stroke="#444" sw={1} />
        <RoughRect x={20} y={145} w={440} h={30} fill="#222" stroke="#444" sw={1} />
        {/* Click highlight */}
        <RoughRect x={15} y={50} w={450} h={38} fill="none" stroke="#ef4444" sw={2.5} />
        <RoughArrow x1={470} y1={70} x2={520} y2={70} />
        <RedLabel x={525} y={65}>1단계: 종목 행 클릭</RedLabel>
        <RedLabel x={525} y={83}>→ 상세 페이지 이동</RedLabel>
      </>
    ),
    2: (
      <>
        {/* Order panel */}
        <RoughRect x={150} y={55} w={360} h={300} fill="#222228" stroke="#444" sw={1.5} />
        <SketchText x={280} y={80} size={13} fill="#ccc">BTC/KRW 매수</SketchText>
        {/* Buy/Sell tabs */}
        <RoughRect x={170} y={95} w={160} h={30} fill="#22c55e20" stroke="#22c55e" sw={1.5} />
        <RoughRect x={330} y={95} w={160} h={30} fill="#2a2a2e" stroke="#555" sw={1} />
        <SketchText x={225} y={115} size={11} fill="#22c55e">매수</SketchText>
        <SketchText x={390} y={115} size={11}>매도</SketchText>
        {/* Order type buttons */}
        <RoughRect x={170} y={140} w={115} h={28} fill="#3b3bff20" stroke="#7c7cff" sw={2} />
        <RoughRect x={290} y={140} w={115} h={28} fill="#2a2a2e" stroke="#555" sw={1} />
        <SketchText x={205} y={159} size={10} fill="#7c7cff">시장가</SketchText>
        <SketchText x={325} y={159} size={10}>지정가</SketchText>
        {/* Highlight */}
        <RoughRect x={165} y={135} w={245} h={38} fill="none" stroke="#ef4444" sw={2.5} />
        <RoughArrow x1={415} y1={155} x2={520} y2={155} />
        <RedLabel x={525} y={150}>2단계: 주문 유형 선택</RedLabel>
        <RedLabel x={525} y={168}>시장가 or 지정가</RedLabel>
      </>
    ),
    3: (
      <>
        <RoughRect x={150} y={55} w={360} h={300} fill="#222228" stroke="#444" sw={1.5} />
        <SketchText x={280} y={80} size={13} fill="#ccc">BTC/KRW 매수</SketchText>
        {/* Order type (already selected) */}
        <RoughRect x={170} y={95} w={115} h={28} fill="#3b3bff20" stroke="#7c7cff" sw={1} />
        <SketchText x={205} y={114} size={10} fill="#7c7cff">시장가</SketchText>
        {/* Quantity input */}
        <SketchText x={175} y={150} size={10} fill="#888">수량</SketchText>
        <RoughRect x={170} y={155} w={320} h={35} fill="#1a1a1e" stroke="#555" sw={1} />
        <SketchText x={185} y={178} size={11} fill="#666">0.5</SketchText>
        {/* Amount display */}
        <SketchText x={175} y={215} size={9} fill="#888">예상 금액</SketchText>
        <SketchText x={175} y={235} size={12} fill="#fff">₩ 27,615,000</SketchText>
        {/* Buy/Sell buttons */}
        <RoughRect x={170} y={255} w={155} h={40} fill="#22c55e30" stroke="#22c55e" sw={2} />
        <RoughRect x={335} y={255} w={155} h={40} fill="#ef444430" stroke="#ef4444" sw={2} />
        <SketchText x={220} y={280} size={12} fill="#22c55e">매수</SketchText>
        <SketchText x={385} y={280} size={12} fill="#ef4444">매도</SketchText>
        {/* Highlight */}
        <RoughRect x={165} y={148} w={330} h={155} fill="none" stroke="#ef4444" sw={2.5} />
        <RoughArrow x1={500} y1={225} x2={530} y2={225} />
        <RedLabel x={535} y={220}>3단계: 수량 입력 후</RedLabel>
        <RedLabel x={535} y={238}>매수/매도 버튼 클릭</RedLabel>
      </>
    ),
    4: (
      <>
        <SketchText x={25} y={70} size={13} fill="#ccc">주문 내역</SketchText>
        {/* Table header */}
        <RoughRect x={20} y={80} w={620} h={28} fill="#2a2a2e" stroke="#444" sw={1} />
        <SketchText x={30} y={99} size={9} fill="#888">종목</SketchText>
        <SketchText x={110} y={99} size={9} fill="#888">유형</SketchText>
        <SketchText x={180} y={99} size={9} fill="#888">주문유형</SketchText>
        <SketchText x={270} y={99} size={9} fill="#888">수량</SketchText>
        <SketchText x={340} y={99} size={9} fill="#888">가격</SketchText>
        <SketchText x={440} y={99} size={9} fill="#888">금액</SketchText>
        <SketchText x={550} y={99} size={9} fill="#888">상태</SketchText>
        {/* Row */}
        <RoughRect x={20} y={108} w={620} h={30} fill="#222" stroke="#444" sw={1} />
        <SketchText x={30} y={128} size={10}>BTC</SketchText>
        <SketchText x={110} y={128} size={10} fill="#22c55e">매수</SketchText>
        <SketchText x={180} y={128} size={10}>시장가</SketchText>
        <SketchText x={270} y={128} size={10}>0.5</SketchText>
        <SketchText x={340} y={128} size={10}>55,230,000</SketchText>
        <SketchText x={440} y={128} size={10}>27,615,000</SketchText>
        <RoughRect x={540} y={113} w={50} h={20} fill="#22c55e30" stroke="#22c55e" sw={1} />
        <SketchText x={548} y={128} size={9} fill="#22c55e">체결</SketchText>
        {/* Highlight */}
        <RoughCircle cx={565} cy={123} r={22} />
        <RoughArrow x1={565} y1={148} x2={565} y2={180} />
        <RedLabel x={430} y={195}>4단계: 체결 상태 확인</RedLabel>
        <RedLabel x={430} y={213}>체결/대기/취소 상태 표시</RedLabel>
      </>
    ),
  };
  return <ScreenFrame>{highlights[step]}</ScreenFrame>;
}

function OrdersCancelIllust() {
  return (
    <ScreenFrame>
      <SketchText x={25} y={70} size={12} fill="#ccc">주문 내역</SketchText>
      <RoughRect x={20} y={80} w={620} h={28} fill="#2a2a2e" stroke="#444" sw={1} />
      <SketchText x={30} y={99} size={9} fill="#888">종목</SketchText>
      <SketchText x={130} y={99} size={9} fill="#888">유형</SketchText>
      <SketchText x={250} y={99} size={9} fill="#888">가격</SketchText>
      <SketchText x={380} y={99} size={9} fill="#888">상태</SketchText>
      <SketchText x={520} y={99} size={9} fill="#888">액션</SketchText>
      {/* Pending order */}
      <RoughRect x={20} y={108} w={620} h={32} fill="#222" stroke="#444" sw={1} />
      <SketchText x={30} y={129} size={10}>BTC</SketchText>
      <SketchText x={130} y={129} size={10}>지정가 매수</SketchText>
      <SketchText x={250} y={129} size={10}>54,000,000</SketchText>
      <RoughRect x={370} y={114} w={55} h={20} fill="#f59e0b30" stroke="#f59e0b" sw={1} />
      <SketchText x={378} y={129} size={9} fill="#f59e0b">대기중</SketchText>
      <RoughRect x={510} y={114} w={60} h={20} fill="#ef444420" stroke="#ef4444" sw={1.5} />
      <SketchText x={523} y={129} size={9} fill="#ef4444">취소</SketchText>
      {/* Filled order (no cancel) */}
      <RoughRect x={20} y={140} w={620} h={32} fill="#1e1e22" stroke="#444" sw={1} />
      <SketchText x={30} y={161} size={10}>ETH</SketchText>
      <SketchText x={130} y={161} size={10}>시장가 매도</SketchText>
      <RoughRect x={370} y={146} w={55} h={20} fill="#22c55e30" stroke="#22c55e" sw={1} />
      <SketchText x={378} y={161} size={9} fill="#22c55e">체결</SketchText>
      <SketchText x={520} y={161} size={9} fill="#555">-</SketchText>
      {/* Highlight cancel button */}
      <RoughCircle cx={540} cy={124} r={28} />
      <RoughArrow x1={540} y1={155} x2={540} y2={200} />
      <RedLabel x={400} y={215}>대기중인 주문만 취소 가능</RedLabel>
      <RedLabel x={400} y={233}>체결된 주문은 취소 불가</RedLabel>
    </ScreenFrame>
  );
}

function OrdersFilterIllust() {
  return (
    <ScreenFrame>
      <SketchText x={25} y={70} size={12} fill="#ccc">주문 내역</SketchText>
      {/* Filter buttons */}
      <RoughRect x={20} y={80} w={55} h={22} fill="#3b3bff20" stroke="#7c7cff" sw={1.5} />
      <RoughRect x={80} y={80} w={55} h={22} fill="#2a2a2e" stroke="#555" sw={1} />
      <RoughRect x={140} y={80} w={65} h={22} fill="#2a2a2e" stroke="#555" sw={1} />
      <RoughRect x={210} y={80} w={55} h={22} fill="#2a2a2e" stroke="#555" sw={1} />
      <SketchText x={32} y={95} size={9} fill="#7c7cff">전체</SketchText>
      <SketchText x={90} y={95} size={9}>대기중</SketchText>
      <SketchText x={150} y={95} size={9}>체결완료</SketchText>
      <SketchText x={220} y={95} size={9}>취소됨</SketchText>
      {/* Table */}
      <RoughRect x={20} y={115} w={620} h={28} fill="#2a2a2e" stroke="#444" sw={1} />
      <RoughRect x={20} y={143} w={620} h={28} fill="#222" stroke="#444" sw={1} />
      <RoughRect x={20} y={171} w={620} h={28} fill="#1e1e22" stroke="#444" sw={1} />
      <RoughRect x={20} y={199} w={620} h={28} fill="#222" stroke="#444" sw={1} />
      {/* Highlight */}
      <RoughRect x={15} y={75} w={255} h={32} fill="none" stroke="#ef4444" sw={2.5} />
      <RoughArrow x1={275} y1={91} x2={320} y2={91} />
      <RedLabel x={325} y={86}>상태별 필터로 주문 분류</RedLabel>
      <RedLabel x={325} y={104}>매수/매도 유형 구분 가능</RedLabel>
    </ScreenFrame>
  );
}

function OrdersMarketVsLimitIllust() {
  return (
    <ScreenFrame>
      <SketchText x={200} y={70} size={13} fill="#ccc" anchor="middle">시장가 vs 지정가</SketchText>
      {/* Market order box */}
      <RoughRect x={20} y={85} w={295} h={200} fill="#222228" stroke="#22c55e" sw={1.5} />
      <SketchText x={120} y={110} size={12} fill="#22c55e" anchor="middle">시장가 주문</SketchText>
      <SketchText x={35} y={140} size={10} fill="#ccc">• 현재 시장 가격으로 즉시 체결</SketchText>
      <SketchText x={35} y={165} size={10} fill="#ccc">• 빠른 체결 보장</SketchText>
      <SketchText x={35} y={190} size={10} fill="#ccc">• 가격 변동 가능성 있음</SketchText>
      <SketchText x={35} y={220} size={10} fill="#888">적합: 빠른 매수/매도 시</SketchText>
      <RoughRect x={50} y={245} w={100} h={25} fill="#22c55e30" stroke="#22c55e" sw={1} />
      <SketchText x={70} y={262} size={9} fill="#22c55e">즉시 체결 ⚡</SketchText>
      {/* Limit order box */}
      <RoughRect x={345} y={85} w={295} h={200} fill="#222228" stroke="#7c7cff" sw={1.5} />
      <SketchText x={445} y={110} size={12} fill="#7c7cff" anchor="middle">지정가 주문</SketchText>
      <SketchText x={360} y={140} size={10} fill="#ccc">• 원하는 가격을 직접 지정</SketchText>
      <SketchText x={360} y={165} size={10} fill="#ccc">• 가격 도달 시 체결</SketchText>
      <SketchText x={360} y={190} size={10} fill="#ccc">• 체결까지 시간 소요 가능</SketchText>
      <SketchText x={360} y={220} size={10} fill="#888">적합: 특정 가격 목표 시</SketchText>
      <RoughRect x={375} y={245} w={100} h={25} fill="#7c7cff30" stroke="#7c7cff" sw={1} />
      <SketchText x={390} y={262} size={9} fill="#7c7cff">가격 보장 🎯</SketchText>
      {/* VS label */}
      <RoughCircle cx={330} cy={185} r={20} stroke="#ef4444" sw={2} fill="#1a1a1e" />
      <SketchText x={330} y={190} size={12} fill="#ef4444" anchor="middle">VS</SketchText>
    </ScreenFrame>
  );
}

function OrdersCalcIllust() {
  return (
    <ScreenFrame>
      <SketchText x={25} y={70} size={12} fill="#ccc">주문 금액 계산</SketchText>
      {/* Calculation card */}
      <RoughRect x={100} y={90} w={460} h={220} fill="#222228" stroke="#444" sw={1.5} />
      <SketchText x={120} y={120} size={10} fill="#888">종목</SketchText>
      <SketchText x={250} y={120} size={12} fill="#fff">BTC/KRW</SketchText>
      <RoughLine x1={120} y1={130} x2={540} y2={130} stroke="#333" sw={0.5} />
      <SketchText x={120} y={155} size={10} fill="#888">현재가</SketchText>
      <SketchText x={250} y={155} size={12} fill="#fff">55,230,000원</SketchText>
      <RoughLine x1={120} y1={165} x2={540} y2={165} stroke="#333" sw={0.5} />
      <SketchText x={120} y={190} size={10} fill="#888">수량</SketchText>
      <SketchText x={250} y={190} size={12} fill="#fff">× 0.5</SketchText>
      <RoughLine x1={120} y1={205} x2={540} y2={205} stroke="#555" sw={1.5} />
      <SketchText x={120} y={235} size={11} fill="#888">주문 금액</SketchText>
      <SketchText x={250} y={235} size={15} fill="#22c55e">= ₩ 27,615,000</SketchText>
      <SketchText x={120} y={265} size={9} fill="#888">수수료: 없음 (무료)</SketchText>
      <SketchText x={120} y={285} size={9} fill="#888">예수금 잔액: ₩ 5,000,000</SketchText>
      {/* Highlight */}
      <RoughRect x={240} y={218} w={300} h={30} fill="none" stroke="#ef4444" sw={2.5} />
      <RedLabel x={200} y={340}>가격 × 수량 = 주문 금액 (수수료 무료)</RedLabel>
    </ScreenFrame>
  );
}

/* ─── Leaderboard illustrations ─── */
function LeaderboardRankIllust() {
  return (
    <ScreenFrame>
      <SketchText x={330} y={70} size={14} fill="#ccc" anchor="middle">🏆 리더보드</SketchText>
      {/* Top 3 */}
      <RoughRect x={80} y={85} w={500} h={36} fill="#fbbf2420" stroke="#fbbf24" sw={1.5} />
      <SketchText x={100} y={108} size={13} fill="#fbbf24">🥇 1위</SketchText>
      <SketchText x={210} y={108} size={11}>사용자A</SketchText>
      <SketchText x={400} y={108} size={11} fill="#22c55e">+42.5%</SketchText>
      <SketchText x={490} y={108} size={10} fill="#888">₩14,250,000</SketchText>
      <RoughRect x={80} y={121} w={500} h={32} fill="#c0c0c020" stroke="#aaa" sw={1} />
      <SketchText x={100} y={142} size={12} fill="#aaa">🥈 2위</SketchText>
      <SketchText x={210} y={142} size={11}>사용자B</SketchText>
      <SketchText x={400} y={142} size={11} fill="#22c55e">+31.2%</SketchText>
      <RoughRect x={80} y={153} w={500} h={32} fill="#cd7f3220" stroke="#cd7f32" sw={1} />
      <SketchText x={100} y={174} size={12} fill="#cd7f32">🥉 3위</SketchText>
      <SketchText x={210} y={174} size={11}>사용자C</SketchText>
      <SketchText x={400} y={174} size={11} fill="#22c55e">+22.8%</SketchText>
      {/* More rows */}
      <RoughRect x={80} y={185} w={500} h={28} fill="#222" stroke="#444" sw={1} />
      <SketchText x={100} y={204} size={10}>4위</SketchText>
      <SketchText x={210} y={204} size={10}>사용자D</SketchText>
      <RoughRect x={80} y={213} w={500} h={28} fill="#1e1e22" stroke="#444" sw={1} />
      {/* Highlight returns column */}
      <RoughRect x={385} y={82} w={100} h={162} fill="none" stroke="#ef4444" sw={2.5} />
      <RoughArrow x1={490} y1={160} x2={540} y2={280} />
      <RedLabel x={350} y={300}>수익률 기준으로 순위 결정</RedLabel>
    </ScreenFrame>
  );
}

function LeaderboardRefreshIllust() {
  return (
    <ScreenFrame>
      <SketchText x={25} y={70} size={14} fill="#ccc">🏆 리더보드</SketchText>
      {/* Refresh button */}
      <RoughRect x={530} y={55} w={100} h={28} fill="#2a2a2e" stroke="#555" sw={1.5} />
      <SketchText x={545} y={74} size={10}>🔄 새로고침</SketchText>
      <RoughCircle cx={580} cy={69} r={30} />
      <RoughArrow x1={580} y1={100} x2={580} y2={140} />
      <RedLabel x={460} y={155}>클릭하면 최신 순위 반영</RedLabel>
    </ScreenFrame>
  );
}

function LeaderboardMyRankIllust() {
  return (
    <ScreenFrame>
      <SketchText x={330} y={70} size={14} fill="#ccc" anchor="middle">🏆 리더보드</SketchText>
      <RoughRect x={80} y={85} w={500} h={32} fill="#222" stroke="#444" sw={1} />
      <SketchText x={100} y={106} size={10}>1위</SketchText>
      <SketchText x={210} y={106} size={10}>사용자A</SketchText>
      <SketchText x={400} y={106} size={10} fill="#22c55e">+42.5%</SketchText>
      <RoughRect x={80} y={117} w={500} h={32} fill="#222" stroke="#444" sw={1} />
      <SketchText x={100} y={138} size={10}>2위</SketchText>
      {/* My rank - highlighted */}
      <RoughRect x={80} y={149} w={500} h={36} fill="#7c7cff15" stroke="#7c7cff" sw={2} />
      <SketchText x={100} y={172} size={11} fill="#7c7cff">15위 ← 나</SketchText>
      <SketchText x={210} y={172} size={11} fill="#7c7cff">내 이름</SketchText>
      <SketchText x={400} y={172} size={11} fill="#22c55e">+8.3%</SketchText>
      <SketchText x={490} y={172} size={10} fill="#7c7cff">₩10,830,000</SketchText>
      <RoughRect x={80} y={185} w={500} h={28} fill="#222" stroke="#444" sw={1} />
      {/* Highlight my row */}
      <RoughCircle cx={330} cy={167} r={40} />
      <RoughArrow x1={330} y1={210} x2={330} y2={260} />
      <RedLabel x={220} y={280}>로그인 시 내 순위가 강조 표시됩니다</RedLabel>
    </ScreenFrame>
  );
}

function LeaderboardScoringIllust() {
  return (
    <ScreenFrame>
      <SketchText x={330} y={70} size={13} fill="#ccc" anchor="middle">순위 산정 기준</SketchText>
      {/* Formula card */}
      <RoughRect x={80} y={90} w={500} h={200} fill="#222228" stroke="#444" sw={1.5} />
      <SketchText x={120} y={125} size={11} fill="#888">초기 자금</SketchText>
      <SketchText x={300} y={125} size={14} fill="#fff">₩ 10,000,000</SketchText>
      <RoughLine x1={120} y1={140} x2={540} y2={140} stroke="#333" sw={0.5} />
      <SketchText x={120} y={165} size={11} fill="#888">현재 총 자산</SketchText>
      <SketchText x={300} y={165} size={14} fill="#fff">₩ 12,500,000</SketchText>
      <RoughLine x1={120} y1={185} x2={540} y2={185} stroke="#555" sw={1} />
      <SketchText x={120} y={215} size={11} fill="#888">수익률</SketchText>
      <SketchText x={300} y={215} size={16} fill="#22c55e">+25.0%</SketchText>
      <SketchText x={120} y={245} size={9} fill="#666">(12,500,000 - 10,000,000) / 10,000,000 × 100</SketchText>
      <SketchText x={120} y={265} size={10} fill="#888">보유 종목 평가액이 실시간 반영됩니다</SketchText>
      {/* Highlight */}
      <RoughRect x={290} y={198} w={260} h={30} fill="none" stroke="#ef4444" sw={2.5} />
    </ScreenFrame>
  );
}

/* ─── Announcements illustrations ─── */
function AnnouncementsViewIllust() {
  return (
    <ScreenFrame>
      <SketchText x={25} y={70} size={12} fill="#ccc">공지사항</SketchText>
      {/* Pinned post */}
      <RoughRect x={20} y={80} w={620} h={34} fill="#222" stroke="#7c7cff" sw={1.5} />
      <SketchText x={30} y={102} size={10} fill="#7c7cff">📌 서비스 업데이트 안내 v2.0</SketchText>
      <SketchText x={450} y={102} size={9} fill="#888">조회 142</SketchText>
      <SketchText x={540} y={102} size={9} fill="#888">02-25</SketchText>
      {/* Normal posts */}
      <RoughRect x={20} y={114} w={620} h={30} fill="#1e1e22" stroke="#444" sw={1} />
      <SketchText x={30} y={134} size={10}>가상화폐 거래 가이드</SketchText>
      <SketchText x={450} y={134} size={9} fill="#888">조회 87</SketchText>
      <RoughRect x={20} y={144} w={620} h={30} fill="#222" stroke="#444" sw={1} />
      <SketchText x={30} y={164} size={10}>시뮬레이션 데이터 안내</SketchText>
      <RoughRect x={20} y={174} w={620} h={30} fill="#1e1e22" stroke="#444" sw={1} />
      {/* Highlight */}
      <RoughRect x={15} y={75} w={630} h={42} fill="none" stroke="#ef4444" sw={2.5} />
      <RoughArrow x1={330} y1={120} x2={330} y2={230} />
      <RedLabel x={220} y={250}>제목 클릭 → 상세 보기</RedLabel>
      <RedLabel x={220} y={268}>📌 고정 공지는 상단 고정</RedLabel>
    </ScreenFrame>
  );
}

function AnnouncementsCommentIllust() {
  return (
    <ScreenFrame>
      <SketchText x={25} y={70} size={13} fill="#ccc">서비스 업데이트 안내</SketchText>
      <RoughRect x={20} y={85} w={620} h={80} fill="#222228" stroke="#444" sw={1} />
      <SketchText x={35} y={110} size={10} fill="#bbb">공지사항 본문 내용이 여기에 표시됩니다.</SketchText>
      <SketchText x={35} y={130} size={10} fill="#bbb">새로운 기능 업데이트 내역을 확인하세요.</SketchText>
      <SketchText x={35} y={150} size={9} fill="#888">작성일: 2026-02-25 | 조회: 142</SketchText>
      {/* Comments section */}
      <SketchText x={25} y={190} size={11} fill="#ccc">💬 댓글 (3)</SketchText>
      <RoughRect x={20} y={200} w={620} h={40} fill="#1e1e22" stroke="#444" sw={1} />
      <SketchText x={35} y={218} size={9} fill="#7c7cff">사용자A</SketchText>
      <SketchText x={100} y={218} size={9} fill="#bbb">좋은 업데이트네요!</SketchText>
      <SketchText x={540} y={218} size={8} fill="#666">수정 | 삭제</SketchText>
      <RoughRect x={20} y={240} w={620} h={40} fill="#222" stroke="#444" sw={1} />
      {/* Comment input */}
      <RoughRect x={20} y={295} w={520} h={35} fill="#1e1e22" stroke="#555" sw={1} />
      <SketchText x={35} y={317} size={10} fill="#666">댓글을 입력하세요...</SketchText>
      <RoughRect x={545} y={295} w={95} h={35} fill="#7c7cff30" stroke="#7c7cff" sw={1.5} />
      <SketchText x={570} y={317} size={10} fill="#7c7cff">작성</SketchText>
      {/* Highlight */}
      <RoughRect x={15} y={185} w={630} h={155} fill="none" stroke="#ef4444" sw={2.5} />
      <RedLabel x={200} y={360}>댓글 작성, 수정, 삭제 가능</RedLabel>
    </ScreenFrame>
  );
}

function AnnouncementsLikeIllust() {
  return (
    <ScreenFrame>
      <SketchText x={25} y={70} size={13} fill="#ccc">서비스 업데이트 안내</SketchText>
      <RoughRect x={20} y={85} w={620} h={70} fill="#222228" stroke="#444" sw={1} />
      <SketchText x={35} y={115} size={10} fill="#bbb">공지사항 본문 내용...</SketchText>
      {/* Like button */}
      <RoughRect x={20} y={170} w={80} h={30} fill="#ef444420" stroke="#ef4444" sw={1.5} />
      <SketchText x={35} y={190} size={11} fill="#ef4444">❤️ 12</SketchText>
      <RoughCircle cx={60} cy={185} r={28} />
      <RoughArrow x1={105} y1={185} x2={160} y2={185} />
      <RedLabel x={170} y={180}>좋아요 버튼</RedLabel>
      <RedLabel x={170} y={198}>클릭으로 반응, 다시 클릭하면 취소</RedLabel>
    </ScreenFrame>
  );
}

function AnnouncementsAttachIllust() {
  return (
    <ScreenFrame>
      <SketchText x={25} y={70} size={13} fill="#ccc">서비스 업데이트 안내</SketchText>
      <RoughRect x={20} y={85} w={620} h={70} fill="#222228" stroke="#444" sw={1} />
      <SketchText x={25} y={175} size={11} fill="#ccc">📎 첨부파일</SketchText>
      <RoughRect x={20} y={185} w={280} h={32} fill="#2a2a2e" stroke="#555" sw={1} />
      <SketchText x={35} y={206} size={10}>📄 업데이트_가이드.pdf (2.3MB)</SketchText>
      <RoughRect x={310} y={185} w={280} h={32} fill="#2a2a2e" stroke="#555" sw={1} />
      <SketchText x={325} y={206} size={10}>🖼️ 스크린샷.png (1.1MB)</SketchText>
      {/* Highlight */}
      <RoughRect x={15} y={170} w={580} h={55} fill="none" stroke="#ef4444" sw={2.5} />
      <RedLabel x={200} y={250}>파일명 클릭 → 다운로드</RedLabel>
    </ScreenFrame>
  );
}

function AnnouncementsWriteIllust() {
  return (
    <ScreenFrame>
      <SketchText x={25} y={70} size={13} fill="#ccc">새 공지사항 작성 (관리자)</SketchText>
      <RoughRect x={20} y={85} w={620} h={280} fill="#222228" stroke="#444" sw={1.5} />
      {/* Title */}
      <SketchText x={35} y={110} size={10} fill="#888">제목</SketchText>
      <RoughRect x={35} y={115} w={590} h={30} fill="#1a1a1e" stroke="#555" sw={1} />
      <SketchText x={50} y={135} size={10} fill="#666">공지 제목을 입력하세요...</SketchText>
      {/* Content */}
      <SketchText x={35} y={165} size={10} fill="#888">내용</SketchText>
      <RoughRect x={35} y={170} w={590} h={100} fill="#1a1a1e" stroke="#555" sw={1} />
      <SketchText x={50} y={195} size={10} fill="#666">공지 내용을 입력하세요...</SketchText>
      {/* Options */}
      <RoughRect x={35} y={285} w={120} h={28} fill="#2a2a2e" stroke="#555" sw={1} />
      <SketchText x={50} y={304} size={9}>📎 파일 첨부</SketchText>
      <RoughRect x={165} y={285} w={100} h={28} fill="#2a2a2e" stroke="#555" sw={1} />
      <SketchText x={180} y={304} size={9}>📌 고정</SketchText>
      {/* Submit */}
      <RoughRect x={500} y={330} w={130} h={30} fill="#7c7cff30" stroke="#7c7cff" sw={1.5} />
      <SketchText x={535} y={350} size={11} fill="#7c7cff">작성하기</SketchText>
      {/* Highlight */}
      <RoughRect x={30} y={280} w={240} h={38} fill="none" stroke="#ef4444" sw={2.5} />
      <RedLabel x={300} y={300}>파일 첨부와 고정 설정 가능</RedLabel>
    </ScreenFrame>
  );
}

/* ─── News illustrations ─── */
function NewsCategoryIllust() {
  return (
    <ScreenFrame>
      <SketchText x={25} y={70} size={12} fill="#ccc">뉴스</SketchText>
      <RoughRect x={20} y={80} w={70} h={22} fill="#3b3bff20" stroke="#7c7cff" sw={1.5} />
      <RoughRect x={95} y={80} w={70} h={22} fill="#2a2a2e" stroke="#555" sw={1} />
      <RoughRect x={170} y={80} w={70} h={22} fill="#2a2a2e" stroke="#555" sw={1} />
      <SketchText x={30} y={95} size={9} fill="#7c7cff">암호화폐</SketchText>
      <SketchText x={105} y={95} size={9}>국내주식</SketchText>
      <SketchText x={180} y={95} size={9}>해외주식</SketchText>
      {/* News cards */}
      <RoughRect x={20} y={115} w={300} h={130} fill="#222228" stroke="#444" sw={1.5} />
      <SketchText x={35} y={140} size={10} fill="#ddd">비트코인 신고가 경신</SketchText>
      <SketchText x={35} y={160} size={8} fill="#888">비트코인이 역대 최고가를 경신하며...</SketchText>
      <SketchText x={35} y={180} size={8} fill="#666">CoinDesk · 2시간 전</SketchText>
      <RoughRect x={340} y={115} w={300} h={130} fill="#222228" stroke="#444" sw={1.5} />
      <SketchText x={355} y={140} size={10} fill="#ddd">이더리움 2.0 업그레이드</SketchText>
      <SketchText x={355} y={160} size={8} fill="#888">이더리움 네트워크 업그레이드가...</SketchText>
      <SketchText x={355} y={180} size={8} fill="#666">블록미디어 · 5시간 전</SketchText>
      {/* Highlight */}
      <RoughRect x={15} y={75} w={230} h={32} fill="none" stroke="#ef4444" sw={2.5} />
      <RoughArrow x1={250} y1={91} x2={310} y2={91} />
      <RedLabel x={315} y={86}>카테고리별 뉴스 필터링</RedLabel>
    </ScreenFrame>
  );
}

function NewsLinkIllust() {
  return (
    <ScreenFrame>
      <SketchText x={25} y={70} size={12} fill="#ccc">뉴스</SketchText>
      <RoughRect x={20} y={85} w={300} h={160} fill="#222228" stroke="#444" sw={1.5} />
      <SketchText x={35} y={110} size={11} fill="#ddd">비트코인 신고가 경신</SketchText>
      <SketchText x={35} y={135} size={9} fill="#888">비트코인이 역대 최고가를 경신하며</SketchText>
      <SketchText x={35} y={155} size={9} fill="#888">투자자들의 관심이 집중되고 있습니다.</SketchText>
      <SketchText x={35} y={180} size={8} fill="#666">CoinDesk · 2시간 전</SketchText>
      <RoughRect x={35} y={200} w={110} h={28} fill="#7c7cff20" stroke="#7c7cff" sw={1.5} />
      <SketchText x={50} y={219} size={10} fill="#7c7cff">기사 보기 →</SketchText>
      {/* Highlight */}
      <RoughCircle cx={90} cy={214} r={30} />
      <RoughArrow x1={125} y1={214} x2={360} y2={214} />
      <RedLabel x={370} y={208}>클릭 → 원본 뉴스 사이트</RedLabel>
      <RedLabel x={370} y={226}>새 탭에서 열림</RedLabel>
    </ScreenFrame>
  );
}

function NewsRefreshIllust() {
  return (
    <ScreenFrame>
      <SketchText x={25} y={70} size={12} fill="#ccc">뉴스</SketchText>
      {/* Auto-refresh indicator */}
      <RoughRect x={500} y={55} w={130} h={28} fill="#2a2a2e" stroke="#555" sw={1} />
      <SketchText x={515} y={74} size={9}>🔄 자동 갱신 중</SketchText>
      {/* News list */}
      <RoughRect x={20} y={90} w={620} h={36} fill="#222228" stroke="#22c55e" sw={1.5} />
      <SketchText x={35} y={108} size={8} fill="#22c55e">NEW</SketchText>
      <SketchText x={70} y={113} size={10} fill="#ddd">최신 뉴스: 시장 동향 업데이트</SketchText>
      <SketchText x={500} y={113} size={8} fill="#888">방금 전</SketchText>
      <RoughRect x={20} y={126} w={620} h={32} fill="#1e1e22" stroke="#444" sw={1} />
      <SketchText x={35} y={147} size={10}>비트코인 분석 리포트</SketchText>
      <RoughRect x={20} y={158} w={620} h={32} fill="#222" stroke="#444" sw={1} />
      {/* Highlight */}
      <RoughCircle cx={565} cy={69} r={35} />
      <RoughArrow x1={565} y1={106} x2={565} y2={220} />
      <RedLabel x={400} y={240}>뉴스는 자동으로 최신 기사 추가</RedLabel>
    </ScreenFrame>
  );
}

/* ─── Chat illustrations ─── */
function ChatDmIllust() {
  return (
    <ScreenFrame>
      {/* Chat panel */}
      <RoughRect x={380} y={55} w={265} h={365} fill="#1a1a1e" stroke="#444" sw={1.5} />
      <RoughRect x={380} y={55} w={265} h={35} fill="#222228" stroke="#444" sw={1} />
      <SketchText x={400} y={78} size={11} fill="#ccc">💬 채팅</SketchText>
      {/* New chat button */}
      <RoughRect x={600} y={60} w={35} h={24} fill="#2a2a2e" stroke="#7c7cff" sw={1.5} />
      <SketchText x={611} y={77} size={11} fill="#7c7cff">+</SketchText>
      <RoughCircle cx={617} cy={72} r={20} />
      {/* Chat list items */}
      <RoughRect x={385} y={100} w={255} h={40} fill="#2a2a2e" stroke="#444" sw={1} />
      <SketchText x={400} y={118} size={10}>사용자A</SketchText>
      <SketchText x={400} y={132} size={8} fill="#888">안녕하세요!</SketchText>
      <RoughRect x={610} y={105} w={20} h={16} fill="#ef4444" stroke="none" />
      <SketchText x={615} y={117} size={8} fill="#fff" anchor="middle">2</SketchText>
      <RoughRect x={385} y={140} w={255} h={40} fill="#222" stroke="#444" sw={1} />
      <SketchText x={400} y={158} size={10}>사용자B</SketchText>
      <SketchText x={400} y={172} size={8} fill="#888">네, 확인했습니다</SketchText>
      <RoughRect x={385} y={180} w={255} h={40} fill="#2a2a2e" stroke="#444" sw={1} />
      {/* Arrow and label */}
      <RoughArrow x1={375} y1={72} x2={280} y2={72} />
      <RedLabel x={80} y={65}>새 대화(+) 버튼 클릭 →</RedLabel>
      <RedLabel x={80} y={83}>사용자 검색 → DM 시작</RedLabel>
    </ScreenFrame>
  );
}

function ChatGroupIllust() {
  return (
    <ScreenFrame>
      <RoughRect x={380} y={55} w={265} h={365} fill="#1a1a1e" stroke="#444" sw={1.5} />
      <SketchText x={420} y={78} size={11} fill="#ccc">새 대화</SketchText>
      {/* Search */}
      <RoughRect x={390} y={90} w={245} h={28} fill="#1e1e22" stroke="#555" sw={1} />
      <SketchText x={405} y={109} size={9} fill="#666">🔍 사용자 검색...</SketchText>
      {/* User checkboxes */}
      <RoughRect x={390} y={125} w={245} h={30} fill="#2a2a2e" stroke="#444" sw={1} />
      <SketchText x={420} y={145} size={10}>☑ 사용자A</SketchText>
      <RoughRect x={390} y={155} w={245} h={30} fill="#2a2a2e" stroke="#444" sw={1} />
      <SketchText x={420} y={175} size={10}>☑ 사용자B</SketchText>
      <RoughRect x={390} y={185} w={245} h={30} fill="#222" stroke="#444" sw={1} />
      <SketchText x={420} y={205} size={10}>☐ 사용자C</SketchText>
      <RoughRect x={390} y={215} w={245} h={30} fill="#222" stroke="#444" sw={1} />
      <SketchText x={420} y={235} size={10}>☐ 사용자D</SketchText>
      {/* Create button */}
      <RoughRect x={390} y={260} w={245} h={32} fill="#7c7cff30" stroke="#7c7cff" sw={1.5} />
      <SketchText x={475} y={281} size={10} fill="#7c7cff" anchor="middle">그룹 채팅 생성</SketchText>
      {/* Highlight */}
      <RoughRect x={385} y={120} w={255} h={100} fill="none" stroke="#ef4444" sw={2.5} />
      <RoughArrow x1={380} y1={170} x2={280} y2={170} />
      <RedLabel x={80} y={163}>2명 이상 선택 →</RedLabel>
      <RedLabel x={80} y={181}>그룹 채팅 자동 생성</RedLabel>
    </ScreenFrame>
  );
}

function ChatInviteIllust() {
  return (
    <ScreenFrame>
      <RoughRect x={380} y={55} w={265} h={365} fill="#1a1a1e" stroke="#444" sw={1.5} />
      <RoughRect x={380} y={55} w={265} h={35} fill="#222228" stroke="#444" sw={1} />
      <SketchText x={400} y={78} size={11} fill="#ccc">그룹채팅</SketchText>
      {/* Menu button */}
      <RoughRect x={610} y={60} w={25} h={24} fill="#2a2a2e" stroke="#555" sw={1} />
      <SketchText x={616} y={77} size={11}>👥</SketchText>
      {/* Dropdown menu */}
      <RoughRect x={500} y={90} w={140} h={70} fill="#2a2a2e" stroke="#555" sw={1.5} />
      <SketchText x={520} y={113} size={10} fill="#7c7cff">👤+ 초대하기</SketchText>
      <RoughLine x1={510} y1={122} x2={630} y2={122} stroke="#333" sw={0.5} />
      <SketchText x={520} y={142} size={10}>✏️ 방 이름 변경</SketchText>
      {/* Highlight invite */}
      <RoughRect x={495} y={98} w={150} h={28} fill="none" stroke="#ef4444" sw={2.5} />
      <RoughArrow x1={490} y1={112} x2={350} y2={112} />
      <RedLabel x={100} y={105}>참여자 메뉴에서</RedLabel>
      <RedLabel x={100} y={123}>초대하기 클릭</RedLabel>
    </ScreenFrame>
  );
}

function ChatKickIllust() {
  return (
    <ScreenFrame>
      <RoughRect x={380} y={55} w={265} h={365} fill="#1a1a1e" stroke="#444" sw={1.5} />
      <RoughRect x={380} y={55} w={265} h={35} fill="#222228" stroke="#444" sw={1} />
      <SketchText x={400} y={78} size={11} fill="#ccc">그룹채팅</SketchText>
      {/* Participant list */}
      <RoughRect x={480} y={95} w={160} h={130} fill="#2a2a2e" stroke="#555" sw={1.5} />
      <SketchText x={495} y={115} size={9} fill="#888">참여자</SketchText>
      <SketchText x={495} y={135} size={10}>나 (관리자)</SketchText>
      <SketchText x={495} y={158} size={10}>사용자A</SketchText>
      <RoughRect x={600} y={148} w={30} h={20} fill="#ef444420" stroke="#ef4444" sw={1} />
      <SketchText x={608} y={162} size={8} fill="#ef4444">🚫</SketchText>
      <SketchText x={495} y={181} size={10}>사용자B</SketchText>
      <RoughRect x={600} y={171} w={30} h={20} fill="#ef444420" stroke="#ef4444" sw={1} />
      <SketchText x={608} y={185} size={8} fill="#ef4444">🚫</SketchText>
      {/* Highlight */}
      <RoughCircle cx={615} cy={158} r={18} />
      <RoughArrow x1={475} y1={158} x2={350} y2={158} />
      <RedLabel x={100} y={150}>관리자 전용:</RedLabel>
      <RedLabel x={100} y={168}>강퇴 버튼으로 사용자 제거</RedLabel>
    </ScreenFrame>
  );
}

function ChatPinIllust() {
  return (
    <ScreenFrame>
      {/* Pinned panel on right */}
      <RoughRect x={420} y={50} w={235} h={380} fill="#1a1a1e" stroke="#444" sw={1.5} />
      <RoughRect x={420} y={50} w={235} h={35} fill="#222228" stroke="#444" sw={1} />
      <SketchText x={440} y={73} size={11} fill="#ccc">💬 채팅</SketchText>
      {/* Pin button */}
      <RoughRect x={615} y={55} w={30} h={24} fill="#7c7cff20" stroke="#7c7cff" sw={1.5} />
      <SketchText x={623} y={72} size={10} fill="#7c7cff">📌</SketchText>
      <RoughCircle cx={630} cy={67} r={18} />
      {/* Main content area shrunk */}
      <RoughRect x={10} y={50} w={405} h={380} fill="#1a1a1e" stroke="#333" sw={1} />
      <SketchText x={160} y={240} size={11} fill="#666">메인 콘텐츠</SketchText>
      <SketchText x={150} y={260} size={9} fill="#555">(너비가 자동 조정됨)</SketchText>
      {/* Arrow showing resize */}
      <RoughArrow x1={420} y1={240} x2={380} y2={240} stroke="#7c7cff" />
      <RedLabel x={100} y={340}>📌 고정 버튼으로 화면 오른쪽에 채팅 패널 부착</RedLabel>
    </ScreenFrame>
  );
}

function ChatDeleteIllust() {
  return (
    <ScreenFrame>
      <RoughRect x={380} y={55} w={265} h={365} fill="#1a1a1e" stroke="#444" sw={1.5} />
      <RoughRect x={380} y={55} w={265} h={35} fill="#222228" stroke="#444" sw={1} />
      <SketchText x={400} y={78} size={11} fill="#ccc">채팅방</SketchText>
      {/* Messages */}
      <RoughRect x={395} y={110} w={160} h={35} fill="#2a2a2e" stroke="#444" sw={1} />
      <SketchText x={405} y={125} size={8} fill="#888">사용자A</SketchText>
      <SketchText x={405} y={138} size={9}>안녕하세요!</SketchText>
      {/* My message with delete */}
      <RoughRect x={475} y={160} w={160} h={35} fill="#7c7cff20" stroke="#7c7cff" sw={1} />
      <SketchText x={485} y={175} size={8} fill="#7c7cff">나</SketchText>
      <SketchText x={485} y={188} size={9}>반갑습니다~</SketchText>
      <RoughRect x={610} y={163} w={25} h={18} fill="#ef444420" stroke="#ef4444" sw={1} />
      <SketchText x={616} y={176} size={8} fill="#ef4444">🗑</SketchText>
      <RoughCircle cx={622} cy={172} r={15} />
      {/* Arrow */}
      <RoughArrow x1={375} y1={172} x2={280} y2={172} />
      <RedLabel x={80} y={165}>자신의 메시지 삭제 가능</RedLabel>
      <RedLabel x={80} y={183}>관리자는 타인 메시지도 삭제</RedLabel>
    </ScreenFrame>
  );
}

function ChatUnreadIllust() {
  return (
    <ScreenFrame>
      <RoughRect x={380} y={55} w={265} h={365} fill="#1a1a1e" stroke="#444" sw={1.5} />
      <RoughRect x={380} y={55} w={265} h={35} fill="#222228" stroke="#444" sw={1} />
      <SketchText x={400} y={78} size={11} fill="#ccc">💬 채팅</SketchText>
      {/* Room with unread badge */}
      <RoughRect x={385} y={100} w={255} h={45} fill="#2a2a2e" stroke="#444" sw={1} />
      <SketchText x={400} y={120} size={10}>사용자A</SketchText>
      <SketchText x={400} y={136} size={8} fill="#888">새 메시지가 도착했습니다</SketchText>
      <RoughCircle cx={620} cy={118} r={12} stroke="none" fill="#ef4444" />
      <SketchText x={620} y={123} size={9} fill="#fff" anchor="middle">3</SketchText>
      {/* Room without badge */}
      <RoughRect x={385} y={145} w={255} h={45} fill="#222" stroke="#444" sw={1} />
      <SketchText x={400} y={165} size={10}>그룹채팅</SketchText>
      <SketchText x={400} y={181} size={8} fill="#888">확인 완료</SketchText>
      <RoughRect x={385} y={190} w={255} h={45} fill="#2a2a2e" stroke="#444" sw={1} />
      <SketchText x={400} y={210} size={10}>사용자C</SketchText>
      <RoughCircle cx={620} cy={208} r={12} stroke="none" fill="#ef4444" />
      <SketchText x={620} y={213} size={9} fill="#fff" anchor="middle">1</SketchText>
      {/* Highlight badge */}
      <RoughCircle cx={620} cy={118} r={20} stroke="#ef4444" sw={2.5} fill="none" />
      <RoughArrow x1={375} y1={118} x2={280} y2={118} />
      <RedLabel x={80} y={110}>빨간 배지 = 읽지 않은 메시지</RedLabel>
      <RedLabel x={80} y={128}>채팅방 입장 시 자동 읽음 처리</RedLabel>
    </ScreenFrame>
  );
}

function ChatResizeIllust() {
  return (
    <ScreenFrame>
      {/* Chat panel with resize handles */}
      <RoughRect x={350} y={80} w={290} h={330} fill="#1a1a1e" stroke="#444" sw={1.5} />
      <RoughRect x={350} y={80} w={290} h={35} fill="#222228" stroke="#444" sw={1} />
      <SketchText x={370} y={103} size={11} fill="#ccc">💬 채팅</SketchText>
      {/* Resize handle indicators */}
      <RoughRect x={346} y={200} w={8} h={40} fill="#7c7cff40" stroke="#7c7cff" sw={1} />
      <RoughRect x={430} y={76} w={40} h={8} fill="#7c7cff40" stroke="#7c7cff" sw={1} />
      <RoughRect x={346} y={76} w={8} h={8} fill="#7c7cff40" stroke="#7c7cff" sw={1} />
      {/* Resize arrows */}
      <RoughArrow x1={346} y1={220} x2={300} y2={220} stroke="#7c7cff" sw={1.5} />
      <RoughArrow x1={450} y1={76} x2={450} y2={55} stroke="#7c7cff" sw={1.5} />
      {/* Labels */}
      <RedLabel x={80} y={215}>가장자리 드래그로 크기 조절</RedLabel>
      <RedLabel x={80} y={233}>변경된 크기는 자동 저장</RedLabel>
    </ScreenFrame>
  );
}

/* ─── Admin illustrations ─── */
function AdminStatsOverviewIllust() {
  return (
    <ScreenFrame>
      <SketchText x={25} y={70} size={12} fill="#ccc">📊 관리자 통계</SketchText>
      {/* Stat cards */}
      <RoughRect x={20} y={85} w={145} h={70} fill="#222228" stroke="#444" sw={1.5} />
      <SketchText x={35} y={108} size={9} fill="#888">총 회원</SketchText>
      <SketchText x={35} y={132} size={18} fill="#fff">156</SketchText>
      <SketchText x={100} y={132} size={9} fill="#22c55e">+5</SketchText>
      <RoughRect x={175} y={85} w={145} h={70} fill="#222228" stroke="#444" sw={1.5} />
      <SketchText x={190} y={108} size={9} fill="#888">오늘 로그인</SketchText>
      <SketchText x={190} y={132} size={18} fill="#fff">42</SketchText>
      <RoughRect x={330} y={85} w={145} h={70} fill="#222228" stroke="#444" sw={1.5} />
      <SketchText x={345} y={108} size={9} fill="#888">총 주문</SketchText>
      <SketchText x={345} y={132} size={18} fill="#fff">1,230</SketchText>
      <RoughRect x={485} y={85} w={150} h={70} fill="#222228" stroke="#444" sw={1.5} />
      <SketchText x={500} y={108} size={9} fill="#888">총 메시지</SketchText>
      <SketchText x={500} y={132} size={18} fill="#fff">892</SketchText>
      {/* Highlight */}
      <RoughRect x={15} y={80} w={625} h={80} fill="none" stroke="#ef4444" sw={2.5} />
      <RedLabel x={200} y={190}>핵심 지표를 한눈에 확인 (전일 대비 변화 포함)</RedLabel>
    </ScreenFrame>
  );
}

function AdminStatsChartIllust() {
  return (
    <ScreenFrame>
      <SketchText x={25} y={70} size={12} fill="#ccc">일별 추이</SketchText>
      <RoughRect x={20} y={80} w={620} h={240} fill="#1e1e22" stroke="#444" sw={1} />
      {/* Bar chart */}
      <RoughRect x={60} y={220} w={30} h={80} fill="#7c7cff40" stroke="#7c7cff" sw={1} />
      <RoughRect x={110} y={190} w={30} h={110} fill="#7c7cff40" stroke="#7c7cff" sw={1} />
      <RoughRect x={160} y={160} w={30} h={140} fill="#7c7cff40" stroke="#7c7cff" sw={1} />
      <RoughRect x={210} y={200} w={30} h={100} fill="#7c7cff40" stroke="#7c7cff" sw={1} />
      <RoughRect x={260} y={175} w={30} h={125} fill="#7c7cff40" stroke="#7c7cff" sw={1} />
      <RoughRect x={310} y={150} w={30} h={150} fill="#7c7cff40" stroke="#7c7cff" sw={1} />
      <RoughRect x={360} y={170} w={30} h={130} fill="#7c7cff40" stroke="#7c7cff" sw={1} />
      <RoughRect x={410} y={130} w={30} h={170} fill="#22c55e40" stroke="#22c55e" sw={1.5} />
      <SketchText x={415} y={125} size={8} fill="#22c55e">오늘</SketchText>
      {/* Line overlay */}
      <path d="M75,215 L125,185 L175,155 L225,195 L275,170 L325,145 L375,165 L425,125" fill="none" stroke="#ef444480" strokeWidth={1.5} strokeDasharray="4,3" />
      {/* Highlight */}
      <RedLabel x={460} y={180}>일별 추이 차트로</RedLabel>
      <RedLabel x={460} y={198}>서비스 성장 모니터링</RedLabel>
    </ScreenFrame>
  );
}

function AdminStatsPeriodIllust() {
  return (
    <ScreenFrame>
      <SketchText x={25} y={70} size={12} fill="#ccc">📊 통계 기간 설정</SketchText>
      {/* Period filter buttons */}
      <RoughRect x={20} y={85} w={55} h={24} fill="#2a2a2e" stroke="#555" sw={1} />
      <RoughRect x={80} y={85} w={55} h={24} fill="#2a2a2e" stroke="#555" sw={1} />
      <RoughRect x={140} y={85} w={55} h={24} fill="#3b3bff20" stroke="#7c7cff" sw={2} />
      <RoughRect x={200} y={85} w={55} h={24} fill="#2a2a2e" stroke="#555" sw={1} />
      <SketchText x={32} y={101} size={9}>7일</SketchText>
      <SketchText x={92} y={101} size={9}>14일</SketchText>
      <SketchText x={150} y={101} size={9} fill="#7c7cff">30일</SketchText>
      <SketchText x={212} y={101} size={9}>90일</SketchText>
      {/* Chart preview */}
      <RoughRect x={20} y={120} w={620} h={180} fill="#1e1e22" stroke="#444" sw={1} />
      <path d="M40,260 L120,230 L200,240 L280,200 L360,210 L440,170 L520,180 L600,140" fill="none" stroke="#7c7cff" strokeWidth={2} strokeLinecap="round" />
      {/* Highlight */}
      <RoughRect x={135} y={80} w={65} h={34} fill="none" stroke="#ef4444" sw={2.5} />
      <RoughArrow x1={260} y1={97} x2={330} y2={97} />
      <RedLabel x={340} y={92}>기간 선택 → 모든 지표 업데이트</RedLabel>
    </ScreenFrame>
  );
}

function AdminStatsServiceIllust() {
  return (
    <ScreenFrame>
      <SketchText x={25} y={70} size={12} fill="#ccc">📊 서비스별 통계</SketchText>
      {/* Service tabs */}
      <RoughRect x={20} y={85} w={70} h={24} fill="#3b3bff20" stroke="#7c7cff" sw={1.5} />
      <RoughRect x={95} y={85} w={55} h={24} fill="#2a2a2e" stroke="#555" sw={1} />
      <RoughRect x={155} y={85} w={55} h={24} fill="#2a2a2e" stroke="#555" sw={1} />
      <RoughRect x={215} y={85} w={55} h={24} fill="#2a2a2e" stroke="#555" sw={1} />
      <SketchText x={35} y={101} size={9} fill="#7c7cff">회원</SketchText>
      <SketchText x={108} y={101} size={9}>거래</SketchText>
      <SketchText x={168} y={101} size={9}>주문</SketchText>
      <SketchText x={228} y={101} size={9}>채팅</SketchText>
      {/* Stats content */}
      <RoughRect x={20} y={120} w={200} h={80} fill="#222228" stroke="#444" sw={1.5} />
      <SketchText x={35} y={145} size={9} fill="#888">신규 가입</SketchText>
      <SketchText x={35} y={168} size={16} fill="#fff">12</SketchText>
      <SketchText x={80} y={168} size={9} fill="#22c55e">+3</SketchText>
      <RoughRect x={230} y={120} w={200} h={80} fill="#222228" stroke="#444" sw={1.5} />
      <SketchText x={245} y={145} size={9} fill="#888">승인 대기</SketchText>
      <SketchText x={245} y={168} size={16} fill="#f59e0b">5</SketchText>
      <RoughRect x={440} y={120} w={200} h={80} fill="#222228" stroke="#444" sw={1.5} />
      <SketchText x={455} y={145} size={9} fill="#888">활성 회원</SketchText>
      <SketchText x={455} y={168} size={16} fill="#fff">142</SketchText>
      {/* Highlight tabs */}
      <RoughRect x={15} y={80} w={260} h={34} fill="none" stroke="#ef4444" sw={2.5} />
      <RedLabel x={300} y={97}>탭으로 서비스별 통계 전환</RedLabel>
    </ScreenFrame>
  );
}

function AdminUsersSearchIllust() {
  return (
    <ScreenFrame>
      <SketchText x={25} y={70} size={12} fill="#ccc">회원관리</SketchText>
      <RoughRect x={20} y={85} w={350} h={32} fill="#1e1e22" stroke="#555" sw={1} />
      <SketchText x={35} y={106} size={11} fill="#666">🔍 이름, 이메일, 아이디 검색</SketchText>
      {/* Results */}
      <RoughRect x={20} y={130} w={620} h={28} fill="#2a2a2e" stroke="#444" sw={1} />
      <SketchText x={30} y={149} size={9} fill="#888">이름</SketchText>
      <SketchText x={130} y={149} size={9} fill="#888">아이디</SketchText>
      <SketchText x={250} y={149} size={9} fill="#888">이메일</SketchText>
      <SketchText x={420} y={149} size={9} fill="#888">상태</SketchText>
      <RoughRect x={20} y={158} w={620} h={28} fill="#222" stroke="#444" sw={1} />
      <SketchText x={30} y={177} size={10}>사용자A</SketchText>
      <SketchText x={130} y={177} size={10}>userA</SketchText>
      <SketchText x={250} y={177} size={10}>userA@test.com</SketchText>
      <RoughRect x={20} y={186} w={620} h={28} fill="#1e1e22" stroke="#444" sw={1} />
      {/* Highlight search */}
      <RoughCircle cx={195} cy={101} r={45} />
      <RoughArrow x1={375} y1={101} x2={420} y2={101} />
      <RedLabel x={430} y={96}>검색 입력 → 실시간 필터링</RedLabel>
    </ScreenFrame>
  );
}

function AdminUsersApproveIllust() {
  return (
    <ScreenFrame>
      <SketchText x={25} y={70} size={12} fill="#ccc">회원관리</SketchText>
      <RoughRect x={20} y={85} w={620} h={30} fill="#222" stroke="#444" sw={1} />
      <SketchText x={30} y={105} size={10}>사용자12</SketchText>
      <SketchText x={150} y={105} size={10}>user12@test.com</SketchText>
      <RoughRect x={340} y={90} w={55} h={20} fill="#f59e0b30" stroke="#f59e0b" sw={1} />
      <SketchText x={350} y={105} size={9} fill="#f59e0b">대기</SketchText>
      <RoughRect x={480} y={90} w={60} h={20} fill="#22c55e30" stroke="#22c55e" sw={1.5} />
      <RoughRect x={550} y={90} w={60} h={20} fill="#ef444430" stroke="#ef4444" sw={1.5} />
      <SketchText x={493} y={105} size={9} fill="#22c55e">승인</SketchText>
      <SketchText x={563} y={105} size={9} fill="#ef4444">반려</SketchText>
      {/* Highlight */}
      <RoughRect x={475} y={85} w={140} h={30} fill="none" stroke="#ef4444" sw={2.5} />
      <RoughArrow x1={545} y1={120} x2={545} y2={160} />
      <RedLabel x={400} y={175}>승인/반려 버튼으로 가입 처리</RedLabel>
    </ScreenFrame>
  );
}

function AdminUsersDetailIllust() {
  return (
    <ScreenFrame>
      <SketchText x={25} y={70} size={12} fill="#ccc">회원 상세</SketchText>
      <RoughRect x={20} y={85} w={400} h={260} fill="#222228" stroke="#444" sw={1.5} />
      <SketchText x={35} y={112} size={10} fill="#888">이름</SketchText>
      <SketchText x={150} y={112} size={10} fill="#fff">사용자A</SketchText>
      <RoughLine x1={35} y1={120} x2={400} y2={120} stroke="#333" sw={0.5} />
      <SketchText x={35} y={142} size={10} fill="#888">아이디</SketchText>
      <SketchText x={150} y={142} size={10} fill="#fff">userA</SketchText>
      <RoughLine x1={35} y1={150} x2={400} y2={150} stroke="#333" sw={0.5} />
      <SketchText x={35} y={172} size={10} fill="#888">이메일</SketchText>
      <SketchText x={150} y={172} size={10} fill="#fff">userA@test.com</SketchText>
      <RoughLine x1={35} y1={180} x2={400} y2={180} stroke="#333" sw={0.5} />
      <SketchText x={35} y={202} size={10} fill="#888">상태</SketchText>
      <SketchText x={150} y={202} size={10} fill="#22c55e">승인됨</SketchText>
      <RoughLine x1={35} y1={210} x2={400} y2={210} stroke="#333" sw={0.5} />
      <SketchText x={35} y={232} size={10} fill="#888">역할</SketchText>
      <SketchText x={150} y={232} size={10} fill="#fff">USER</SketchText>
      <RoughLine x1={35} y1={240} x2={400} y2={240} stroke="#333" sw={0.5} />
      <SketchText x={35} y={262} size={10} fill="#888">가입일</SketchText>
      <SketchText x={150} y={262} size={10} fill="#fff">2026-02-01</SketchText>
      <SketchText x={35} y={288} size={10} fill="#888">최근 로그인</SketchText>
      <SketchText x={150} y={288} size={10} fill="#fff">2026-02-25</SketchText>
      {/* Highlight */}
      <RoughRect x={15} y={80} w={410} h={270} fill="none" stroke="#ef4444" sw={2.5} />
      <RedLabel x={450} y={200}>회원의 전체 정보 확인 및 관리</RedLabel>
    </ScreenFrame>
  );
}

function AdminUsersRoleIllust() {
  return (
    <ScreenFrame>
      <SketchText x={25} y={70} size={12} fill="#ccc">역할 변경</SketchText>
      <RoughRect x={20} y={85} w={400} h={150} fill="#222228" stroke="#444" sw={1.5} />
      <SketchText x={35} y={112} size={10} fill="#888">사용자: 사용자A</SketchText>
      <SketchText x={35} y={142} size={10} fill="#888">현재 역할</SketchText>
      <RoughRect x={140} y={128} w={70} h={24} fill="#2a2a2e" stroke="#555" sw={1} />
      <SketchText x={155} y={145} size={10}>USER</SketchText>
      <SketchText x={35} y={180} size={10} fill="#888">변경할 역할</SketchText>
      <RoughRect x={140} y={166} w={70} h={24} fill="#7c7cff20" stroke="#7c7cff" sw={1.5} />
      <SketchText x={155} y={183} size={10} fill="#7c7cff">ADMIN</SketchText>
      <RoughRect x={230} y={166} w={80} h={24} fill="#22c55e30" stroke="#22c55e" sw={1.5} />
      <SketchText x={245} y={183} size={10} fill="#22c55e">변경</SketchText>
      {/* Highlight */}
      <RoughCircle cx={175} cy={178} r={25} />
      <RoughArrow x1={205} y1={178} x2={430} y2={178} />
      <RedLabel x={440} y={170}>역할 변경 → ADMIN은</RedLabel>
      <RedLabel x={440} y={188}>통계/회원관리 접근 가능</RedLabel>
    </ScreenFrame>
  );
}

function AdminUsersStatusFilterIllust() {
  return (
    <ScreenFrame>
      <SketchText x={25} y={70} size={12} fill="#ccc">회원관리 - 상태 필터</SketchText>
      {/* Filter buttons */}
      <RoughRect x={20} y={85} w={55} h={22} fill="#3b3bff20" stroke="#7c7cff" sw={1.5} />
      <RoughRect x={80} y={85} w={55} h={22} fill="#2a2a2e" stroke="#555" sw={1} />
      <RoughRect x={140} y={85} w={55} h={22} fill="#2a2a2e" stroke="#555" sw={1} />
      <RoughRect x={200} y={85} w={55} h={22} fill="#2a2a2e" stroke="#555" sw={1} />
      <SketchText x={32} y={100} size={9} fill="#7c7cff">전체</SketchText>
      <SketchText x={90} y={100} size={9}>승인</SketchText>
      <SketchText x={150} y={100} size={9}>대기</SketchText>
      <SketchText x={210} y={100} size={9}>반려</SketchText>
      {/* Table */}
      <RoughRect x={20} y={120} w={620} h={28} fill="#2a2a2e" stroke="#444" sw={1} />
      <RoughRect x={20} y={148} w={620} h={28} fill="#222" stroke="#444" sw={1} />
      <RoughRect x={20} y={176} w={620} h={28} fill="#1e1e22" stroke="#444" sw={1} />
      {/* Highlight */}
      <RoughRect x={15} y={80} w={245} h={32} fill="none" stroke="#ef4444" sw={2.5} />
      <RoughArrow x1={265} y1={96} x2={320} y2={96} />
      <RedLabel x={330} y={91}>상태별 필터로 원하는 회원만 표시</RedLabel>
    </ScreenFrame>
  );
}

/* ─── Illustration mapping ─── */
const illustrationMap: Record<string, Record<number, () => React.ReactNode>> = {
  dashboard: {
    0: () => <DashboardChartIllust />,
    1: () => <DashboardFilterIllust />,
    2: () => <DashboardSortIllust />,
    3: () => <DashboardPeriodIllust />,
    4: () => <DashboardWatchlistIllust />,
    5: () => <DashboardSearchIllust />,
    6: () => <DashboardDetailIllust />,
    7: () => <DashboardMarketInfoIllust />,
  },
  portfolio: {
    0: () => <PortfolioBalanceIllust />,
    1: () => <PortfolioDepositIllust />,
    2: () => <PortfolioHoldingsIllust />,
    3: () => <PortfolioPnlIllust />,
    4: () => <PortfolioRatioIllust />,
    5: () => <PortfolioHistoryIllust />,
  },
  orders: {
    0: () => <OrdersStepIllust step={1} />,
    1: () => <OrdersStepIllust step={2} />,
    2: () => <OrdersStepIllust step={3} />,
    3: () => <OrdersStepIllust step={4} />,
    4: () => <OrdersCancelIllust />,
    5: () => <OrdersFilterIllust />,
    6: () => <OrdersMarketVsLimitIllust />,
    7: () => <OrdersCalcIllust />,
  },
  leaderboard: {
    0: () => <LeaderboardRankIllust />,
    1: () => <LeaderboardRefreshIllust />,
    2: () => <LeaderboardMyRankIllust />,
    3: () => <LeaderboardScoringIllust />,
  },
  announcements: {
    0: () => <AnnouncementsViewIllust />,
    1: () => <AnnouncementsCommentIllust />,
    2: () => <AnnouncementsLikeIllust />,
    3: () => <AnnouncementsAttachIllust />,
    4: () => <AnnouncementsWriteIllust />,
  },
  news: {
    0: () => <NewsCategoryIllust />,
    1: () => <NewsLinkIllust />,
    2: () => <NewsRefreshIllust />,
  },
  chat: {
    0: () => <ChatDmIllust />,
    1: () => <ChatGroupIllust />,
    2: () => <ChatInviteIllust />,
    3: () => <ChatKickIllust />,
    4: () => <ChatPinIllust />,
    5: () => <ChatDeleteIllust />,
    6: () => <ChatUnreadIllust />,
    7: () => <ChatResizeIllust />,
  },
  adminStats: {
    0: () => <AdminStatsOverviewIllust />,
    1: () => <AdminStatsChartIllust />,
    2: () => <AdminStatsPeriodIllust />,
    3: () => <AdminStatsServiceIllust />,
  },
  adminUsers: {
    0: () => <AdminUsersSearchIllust />,
    1: () => <AdminUsersApproveIllust />,
    2: () => <AdminUsersDetailIllust />,
    3: () => <AdminUsersRoleIllust />,
    4: () => <AdminUsersStatusFilterIllust />,
  },
};

/* ─── Tip descriptions per illustration ─── */
const tipMap: Record<string, Record<number, TranslationKey[]>> = {
  dashboard: {
    0: ['help.dashboard.chart.tip1', 'help.dashboard.chart.tip2', 'help.dashboard.chart.tip3'],
    1: ['help.dashboard.filter.tip1', 'help.dashboard.filter.tip2'],
    2: ['help.dashboard.sort.tip1', 'help.dashboard.sort.tip2'],
    3: ['help.dashboard.period.tip1', 'help.dashboard.period.tip2'],
    4: ['help.dashboard.watchlist.tip1', 'help.dashboard.watchlist.tip2'],
    5: ['help.dashboard.search.tip1', 'help.dashboard.search.tip2'],
    6: ['help.dashboard.detail.tip1', 'help.dashboard.detail.tip2'],
    7: ['help.dashboard.marketInfo.tip1', 'help.dashboard.marketInfo.tip2'],
  },
  portfolio: {
    0: ['help.portfolio.balance.tip1', 'help.portfolio.balance.tip2'],
    1: ['help.portfolio.deposit.tip1', 'help.portfolio.deposit.tip2'],
    2: ['help.portfolio.holdings.tip1', 'help.portfolio.holdings.tip2'],
    3: ['help.portfolio.pnl.tip1', 'help.portfolio.pnl.tip2'],
    4: ['help.portfolio.ratio.tip1', 'help.portfolio.ratio.tip2'],
    5: ['help.portfolio.history.tip1', 'help.portfolio.history.tip2'],
  },
  orders: {
    0: ['help.orders.step1.tip1', 'help.orders.step1.tip2'],
    1: ['help.orders.step2.tip1', 'help.orders.step2.tip2'],
    2: ['help.orders.step3.tip1', 'help.orders.step3.tip2'],
    3: ['help.orders.step4.tip1', 'help.orders.step4.tip2'],
    4: ['help.orders.cancel.tip1', 'help.orders.cancel.tip2'],
    5: ['help.orders.filter.tip1', 'help.orders.filter.tip2'],
    6: ['help.orders.marketVsLimit.tip1', 'help.orders.marketVsLimit.tip2'],
    7: ['help.orders.orderCalc.tip1', 'help.orders.orderCalc.tip2'],
  },
  leaderboard: {
    0: ['help.leaderboard.ranking.tip1', 'help.leaderboard.ranking.tip2'],
    1: ['help.leaderboard.refresh.tip1', 'help.leaderboard.refresh.tip2'],
    2: ['help.leaderboard.myRank.tip1', 'help.leaderboard.myRank.tip2'],
    3: ['help.leaderboard.scoring.tip1', 'help.leaderboard.scoring.tip2'],
  },
  announcements: {
    0: ['help.announcements.view.tip1', 'help.announcements.view.tip2'],
    1: ['help.announcements.comment.tip1', 'help.announcements.comment.tip2'],
    2: ['help.announcements.like.tip1', 'help.announcements.like.tip2'],
    3: ['help.announcements.attachment.tip1', 'help.announcements.attachment.tip2'],
    4: ['help.announcements.write.tip1', 'help.announcements.write.tip2'],
  },
  news: {
    0: ['help.news.category.tip1', 'help.news.category.tip2'],
    1: ['help.news.link.tip1', 'help.news.link.tip2'],
    2: ['help.news.refresh.tip1', 'help.news.refresh.tip2'],
  },
  chat: {
    0: ['help.chat.dm.tip1', 'help.chat.dm.tip2'],
    1: ['help.chat.group.tip1', 'help.chat.group.tip2'],
    2: ['help.chat.invite.tip1', 'help.chat.invite.tip2'],
    3: ['help.chat.kick.tip1', 'help.chat.kick.tip2'],
    4: ['help.chat.pin.tip1', 'help.chat.pin.tip2'],
    5: ['help.chat.delete.tip1', 'help.chat.delete.tip2'],
    6: ['help.chat.unread.tip1', 'help.chat.unread.tip2'],
    7: ['help.chat.resize.tip1', 'help.chat.resize.tip2'],
  },
  adminStats: {
    0: ['help.adminStats.overview.tip1', 'help.adminStats.overview.tip2'],
    1: ['help.adminStats.chart.tip1', 'help.adminStats.chart.tip2'],
    2: ['help.adminStats.period.tip1', 'help.adminStats.period.tip2'],
    3: ['help.adminStats.service.tip1', 'help.adminStats.service.tip2'],
  },
  adminUsers: {
    0: ['help.adminUsers.search.tip1', 'help.adminUsers.search.tip2'],
    1: ['help.adminUsers.approve.tip1', 'help.adminUsers.approve.tip2'],
    2: ['help.adminUsers.detail.tip1', 'help.adminUsers.detail.tip2'],
    3: ['help.adminUsers.role.tip1', 'help.adminUsers.role.tip2'],
    4: ['help.adminUsers.statusFilter.tip1', 'help.adminUsers.statusFilter.tip2'],
  },
};

/* ─── Feature item with expand/collapse ─── */
interface FeatureItemData {
  icon: React.ReactNode;
  text: TranslationKey;
}

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
  const [zoomOpen, setZoomOpen] = useState(false);

  useEffect(() => {
    if (expanded && contentRef.current) {
      setHeight(contentRef.current.scrollHeight);
    } else {
      setHeight(0);
    }
  }, [expanded]);

  useEffect(() => {
    if (!zoomOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setZoomOpen(false); };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', handler); document.body.style.overflow = ''; };
  }, [zoomOpen]);

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
              <div
                className="bg-bg-secondary/30 border border-border/30 rounded-xl p-3 sm:p-4 cursor-zoom-in hover:border-accent/30 transition-colors"
                onClick={() => setZoomOpen(true)}
              >
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

      {/* Zoom Modal */}
      {zoomOpen && hasIllust && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4"
          onClick={() => setZoomOpen(false)}
        >
          <div
            className="relative bg-bg-primary border border-border rounded-2xl p-6 sm:p-8 max-w-[90vw] max-h-[90vh] overflow-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setZoomOpen(false)}
              className="absolute top-3 right-3 p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-secondary transition-colors"
            >
              <span className="text-[18px]">&times;</span>
            </button>
            <div className="transform scale-125 sm:scale-150 origin-top-left w-[calc(100%/1.25)] sm:w-[calc(100%/1.5)]">
              {illustrationMap[tabKey]?.[index]?.()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Section data ─── */
interface HelpSection {
  icon: React.ReactNode;
  title: TranslationKey;
  description: TranslationKey;
  items: FeatureItemData[];
}

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
          <div>
            <h2 className="text-[16px] font-bold text-text-primary">{t(section.title)}</h2>
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

/* ─── FAQ Item ─── */
function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border/60 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full px-4 py-3.5 text-left hover:bg-bg-secondary/50 transition-colors"
      >
        <span className="text-[14px] font-semibold text-text-primary">{question}</span>
        <ChevronDown className={cn('w-4 h-4 text-text-quaternary transition-transform shrink-0 ml-2', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="px-4 pb-4 text-[13px] text-text-secondary leading-relaxed">
          {answer}
        </div>
      )}
    </div>
  );
}

/* ─── Main page ─── */
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

  const normalTabs = tabs.filter((tab) => !tab.adminOnly);
  const adminTabs = tabs.filter((tab) => tab.adminOnly && isAdmin);
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
        { icon: <MousePointerClick className="w-4 h-4" />, text: 'help.dashboard.detail' },
        { icon: <BarChart className="w-4 h-4" />, text: 'help.dashboard.marketInfo' },
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
        { icon: <PieChart className="w-4 h-4" />, text: 'help.portfolio.ratio' },
        { icon: <History className="w-4 h-4" />, text: 'help.portfolio.history' },
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
        { icon: <Scale className="w-4 h-4" />, text: 'help.orders.marketVsLimit' },
        { icon: <Calculator className="w-4 h-4" />, text: 'help.orders.orderCalc' },
      ],
    },
    leaderboard: {
      icon: <Trophy className="w-5 h-5" />,
      title: 'help.leaderboard.title',
      description: 'help.leaderboard.desc',
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
    adminStats: {
      icon: <BarChart3 className="w-5 h-5" />,
      title: 'help.adminStats.title',
      description: 'help.adminStats.desc',
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
      items: [
        { icon: <Search className="w-4 h-4" />, text: 'help.adminUsers.search' },
        { icon: <CheckCircle className="w-4 h-4" />, text: 'help.adminUsers.approve' },
        { icon: <Eye className="w-4 h-4" />, text: 'help.adminUsers.detail' },
        { icon: <Shield className="w-4 h-4" />, text: 'help.adminUsers.role' },
        { icon: <ListFilter className="w-4 h-4" />, text: 'help.adminUsers.statusFilter' },
      ],
    },
  };

  return (
    <div>
      <div className="py-6 flex items-center gap-2.5">
        <HelpCircle className="w-5 h-5 text-accent" />
        <h1 className="text-[20px] font-extrabold text-text-primary">{t('help.title')}</h1>
      </div>

      <div className="flex flex-wrap items-center gap-1 pb-4">
        {normalTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[12px] sm:text-[13px] font-medium transition-colors',
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
                  'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[12px] sm:text-[13px] font-medium transition-colors border border-accent/20',
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

      {/* FAQ Section */}
      <div className="border-t border-border/60 pt-8 pb-10">
        <h2 className="text-[16px] font-bold text-text-primary mb-4 flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-accent" />
          {t('help.faq.title')}
        </h2>
        <div className="space-y-2">
          {(['q1', 'q2', 'q3'] as const).map((qKey) => (
            <FaqItem
              key={qKey}
              question={t(`help.faq.${qKey}` as TranslationKey)}
              answer={t(`help.faq.a${qKey.slice(1)}` as TranslationKey)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
