interface EmailIconProps {
  width?: number;
  height?: number;
  className?: string;
  style?: React.CSSProperties;
}

const EmailIcon: React.FC<EmailIconProps> = ({
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
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
};

export default EmailIcon;

