/**
 * CPU/Chip Icon (for auth section)
 */

interface IconProps {
  width?: number | string;
  height?: number | string;
  className?: string;
  style?: React.CSSProperties;
}

export default function CpuIcon({ width = 48, height = 48, className, style }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={width}
      height={height}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className={className}
      style={style}
    >
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
      <path d="M9 9h6v6H9z"/>
      <path d="M9 1v6"/>
      <path d="M15 1v6"/>
      <path d="M9 17v6"/>
      <path d="M15 17v6"/>
      <path d="M1 9h6"/>
      <path d="M17 9h6"/>
      <path d="M1 15h6"/>
      <path d="M17 15h6"/>
    </svg>
  );
}

