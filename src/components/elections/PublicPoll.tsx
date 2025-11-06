import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { Vote, Check } from 'lucide-react';
import { toast } from 'sonner';

interface Poll {
  id: string;
  question: string;
  options: string[];
}

interface PollResults {
  [key: number]: number;
}

const PublicPoll = () => {
  const [poll, setPoll] = useState<Poll | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [results, setResults] = useState<PollResults>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivePoll();
  }, []);

  const fetchActivePoll = async () => {
    try {
      const { data: pollData, error: pollError } = await supabase
        .from('elections_public_polls')
        .select('*')
        .eq('election_slug', 'jubilee-hills-2025')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (pollError) throw pollError;

      if (pollData) {
        setPoll({
          id: pollData.id,
          question: pollData.question,
          options: pollData.options as string[]
        });

        // Fetch results
        const { data: responsesData, error: responsesError } = await supabase
          .from('elections_poll_responses')
          .select('option_index')
          .eq('poll_id', pollData.id);

        if (responsesError) throw responsesError;

        // Calculate results
        const resultCounts: PollResults = {};
        (pollData.options as string[]).forEach((_, index) => {
          resultCounts[index] = 0;
        });

        responsesData?.forEach((response) => {
          resultCounts[response.option_index]++;
        });

        setResults(resultCounts);

        // Check if user already voted (via localStorage)
        const votedPolls = JSON.parse(localStorage.getItem('voted_polls') || '[]');
        setHasVoted(votedPolls.includes(pollData.id));
      }
    } catch (error) {
      console.error('Error fetching poll:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async () => {
    if (selectedOption === null || !poll) return;

    try {
      // Create a simple hash of IP for anonymization
      const ipHash = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(Date.now().toString())
      ).then(buf => 
        Array.from(new Uint8Array(buf))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('')
          .substring(0, 16)
      );

      const { error } = await supabase
        .from('elections_poll_responses')
        .insert({
          poll_id: poll.id,
          option_index: selectedOption,
          ip_hash: ipHash
        });

      if (error) throw error;

      // Save to localStorage
      const votedPolls = JSON.parse(localStorage.getItem('voted_polls') || '[]');
      votedPolls.push(poll.id);
      localStorage.setItem('voted_polls', JSON.stringify(votedPolls));

      setHasVoted(true);
      toast.success('Vote submitted successfully!');
      
      // Refresh results
      fetchActivePoll();
    } catch (error) {
      console.error('Error submitting vote:', error);
      toast.error('Failed to submit vote');
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading poll...</div>;
  }

  if (!poll) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">No active polls at the moment.</p>
      </Card>
    );
  }

  const totalVotes = Object.values(results).reduce((sum, count) => sum + count, 0);

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div className="flex items-start gap-3">
          <Vote className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-xl font-bold text-foreground mb-2">{poll.question}</h3>
            <p className="text-sm text-muted-foreground">
              {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'} • Anonymous poll
            </p>
          </div>
        </div>

        {!hasVoted ? (
          <div className="space-y-4">
            <RadioGroup value={selectedOption?.toString()} onValueChange={(val) => setSelectedOption(parseInt(val))}>
              <div className="space-y-3">
                {poll.options.map((option, index) => (
                  <div key={index} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-accent transition-colors">
                    <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                    <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                      {option}
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>

            <Button
              onClick={handleVote}
              disabled={selectedOption === null}
              className="w-full"
            >
              Submit Vote
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <Check className="h-5 w-5 text-green-600" />
              <p className="text-sm text-green-600 font-medium">You've already voted in this poll</p>
            </div>

            <div className="space-y-3">
              {poll.options.map((option, index) => {
                const count = results[index] || 0;
                const percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;

                return (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">{option}</span>
                      <span className="text-sm text-muted-foreground">
                        {percentage}% ({count})
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default PublicPoll;
