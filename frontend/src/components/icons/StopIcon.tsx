/**
 * Stop Icon (square)
 */

interface IconProps {
  width?: number | string;
  height?: number | string;
  className?: string;
  style?: React.CSSProperties;
}

export default function StopIcon({ width = 14, height = 14, className, style }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={width}
      height={height}
      fill="currentColor"
      stroke="none"
      className={className}
      style={style}
    >
      <rect x="4" y="4" width="16" height="16" rx="2" />
    </svg>
  );
}

