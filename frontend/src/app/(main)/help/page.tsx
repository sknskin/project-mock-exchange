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
    <svg viewBox="0 0 480 300" className="w-full max-w-[560px] mx-auto" style={{ filter: 'url(#sketch)' }}>
      <SketchFilter />
      {/* Browser chrome */}
      <RoughRect x={5} y={5} w={470} h={290} fill="#1a1a1e" stroke="#444" sw={2} />
      {/* Header bar */}
      <RoughRect x={5} y={5} w={470} h={32} fill="#111114" stroke="#444" />
      <SketchText x={18} y={26} size={13} fill="#7c7cff">VirtuEx</SketchText>
      {/* Nav items */}
      <SketchText x={85} y={25} size={8}>대시보드</SketchText>
      <SketchText x={130} y={25} size={8}>내 투자</SketchText>
      <SketchText x={170} y={25} size={8}>주문</SketchText>
      <SketchText x={200} y={25} size={8}>리더보드</SketchText>
      {/* User area */}
      <RoughCircle cx={440} cy={21} r={8} stroke="#555" sw={1} fill="#333" />
      <SketchText x={420} y={25} size={7} fill="#666">🔔</SketchText>
      {/* Chat button */}
      <RoughCircle cx={450} cy={275} r={14} stroke="#7c7cff" sw={1.5} fill="#2a2a3e" />
      <SketchText x={444} y={280} size={12}>💬</SketchText>
      {children}
    </svg>
  );
}

/* ─── Dashboard illustrations ─── */
function DashboardChartIllust() {
  return (
    <ScreenFrame>
      {/* Filter buttons */}
      <RoughRect x={15} y={45} w={40} h={14} fill="#2a2a2e" stroke="#555" sw={1} />
      <RoughRect x={60} y={45} w={50} h={14} fill="#2a2a2e" stroke="#555" sw={1} />
      <SketchText x={22} y={55} size={7}>전체</SketchText>
      <SketchText x={67} y={55} size={7}>암호화폐</SketchText>
      {/* Asset table */}
      <RoughRect x={15} y={68} w={260} h={18} fill="#222" stroke="#444" sw={1} />
      <SketchText x={20} y={80} size={7}>BTC/KRW</SketchText>
      <SketchText x={100} y={80} size={7}>55,230,000</SketchText>
      <SketchText x={170} y={80} size={7} fill="#22c55e">+2.3%</SketchText>
      <RoughRect x={15} y={86} w={260} h={18} fill="#1e1e22" stroke="#444" sw={1} />
      <RoughRect x={15} y={104} w={260} h={18} fill="#222" stroke="#444" sw={1} />
      {/* Chart area */}
      <RoughRect x={290} y={45} w={175} h={160} fill="#1a1a1e" stroke="#444" sw={1} />
      <path d="M300,170 L320,150 L340,160 L360,120 L380,130 L400,95 L420,100 L440,80 L455,90" fill="none" stroke="#22c55e" strokeWidth={2} strokeLinecap="round" />
      <SketchText x={350} y={60} size={8} fill="#888">차트</SketchText>
      {/* Highlight */}
      <RoughCircle cx={370} cy={125} r={55} />
      <RoughArrow x1={370} y1={185} x2={370} y2={195} />
      <RedLabel x={310} y={210}>실시간 차트 영역</RedLabel>
    </ScreenFrame>
  );
}

function DashboardFilterIllust() {
  return (
    <ScreenFrame>
      <RoughRect x={15} y={45} w={40} h={16} fill="#3b3bff20" stroke="#7c7cff" sw={2} />
      <RoughRect x={60} y={45} w={50} h={16} fill="#2a2a2e" stroke="#555" sw={1} />
      <RoughRect x={115} y={45} w={55} h={16} fill="#2a2a2e" stroke="#555" sw={1} />
      <RoughRect x={175} y={45} w={55} h={16} fill="#2a2a2e" stroke="#555" sw={1} />
      <SketchText x={22} y={57} size={7}>전체</SketchText>
      <SketchText x={67} y={57} size={7}>암호화폐</SketchText>
      <SketchText x={122} y={57} size={7}>국내주식</SketchText>
      <SketchText x={182} y={57} size={7}>해외주식</SketchText>
      <RoughRect x={15} y={70} w={300} h={120} fill="#1e1e22" stroke="#444" sw={1} />
      <SketchText x={30} y={90} size={8}>종목 목록 영역</SketchText>
      {/* Highlight */}
      <RoughCircle cx={120} cy={53} r={70} sw={2.5} />
      <RoughArrow x1={200} y1={53} x2={250} y2={53} />
      <RedLabel x={255} y={57}>카테고리 필터</RedLabel>
    </ScreenFrame>
  );
}

function DashboardSortIllust() {
  return (
    <ScreenFrame>
      <RoughRect x={15} y={45} w={100} h={16} fill="#2a2a2e" stroke="#555" sw={1} />
      {/* Sort buttons */}
      <RoughRect x={250} y={45} w={50} h={16} fill="#3b3bff20" stroke="#7c7cff" sw={2} />
      <RoughRect x={305} y={45} w={45} h={16} fill="#2a2a2e" stroke="#555" sw={1} />
      <RoughRect x={355} y={45} w={45} h={16} fill="#2a2a2e" stroke="#555" sw={1} />
      <SketchText x={257} y={57} size={7}>거래량</SketchText>
      <SketchText x={312} y={57} size={7}>급상승</SketchText>
      <SketchText x={362} y={57} size={7}>급하락</SketchText>
      <RoughRect x={15} y={70} w={440} h={120} fill="#1e1e22" stroke="#444" sw={1} />
      <RoughCircle cx={320} cy={53} r={60} />
      <RoughArrow x1={320} y1={75} x2={320} y2={100} />
      <RedLabel x={280} y={115}>정렬 옵션 선택</RedLabel>
    </ScreenFrame>
  );
}

