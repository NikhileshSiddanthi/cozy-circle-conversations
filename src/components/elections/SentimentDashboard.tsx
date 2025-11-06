import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, TrendingDown, Minus, AlertCircle } from 'lucide-react';

interface SentimentData {
  total: number;
  positive: number;
  neutral: number;
  negative: number;
  topics: Array<{ name: string; count: number; percentage: number }>;
  created_at: string;
}

const topicEmojis: Record<string, string> = {
  'water and drainage': '💧',
  'roads and infrastructure': '🛣️',
  'education': '🏫',
  'health facilities': '🏥',
  'environment': '🌳',
  'safety and security': '🛡️',
  'employment': '💼',
  'housing': '🏘️'
};

const SentimentDashboard = () => {
  const [sentimentData, setSentimentData] = useState<SentimentData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSentiment();
    const interval = setInterval(fetchSentiment, 5 * 60 * 1000); // Refresh every 5 minutes
    return () => clearInterval(interval);
  }, []);

  const fetchSentiment = async () => {
    try {
      const { data, error } = await supabase
        .from('elections_sentiment_snapshots')
        .select('*')
        .eq('election_slug', 'jubilee-hills-2025')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;
      if (data) {
        setSentimentData({
          ...data,
          topics: (data.topics as any) || []
        });
      }
    } catch (error) {
      console.error('Error fetching sentiment:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading sentiment data...</div>;
  }

  if (!sentimentData) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">No sentiment data available yet.</p>
      </Card>
    );
  }

  const positivePercent = Math.round((sentimentData.positive / sentimentData.total) * 100);
  const neutralPercent = Math.round((sentimentData.neutral / sentimentData.total) * 100);
  const negativePercent = Math.round((sentimentData.negative / sentimentData.total) * 100);

  return (
    <div className="space-y-6">
      {/* Disclaimer */}
      <Card className="p-4 bg-accent/50 border-accent">
        <div className="flex gap-2">
          <AlertCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
          <p className="text-sm text-foreground">
            Community sentiment is aggregated from public data sources. This is not an official result.
            Last updated: {new Date(sentimentData.created_at).toLocaleString()}
          </p>
        </div>
      </Card>

      {/* Sentiment Overview */}
      <Card className="p-6">
        <h3 className="text-xl font-bold text-foreground mb-4">Community Sentiment</h3>
        
        {/* Sentiment Bar */}
        <div className="space-y-4">
          <div className="h-8 flex rounded-lg overflow-hidden">
            <div
              className="bg-green-500 flex items-center justify-center text-white text-sm font-medium"
              style={{ width: `${positivePercent}%` }}
            >
              {positivePercent > 10 && `${positivePercent}%`}
            </div>
            <div
              className="bg-gray-400 flex items-center justify-center text-white text-sm font-medium"
              style={{ width: `${neutralPercent}%` }}
            >
              {neutralPercent > 10 && `${neutralPercent}%`}
            </div>
            <div
              className="bg-red-500 flex items-center justify-center text-white text-sm font-medium"
              style={{ width: `${negativePercent}%` }}
            >
              {negativePercent > 10 && `${negativePercent}%`}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-green-600 mb-1">
                <TrendingUp className="h-4 w-4" />
                <span className="font-bold">{positivePercent}%</span>
              </div>
              <p className="text-sm text-muted-foreground">Positive</p>
              <p className="text-xs text-muted-foreground">{sentimentData.positive} mentions</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-gray-600 mb-1">
                <Minus className="h-4 w-4" />
                <span className="font-bold">{neutralPercent}%</span>
              </div>
              <p className="text-sm text-muted-foreground">Neutral</p>
              <p className="text-xs text-muted-foreground">{sentimentData.neutral} mentions</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-red-600 mb-1">
                <TrendingDown className="h-4 w-4" />
                <span className="font-bold">{negativePercent}%</span>
              </div>
              <p className="text-sm text-muted-foreground">Negative</p>
              <p className="text-xs text-muted-foreground">{sentimentData.negative} mentions</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Top Topics */}
      <Card className="p-6">
        <h3 className="text-xl font-bold text-foreground mb-4">Top Discussion Topics</h3>
        <div className="space-y-3">
          {sentimentData.topics?.slice(0, 5).map((topic, index) => {
            const emoji = topicEmojis[topic.name.toLowerCase()] || '📌';
            return (
              <div key={index} className="flex items-center gap-3">
                <span className="text-2xl">{emoji}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-foreground capitalize">{topic.name}</span>
                    <Badge variant="secondary">{topic.percentage}%</Badge>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${topic.percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};

export default SentimentDashboard;
