import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useRealtimeUpdates } from '@/hooks/useRealtimeUpdates';
import { Trophy, FileText, Share2, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface CanonicalData {
  constituency_id: string;
  last_update: string;
  canonical_data: {
    party_votes: Record<string, number>;
    total_counted: number;
    round_number?: number;
    form20_url?: string;
  };
  source: string;
  total_counted: number;
  leading_party: string;
  status: 'counting' | 'called' | 'recounting';
}

export const ConstituencySnapshot = ({ constituencyId }: { constituencyId: string }) => {
  const [data, setData] = useState<CanonicalData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCanonical = async () => {
    const { data: canonical, error } = await supabase
      .from('election_canonical')
      .select('*')
      .eq('constituency_id', constituencyId)
      .single();

    if (error) {
      console.error('Error fetching canonical:', error);
      setLoading(false);
      return;
    }

    setData(canonical as unknown as CanonicalData);
    setLoading(false);
  };

  useEffect(() => {
    fetchCanonical();
  }, [constituencyId]);

  useRealtimeUpdates({
    table: 'election_canonical',
    event: '*',
    filter: `constituency_id=eq.${constituencyId}`,
    onUpdate: () => {
      fetchCanonical();
    },
  });

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Data Available</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Counting has not started yet for this constituency.
          </p>
        </CardContent>
      </Card>
    );
  }

  const partyVotes = data.canonical_data.party_votes || {};
  const totalVotes = data.total_counted;
  const sortedParties = Object.entries(partyVotes).sort((a, b) => b[1] - a[1]);

  return (
    <Card className="border-2">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-2xl mb-1">Jubilee Hills By-Election 2025</CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={data.status === 'called' ? 'default' : 'secondary'} className="capitalize">
                {data.status}
              </Badge>
              <Badge variant="outline" className="text-xs">
                Source: {data.source.toUpperCase()} (Official)
              </Badge>
              {data.canonical_data.round_number && (
                <Badge variant="outline" className="text-xs">
                  Round {data.canonical_data.round_number}
                </Badge>
              )}
            </div>
          </div>
          <div className="text-right text-sm text-muted-foreground">
            <div className="flex items-center gap-1 mb-1">
              <Clock className="h-3 w-3" />
              <span>Updated {format(new Date(data.last_update), 'HH:mm:ss')}</span>
            </div>
            <div className="font-semibold text-foreground">
              {totalVotes.toLocaleString()} votes counted
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Leading Candidate */}
        {sortedParties[0] && (
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="h-5 w-5 text-primary" />
              <span className="font-semibold text-lg">Leading</span>
            </div>
            <div className="text-2xl font-bold mb-1">{sortedParties[0][0]}</div>
            <div className="text-3xl font-bold text-primary mb-2">
              {sortedParties[0][1].toLocaleString()} votes
            </div>
            <div className="text-sm text-muted-foreground">
              {((sortedParties[0][1] / totalVotes) * 100).toFixed(2)}% vote share
            </div>
          </div>
        )}

        {/* Vote Distribution */}
        <div className="space-y-3">
          <h4 className="font-semibold">Vote Distribution</h4>
          {sortedParties.map(([party, votes]) => {
            const percentage = (votes / totalVotes) * 100;
            return (
              <div key={party} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{party}</span>
                  <span className="text-muted-foreground">
                    {votes.toLocaleString()} ({percentage.toFixed(2)}%)
                  </span>
                </div>
                <Progress value={percentage} className="h-3" />
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4 border-t">
          {data.canonical_data.form20_url && (
            <Button variant="outline" size="sm" asChild>
              <a href={data.canonical_data.form20_url} target="_blank" rel="noopener noreferrer">
                <FileText className="h-4 w-4 mr-2" />
                View Form-20
              </a>
            </Button>
          )}
          <Button variant="outline" size="sm">
            <Share2 className="h-4 w-4 mr-2" />
            Share Results
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