function DashboardPeriodIllust() {
  return (
    <ScreenFrame>
      <RoughRect x={290} y={45} w={175} h={160} fill="#1a1a1e" stroke="#444" sw={1} />
      <path d="M300,170 L330,140 L360,155 L390,110 L420,120 L450,90" fill="none" stroke="#22c55e" strokeWidth={2} />
      {/* Period buttons */}
      <RoughRect x={300} y={210} w={30} h={14} fill="#3b3bff20" stroke="#7c7cff" sw={1.5} />
      <RoughRect x={335} y={210} w={30} h={14} fill="#2a2a2e" stroke="#555" sw={1} />
      <RoughRect x={370} y={210} w={30} h={14} fill="#2a2a2e" stroke="#555" sw={1} />
      <RoughRect x={405} y={210} w={30} h={14} fill="#2a2a2e" stroke="#555" sw={1} />
      <SketchText x={306} y={220} size={6}>실시간</SketchText>
      <SketchText x={343} y={220} size={6}>1일</SketchText>
      <SketchText x={378} y={220} size={6}>1주</SketchText>
      <SketchText x={412} y={220} size={6}>1개월</SketchText>
      <RoughCircle cx={370} cy={217} r={50} />
      <RedLabel x={300} y={250}>기간 필터로 차트 변경</RedLabel>
    </ScreenFrame>
  );
}

function DashboardWatchlistIllust() {
  return (
    <ScreenFrame>
      <RoughRect x={15} y={45} w={300} h={20} fill="#222" stroke="#444" sw={1} />
      <SketchText x={20} y={59} size={8}>BTC/KRW</SketchText>
      <SketchText x={100} y={59} size={8}>55,230,000</SketchText>
      {/* Star */}
      <SketchText x={270} y={60} size={14}>⭐</SketchText>
      <RoughRect x={15} y={65} w={300} h={20} fill="#1e1e22" stroke="#444" sw={1} />
      <SketchText x={20} y={79} size={8}>ETH/KRW</SketchText>
      <SketchText x={270} y={80} size={14}>☆</SketchText>
      <RoughCircle cx={278} cy={56} r={16} />
      <RoughArrow x1={298} y1={56} x2={330} y2={56} />
      <RedLabel x={335} y={60}>별표 클릭으로</RedLabel>
      <RedLabel x={335} y={74}>관심종목 등록</RedLabel>
    </ScreenFrame>
  );
}

function DashboardSearchIllust() {
  return (
    <ScreenFrame>
      {/* Search bar overlay */}
      <RoughRect x={80} y={80} w={320} h={36} fill="#222228" stroke="#7c7cff" sw={2} />
      <SketchText x={95} y={103} size={10} fill="#666">🔍 종목 검색...</SketchText>
      {/* Results */}
      <RoughRect x={80} y={116} w={320} h={24} fill="#2a2a2e" stroke="#444" sw={1} />
      <SketchText x={95} y={132} size={8}>BTC/KRW - 비트코인</SketchText>
      <RoughRect x={80} y={140} w={320} h={24} fill="#252528" stroke="#444" sw={1} />
      <SketchText x={95} y={156} size={8}>ETH/KRW - 이더리움</SketchText>
      <RoughCircle cx={240} cy={98} r={40} />
      <RedLabel x={170} y={195}>{'"/"키로 빠른 검색 열기'}</RedLabel>
    </ScreenFrame>
  );
}

/* ─── Portfolio illustrations ─── */
function PortfolioBalanceIllust() {
  return (
    <ScreenFrame>
      <SketchText x={20} y={55} size={12} fill="#ccc">내 투자</SketchText>
      <RoughRect x={15} y={65} w={220} h={70} fill="#222228" stroke="#444" sw={1.5} />
      <SketchText x={25} y={85} size={9} fill="#888">총 자산</SketchText>
      <SketchText x={25} y={102} size={14} fill="#fff">₩ 12,500,000</SketchText>
      <SketchText x={25} y={120} size={8} fill="#888">예수금: ₩ 5,000,000</SketchText>
      <RoughCircle cx={125} cy={95} r={55} />
      <RoughArrow x1={185} y1={95} x2={260} y2={95} />
      <RedLabel x={265} y={92}>잔고 카드에서</RedLabel>
      <RedLabel x={265} y={106}>총 자산 확인</RedLabel>
    </ScreenFrame>
  );
}

function PortfolioDepositIllust() {
  return (
    <ScreenFrame>
      <RoughRect x={15} y={65} w={220} h={70} fill="#222228" stroke="#444" sw={1.5} />
      <SketchText x={25} y={85} size={9} fill="#888">총 자산</SketchText>
      <SketchText x={25} y={102} size={13} fill="#fff">₩ 12,500,000</SketchText>
      {/* Deposit button */}
      <RoughRect x={150} y={112} w={70} h={18} fill="#7c7cff20" stroke="#7c7cff" sw={1.5} />
      <SketchText x={160} y={124} size={8} fill="#7c7cff">+ 입금하기</SketchText>
      <RoughCircle cx={185} cy={121} r={22} />
      <RoughArrow x1={210} y1={121} x2={260} y2={121} />
      <RedLabel x={265} y={118}>입금 버튼 클릭</RedLabel>
      <RedLabel x={265} y={132}>→ 모달에서 충전</RedLabel>
    </ScreenFrame>
  );
}

