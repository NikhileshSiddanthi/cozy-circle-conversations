import { Users, Activity, Eye } from 'lucide-react';
import { useVisitorTracking } from '@/hooks/useVisitorTracking';
import { Badge } from './ui/badge';

export const VisitorCounter = () => {
  const { totalVisitors, liveUsers } = useVisitorTracking();

  return (
    <div className="flex items-center gap-3 text-sm">
      {/* Live Users */}
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-500/10 border border-green-500/20">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        <Activity className="h-3.5 w-3.5 text-green-500" />
        <span className="text-green-500 font-medium">{liveUsers}</span>
      </div>

      {/* Total Visitors */}
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-primary/10 border border-primary/20">
        <Eye className="h-3.5 w-3.5 text-primary" />
        <span className="text-primary font-medium">{totalVisitors.toLocaleString()}</span>
      </div>
    </div>
  );
};