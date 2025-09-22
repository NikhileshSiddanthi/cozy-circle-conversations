import { Users, Activity, Eye } from 'lucide-react';
import { useVisitorTracking } from '@/hooks/useVisitorTracking';
import { Badge } from './ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

export const VisitorCounter = () => {
  const { totalVisitors, liveUsers } = useVisitorTracking();

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2 md:gap-3 text-sm">
        {/* Live Users */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1 md:gap-1.5 px-1.5 md:px-2 py-1 rounded-full bg-green-500/10 border border-green-500/20 cursor-help">
              <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-green-500 rounded-full animate-pulse" />
              <Activity className="h-3 w-3 md:h-3.5 md:w-3.5 text-green-500" />
              <span className="text-green-500 font-medium text-xs md:text-sm">{liveUsers}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Users currently online</p>
          </TooltipContent>
        </Tooltip>

        {/* Total Visitors */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1 md:gap-1.5 px-1.5 md:px-2 py-1 rounded-full bg-primary/10 border border-primary/20 cursor-help">
              <Eye className="h-3 w-3 md:h-3.5 md:w-3.5 text-primary" />
              <span className="text-primary font-medium text-xs md:text-sm">{totalVisitors.toLocaleString()}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Total visitors to date</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
};