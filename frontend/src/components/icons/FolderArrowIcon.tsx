/**
 * Folder Arrow Icon
 * Icon showing an arrow moving into a folder
 */

interface FolderArrowIconProps {
  width?: string | number;
  height?: string | number;
  className?: string;
  style?: React.CSSProperties;
}

const FolderArrowIcon: React.FC<FolderArrowIconProps> = ({
  width = '24',
  height = '24',
  className = '',
  style = {},
}) => {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
    >
      {/* Folder */}
      <path
        d="M3 6C3 4.89543 3.89543 4 5 4H9L11 6H19C20.1046 6 21 6.89543 21 8V18C21 19.1046 20.1046 20 19 20H5C3.89543 20 3 19.1046 3 18V6Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Arrow */}
      <path
        d="M8 12H16M16 12L13 9M16 12L13 15"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default FolderArrowIcon;

