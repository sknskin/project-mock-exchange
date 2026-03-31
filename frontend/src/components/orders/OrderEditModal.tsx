/**
 * @file 주문 수정 인라인 폼 컴포넌트
 * @description PENDING 주문의 가격/수량을 인라인으로 수정하는 폼
 *
 * @file Order Edit Inline Form Component
 * @description Inline form for modifying price/quantity of PENDING orders
 */
'use client';

import { cn } from '@/lib/format';
import type { TranslationKey } from '@/lib/i18n';
import type { Order } from '@/types';

interface OrderEditModalProps {
  order: Order;
  editPrice: string;
  editQuantity: string;
  onEditPriceChange: (v: string) => void;
  onEditQuantityChange: (v: string) => void;
  onConfirm: (orderId: string) => void;
  onCancel: () => void;
  isModifying: boolean;
  t: (key: TranslationKey) => string;
}

/**
 * 인라인 주문 수정 폼 — PENDING 상태 주문의 가격/수량 변경
 * Inline order edit form — modify price/quantity of PENDING orders
 */
export default function OrderEditModal({
  order,
  editPrice,
  editQuantity,
  onEditPriceChange,
  onEditQuantityChange,
  onConfirm,
  onCancel,
  isModifying,
  t,
}: OrderEditModalProps) {
  return (
    <div className="py-3 space-y-2">
      <div className="flex items-center gap-2 text-[13px]">
        <span className={cn('font-bold', order.side === 'BUY' ? 'text-rise' : 'text-fall')}>
          {order.side === 'BUY' ? t('orders.buy') : t('orders.sell')}
        </span>
        <span className="font-semibold text-text-primary">{order.symbol}</span>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="number"
          value={editPrice}
          onChange={(e) => onEditPriceChange(e.target.value)}
          placeholder={t('orders.price')}
          aria-label={t('orders.price')}
          className="flex-1 h-11 px-3 text-[13px] bg-bg-secondary border border-border rounded-lg text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/20 focus-visible:border-accent/40"
        />
        <input
          type="number"
          value={editQuantity}
          onChange={(e) => onEditQuantityChange(e.target.value)}
          placeholder={t('orders.quantity')}
          aria-label={t('orders.quantity')}
          className="flex-1 h-11 px-3 text-[13px] bg-bg-secondary border border-border rounded-lg text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/20 focus-visible:border-accent/40"
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onConfirm(order.id)}
          disabled={isModifying}
          className="flex-1 h-10 text-[12px] font-semibold text-white bg-accent rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50"
        >
          {t('orders.confirmModify')}
        </button>
        <button
          onClick={onCancel}
          className="flex-1 h-10 text-[12px] font-semibold text-text-tertiary bg-bg-secondary rounded-lg hover:bg-bg-tertiary transition-colors"
        >
          {t('orders.cancel')}
        </button>
      </div>
    </div>
  );
}
