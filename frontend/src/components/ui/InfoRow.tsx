'use client';

interface InfoRowProps {
  label: string;
  children: React.ReactNode;
}

export default function InfoRow({ label, children }: InfoRowProps) {
  return (
    <div className="flex justify-between items-start py-3 border-b border-border/50 gap-3">
      <span className="text-[13px] text-text-tertiary shrink-0">{label}</span>
      <span className="text-[13px] text-text-primary font-medium text-right">{children}</span>
    </div>
  );
}
