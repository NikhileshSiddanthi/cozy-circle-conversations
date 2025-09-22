import { Users, TrendingUp } from 'lucide-react';
import { useVisitorTracking } from '@/hooks/useVisitorTracking';

export const VisitorCounter = () => {
  const { totalVisits, liveUsers } = useVisitorTracking();

  return (
    <div className="flex items-center gap-4 text-sm text-muted-foreground">
      <div className="flex items-center gap-1">
        <TrendingUp className="h-4 w-4" />
        <span>{totalVisits.toLocaleString()}</span>
        <span className="hidden sm:inline">visits</span>
      </div>
      <div className="flex items-center gap-1">
        <Users className="h-4 w-4" />
        <span>{liveUsers}</span>
        <span className="hidden sm:inline">online</span>
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
      </div>
    </div>
  );
};