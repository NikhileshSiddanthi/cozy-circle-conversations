import React from 'react';
import { InAppLink } from './InAppLink';

interface ClickableContentProps {
  content: string;
  className?: string;
}

// URL regex that matches http/https URLs
const URL_REGEX = /(https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&=]*))/g;

export const ClickableContent: React.FC<ClickableContentProps> = ({ 
  content, 
  className = "" 
}) => {
  const renderContentWithLinks = (text: string) => {
    const parts = text.split(URL_REGEX);
    
    return parts.map((part, index) => {
      // Check if this part is a URL
      if (URL_REGEX.test(part)) {
        return (
          <InAppLink
            key={index}
            href={part}
            className="text-primary hover:underline break-all"
            onClick={(e) => {
              e.stopPropagation(); // Prevent triggering parent click handlers
            }}
          >
            {part}
          </InAppLink>
        );
      }
      return part;
    });
  };

  return (
    <div className={className}>
      {content.split('\n').map((line, lineIndex) => (
        <React.Fragment key={lineIndex}>
          {lineIndex > 0 && <br />}
          {renderContentWithLinks(line)}
        </React.Fragment>
      ))}
    </div>
  );
};