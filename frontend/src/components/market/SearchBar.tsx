'use client';

import { Search } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function SearchBar({
  value,
  onChange,
  placeholder = '종목 검색',
}: SearchBarProps) {
  return (
    <div className="relative px-6 py-3">
      <Search className="absolute left-9 top-1/2 -translate-y-1/2 w-4 h-4 text-text-quaternary" />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full pl-9 pr-4 py-2.5 bg-bg-secondary border-none rounded-lg text-[14px] text-text-primary placeholder-text-quaternary focus:outline-none focus:ring-1 focus:ring-accent/30 transition-all font-medium"
      />
    </div>
  );
}
