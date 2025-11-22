interface GeneralIconProps {
  width?: number;
  height?: number;
  className?: string;
  style?: React.CSSProperties;
}

const GeneralIcon: React.FC<GeneralIconProps> = ({
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
      {/* Browser window icon */}
      {/* Window frame */}
      <rect x="2" y="4" width="20" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="2"/>
      {/* Top bar with dots */}
      <line x1="2" y1="8" x2="22" y2="8" stroke="currentColor" strokeWidth="2"/>
      <circle cx="5" cy="6" r="0.8" fill="currentColor"/>
      <circle cx="8" cy="6" r="0.8" fill="currentColor"/>
      <circle cx="11" cy="6" r="0.8" fill="currentColor"/>
    </svg>
  );
};

export default GeneralIcon;

