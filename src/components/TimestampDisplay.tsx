import { useState } from 'react';
import { formatRelative, formatFullWithTz, isEdited } from '@/utils/dates';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface TimestampDisplayProps {
  timestamp: string;
  editedAt?: string;
  className?: string;
  showEdited?: boolean;
}

export const TimestampDisplay = ({ 
  timestamp, 
  editedAt,
  className = "",
  showEdited = true 
}: TimestampDisplayProps) => {
  const [isHovered, setIsHovered] = useState(false);
  
  const relativeTime = formatRelative(timestamp);
  const fullTime = formatFullWithTz(timestamp);
  const wasEdited = showEdited && isEdited(timestamp, editedAt);
  
  const displayText = wasEdited 
    ? `Edited · ${formatRelative(editedAt!)}`
    : relativeTime;
    
  const tooltipText = wasEdited
    ? `Edited: ${formatFullWithTz(editedAt!)}\nCreated: ${fullTime}`
    : fullTime;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <time 
            dateTime={wasEdited ? editedAt : timestamp}
            className={`text-muted-foreground cursor-help ${className}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            {displayText}
          </time>
        </TooltipTrigger>
        <TooltipContent>
          <div className="whitespace-pre-line">
            {tooltipText}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};