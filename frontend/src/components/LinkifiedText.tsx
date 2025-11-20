/**
 * LinkifiedText Component
 * Renders text with URLs converted to clickable links
 */

import React from 'react';

interface LinkifiedTextProps {
  text: string;
  className?: string;
}

const LinkifiedText: React.FC<LinkifiedTextProps> = ({ text, className }) => {
  // URL regex pattern that matches http://, https://, and www. URLs
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;
  
  // Split text by URLs and create elements
  const parts = text.split(urlRegex);
  const elements: React.ReactNode[] = [];
  
  parts.forEach((part, index) => {
    if (urlRegex.test(part)) {
      // This is a URL - make it clickable
      let href = part;
      
      // Add https:// to www. URLs
      if (part.startsWith('www.')) {
        href = `https://${part}`;
      }
      
      elements.push(
        <a
          key={index}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: 'inherit',
            textDecoration: 'underline',
            wordBreak: 'break-all'
          }}
        >
          {part}
        </a>
      );
    } else {
      // Regular text
      elements.push(<React.Fragment key={index}>{part}</React.Fragment>);
    }
  });
  
  return <span className={className}>{elements}</span>;
};

export default LinkifiedText;

