/**
 * Chevron Up Icon (move up in list)
 */

interface IconProps {
  width?: number | string;
  height?: number | string;
  className?: string;
  style?: React.CSSProperties;
}

export default function ChevronUpIcon({ width = 20, height = 20, className, style }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={width}
      height={height}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      <polyline points="18 15 12 9 6 15" />
    </svg>
  );
}

