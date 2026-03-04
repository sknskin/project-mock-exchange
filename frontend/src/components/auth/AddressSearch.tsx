/**
 * @file 주소 검색 컴포넌트
 * @description 다음 우편번호 API를 사용한 주소 검색 컴포넌트
 *
 * @file Address Search Component
 * @description Address search component using Daum Postcode API
 */
'use client';

import { useCallback, useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { useTranslation } from '@/hooks/useTranslation';

// 주소 검색 Props / Address Search Props
interface AddressSearchProps {
  /** 선택된 주소 / Selected address */
  address: string;
  /** 상세 주소 / Detail address */
  addressDetail: string;
  /** 우편번호 / Zip code */
  zipCode: string;
  /** 주소 선택 콜백 / Address selection callback */
  onAddressChange: (address: string, zipCode: string) => void;
  /** 상세 주소 변경 콜백 / Detail address change callback */
  onAddressDetailChange: (detail: string) => void;
  /** 상세 주소 에러 / Detail address error */
  addressDetailError?: string;
}

declare global {
  interface Window {
    daum?: {
      Postcode: new (options: {
        oncomplete: (data: {
          zonecode: string;
          address: string;
          roadAddress: string;
          jibunAddress: string;
        }) => void;
        width: string | number;
        height: string | number;
      }) => { embed: (element: HTMLElement) => void };
    };
  }
}

export default function AddressSearch({
  address,
  addressDetail,
  zipCode,
  onAddressChange,
  onAddressDetailChange,
  addressDetailError,
}: AddressSearchProps) {
  const { t } = useTranslation();
  const [showEmbed, setShowEmbed] = useState(false);
  const embedRef = useRef<HTMLDivElement>(null);

  const loadScript = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      if (window.daum?.Postcode) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = '//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
      script.onload = () => resolve();
      document.head.appendChild(script);
    });
  }, []);

  const handleSearch = useCallback(async () => {
    await loadScript();
    setShowEmbed(true);
  }, [loadScript]);

  // 모달 열릴 때 배경 스크롤 완전 차단 (iOS 포함) / Fully lock body scroll (iOS safe)
  useEffect(() => {
    if (!showEmbed) return;
    const scrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.overflow = '';
      window.scrollTo(0, scrollY);
    };
  }, [showEmbed]);

  useEffect(() => {
    if (!showEmbed || !embedRef.current || !window.daum?.Postcode) return;

    new window.daum.Postcode({
      oncomplete: (data) => {
        onAddressChange(data.roadAddress || data.jibunAddress, data.zonecode);
        setShowEmbed(false);
      },
      width: '100%',
      height: '100%',
    }).embed(embedRef.current);
  }, [showEmbed, onAddressChange]);

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            type="text"
            placeholder={t('auth.register.zipCode')}
            value={zipCode}
            readOnly
          />
        </div>
        <Button
          type="button"
          variant="secondary"
          size="md"
          onClick={handleSearch}
          className="shrink-0 whitespace-nowrap"
        >
          {t('auth.register.addressSearch')}
        </Button>
      </div>

      {/* 주소 검색: Portal로 body에 직접 렌더 (부모 overflow/stacking context 영향 방지) */}
      {/* Address search: Portal to body (avoids parent overflow/stacking context clipping) */}
      {showEmbed && createPortal(
        <>
          <div className="fixed inset-0 z-[60] bg-black/60" onClick={() => setShowEmbed(false)} />
          <div className="fixed inset-0 z-[61] flex items-center justify-center pointer-events-none px-4">
            <div className="relative w-full max-w-[500px] rounded-2xl shadow-2xl pointer-events-auto bg-bg-primary border border-border overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <span className="text-[14px] font-bold text-text-primary">{t('auth.register.addressSearch')}</span>
                <button
                  type="button"
                  onClick={() => setShowEmbed(false)}
                  className="w-7 h-7 flex items-center justify-center bg-bg-secondary rounded-full text-text-tertiary hover:text-text-primary text-[14px] font-bold"
                >
                  X
                </button>
              </div>
              <div ref={embedRef} className="w-full h-[60vh] md:h-[450px]" />
            </div>
          </div>
        </>,
        document.body,
      )}

      {address && (
        <>
          <Input
            type="text"
            value={address}
            readOnly
          />
          <Input
            type="text"
            placeholder={t('auth.register.addressDetailPlaceholder')}
            value={addressDetail}
            onChange={(e) => onAddressDetailChange(e.target.value)}
            error={addressDetailError}
            required
          />
        </>
      )}
    </div>
  );
}
