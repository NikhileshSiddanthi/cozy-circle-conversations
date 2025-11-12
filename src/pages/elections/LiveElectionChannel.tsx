import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MainLayout } from '@/components/layout/MainLayout';
import { LiveTicker } from '@/components/elections/LiveTicker';
import { ConstituencySnapshot } from '@/components/elections/ConstituencySnapshot';
import { ExitPollsPanel } from '@/components/elections/ExitPollsPanel';
import ElectionTimeline from '@/components/elections/ElectionTimeline';
import { AutomationControl } from '@/components/elections/AutomationControl';
import { Badge } from '@/components/ui/badge';
import { Radio } from 'lucide-react';

const LiveElectionChannel = () => {
  const constituencyId = 'jubilee-hills-2025';

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <Radio className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold">Live Election Channel</h1>
            <Badge variant="secondary" className="animate-pulse ml-auto">
              <span className="h-2 w-2 rounded-full bg-red-500 mr-2 inline-block" />
              LIVE
            </Badge>
          </div>
          <p className="text-muted-foreground text-lg">
            Real-time election coverage with official ECI data, exit polls, and expert analysis
          </p>
        </div>

        {/* Automation Control */}
        <div className="mb-6">
          <AutomationControl />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Left Column: Constituency Snapshot */}
          <div className="lg:col-span-2">
            <ConstituencySnapshot constituencyId={constituencyId} />
          </div>

          {/* Right Column: Live Ticker */}
          <div className="lg:col-span-1">
            <LiveTicker constituencyId={constituencyId} />
          </div>
        </div>

        {/* Tabs for Additional Info */}
        <Tabs defaultValue="timeline" className="w-full">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
            <TabsTrigger value="timeline">Timeline & Results</TabsTrigger>
            <TabsTrigger value="exit-polls">Exit Polls & Projections</TabsTrigger>
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
          </TabsList>

          <TabsContent value="timeline" className="mt-6">
            <ElectionTimeline />
          </TabsContent>

          <TabsContent value="exit-polls" className="mt-6">
            <ExitPollsPanel constituencyId={constituencyId} />
          </TabsContent>

          <TabsContent value="analysis" className="mt-6">
            <div className="bg-card border rounded-lg p-8 text-center text-muted-foreground">
              <p>Expert analysis and commentary coming soon</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default LiveElectionChannel;
