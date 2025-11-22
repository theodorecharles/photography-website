interface VideoQualityIconProps {
  width?: number;
  height?: number;
  className?: string;
  style?: React.CSSProperties;
}

const VideoQualityIcon: React.FC<VideoQualityIconProps> = ({
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
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      <path d="m22 8-6 4 6 4V8Z" />
      <rect x="2" y="6" width="14" height="12" rx="2" ry="2" />
    </svg>
  );
};

export default VideoQualityIcon;

