import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { useRealtimeUpdates } from '@/hooks/useRealtimeUpdates';
import { BarChart3, Info, Users } from 'lucide-react';
import { format } from 'date-fns';

interface ExitPoll {
  id: string;
  provider: string;
  sample_size: number;
  methodology: string;
  predicted_winner: string;
  vote_share: Record<string, number>;
  confidence: number;
  margin_of_error: number;
  published_at: string;
}

export const ExitPollsPanel = ({ constituencyId }: { constituencyId: string }) => {
  const [polls, setPolls] = useState<ExitPoll[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPolls = async () => {
    const { data, error } = await supabase
      .from('exit_polls')
      .select('*')
      .eq('constituency_id', constituencyId)
      .order('published_at', { ascending: false });

    if (error) {
      console.error('Error fetching exit polls:', error);
      setLoading(false);
      return;
    }

    setPolls(data as ExitPoll[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchPolls();
  }, [constituencyId]);

  useRealtimeUpdates({
    table: 'exit_polls',
    event: 'INSERT',
    filter: `constituency_id=eq.${constituencyId}`,
    onUpdate: () => {
      fetchPolls();
    },
  });

  if (loading) {
    return <Card><CardContent className="p-6">Loading exit polls...</CardContent></Card>;
  }

  return (
    <div className="space-y-4">
      <Alert variant="default" className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900">
        <Info className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        <AlertDescription className="text-amber-800 dark:text-amber-200">
          Exit polls are <strong>projections</strong> based on voter surveys and are not official results. 
          Confidence intervals and sample sizes are provided for transparency.
        </AlertDescription>
      </Alert>

      {polls.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No exit polls available yet</p>
            <p className="text-sm mt-1">Exit polls will appear here when published by agencies</p>
          </CardContent>
        </Card>
      ) : (
        polls.map((poll) => (
          <Card key={poll.id} className="border-2 hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{poll.provider}</CardTitle>
                  <div className="text-sm text-muted-foreground mt-1">
                    Published {format(new Date(poll.published_at), 'PPpp')}
                  </div>
                </div>
                <Badge variant="secondary" className="capitalize">
                  Projection
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Predicted Winner */}
              <div className="bg-accent/50 rounded-lg p-4">
                <div className="text-sm text-muted-foreground mb-1">Predicted Winner</div>
                <div className="text-2xl font-bold text-primary">{poll.predicted_winner}</div>
                <div className="text-sm text-muted-foreground mt-2">
                  Confidence: {(poll.confidence * 100).toFixed(1)}% 
                  {poll.margin_of_error && ` ± ${poll.margin_of_error}%`}
                </div>
              </div>

              {/* Vote Share Distribution */}
              <div className="space-y-3">
                <h5 className="font-semibold text-sm flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Projected Vote Share
                </h5>
                {Object.entries(poll.vote_share).map(([party, share]) => (
                  <div key={party} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{party}</span>
                      <span className="text-muted-foreground">{share}%</span>
                    </div>
                    <Progress value={share} className="h-2" />
                  </div>
                ))}
              </div>

              {/* Methodology */}
              <div className="border-t pt-3 space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>Sample Size: {poll.sample_size.toLocaleString()} respondents</span>
                </div>
                <div className="text-muted-foreground">
                  <strong>Methodology:</strong> {poll.methodology}
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}

      {polls.length > 1 && (
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-base">Poll of Polls Average</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Weighted average of {polls.length} exit polls coming soon
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