function PortfolioHoldingsIllust() {
  return (
    <ScreenFrame>
      <SketchText x={20} y={55} size={10} fill="#ccc">보유 자산</SketchText>
      <RoughRect x={15} y={62} w={440} h={22} fill="#2a2a2e" stroke="#444" sw={1} />
      <SketchText x={20} y={77} size={7} fill="#888">종목</SketchText>
      <SketchText x={100} y={77} size={7} fill="#888">수량</SketchText>
      <SketchText x={160} y={77} size={7} fill="#888">평균단가</SketchText>
      <SketchText x={240} y={77} size={7} fill="#888">현재가</SketchText>
      <SketchText x={320} y={77} size={7} fill="#888">수익률</SketchText>
      <RoughRect x={15} y={84} w={440} h={20} fill="#222" stroke="#444" sw={1} />
      <SketchText x={20} y={98} size={8}>BTC</SketchText>
      <SketchText x={100} y={98} size={8}>0.5</SketchText>
      <SketchText x={160} y={98} size={8}>50,000,000</SketchText>
      <SketchText x={240} y={98} size={8}>55,000,000</SketchText>
      <SketchText x={320} y={98} size={8} fill="#22c55e">+10.0%</SketchText>
      <RoughRect x={15} y={104} w={440} h={20} fill="#1e1e22" stroke="#444" sw={1} />
      <RoughRect x={10} y={58} w={450} h={72} fill="none" stroke="#ef4444" sw={2.5} />
      <RedLabel x={160} y={150}>보유 종목별 상세 현황</RedLabel>
    </ScreenFrame>
  );
}

function PortfolioPnlIllust() {
  return (
    <ScreenFrame>
      <RoughRect x={15} y={65} w={220} h={80} fill="#222228" stroke="#444" sw={1.5} />
      <SketchText x={25} y={85} size={9} fill="#888">총 자산</SketchText>
      <SketchText x={25} y={102} size={13} fill="#fff">₩ 12,500,000</SketchText>
      <SketchText x={25} y={118} size={9} fill="#888">투자 수익</SketchText>
      <SketchText x={25} y={133} size={12} fill="#22c55e">+₩ 2,500,000 (+25%)</SketchText>
      <RoughCircle cx={100} cy={126} r={30} />
      <RoughArrow x1={135} y1={126} x2={250} y2={126} />
      <RedLabel x={255} y={122}>(현재가-평균단가)</RedLabel>
      <RedLabel x={255} y={136}>÷ 평균단가 = 수익률</RedLabel>
    </ScreenFrame>
  );
}

/* ─── Orders illustrations ─── */
function OrdersStepIllust({ step }: { step: number }) {
  const highlights: Record<number, React.ReactNode> = {
    1: (
      <>
        <RoughRect x={15} y={45} w={300} h={20} fill="#2a2a2e" stroke="#444" sw={1} />
        <SketchText x={20} y={59} size={8}>BTC/KRW</SketchText>
        <SketchText x={100} y={59} size={8}>55,230,000</SketchText>
        <SketchText x={200} y={59} size={8} fill="#22c55e">+2.3%</SketchText>
        <RoughRect x={15} y={65} w={300} h={20} fill="#222" stroke="#444" sw={1} />
        <RoughRect x={15} y={85} w={300} h={20} fill="#2a2a2e" stroke="#444" sw={1} />
        <RoughRect x={10} y={42} w={310} h={26} fill="none" stroke="#ef4444" sw={2.5} />
        <RoughArrow x1={325} y1={55} x2={365} y2={55} />
        <RedLabel x={370} y={52}>1단계: 종목 클릭</RedLabel>
        <RedLabel x={370} y={66}>→ 상세화면 이동</RedLabel>
      </>
    ),
    2: (
      <>
        <RoughRect x={15} y={45} w={200} h={180} fill="#222228" stroke="#444" sw={1.5} />
        <SketchText x={60} y={62} size={10} fill="#ccc">매수 주문</SketchText>
        <RoughRect x={30} y={72} w={80} h={22} fill="#7c7cff20" stroke="#7c7cff" sw={1.5} />
        <RoughRect x={120} y={72} w={80} h={22} fill="#2a2a2e" stroke="#555" sw={1} />
        <SketchText x={50} y={87} size={8} fill="#7c7cff">시장가</SketchText>
        <SketchText x={140} y={87} size={8}>지정가</SketchText>
        <RoughRect x={25} y={68} w={180} h={30} fill="none" stroke="#ef4444" sw={2.5} />
        <RedLabel x={240} y={85}>2단계: 주문 유형 선택</RedLabel>
        <RedLabel x={240} y={99}>시장가 or 지정가</RedLabel>
      </>
    ),
    3: (
      <>
        <RoughRect x={15} y={45} w={200} h={180} fill="#222228" stroke="#444" sw={1.5} />
        <SketchText x={60} y={62} size={10} fill="#ccc">매수 주문</SketchText>
        <RoughRect x={30} y={100} w={170} h={28} fill="#1a1a1e" stroke="#555" sw={1} />
        <SketchText x={40} y={118} size={8} fill="#666">수량 입력</SketchText>
        <RoughRect x={30} y={145} w={80} h={28} fill="#22c55e30" stroke="#22c55e" sw={1.5} />
        <RoughRect x={120} y={145} w={80} h={28} fill="#ef444430" stroke="#ef4444" sw={1.5} />
        <SketchText x={50} y={163} size={9} fill="#22c55e">매수</SketchText>
        <SketchText x={140} y={163} size={9} fill="#ef4444">매도</SketchText>
        <RoughRect x={25} y={95} w={180} h={85} fill="none" stroke="#ef4444" sw={2.5} />
        <RedLabel x={240} y={130}>3단계: 수량 입력 후</RedLabel>
        <RedLabel x={240} y={144}>매수/매도 버튼 클릭</RedLabel>
      </>
    ),
    4: (
      <>
        <SketchText x={20} y={55} size={12} fill="#ccc">주문 내역</SketchText>
        <RoughRect x={15} y={62} w={440} h={22} fill="#2a2a2e" stroke="#444" sw={1} />
        <SketchText x={20} y={77} size={7} fill="#888">종목</SketchText>
        <SketchText x={80} y={77} size={7} fill="#888">유형</SketchText>
        <SketchText x={130} y={77} size={7} fill="#888">수량</SketchText>
        <SketchText x={190} y={77} size={7} fill="#888">가격</SketchText>
        <SketchText x={260} y={77} size={7} fill="#888">상태</SketchText>
        <RoughRect x={15} y={84} w={440} h={22} fill="#222" stroke="#444" sw={1} />
        <SketchText x={20} y={99} size={8}>BTC</SketchText>
        <SketchText x={80} y={99} size={8}>시장가</SketchText>
        <SketchText x={130} y={99} size={8}>0.5</SketchText>
        <SketchText x={190} y={99} size={8}>55,230,000</SketchText>
        <RoughRect x={250} y={88} w={45} h={15} fill="#22c55e30" stroke="#22c55e" sw={1} />
        <SketchText x={256} y={99} size={7} fill="#22c55e">체결</SketchText>
        <RoughCircle cx={272} cy={95} r={18} />
        <RedLabel x={320} y={95}>4단계: 체결 상태 확인</RedLabel>
      </>
    ),
  };
  return <ScreenFrame>{highlights[step]}</ScreenFrame>;
}

