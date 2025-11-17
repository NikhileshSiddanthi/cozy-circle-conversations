import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, FileCheck, ClipboardCheck, Vote, BarChart3, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeUpdates } from '@/hooks/useRealtimeUpdates';

interface VoteCount {
  candidate_name: string;
  party: string;
  total_votes: number;
  booths_counted: number;
  total_booths: number;
}

const timelineEvents = [
  {
    date: 'Oct 11, 2025',
    title: 'Model Code of Conduct',
    description: 'Model code starts for Jubilee Hills constituency',
    icon: FileCheck,
    status: 'completed'
  },
  {
    date: 'Oct 17-25, 2025',
    title: 'Nomination Period',
    description: 'Candidates file their nomination papers',
    icon: ClipboardCheck,
    status: 'completed'
  },
  {
    date: 'Oct 26, 2025',
    title: 'Scrutiny of Nominations',
    description: 'Election Commission reviews all nominations',
    icon: ClipboardCheck,
    status: 'completed'
  },
  {
    date: 'Nov 11, 2025',
    title: 'Polling Day',
    description: 'Citizens cast their votes from 7 AM to 6 PM',
    icon: Vote,
    status: 'upcoming'
  },
  {
    date: 'TBD',
    title: 'Counting & Results',
    description: 'Vote counting and result declaration',
    icon: BarChart3,
    status: 'upcoming'
  }
];

const ElectionTimeline = () => {
  const [voteCounts, setVoteCounts] = useState<VoteCount[]>([]);
  const [isCounting, setIsCounting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResults();
  }, []);

  // Real-time updates for vote counting
  useRealtimeUpdates({
    table: 'elections_results',
    event: '*',
    filter: 'election_slug=eq.jubilee-hills-2025',
    onUpdate: () => {
      fetchResults();
    }
  });

  const fetchResults = async () => {
    try {
      const { data, error } = await supabase
        .from('elections_results_summary')
        .select('*')
        .eq('election_slug', 'jubilee-hills-2025');

      if (error) throw error;

      if (data && data.length > 0) {
        setVoteCounts(data);
        setIsCounting(true);
      }
    } catch (error) {
      console.error('Error fetching results:', error);
    } finally {
      setLoading(false);
    }
  };
  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Election Timeline</h2>
          <p className="text-muted-foreground">
            Key dates and milestones for the Jubilee Hills by-election
          </p>
        </div>

        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-border" />

          {/* Timeline events */}
          <div className="space-y-6">
            {timelineEvents.map((event, index) => {
              const Icon = event.icon;
              const isCompleted = event.status === 'completed';
              const isCountingEvent = event.title === 'Counting & Results';
              const showLiveData = isCountingEvent && isCounting && voteCounts.length > 0;
              
              return (
                <div key={index} className="relative flex gap-4">
                  {/* Icon */}
                  <div
                    className={`relative z-10 flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                      isCompleted
                        ? 'bg-primary border-primary'
                        : showLiveData
                        ? 'bg-primary border-primary animate-pulse'
                        : 'bg-background border-border'
                    }`}
                  >
                    <Icon
                      className={`h-5 w-5 ${
                        isCompleted || showLiveData ? 'text-primary-foreground' : 'text-muted-foreground'
                      }`}
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 pb-6">
                    <Card className={`p-4 ${isCompleted || showLiveData ? 'bg-accent/50' : ''}`}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-foreground">{event.title}</h3>
                            {showLiveData ? (
                              <Badge variant="destructive" className="animate-pulse">
                                Live Counting
                              </Badge>
                            ) : (
                              <Badge variant={isCompleted ? 'default' : 'outline'}>
                                {isCompleted ? 'Completed' : 'Upcoming'}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{event.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                        <Calendar className="h-4 w-4" />
                        <span>{event.date}</span>
                      </div>

                      {/* Live Vote Counting Data */}
                      {showLiveData && (
                        <div className="mt-4 pt-4 border-t border-border">
                          <div className="flex items-center gap-2 mb-3">
                            <TrendingUp className="h-4 w-4 text-primary" />
                            <span className="font-semibold text-sm text-foreground">
                              Live Results - {voteCounts[0]?.booths_counted || 0}/{voteCounts[0]?.total_booths || 0} Booths Counted
                            </span>
                          </div>
                          <div className="space-y-2">
                            {voteCounts.map((candidate, idx) => (
                              <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-background/50">
                                <div className="flex items-center gap-3">
                                  <span className="font-bold text-lg text-primary">
                                    #{idx + 1}
                                  </span>
                                  <div>
                                    <p className="font-semibold text-foreground">{candidate.candidate_name}</p>
                                    <p className="text-xs text-muted-foreground">{candidate.party}</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold text-lg text-foreground">
                                    {candidate.total_votes.toLocaleString()}
                                  </p>
                                  <p className="text-xs text-muted-foreground">votes</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </Card>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default ElectionTimeline;
