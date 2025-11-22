interface AnalyticsIconProps {
  width?: number;
  height?: number;
  className?: string;
  style?: React.CSSProperties;
}

const AnalyticsIcon: React.FC<AnalyticsIconProps> = ({
  width = 24,
  height = 24,
  className = "",
  style,
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      style={style}
    >
      {/* Bold bar chart with three bars of different heights */}
      <rect x="3" y="14" width="4" height="7" rx="1" />
      <rect x="10" y="8" width="4" height="13" rx="1" />
      <rect x="17" y="3" width="4" height="18" rx="1" />
    </svg>
  );
};

export default AnalyticsIcon;