function OrdersCancelIllust() {
  return (
    <ScreenFrame>
      <SketchText x={20} y={55} size={10} fill="#ccc">주문 내역</SketchText>
      <RoughRect x={15} y={62} w={440} h={22} fill="#222" stroke="#444" sw={1} />
      <SketchText x={20} y={77} size={8}>BTC</SketchText>
      <SketchText x={80} y={77} size={8}>지정가</SketchText>
      <RoughRect x={250} y={66} w={40} h={15} fill="#f59e0b30" stroke="#f59e0b" sw={1} />
      <SketchText x={256} y={77} size={7} fill="#f59e0b">대기중</SketchText>
      <RoughRect x={380} y={66} w={50} h={15} fill="#ef444420" stroke="#ef4444" sw={1.5} />
      <SketchText x={390} y={77} size={7} fill="#ef4444">취소</SketchText>
      <RoughCircle cx={405} cy={73} r={20} />
      <RoughArrow x1={405} y1={95} x2={405} y2={110} />
      <RedLabel x={340} y={125}>대기중인 주문만 취소 가능</RedLabel>
    </ScreenFrame>
  );
}

function OrdersFilterIllust() {
  return (
    <ScreenFrame>
      <SketchText x={20} y={55} size={10} fill="#ccc">주문 내역</SketchText>
      <RoughRect x={15} y={62} w={50} h={16} fill="#3b3bff20" stroke="#7c7cff" sw={1.5} />
      <RoughRect x={70} y={62} w={50} h={16} fill="#2a2a2e" stroke="#555" sw={1} />
      <RoughRect x={125} y={62} w={55} h={16} fill="#2a2a2e" stroke="#555" sw={1} />
      <RoughRect x={185} y={62} w={50} h={16} fill="#2a2a2e" stroke="#555" sw={1} />
      <SketchText x={25} y={74} size={7}>전체</SketchText>
      <SketchText x={78} y={74} size={7}>대기중</SketchText>
      <SketchText x={133} y={74} size={7}>체결완료</SketchText>
      <SketchText x={193} y={74} size={7}>취소됨</SketchText>
      <RoughRect x={10} y={58} w={230} h={24} fill="none" stroke="#ef4444" sw={2.5} />
      <RedLabel x={250} y={74}>상태별 필터로 분류</RedLabel>
    </ScreenFrame>
  );
}

/* ─── Leaderboard illustrations ─── */
function LeaderboardRankIllust() {
  return (
    <ScreenFrame>
      <SketchText x={180} y={55} size={12} fill="#ccc" anchor="middle">🏆 리더보드</SketchText>
      <RoughRect x={60} y={65} w={360} h={24} fill="#fbbf2420" stroke="#fbbf24" sw={1} />
      <SketchText x={75} y={81} size={10} fill="#fbbf24">🥇 1위</SketchText>
      <SketchText x={160} y={81} size={9}>사용자1</SketchText>
      <SketchText x={300} y={81} size={9} fill="#22c55e">+42.5%</SketchText>
      <RoughRect x={60} y={89} w={360} h={22} fill="#c0c0c020" stroke="#aaa" sw={1} />
      <SketchText x={75} y={104} size={10} fill="#aaa">🥈 2위</SketchText>
      <SketchText x={160} y={104} size={9}>사용자3</SketchText>
      <SketchText x={300} y={104} size={9} fill="#22c55e">+31.2%</SketchText>
      <RoughRect x={60} y={111} w={360} h={22} fill="#cd7f3220" stroke="#cd7f32" sw={1} />
      <SketchText x={75} y={126} size={10} fill="#cd7f32">🥉 3위</SketchText>
      <RoughRect x={340} y={65} w={85} h={24} fill="none" stroke="#ef4444" sw={2.5} />
      <RoughArrow x1={385} y1={92} x2={385} y2={145} />
      <RedLabel x={310} y={160}>수익률 기준 순위</RedLabel>
    </ScreenFrame>
  );
}

