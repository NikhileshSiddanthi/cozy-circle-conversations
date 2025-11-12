import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Radio, RefreshCw, CheckCircle2, XCircle, Loader2, Zap } from 'lucide-react';

export const AutomationControl = () => {
  const [loading, setLoading] = useState(false);
  const [lastRun, setLastRun] = useState<any>(null);

  const runOrchestrator = async () => {
    setLoading(true);
    try {
      toast.info('Starting automated data collection...', {
        description: 'Running all collectors: ECI, News, and Twitter',
      });

      const { data, error } = await supabase.functions.invoke('election-data-orchestrator', {});

      if (error) throw error;

      setLastRun(data);

      const { summary } = data;
      
      if (summary.successful > 0) {
        toast.success('Data Collection Complete', {
          description: `Successfully ran ${summary.successful} out of ${summary.total_tasks} collectors`,
        });
      } else {
        toast.error('Collection Failed', {
          description: 'All data collectors failed. Check logs for details.',
        });
      }
    } catch (error) {
      console.error('Orchestrator error:', error);
      toast.error('Collection Error', {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Automated Data Collection
            </CardTitle>
            <CardDescription>
              Run all data collectors to fetch live election data from multiple sources
            </CardDescription>
          </div>
          <Badge variant={loading ? 'secondary' : 'outline'}>
            {loading ? 'Running...' : 'Ready'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* ECI Scraper Status */}
          <div className="border rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              {lastRun?.results?.eci_scraper ? (
                getStatusIcon(lastRun.results.eci_scraper.status)
              ) : (
                <Radio className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="text-sm font-medium">ECI Scraper</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Official counting data from ECI
            </p>
            {lastRun?.results?.eci_scraper?.data?.success && (
              <p className="text-xs text-green-600 mt-1">
                Round {lastRun.results.eci_scraper.data.round} collected
              </p>
            )}
          </div>

          {/* News Analysis Status */}
          <div className="border rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              {lastRun?.results?.news_analysis ? (
                getStatusIcon(lastRun.results.news_analysis.status)
              ) : (
                <Radio className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="text-sm font-medium">News Analysis</span>
            </div>
            <p className="text-xs text-muted-foreground">
              AI-powered sentiment from news
            </p>
            {lastRun?.results?.news_analysis?.data?.articles_analyzed && (
              <p className="text-xs text-green-600 mt-1">
                {lastRun.results.news_analysis.data.articles_analyzed} articles analyzed
              </p>
            )}
          </div>

          {/* Twitter Monitor Status */}
          <div className="border rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              {lastRun?.results?.twitter_monitor ? (
                getStatusIcon(lastRun.results.twitter_monitor.status)
              ) : (
                <Radio className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="text-sm font-medium">Twitter Monitor</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Social media sentiment tracking
            </p>
            {lastRun?.results?.twitter_monitor?.data?.tweets_analyzed && (
              <p className="text-xs text-green-600 mt-1">
                {lastRun.results.twitter_monitor.data.tweets_analyzed} tweets analyzed
              </p>
            )}
          </div>
        </div>

        <Button 
          onClick={runOrchestrator} 
          disabled={loading}
          className="w-full"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Collecting Data...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Run All Collectors Now
            </>
          )}
        </Button>

        {lastRun && (
          <div className="text-xs text-muted-foreground text-center pt-2 border-t">
            Last run: {new Date(lastRun.completed_at).toLocaleTimeString()} — 
            {lastRun.summary.successful}/{lastRun.summary.total_tasks} successful
          </div>
        )}
      </CardContent>
    </Card>
  );
};
