/**
 * @file VirtuEx 로고 SVG 컴포넌트
 * @description 브랜드 로고를 렌더링하는 SVG 컴포넌트
 *
 * @file VirtuEx Logo SVG Component
 * @description SVG component rendering the brand logo
 */
interface VirtuExLogoProps {
  size?: number;
  className?: string;
}

export default function VirtuExLogo({ size = 24, className }: VirtuExLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect width="48" height="48" rx="12" fill="#3182F6" />
      <path
        d="M12 14L23 34L36 10"
        stroke="white"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