function LeaderboardRefreshIllust() {
  return (
    <ScreenFrame>
      <SketchText x={20} y={55} size={12} fill="#ccc">🏆 리더보드</SketchText>
      <RoughRect x={380} y={42} w={70} h={22} fill="#2a2a2e" stroke="#555" sw={1} />
      <SketchText x={392} y={57} size={8}>🔄 새로고침</SketchText>
      <RoughCircle cx={415} cy={53} r={25} />
      <RoughArrow x1={415} y1={80} x2={415} y2={100} />
      <RedLabel x={350} y={115}>최신 순위 반영</RedLabel>
    </ScreenFrame>
  );
}

/* ─── Announcements illustrations ─── */
function AnnouncementsViewIllust() {
  return (
    <ScreenFrame>
      <SketchText x={20} y={55} size={10} fill="#ccc">공지사항</SketchText>
      <RoughRect x={15} y={62} w={440} h={24} fill="#222" stroke="#444" sw={1} />
      <SketchText x={20} y={78} size={8} fill="#7c7cff">📌 서비스 업데이트 안내</SketchText>
      <SketchText x={350} y={78} size={7} fill="#888">조회 42</SketchText>
      <RoughRect x={15} y={86} w={440} h={22} fill="#1e1e22" stroke="#444" sw={1} />
      <SketchText x={20} y={101} size={8}>가상화폐 거래 가이드</SketchText>
      <RoughRect x={10} y={58} w={450} h={30} fill="none" stroke="#ef4444" sw={2.5} />
      <RoughArrow x1={240} y1={90} x2={240} y2={120} />
      <RedLabel x={180} y={135}>제목 클릭 → 상세 보기</RedLabel>
    </ScreenFrame>
  );
}

function AnnouncementsCommentIllust() {
  return (
    <ScreenFrame>
      <SketchText x={20} y={55} size={11} fill="#ccc">서비스 업데이트 안내</SketchText>
      <RoughRect x={15} y={65} w={440} h={60} fill="#222228" stroke="#444" sw={1} />
      <SketchText x={25} y={85} size={8} fill="#bbb">공지사항 본문 내용이 여기에 표시됩니다...</SketchText>
      <SketchText x={20} y={145} size={9} fill="#ccc">💬 댓글</SketchText>
      <RoughRect x={15} y={155} w={440} h={28} fill="#1e1e22" stroke="#555" sw={1} />
      <SketchText x={25} y={173} size={8} fill="#666">댓글을 입력하세요...</SketchText>
      <RoughRect x={10} y={140} w={450} h={48} fill="none" stroke="#ef4444" sw={2.5} />
      <RedLabel x={160} y={210}>댓글로 의견 남기기</RedLabel>
    </ScreenFrame>
  );
}

function AnnouncementsLikeIllust() {
  return (
    <ScreenFrame>
      <SketchText x={20} y={55} size={11} fill="#ccc">서비스 업데이트 안내</SketchText>
      <RoughRect x={15} y={65} w={440} h={50} fill="#222228" stroke="#444" sw={1} />
      {/* Like button */}
      <RoughRect x={15} y={125} w={60} h={22} fill="#ef444420" stroke="#ef4444" sw={1.5} />
      <SketchText x={25} y={140} size={9} fill="#ef4444">❤️ 12</SketchText>
      <RoughCircle cx={45} cy={136} r={22} />
      <RoughArrow x1={70} y1={136} x2={110} y2={136} />
      <RedLabel x={115} y={133}>좋아요 버튼</RedLabel>
      <RedLabel x={115} y={147}>유용한 공지에 반응</RedLabel>
    </ScreenFrame>
  );
}

function AnnouncementsAttachIllust() {
  return (
    <ScreenFrame>
      <SketchText x={20} y={55} size={11} fill="#ccc">서비스 업데이트 안내</SketchText>
      <RoughRect x={15} y={65} w={440} h={50} fill="#222228" stroke="#444" sw={1} />
      <SketchText x={20} y={135} size={9} fill="#ccc">📎 첨부파일</SketchText>
      <RoughRect x={15} y={145} w={200} h={24} fill="#2a2a2e" stroke="#555" sw={1} />
      <SketchText x={25} y={161} size={8}>📄 업데이트_가이드.pdf</SketchText>
      <RoughRect x={10} y={130} w={210} h={45} fill="none" stroke="#ef4444" sw={2.5} />
      <RedLabel x={240} y={155}>첨부파일 클릭 → 다운로드</RedLabel>
    </ScreenFrame>
  );
}

