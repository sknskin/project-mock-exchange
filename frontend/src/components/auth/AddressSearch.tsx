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

      {/* 주소 검색: 모바일/데스크톱 모두 화면 중앙 모달 */}
      {/* Address search: centered modal on both mobile and desktop */}
      {showEmbed && (
        <>
          <div className="fixed inset-0 z-[60] bg-black/60" onClick={() => setShowEmbed(false)} />
          <div className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none px-4">
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
