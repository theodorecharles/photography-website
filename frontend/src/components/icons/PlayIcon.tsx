interface PlayIconProps {
  width?: number | string;
  height?: number | string;
  className?: string;
  style?: React.CSSProperties;
}

const PlayIcon: React.FC<PlayIconProps> = ({ 
  width = 24, 
  height = 24, 
  className = '',
  style = {} 
}) => {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      style={style}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M8 5v14l11-7z"/>
    </svg>
  );
};

export default PlayIcon;