/* ─── News illustrations ─── */
function NewsCategoryIllust() {
  return (
    <ScreenFrame>
      <SketchText x={20} y={55} size={10} fill="#ccc">뉴스</SketchText>
      <RoughRect x={15} y={62} w={55} h={16} fill="#3b3bff20" stroke="#7c7cff" sw={1.5} />
      <RoughRect x={75} y={62} w={55} h={16} fill="#2a2a2e" stroke="#555" sw={1} />
      <RoughRect x={135} y={62} w={55} h={16} fill="#2a2a2e" stroke="#555" sw={1} />
      <SketchText x={22} y={74} size={7}>암호화폐</SketchText>
      <SketchText x={82} y={74} size={7}>국내주식</SketchText>
      <SketchText x={142} y={74} size={7}>해외주식</SketchText>
      <RoughRect x={10} y={58} w={185} h={24} fill="none" stroke="#ef4444" sw={2.5} />
      <RedLabel x={210} y={74}>카테고리별 뉴스 필터</RedLabel>
    </ScreenFrame>
  );
}

function NewsLinkIllust() {
  return (
    <ScreenFrame>
      <SketchText x={20} y={55} size={10} fill="#ccc">뉴스</SketchText>
      <RoughRect x={15} y={65} w={210} h={100} fill="#222228" stroke="#444" sw={1.5} />
      <SketchText x={25} y={85} size={9} fill="#ddd">비트코인 신고가 경신</SketchText>
      <SketchText x={25} y={100} size={7} fill="#888">비트코인이 역대 최고가를...</SketchText>
      <RoughRect x={25} y={135} w={80} h={20} fill="#7c7cff20" stroke="#7c7cff" sw={1.5} />
      <SketchText x={35} y={149} size={8} fill="#7c7cff">기사 보기 →</SketchText>
      <RoughCircle cx={65} cy={145} r={25} />
      <RoughArrow x1={95} y1={145} x2={250} y2={145} />
      <RedLabel x={255} y={142}>클릭 → 원본 사이트 이동</RedLabel>
    </ScreenFrame>
  );
}

/* ─── Chat illustrations ─── */
function ChatDmIllust() {
  return (
    <ScreenFrame>
      {/* Chat panel */}
      <RoughRect x={280} y={45} w={185} h={230} fill="#1a1a1e" stroke="#444" sw={1.5} />
      <RoughRect x={280} y={45} w={185} h={28} fill="#222228" stroke="#444" sw={1} />
      <SketchText x={295} y={63} size={9} fill="#ccc">💬 채팅</SketchText>
      <RoughRect x={430} y={50} w={25} h={18} fill="#2a2a2e" stroke="#7c7cff" sw={1} />
      <SketchText x={436} y={63} size={8} fill="#7c7cff">+</SketchText>
      <RoughCircle cx={443} cy={59} r={16} />
      <RoughArrow x1={275} y1={59} x2={255} y2={59} />
      <RedLabel x={100} y={56}>새 대화 버튼 클릭 →</RedLabel>
      <RedLabel x={100} y={70}>사용자 검색 → DM 시작</RedLabel>
      {/* Chat list items */}
      <RoughRect x={285} y={80} w={175} h={30} fill="#2a2a2e" stroke="#444" sw={1} />
      <SketchText x={295} y={99} size={8}>사용자1</SketchText>
      <RoughRect x={285} y={110} w={175} h={30} fill="#222" stroke="#444" sw={1} />
    </ScreenFrame>
  );
}

function ChatGroupIllust() {
  return (
    <ScreenFrame>
      <RoughRect x={280} y={45} w={185} h={230} fill="#1a1a1e" stroke="#444" sw={1.5} />
      <SketchText x={310} y={63} size={9} fill="#ccc">새 대화</SketchText>
      {/* User checkboxes */}
      <RoughRect x={290} y={80} w={165} h={22} fill="#2a2a2e" stroke="#444" sw={1} />
      <SketchText x={315} y={95} size={8}>☑ 사용자1</SketchText>
      <RoughRect x={290} y={102} w={165} h={22} fill="#2a2a2e" stroke="#444" sw={1} />
      <SketchText x={315} y={117} size={8}>☑ 사용자2</SketchText>
      <RoughRect x={290} y={124} w={165} h={22} fill="#222" stroke="#444" sw={1} />
      <SketchText x={315} y={139} size={8}>☐ 사용자3</SketchText>
      <RoughRect x={285} y={76} w={175} h={52} fill="none" stroke="#ef4444" sw={2.5} />
      <RoughArrow x1={280} y1={100} x2={240} y2={100} />
      <RedLabel x={70} y={97}>2명 이상 선택 →</RedLabel>
      <RedLabel x={70} y={111}>그룹 채팅 생성</RedLabel>
    </ScreenFrame>
  );
}

function ChatInviteIllust() {
  return (
    <ScreenFrame>
      <RoughRect x={280} y={45} w={185} h={230} fill="#1a1a1e" stroke="#444" sw={1.5} />
      <RoughRect x={280} y={45} w={185} h={28} fill="#222228" stroke="#444" sw={1} />
      <SketchText x={295} y={63} size={9} fill="#ccc">그룹채팅</SketchText>
      {/* Menu */}
      <RoughRect x={420} y={50} w={18} h={18} fill="#2a2a2e" stroke="#555" sw={1} />
      <SketchText x={424} y={63} size={9}>👥</SketchText>
      {/* Dropdown */}
      <RoughRect x={350} y={73} w={110} h={50} fill="#2a2a2e" stroke="#555" sw={1.5} />
      <SketchText x={365} y={90} size={8} fill="#7c7cff">👤+ 초대하기</SketchText>
      <RoughRect x={345} y={76} w={120} h={20} fill="none" stroke="#ef4444" sw={2.5} />
      <RoughArrow x1={340} y1={86} x2={260} y2={86} />
      <RedLabel x={100} y={83}>참여자 메뉴에서</RedLabel>
      <RedLabel x={100} y={97}>초대하기 클릭</RedLabel>
    </ScreenFrame>
  );
}

