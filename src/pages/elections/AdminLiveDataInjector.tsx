import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useUserRole } from '@/hooks/useUserRole';
import { useNavigate } from 'react-router-dom';
import { Radio, BarChart3, Loader2 } from 'lucide-react';

const AdminLiveDataInjector = () => {
  const { isAdmin, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // ECI Data Form
  const [roundNumber, setRoundNumber] = useState(1);
  const [bjpVotes, setBjpVotes] = useState(0);
  const [incVotes, setIncVotes] = useState(0);
  const [localVotes, setLocalVotes] = useState(0);

  // Exit Poll Form
  const [provider, setProvider] = useState('');
  const [sampleSize, setSampleSize] = useState(1000);
  const [methodology, setMethodology] = useState('');
  const [predictedWinner, setPredictedWinner] = useState('BJP');
  const [bjpShare, setBjpShare] = useState(40);
  const [incShare, setIncShare] = useState(35);
  const [localShare, setLocalShare] = useState(25);
  const [confidence, setConfidence] = useState(0.72);
  const [marginOfError, setMarginOfError] = useState(3.2);

  if (roleLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </MainLayout>
    );
  }

  if (!isAdmin) {
    navigate('/');
    return null;
  }

  const handleIngestECI = async () => {
    setLoading(true);
    try {
      const totalVotes = bjpVotes + incVotes + localVotes;
      
      const { data, error } = await supabase.functions.invoke('ingest-eci-data', {
        body: {
          constituency_id: 'jubilee-hills-2025',
          round_number: roundNumber,
          party_votes: {
            BJP: bjpVotes,
            INC: incVotes,
            LOCAL: localVotes,
          },
          total_counted: totalVotes,
          timestamp: new Date().toISOString(),
        },
      });

      if (error) throw error;

      toast.success('ECI Data Ingested', {
        description: `Round ${roundNumber} data added successfully`,
      });

      // Increment round for next entry
      setRoundNumber((prev) => prev + 1);
      
      // Add some votes for simulation
      setBjpVotes((prev) => prev + Math.floor(Math.random() * 500) + 300);
      setIncVotes((prev) => prev + Math.floor(Math.random() * 450) + 250);
      setLocalVotes((prev) => prev + Math.floor(Math.random() * 200) + 100);
    } catch (error) {
      console.error('Error ingesting ECI data:', error);
      toast.error('Failed to ingest data', {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleIngestExitPoll = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ingest-exit-poll', {
        body: {
          provider,
          constituency_id: 'jubilee-hills-2025',
          sample_size: sampleSize,
          methodology,
          predicted_winner: predictedWinner,
          vote_share: {
            BJP: bjpShare,
            INC: incShare,
            LOCAL: localShare,
          },
          confidence,
          margin_of_error: marginOfError,
          published_at: new Date().toISOString(),
        },
      });

      if (error) throw error;

      toast.success('Exit Poll Added', {
        description: `${provider} projection added successfully`,
      });

      // Clear form
      setProvider('');
    } catch (error) {
      console.error('Error ingesting exit poll:', error);
      toast.error('Failed to add exit poll', {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAutoSimulate = async () => {
    setLoading(true);
    try {
      for (let i = 0; i < 5; i++) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const bjp = bjpVotes + (Math.floor(Math.random() * 500) + 300) * (i + 1);
        const inc = incVotes + (Math.floor(Math.random() * 450) + 250) * (i + 1);
        const local = localVotes + (Math.floor(Math.random() * 200) + 100) * (i + 1);
        
        await supabase.functions.invoke('ingest-eci-data', {
          body: {
            constituency_id: 'jubilee-hills-2025',
            round_number: roundNumber + i,
            party_votes: { BJP: bjp, INC: inc, LOCAL: local },
            total_counted: bjp + inc + local,
            timestamp: new Date().toISOString(),
          },
        });

        toast.info(`Round ${roundNumber + i} simulated`);
      }

      toast.success('Simulation Complete', {
        description: '5 rounds of counting simulated',
      });

      setRoundNumber((prev) => prev + 5);
    } catch (error) {
      console.error('Error in simulation:', error);
      toast.error('Simulation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <Radio className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold">Live Data Injector</h1>
            <Badge variant="destructive" className="ml-auto">ADMIN ONLY</Badge>
          </div>
          <p className="text-muted-foreground">
            Manually inject ECI counting data and exit polls for testing the live election channel
          </p>
        </div>

        <Tabs defaultValue="eci" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="eci">ECI Official Data</TabsTrigger>
            <TabsTrigger value="exitpoll">Exit Polls</TabsTrigger>
          </TabsList>

          <TabsContent value="eci" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Inject ECI Counting Data</CardTitle>
                <CardDescription>
                  Add official vote counts for Round {roundNumber}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Round Number</Label>
                    <Input
                      type="number"
                      value={roundNumber}
                      onChange={(e) => setRoundNumber(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>BJP Votes</Label>
                  <Input
                    type="number"
                    value={bjpVotes}
                    onChange={(e) => setBjpVotes(Number(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>INC Votes</Label>
                  <Input
                    type="number"
                    value={incVotes}
                    onChange={(e) => setIncVotes(Number(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>LOCAL Votes</Label>
                  <Input
                    type="number"
                    value={localVotes}
                    onChange={(e) => setLocalVotes(Number(e.target.value))}
                  />
                </div>

                <div className="text-sm text-muted-foreground pt-2 border-t">
                  Total Votes: {(bjpVotes + incVotes + localVotes).toLocaleString()}
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleIngestECI} disabled={loading} className="flex-1">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Ingest Round {roundNumber}
                  </Button>
                  <Button onClick={handleAutoSimulate} disabled={loading} variant="secondary">
                    Auto Simulate 5 Rounds
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="exitpoll" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Add Exit Poll Projection</CardTitle>
                <CardDescription>
                  Add survey-based predictions from polling agencies
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Provider / Agency</Label>
                  <Input
                    placeholder="e.g., Axis My India, C-Voter, CSDS-Lokniti"
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Sample Size</Label>
                    <Input
                      type="number"
                      value={sampleSize}
                      onChange={(e) => setSampleSize(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Predicted Winner</Label>
                    <Select value={predictedWinner} onValueChange={setPredictedWinner}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BJP">BJP</SelectItem>
                        <SelectItem value="INC">INC</SelectItem>
                        <SelectItem value="LOCAL">LOCAL</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Methodology</Label>
                  <Textarea
                    placeholder="e.g., Exit-intercept survey with demographic weighting"
                    value={methodology}
                    onChange={(e) => setMethodology(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>BJP Vote Share (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={bjpShare}
                      onChange={(e) => setBjpShare(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>INC Vote Share (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={incShare}
                      onChange={(e) => setIncShare(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>LOCAL Vote Share (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={localShare}
                      onChange={(e) => setLocalShare(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Confidence (0-1)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={confidence}
                      onChange={(e) => setConfidence(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Margin of Error (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={marginOfError}
                      onChange={(e) => setMarginOfError(Number(e.target.value))}
                    />
                  </div>
                </div>

                <Button
                  onClick={handleIngestExitPoll}
                  disabled={loading || !provider}
                  className="w-full"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <BarChart3 className="h-4 w-4 mr-2" />}
                  Add Exit Poll
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Card className="mt-6 bg-muted/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold mb-1">View Live Channel</h3>
                <p className="text-sm text-muted-foreground">
                  Check your injected data in the live election channel
                </p>
              </div>
              <Button asChild>
                <a href="/elections/live" target="_blank">
                  View Live Channel
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default AdminLiveDataInjector;
