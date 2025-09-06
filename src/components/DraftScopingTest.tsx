import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, XCircle, AlertCircle, Upload, Users, Database } from 'lucide-react';

interface TestResult {
  test: string;
  status: 'pending' | 'pass' | 'fail' | 'running';
  message: string;
  data?: any;
  details?: string[];
}

export const DraftScopingTest: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);

  const updateResult = (testName: string, status: TestResult['status'], message: string, data?: any, details?: string[]) => {
    setResults(prev => {
      const existing = prev.find(r => r.test === testName);
      if (existing) {
        existing.status = status;
        existing.message = message;
        existing.data = data;
        existing.details = details;
        return [...prev];
      } else {
        return [...prev, { test: testName, status, message, data, details }];
      }
    });
  };

  const runComprehensiveTests = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "Please log in to run tests",
        variant: "destructive"
      });
      return;
    }

    setIsRunning(true);
    setResults([]);

    // Test groups
    const groupA = 'd9ae0eaf-e3ca-40ed-97d1-7b4dc6b332a8'; // Generative AI
    const groupB = '6304d445-d9d4-469e-9912-e8924de201a4'; // Anurag College

    try {
      // Clean up any existing test drafts first
      updateResult('Initial Cleanup', 'running', 'Cleaning up any existing test drafts...');
      
      const { data: existingDrafts } = await supabase
        .from('post_drafts')
        .select('id')
        .eq('user_id', user.id)
        .ilike('title', 'Test Draft%');

      if (existingDrafts && existingDrafts.length > 0) {
        for (const draft of existingDrafts) {
          await supabase.from('post_drafts').delete().eq('id', draft.id);
        }
      }

      updateResult('Initial Cleanup', 'pass', `Cleaned up ${existingDrafts?.length || 0} existing test drafts`);

      // TEST 1: Create draft for Group A
      updateResult('Create Draft Group A', 'running', 'Creating draft for Generative AI group...');
      
      const { data: draftAResponse, error: draftAError } = await supabase.functions.invoke('draft-manager', {
        body: {
          groupId: groupA,
          title: 'Test Draft Group A - Media Upload Test',
          content: 'This draft will test media scoping for Group A',
          metadata: { testId: 'group-a-test' }
        }
      });

      if (draftAError || !draftAResponse?.draft) {
        updateResult('Create Draft Group A', 'fail', `Failed: ${draftAError?.message || 'No draft returned'}`);
        return;
      }

      const draftA = draftAResponse.draft;
      updateResult('Create Draft Group A', 'pass', 'Draft A created successfully', { draftId: draftA.id, groupId: draftA.group_id });

      // TEST 2: Create draft for Group B
      updateResult('Create Draft Group B', 'running', 'Creating draft for Anurag College group...');
      
      const { data: draftBResponse, error: draftBError } = await supabase.functions.invoke('draft-manager', {
        body: {
          groupId: groupB,
          title: 'Test Draft Group B - Media Upload Test',
          content: 'This draft will test media scoping for Group B',
          metadata: { testId: 'group-b-test' }
        }
      });

      if (draftBError || !draftBResponse?.draft) {
        updateResult('Create Draft Group B', 'fail', `Failed: ${draftBError?.message || 'No draft returned'}`);
        return;
      }

      const draftB = draftBResponse.draft;
      updateResult('Create Draft Group B', 'pass', 'Draft B created successfully', { draftId: draftB.id, groupId: draftB.group_id });

      // TEST 3: Simulate media upload to Draft A
      updateResult('Upload Media to Group A', 'running', 'Simulating media upload to Group A draft...');
      
      const { data: mediaAResponse, error: mediaAError } = await supabase.functions.invoke('media-upload/complete', {
        body: {
          draftId: draftA.id,
          fileId: `test-file-a-${Date.now()}.jpg`,
          url: `https://example.com/test-media-a.jpg`,
          mimeType: 'image/jpeg',
          fileSize: 1024000
        }
      });

      if (mediaAError) {
        updateResult('Upload Media to Group A', 'fail', `Failed: ${mediaAError.message}`);
      } else {
        updateResult('Upload Media to Group A', 'pass', 'Media uploaded to Group A draft successfully', mediaAResponse);
      }

      // TEST 4: Verify media is only in Group A draft
      updateResult('Verify Media Isolation', 'running', 'Verifying media is only attached to Group A draft...');
      
      const { data: draftAWithMedia, error: draftAFetchError } = await supabase.functions.invoke('draft-manager', {
        body: { groupId: groupA }
      });

      const { data: draftBWithMedia, error: draftBFetchError } = await supabase.functions.invoke('draft-manager', {
        body: { groupId: groupB }
      });

      if (draftAFetchError || draftBFetchError) {
        updateResult('Verify Media Isolation', 'fail', 'Failed to fetch drafts for verification');
        return;
      }

      const groupADraft = draftAWithMedia?.drafts?.find((d: any) => d.id === draftA.id);
      const groupBDraft = draftBWithMedia?.drafts?.find((d: any) => d.id === draftB.id);

      const groupAHasMedia = groupADraft?.draft_media?.length > 0;
      const groupBHasMedia = groupBDraft?.draft_media?.length > 0;

      if (groupAHasMedia && !groupBHasMedia) {
        updateResult('Verify Media Isolation', 'pass', 'Media correctly isolated to Group A only', {
          groupAMediaCount: groupADraft?.draft_media?.length || 0,
          groupBMediaCount: groupBDraft?.draft_media?.length || 0
        });
      } else {
        updateResult('Verify Media Isolation', 'fail', 'Media isolation failed', {
          groupAMediaCount: groupADraft?.draft_media?.length || 0,
          groupBMediaCount: groupBDraft?.draft_media?.length || 0,
          expectedGroupA: 1,
          expectedGroupB: 0
        });
      }

      // TEST 5: Test cross-group draft loading
      updateResult('Cross-Group Draft Loading', 'running', 'Testing that Group B drafts don\'t show Group A media...');
      
      const groupBDrafts = draftBWithMedia?.drafts || [];
      const hasLeakedMedia = groupBDrafts.some((draft: any) => 
        draft.draft_media && draft.draft_media.length > 0 && 
        draft.draft_media.some((media: any) => media.url.includes('test-media-a'))
      );

      if (!hasLeakedMedia) {
        updateResult('Cross-Group Draft Loading', 'pass', 'No media leakage detected between groups', {
          groupBDraftCount: groupBDrafts.length,
          groupBMediaCount: groupBDrafts.reduce((acc: number, d: any) => acc + (d.draft_media?.length || 0), 0)
        });
      } else {
        updateResult('Cross-Group Draft Loading', 'fail', 'Media leaked between groups!', {
          groupBDrafts: groupBDrafts.map((d: any) => ({
            id: d.id,
            mediaCount: d.draft_media?.length || 0
          }))
        });
      }

      // TEST 6: Test atomic publish simulation
      updateResult('Atomic Publish Test', 'running', 'Testing atomic publish behavior...');
      
      // First, check user membership in groups
      const { data: membershipA } = await supabase
        .from('group_members')
        .select('status, role')
        .eq('group_id', groupA)
        .eq('user_id', user.id)
        .single();

      if (!membershipA || membershipA.status !== 'approved') {
        updateResult('Atomic Publish Test', 'fail', 'User not approved member of Group A - cannot test publish', {
          membership: membershipA
        });
      } else {
        // Attempt to publish (this might fail due to validation, but we test the flow)
        const { data: publishResult, error: publishError } = await supabase.functions.invoke('publish-post', {
          body: {
            draftId: draftA.id,
            groupId: groupA
          }
        });

        if (publishError) {
          // This is expected if there are validation issues, but we check if draft remains intact
          const { data: draftAfterFailure } = await supabase.functions.invoke('draft-manager', {
            body: { groupId: groupA }
          });
          
          const draftStillExists = draftAfterFailure?.drafts?.some((d: any) => d.id === draftA.id);
          
          if (draftStillExists) {
            updateResult('Atomic Publish Test', 'pass', 'Publish failed as expected, draft remains intact', {
              error: publishError.message,
              draftPreserved: true
            });
          } else {
            updateResult('Atomic Publish Test', 'fail', 'Draft was lost on publish failure!', {
              error: publishError.message,
              draftPreserved: false
            });
          }
        } else {
          updateResult('Atomic Publish Test', 'pass', 'Post published successfully', publishResult);
        }
      }

      // TEST 7: Database integrity check
      updateResult('Database Integrity Check', 'running', 'Verifying database state integrity...');
      
      const { data: allUserDrafts, error: draftsError } = await supabase
        .from('post_drafts')
        .select(`
          id, 
          group_id, 
          title, 
          status,
          draft_media (
            id,
            file_id,
            url,
            status
          )
        `)
        .eq('user_id', user.id)
        .ilike('title', 'Test Draft%');

      if (draftsError) {
        updateResult('Database Integrity Check', 'fail', `Database query failed: ${draftsError.message}`);
      } else {
        const integrityDetails = [];
        let hasIntegrityIssues = false;

        // Check each draft
        for (const draft of allUserDrafts || []) {
          const mediaCount = draft.draft_media?.length || 0;
          const mediaForWrongGroup = draft.draft_media?.filter((m: any) => 
            (draft.group_id === groupA && m.url?.includes('test-media-b')) ||
            (draft.group_id === groupB && m.url?.includes('test-media-a'))
          ).length || 0;

          integrityDetails.push(`Draft ${draft.id}: Group ${draft.group_id}, Media: ${mediaCount}, Wrong Group Media: ${mediaForWrongGroup}`);
          
          if (mediaForWrongGroup > 0) {
            hasIntegrityIssues = true;
          }
        }

        if (!hasIntegrityIssues) {
          updateResult('Database Integrity Check', 'pass', 'Database integrity verified', {
            totalDrafts: allUserDrafts?.length || 0,
            details: integrityDetails
          });
        } else {
          updateResult('Database Integrity Check', 'fail', 'Database integrity issues found!', {
            totalDrafts: allUserDrafts?.length || 0,
            details: integrityDetails
          });
        }
      }

      // Final cleanup
      updateResult('Final Cleanup', 'running', 'Cleaning up test data...');
      
      try {
        const { error: cleanupError } = await supabase
          .from('post_drafts')
          .delete()
          .eq('user_id', user.id)
          .ilike('title', 'Test Draft%');

        if (cleanupError) {
          updateResult('Final Cleanup', 'fail', `Cleanup failed: ${cleanupError.message}`);
        } else {
          updateResult('Final Cleanup', 'pass', 'Test data cleaned up successfully');
        }
      } catch (cleanupError) {
        updateResult('Final Cleanup', 'fail', `Cleanup error: ${cleanupError}`);
      }

    } catch (error) {
      console.error('Test execution failed:', error);
      toast({
        title: "Test Failed",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive"
      });
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'running': return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'pass': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'fail': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getTestIcon = (testName: string) => {
    if (testName.includes('Media')) return <Upload className="h-4 w-4" />;
    if (testName.includes('Group')) return <Users className="h-4 w-4" />;
    if (testName.includes('Database')) return <Database className="h-4 w-4" />;
    return <AlertCircle className="h-4 w-4" />;
  };

  const allTestsPassed = results.length > 0 && results.every(r => r.status === 'pass');
  const hasFailures = results.some(r => r.status === 'fail');

  if (!user) {
    return (
      <Card className="max-w-2xl mx-auto mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Draft Scoping Test Suite
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Please log in to run draft scoping tests.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-6xl mx-auto mt-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Comprehensive Draft Scoping Test Suite
        </CardTitle>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            This test suite verifies that drafts and media are properly scoped to groups and don't leak between groups.
          </p>
          {results.length > 0 && (
            <div className="flex items-center gap-4 text-sm">
              <span className={`font-medium ${allTestsPassed ? 'text-green-600' : hasFailures ? 'text-red-600' : 'text-yellow-600'}`}>
                Status: {isRunning ? 'Running...' : allTestsPassed ? 'All Tests Passed ✓' : hasFailures ? 'Some Tests Failed ✗' : 'Completed with Warnings'}
              </span>
              <span className="text-muted-foreground">
                {results.filter(r => r.status === 'pass').length}/{results.length} tests passed
              </span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <Button 
          onClick={runComprehensiveTests} 
          disabled={isRunning}
          className="w-full"
          size="lg"
        >
          {isRunning ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Running Comprehensive Tests...
            </>
          ) : (
            <>
              <Database className="h-4 w-4 mr-2" />
              Run Complete Draft Scoping Test Suite
            </>
          )}
        </Button>

        {results.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">Test Results:</h3>
              <div className="flex items-center gap-2">
                <span className="text-sm text-green-600 flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  {results.filter(r => r.status === 'pass').length} passed
                </span>
                <span className="text-sm text-red-600 flex items-center gap-1">
                  <XCircle className="h-3 w-3" />
                  {results.filter(r => r.status === 'fail').length} failed
                </span>
              </div>
            </div>
            
            <div className="grid gap-3">
              {results.map((result, index) => (
                <Card 
                  key={index}
                  className={`border-l-4 ${
                    result.status === 'pass' ? 'border-l-green-500 bg-green-50/50' : 
                    result.status === 'fail' ? 'border-l-red-500 bg-red-50/50' : 
                    result.status === 'running' ? 'border-l-blue-500 bg-blue-50/50' : 
                    'border-l-gray-300'
                  }`}
                >
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {getTestIcon(result.test)}
                        {getStatusIcon(result.status)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium truncate">{result.test}</h4>
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                            result.status === 'pass' ? 'bg-green-100 text-green-800' :
                            result.status === 'fail' ? 'bg-red-100 text-red-800' :
                            result.status === 'running' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {result.status.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{result.message}</p>
                        
                        {result.details && result.details.length > 0 && (
                          <div className="mb-2">
                            <p className="text-xs font-medium text-muted-foreground mb-1">Details:</p>
                            <ul className="text-xs text-muted-foreground space-y-1">
                              {result.details.map((detail, i) => (
                                <li key={i} className="flex items-start gap-1">
                                  <span className="text-muted-foreground">•</span>
                                  <span>{detail}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {result.data && (
                          <details className="mt-2">
                            <summary className="text-xs text-blue-600 cursor-pointer hover:text-blue-800">
                              Show Technical Data
                            </summary>
                            <div className="mt-2 p-3 bg-gray-50 rounded border">
                              <pre className="text-xs overflow-auto max-h-40">
                                {JSON.stringify(result.data, null, 2)}
                              </pre>
                            </div>
                          </details>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium mb-2">Test Coverage:</h4>
          <div className="grid md:grid-cols-2 gap-3 text-sm text-muted-foreground">
            <ul className="space-y-1">
              <li className="flex items-center gap-2">
                <Users className="h-3 w-3" />
                Draft creation for different groups
              </li>
              <li className="flex items-center gap-2">
                <Upload className="h-3 w-3" />
                Media upload scoping to drafts
              </li>
              <li className="flex items-center gap-2">
                <Database className="h-3 w-3" />
                Cross-group isolation verification
              </li>
            </ul>
            <ul className="space-y-1">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3" />
                Atomic publish/rollback behavior
              </li>
              <li className="flex items-center gap-2">
                <XCircle className="h-3 w-3" />
                Database integrity checks
              </li>
              <li className="flex items-center gap-2">
                <AlertCircle className="h-3 w-3" />
                Cleanup and resource management
              </li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};