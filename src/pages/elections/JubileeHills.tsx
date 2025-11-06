import React, { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, MapPin, Users, TrendingUp, Vote, Info } from 'lucide-react';
import { toast } from 'sonner';
import CandidateGrid from '@/components/elections/CandidateGrid';
import BoothMap from '@/components/elections/BoothMap';
import ElectionTimeline from '@/components/elections/ElectionTimeline';
import SentimentDashboard from '@/components/elections/SentimentDashboard';
import PublicPoll from '@/components/elections/PublicPoll';
import ElectionFAQ from '@/components/elections/ElectionFAQ';

const JubileeHills = () => {
  const [stats, setStats] = useState({
    candidates: 0,
    booths: 0,
    sentiment: { positive: 0, neutral: 0, negative: 0 }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [candidatesRes, boothsRes, sentimentRes] = await Promise.all([
        supabase.from('elections_candidates').select('id', { count: 'exact', head: true }),
        supabase.from('elections_booths').select('id', { count: 'exact', head: true }),
        supabase
          .from('elections_sentiment_snapshots')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1)
          .single()
      ]);

      setStats({
        candidates: candidatesRes.count || 0,
        booths: boothsRes.count || 0,
        sentiment: sentimentRes.data ? {
          positive: sentimentRes.data.positive,
          neutral: sentimentRes.data.neutral,
          negative: sentimentRes.data.negative
        } : { positive: 0, neutral: 0, negative: 0 }
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6 pb-8">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-3xl font-bold text-foreground">
                Jubilee Hills Election Dashboard
              </h1>
              <Badge variant="destructive" className="animate-pulse">Live</Badge>
            </div>
            <p className="text-muted-foreground">
              Voter Guide & Community Pulse for the by-election on November 11, 2025
            </p>
          </div>
        </div>

        {/* Disclaimer */}
        <Card className="p-4 bg-accent/50 border-accent">
          <div className="flex gap-2">
            <Info className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-sm text-foreground">
              This dashboard provides publicly available election information. It does not display live vote counts or results.
              Community sentiment is aggregated from public data sources.
            </p>
          </div>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Election Date</p>
                <p className="text-2xl font-bold text-foreground">Nov 11, 2025</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Candidates</p>
                <p className="text-2xl font-bold text-foreground">{stats.candidates}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <MapPin className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Polling Booths</p>
                <p className="text-2xl font-bold text-foreground">{stats.booths}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">What's Live</p>
                <p className="text-lg font-bold text-foreground">Sentiment, Polls</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="candidates" className="w-full">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6">
            <TabsTrigger value="candidates">Candidates</TabsTrigger>
            <TabsTrigger value="booths">Polling Booths</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="sentiment">Sentiment</TabsTrigger>
            <TabsTrigger value="polls">Public Poll</TabsTrigger>
            <TabsTrigger value="faq">FAQ</TabsTrigger>
          </TabsList>

          <TabsContent value="candidates" className="mt-6">
            <CandidateGrid />
          </TabsContent>

          <TabsContent value="booths" className="mt-6">
            <BoothMap />
          </TabsContent>

          <TabsContent value="timeline" className="mt-6">
            <ElectionTimeline />
          </TabsContent>

          <TabsContent value="sentiment" className="mt-6">
            <SentimentDashboard />
          </TabsContent>

          <TabsContent value="polls" className="mt-6">
            <PublicPoll />
          </TabsContent>

          <TabsContent value="faq" className="mt-6">
            <ElectionFAQ />
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <Card className="p-4 bg-muted/30">
          <p className="text-sm text-center text-muted-foreground">
            Powered by Cozi | Data from Election Commission of India & open sources
          </p>
        </Card>
      </div>
    </MainLayout>
  );
};

export default JubileeHills;