function ChatKickIllust() {
  return (
    <ScreenFrame>
      <RoughRect x={280} y={45} w={185} h={230} fill="#1a1a1e" stroke="#444" sw={1.5} />
      <RoughRect x={280} y={45} w={185} h={28} fill="#222228" stroke="#444" sw={1} />
      <SketchText x={295} y={63} size={9} fill="#ccc">그룹채팅</SketchText>
      {/* Participant list */}
      <RoughRect x={350} y={73} w={110} h={80} fill="#2a2a2e" stroke="#555" sw={1.5} />
      <SketchText x={360} y={88} size={7} fill="#888">Participants</SketchText>
      <SketchText x={360} y={103} size={8}>사용자1</SketchText>
      <RoughRect x={440} y={93} w={14} h={14} fill="none" stroke="#ef4444" sw={1} />
      <SketchText x={443} y={103} size={7} fill="#ef4444">🚫</SketchText>
      <RoughCircle cx={447} cy={100} r={12} />
      <RoughArrow x1={347} y1={100} x2={280} y2={100} />
      <RedLabel x={100} y={97}>관리자 전용:</RedLabel>
      <RedLabel x={100} y={111}>강퇴 버튼으로 제거</RedLabel>
    </ScreenFrame>
  );
}

function ChatPinIllust() {
  return (
    <ScreenFrame>
      {/* Pinned panel on right */}
      <RoughRect x={310} y={37} w={165} h={258} fill="#1a1a1e" stroke="#444" sw={1.5} />
      <RoughRect x={310} y={37} w={165} h={28} fill="#222228" stroke="#444" sw={1} />
      <SketchText x={325} y={55} size={9} fill="#ccc">💬 채팅</SketchText>
      {/* Pin button */}
      <RoughRect x={440} y={42} w={25} h={18} fill="#7c7cff20" stroke="#7c7cff" sw={1.5} />
      <SketchText x={446} y={55} size={8} fill="#7c7cff">📌</SketchText>
      <RoughCircle cx={452} cy={51} r={16} />
      {/* Main content area shrunk */}
      <RoughRect x={10} y={37} w={295} h={258} fill="#1a1a1e" stroke="#333" sw={1} />
      <SketchText x={110} y={170} size={9} fill="#666">메인 콘텐츠</SketchText>
      <SketchText x={110} y={185} size={7} fill="#555">(너비가 줄어듦)</SketchText>
      <RoughArrow x1={310} y1={170} x2={280} y2={170} stroke="#7c7cff" />
      <RedLabel x={100} y={220}>고정 버튼으로 화면 오른쪽에 채팅 패널 부착</RedLabel>
    </ScreenFrame>
  );
}

/* ─── Admin illustrations ─── */
function AdminStatsOverviewIllust() {
  return (
    <ScreenFrame>
      <SketchText x={20} y={55} size={10} fill="#ccc">📊 관리자 통계</SketchText>
      <RoughRect x={15} y={65} w={100} h={50} fill="#222228" stroke="#444" sw={1.5} />
      <SketchText x={25} y={82} size={7} fill="#888">총 회원</SketchText>
      <SketchText x={25} y={100} size={14} fill="#fff">156</SketchText>
      <RoughRect x={125} y={65} w={100} h={50} fill="#222228" stroke="#444" sw={1.5} />
      <SketchText x={135} y={82} size={7} fill="#888">오늘 로그인</SketchText>
      <SketchText x={135} y={100} size={14} fill="#fff">42</SketchText>
      <RoughRect x={235} y={65} w={100} h={50} fill="#222228" stroke="#444" sw={1.5} />
      <SketchText x={245} y={82} size={7} fill="#888">페이지뷰</SketchText>
      <SketchText x={245} y={100} size={14} fill="#fff">1,230</SketchText>
      <RoughRect x={10} y={60} w={330} h={60} fill="none" stroke="#ef4444" sw={2.5} />
      <RedLabel x={120} y={145}>핵심 지표를 한눈에 확인</RedLabel>
    </ScreenFrame>
  );
}

function AdminStatsChartIllust() {
  return (
    <ScreenFrame>
      <SketchText x={20} y={55} size={10} fill="#ccc">일별 추이</SketchText>
      <RoughRect x={15} y={65} w={440} h={150} fill="#1e1e22" stroke="#444" sw={1} />
      {/* Bar chart */}
      <RoughRect x={40} y={140} w={20} h={60} fill="#7c7cff40" stroke="#7c7cff" sw={1} />
      <RoughRect x={80} y={120} w={20} h={80} fill="#7c7cff40" stroke="#7c7cff" sw={1} />
      <RoughRect x={120} y={100} w={20} h={100} fill="#7c7cff40" stroke="#7c7cff" sw={1} />
      <RoughRect x={160} y={130} w={20} h={70} fill="#7c7cff40" stroke="#7c7cff" sw={1} />
      <RoughRect x={200} y={110} w={20} h={90} fill="#7c7cff40" stroke="#7c7cff" sw={1} />
      <RoughRect x={240} y={90} w={20} h={110} fill="#22c55e40" stroke="#22c55e" sw={1} />
      <SketchText x={240} y={85} size={7} fill="#22c55e">오늘</SketchText>
      <RedLabel x={280} y={130}>일별 추이 차트로</RedLabel>
      <RedLabel x={280} y={144}>서비스 성장 모니터링</RedLabel>
    </ScreenFrame>
  );
}

