import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Eye } from 'lucide-react';

interface ViewCounterProps {
  postId: string;
  initialCount?: number;
}

export const ViewCounter = ({ postId, initialCount = 0 }: ViewCounterProps) => {
  const [viewCount, setViewCount] = useState(initialCount);
  const [hasViewed, setHasViewed] = useState(false);

  useEffect(() => {
    const incrementView = async () => {
      if (hasViewed) return;

      try {
        // Increment view count in database
        const { error } = await supabase.rpc('increment_post_view', {
          post_id: postId
        });

        if (error) {
          console.error('Error incrementing view:', error);
          return;
        }

        setViewCount(prev => prev + 1);
        setHasViewed(true);
      } catch (error) {
        console.error('Error incrementing view:', error);
      }
    };

    // Track view after a delay to ensure user is actually reading
    const viewTimer = setTimeout(incrementView, 2000);
    
    return () => clearTimeout(viewTimer);
  }, [postId, hasViewed]);

  return (
    <div className="flex items-center gap-1 text-muted-foreground text-sm">
      <Eye className="h-4 w-4" />
      <span>{viewCount.toLocaleString()}</span>
    </div>
  );
};