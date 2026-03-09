/**
 * @file 정보 행 컴포넌트
 * @description 라벨(좌)과 값(우)을 가로로 배치하는 단순 정보 표시 행
 *
 * @file Info Row Component
 * @description Simple display row with label(left) and value(right) horizontal layout
 */
'use client';

interface InfoRowProps {
  label: string;
  children: React.ReactNode;
}

/** 라벨-값 가로 정렬 행
 * Label-value horizontal row */
export default function InfoRow({ label, children }: InfoRowProps) {
  return (
    <div className="flex justify-between items-start py-3 border-b border-border/50 gap-3">
      <span className="text-[13px] text-text-tertiary shrink-0">{label}</span>
      <span className="text-[13px] text-text-primary font-medium text-right">{children}</span>
    </div>
  );
}