function AdminUsersSearchIllust() {
  return (
    <ScreenFrame>
      <SketchText x={20} y={55} size={10} fill="#ccc">회원관리</SketchText>
      <RoughRect x={15} y={65} w={250} h={28} fill="#1e1e22" stroke="#555" sw={1} />
      <SketchText x={25} y={83} size={9} fill="#666">🔍 이름, 이메일, 아이디 검색</SketchText>
      <RoughCircle cx={140} cy={79} r={30} />
      <RoughArrow x1={275} y1={79} x2={300} y2={79} />
      <RedLabel x={305} y={76}>검색창에 입력 →</RedLabel>
      <RedLabel x={305} y={90}>실시간 필터링</RedLabel>
    </ScreenFrame>
  );
}

function AdminUsersApproveIllust() {
  return (
    <ScreenFrame>
      <SketchText x={20} y={55} size={10} fill="#ccc">회원관리</SketchText>
      <RoughRect x={15} y={65} w={440} h={24} fill="#222" stroke="#444" sw={1} />
      <SketchText x={20} y={81} size={8}>사용자12</SketchText>
      <RoughRect x={200} y={69} w={40} h={16} fill="#f59e0b30" stroke="#f59e0b" sw={1} />
      <SketchText x={206} y={81} size={7} fill="#f59e0b">대기</SketchText>
      <RoughRect x={340} y={69} w={45} h={16} fill="#22c55e30" stroke="#22c55e" sw={1} />
      <RoughRect x={390} y={69} w={45} h={16} fill="#ef444430" stroke="#ef4444" sw={1} />
      <SketchText x={350} y={81} size={7} fill="#22c55e">승인</SketchText>
      <SketchText x={400} y={81} size={7} fill="#ef4444">반려</SketchText>
      <RoughRect x={335} y={65} w={105} h={24} fill="none" stroke="#ef4444" sw={2.5} />
      <RedLabel x={280} y={110}>승인/반려 버튼으로 처리</RedLabel>
    </ScreenFrame>
  );
}

function AdminUsersDetailIllust() {
  return (
    <ScreenFrame>
      <SketchText x={20} y={55} size={10} fill="#ccc">회원 상세</SketchText>
      <RoughRect x={15} y={65} w={300} h={160} fill="#222228" stroke="#444" sw={1.5} />
      <SketchText x={25} y={85} size={8} fill="#888">이름</SketchText>
      <SketchText x={100} y={85} size={8} fill="#fff">사용자1</SketchText>
      <SketchText x={25} y={105} size={8} fill="#888">이메일</SketchText>
      <SketchText x={100} y={105} size={8} fill="#fff">user1@test.com</SketchText>
      <SketchText x={25} y={125} size={8} fill="#888">상태</SketchText>
      <SketchText x={100} y={125} size={8} fill="#22c55e">승인됨</SketchText>
      <SketchText x={25} y={145} size={8} fill="#888">가입일</SketchText>
      <SketchText x={100} y={145} size={8} fill="#fff">2026-02-01</SketchText>
      <RoughRect x={10} y={60} w={310} h={170} fill="none" stroke="#ef4444" sw={2.5} />
      <RedLabel x={340} y={140}>회원 상세 정보 확인</RedLabel>
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
  },
  portfolio: {
    0: () => <PortfolioBalanceIllust />,
    1: () => <PortfolioDepositIllust />,
    2: () => <PortfolioHoldingsIllust />,
    3: () => <PortfolioPnlIllust />,
  },
  orders: {
    0: () => <OrdersStepIllust step={1} />,
    1: () => <OrdersStepIllust step={2} />,
    2: () => <OrdersStepIllust step={3} />,
    3: () => <OrdersStepIllust step={4} />,
    4: () => <OrdersCancelIllust />,
    5: () => <OrdersFilterIllust />,
  },
  leaderboard: {
    0: () => <LeaderboardRankIllust />,
    1: () => <LeaderboardRefreshIllust />,
  },
  announcements: {
    0: () => <AnnouncementsViewIllust />,
    1: () => <AnnouncementsCommentIllust />,
    2: () => <AnnouncementsLikeIllust />,
    3: () => <AnnouncementsAttachIllust />,
  },
  news: {
    0: () => <NewsCategoryIllust />,
    1: () => <NewsLinkIllust />,
  },
  chat: {
    0: () => <ChatDmIllust />,
    1: () => <ChatGroupIllust />,
    2: () => <ChatInviteIllust />,
    3: () => <ChatKickIllust />,
    4: () => <ChatPinIllust />,
  },
  adminStats: {
    0: () => <AdminStatsOverviewIllust />,
    1: () => <AdminStatsChartIllust />,
  },
  adminUsers: {
    0: () => <AdminUsersSearchIllust />,
    1: () => <AdminUsersApproveIllust />,
    2: () => <AdminUsersDetailIllust />,
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

  useEffect(() => {
    if (expanded && contentRef.current) {
      setHeight(contentRef.current.scrollHeight);
    } else {
      setHeight(0);
    }
  }, [expanded]);

  const hasIllust = !!illustrationMap[tabKey]?.[index];

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
          <div className="bg-bg-secondary/30 border border-border/30 rounded-xl p-3 sm:p-4">
            {illustrationMap[tabKey]?.[index]?.()}
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
        <h1 className="text-[20px] font-extrabold text-text-primary">{t('help.title')}</h1>
      </div>

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

      <div className="pb-10">
        {sections[activeTab] && <HelpTab section={sections[activeTab]} tabKey={activeTab} t={t} />}
      </div>
    </div>
  );
}
