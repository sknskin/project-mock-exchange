/**
 * @file 랜딩 홈 페이지
 * @description Hero, 기술 스택, 프로젝트 개요, 콘텐츠 모달 버튼을 보여주는 랜딩 페이지
 *
 * @file Landing Home Page
 * @description Landing page with hero, tech stack, project overview, and content modal buttons
 */
'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useTranslation } from '@/hooks/useTranslation';
import { techItems } from '@/lib/constants';
import ContentModal from '@/components/ui/ContentModal';
import { ArrowRight, Boxes, Radio, MessageSquare, Cpu, Terminal, FileText, Globe } from 'lucide-react';
import VirtuExLogo from '@/components/ui/VirtuExLogo';

const tripledItems = [...techItems, ...techItems, ...techItems];

type ModalState = {
  isOpen: boolean;
  title: string;
  content: string;
  type: 'markdown' | 'iframe';
};

export default function LandingPage() {
  const { t } = useTranslation();
  const [modal, setModal] = useState<ModalState>({
    isOpen: false,
    title: '',
    content: '',
    type: 'markdown',
  });

  const openMarkdownModal = useCallback(async (title: string, docPath: string) => {
    const res = await fetch(docPath);
    const text = await res.text();
    setModal({ isOpen: true, title, content: text, type: 'markdown' });
  }, []);

  const openSwaggerNewTab = useCallback(() => {
    window.open('http://localhost:3000/api-docs', '_blank');
  }, []);

  const features = [
    {
      icon: Boxes,
      title: t('landing.features.microservice'),
      desc: t('landing.features.microserviceDesc'),
    },
    {
      icon: Radio,
      title: t('landing.features.websocket'),
      desc: t('landing.features.websocketDesc'),
    },
    {
      icon: MessageSquare,
      title: t('landing.features.kafka'),
      desc: t('landing.features.kafkaDesc'),
    },
    {
      icon: Cpu,
      title: t('landing.features.matching'),
      desc: t('landing.features.matchingDesc'),
    },
  ];

  return (
    <div className="py-8 md:py-16">
      {/* 히어로 섹션 / Hero Section */}
      <section className="text-center py-12 md:py-20">
        <h1 className="flex items-center justify-center gap-3 md:gap-4 text-[36px] md:text-[52px] font-extrabold text-text-primary tracking-tight leading-tight">
          <VirtuExLogo size={64} className="shrink-0" />
          {t('landing.title')}
        </h1>
        <p className="mt-6 text-[18px] md:text-[22px] font-bold text-accent">
          {t('landing.subtitle')}
        </p>
        <p className="mt-5 text-[14px] md:text-[16px] text-text-secondary max-w-[560px] mx-auto leading-relaxed">
          {t('landing.description')}
        </p>
        <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-warning/10 border border-warning/20">
          <span className="text-[11px] font-bold text-warning/90 px-1.5 py-0.5 rounded bg-warning/15">MOCK</span>
          <span className="text-[12px] text-warning/80">{t('market.mockDataDesc')}</span>
        </div>
        <div className="mt-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 h-12 px-8 text-[15px] font-bold text-white bg-accent rounded-xl hover:bg-accent/85 transition-colors"
          >
            {t('landing.cta')}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* 기술 스택 마키 / Tech Stack Marquee */}
      <section className="py-8">
        <h2 className="text-[13px] font-bold text-text-quaternary text-center uppercase tracking-wider mb-6">
          {t('landing.techStack')}
        </h2>
        <div className="relative overflow-hidden py-4 -mx-5 sm:-mx-8 lg:-mx-10">
          <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-bg-primary to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-bg-primary to-transparent z-10 pointer-events-none" />
          <div className="animate-marquee">
            {tripledItems.map((tech, i) => (
              <div
                key={`${tech.name}-${i}`}
                className="flex flex-col items-center gap-2 px-5 shrink-0"
              >
                <div className="w-10 h-10 rounded-xl bg-bg-secondary/80 flex items-center justify-center p-2">
                  <img
                    src={tech.icon}
                    alt={tech.name}
                    className="w-5 h-5 object-contain"
                    loading="eager"
                  />
                </div>
                <span className="text-[10px] font-medium text-text-quaternary whitespace-nowrap">
                  {tech.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 프로젝트 개요 / Project Overview */}
      <section className="py-10 md:py-14">
        <div className="text-center mb-10">
          <h2 className="text-[22px] md:text-[28px] font-extrabold text-text-primary">
            {t('landing.overview')}
          </h2>
          <p className="mt-2 text-[14px] text-text-tertiary max-w-[480px] mx-auto">
            {t('landing.overviewDesc')}
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {features.map((feat) => {
            const Icon = feat.icon;
            return (
              <div
                key={feat.title}
                className="p-5 rounded-2xl border border-border bg-bg-secondary/50 hover:bg-bg-secondary transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center mb-3">
                  <Icon className="w-5 h-5 text-accent" />
                </div>
                <h3 className="text-[15px] font-bold text-text-primary mb-1">{feat.title}</h3>
                <p className="text-[13px] text-text-tertiary leading-relaxed">{feat.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 문서 / Documentation */}
      <section className="py-10 md:py-14">
        <div className="text-center mb-10">
          <h2 className="text-[22px] md:text-[28px] font-extrabold text-text-primary">
            {t('landing.docs')}
          </h2>
          <p className="mt-2 text-[14px] text-text-tertiary max-w-[480px] mx-auto">
            {t('landing.docsDesc')}
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              icon: FileText,
              title: t('landing.projectSpec'),
              desc: t('landing.projectSpecDesc'),
              onClick: () => openMarkdownModal(t('landing.projectSpec'), '/docs/PROJECT_SPEC.md'),
            },
            {
              icon: Terminal,
              title: t('landing.localRun'),
              desc: t('landing.localRunDesc'),
              onClick: () => openMarkdownModal(t('landing.localRun'), '/docs/LOCAL_RUN.md'),
            },
            {
              icon: Globe,
              title: t('landing.swaggerDocs'),
              desc: t('landing.swaggerDocsDesc'),
              onClick: openSwaggerNewTab,
            },
          ].map((doc) => {
            const Icon = doc.icon;
            return (
              <button
                key={doc.title}
                onClick={doc.onClick}
                className="p-5 rounded-2xl border border-border bg-bg-secondary/50 hover:bg-bg-secondary transition-colors text-left cursor-pointer h-full flex flex-col items-start"
              >
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center mb-3">
                  <Icon className="w-5 h-5 text-accent" />
                </div>
                <h3 className="text-[15px] font-bold text-text-primary mb-1">{doc.title}</h3>
                <p className="text-[13px] text-text-tertiary leading-relaxed">{doc.desc}</p>
              </button>
            );
          })}
        </div>
      </section>

      {/* 콘텐츠 모달 / Content Modal */}
      <ContentModal
        isOpen={modal.isOpen}
        onClose={() => setModal((prev) => ({ ...prev, isOpen: false }))}
        title={modal.title}
        content={modal.content}
        type={modal.type}
      />
    </div>
  );
}
