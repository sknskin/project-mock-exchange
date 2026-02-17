'use client';

import { useState, useMemo } from 'react';
import AssetListItem from './AssetListItem';
import Tabs from '@/components/ui/Tabs';
import type { Asset } from '@/types';

interface AssetListProps {
  assets: Asset[];
}

const categoryTabs = [
  { key: 'all', label: '전체' },
  { key: 'CRYPTO', label: '암호화폐' },
  { key: 'STOCK', label: '주식' },
];

export default function AssetList({ assets }: AssetListProps) {
  const [category, setCategory] = useState('all');

  const filtered = useMemo(() => {
    if (category === 'all') return assets;
    return assets.filter((a) => a.type === category);
  }, [assets, category]);

  return (
    <div>
      <div className="px-5 pt-2 pb-1">
        <Tabs tabs={categoryTabs} activeTab={category} onChange={setCategory} variant="pill" />
      </div>
      <div className="mt-2">
        {filtered.map((asset) => (
          <AssetListItem key={asset.symbol} asset={asset} />
        ))}
        {filtered.length === 0 && (
          <div className="py-16 text-center text-text-secondary text-sm">
            종목이 없습니다
          </div>
        )}
      </div>
    </div>
  );
}
