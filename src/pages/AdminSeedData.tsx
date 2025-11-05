import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Sparkles, CheckCircle2, XCircle, Database } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function AdminSeedData() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    stats?: {
      categories: number;
      groups: number;
      posts: number;
      comments: number;
    };
    error?: string;
  } | null>(null);

  const handleGenerateSeedData = async () => {
    try {
      setIsGenerating(true);
      setResult(null);

      toast.info('Starting seed data generation...', {
        description: 'This may take several minutes. Please wait...'
      });

      const { data, error } = await supabase.functions.invoke('generate-seed-data', {
        body: {}
      });

      if (error) {
        throw error;
      }

      setResult(data);

      if (data.success) {
        toast.success('Seed data generated successfully!', {
          description: `Created ${data.stats?.categories} categories, ${data.stats?.groups} groups, ${data.stats?.posts} posts, and ${data.stats?.comments} comments.`
        });
      } else {
        toast.error('Failed to generate seed data', {
          description: data.error || 'Unknown error'
        });
      }

    } catch (error) {
      console.error('Error generating seed data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      setResult({
        success: false,
        message: 'Failed to generate seed data',
        error: errorMessage
      });

      toast.error('Error generating seed data', {
        description: errorMessage
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Seed Data Generator</h1>
          <p className="text-muted-foreground">
            Generate sample data for your COZI platform using AI
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              AI-Powered Seed Data Generation
            </CardTitle>
            <CardDescription>
              This will create 2 categories (Technology & Sports), 1 group per category, 
              5 posts per group (10 posts total), and 3 comments per post (30 comments) 
              using AI to generate realistic content.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Sparkles className="h-4 w-4" />
              <AlertDescription>
                <strong>Note:</strong> This process uses AI to generate content and may take 
                several minutes to complete. Please be patient and don't close this page.
              </AlertDescription>
            </Alert>

            <Button
              onClick={handleGenerateSeedData}
              disabled={isGenerating}
              size="lg"
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Generating Seed Data...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" />
                  Generate Seed Data
                </>
              )}
            </Button>

            {result && (
              <Alert variant={result.success ? 'default' : 'destructive'}>
                {result.success ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-semibold">{result.message}</p>
                    {result.stats && (
                      <div className="grid grid-cols-2 gap-2 text-sm mt-2">
                        <div>Categories: <strong>{result.stats.categories}</strong></div>
                        <div>Groups: <strong>{result.stats.groups}</strong></div>
                        <div>Posts: <strong>{result.stats.posts}</strong></div>
                        <div>Comments: <strong>{result.stats.comments}</strong></div>
                      </div>
                    )}
                    {result.error && (
                      <p className="text-sm mt-2 text-destructive">{result.error}</p>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {isGenerating && (
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground text-center">
                  Generating content with AI... This should take 1-2 minutes
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary animate-pulse" style={{ width: '100%' }} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>What gets created?</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500 flex-shrink-0" />
                <span><strong>2 Categories:</strong> Technology and Sports</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500 flex-shrink-0" />
                <span><strong>2 Groups:</strong> AI-generated group names and descriptions</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500 flex-shrink-0" />
                <span><strong>10 Posts:</strong> Engaging posts with AI-generated titles and content</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500 flex-shrink-0" />
                <span><strong>30 Comments:</strong> Thoughtful AI-generated comments on each post</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
