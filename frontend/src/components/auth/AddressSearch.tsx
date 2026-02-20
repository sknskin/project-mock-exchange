/**
 * @file 주소 검색 컴포넌트
 * @description 다음 우편번호 API를 사용한 주소 검색 컴포넌트
 *
 * @file Address Search Component
 * @description Address search component using Daum Postcode API
 */
'use client';

import { useCallback, useRef, useState, useEffect } from 'react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { useTranslation } from '@/hooks/useTranslation';

interface AddressSearchProps {
  address: string;
  addressDetail: string;
  zipCode: string;
  onAddressChange: (address: string, zipCode: string) => void;
  onAddressDetailChange: (detail: string) => void;
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

      {/* 주소 검색: 모바일은 인라인, 데스크톱은 화면 중앙 모달 */}
      {/* Address search: inline on mobile, centered modal on desktop */}
      {showEmbed && (
        <>
          {/* 데스크톱 오버레이 / Desktop overlay */}
          <div className="hidden md:block fixed inset-0 z-[60] bg-black/60" onClick={() => setShowEmbed(false)} />

          <div className="md:fixed md:inset-0 md:z-[60] md:flex md:items-start md:justify-center md:pt-[15vh] md:pointer-events-none">
            <div className="relative border border-border rounded-xl overflow-hidden md:w-[500px] md:rounded-2xl md:shadow-2xl md:pointer-events-auto md:bg-bg-primary">
              {/* 데스크톱 헤더 / Desktop header */}
              <div className="hidden md:flex items-center justify-between px-4 py-3 border-b border-border">
                <span className="text-[14px] font-bold text-text-primary">{t('auth.register.addressSearch')}</span>
                <button
                  type="button"
                  onClick={() => setShowEmbed(false)}
                  className="w-7 h-7 flex items-center justify-center bg-bg-secondary rounded-full text-text-tertiary hover:text-text-primary text-[14px] font-bold"
                >
                  X
                </button>
              </div>
              {/* 모바일 닫기 버튼 / Mobile close button */}
              <button
                type="button"
                onClick={() => setShowEmbed(false)}
                className="md:hidden absolute top-2 right-2 z-10 w-7 h-7 flex items-center justify-center bg-bg-primary/80 border border-border rounded-full text-text-tertiary hover:text-text-primary text-[14px] font-bold"
              >
                X
              </button>
              <div ref={embedRef} className="w-full h-[400px] md:h-[450px]" />
            </div>
          </div>
        </>
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
