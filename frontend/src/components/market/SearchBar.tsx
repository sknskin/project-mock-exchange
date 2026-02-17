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
    <div className="relative px-5 py-3">
      <Search className="absolute left-8 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-4 py-2.5 bg-bg-secondary border border-border rounded-xl text-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:border-accent transition-colors"
      />
    </div>
  );
}
