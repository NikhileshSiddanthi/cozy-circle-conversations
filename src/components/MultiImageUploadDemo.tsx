import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { PostComposer } from './PostComposer';
import { 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Image, 
  FileText,
  AlertTriangle,
  Database,
  Network
} from 'lucide-react';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error' | 'info';
  message: string;
  details?: any;
  timestamp: string;
}

interface Group {
  id: string;
  name: string;
  is_public: boolean;
}

export const MultiImageUploadDemo = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [groups, setGroups] = useState<Group[]>([]);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [publishedPostId, setPublishedPostId] = useState<string | null>(null);

  useEffect(() => {
    loadGroups();
    addTestResult('System Check', 'info', 'Multi-image upload demo initialized', { userId: user?.id });
  }, [user]);

  const loadGroups = async () => {
    try {
      const { data } = await supabase
        .from('groups')
        .select('id, name, is_public')
        .eq('is_approved', true)
        .limit(5);
      
      setGroups(data || []);
      
      if (data && data.length > 0) {
        addTestResult('Groups Loaded', 'success', `Found ${data.length} available groups`, { groups: data.map(g => g.name) });
      } else {
        addTestResult('Groups Check', 'error', 'No approved groups found - create one first');
      }
    } catch (error) {
      console.error('Failed to load groups:', error);
      addTestResult('Groups Load Error', 'error', 'Failed to load groups', { error });
    }
  };

  const addTestResult = (name: string, status: TestResult['status'], message: string, details?: any) => {
    const result: TestResult = {
      name,
      status,
      message,
      details,
      timestamp: new Date().toLocaleTimeString()
    };
    setTestResults(prev => [...prev, result]);
    
    // Also log to console for debugging
    console.log(`[${result.timestamp}] ${status.toUpperCase()}: ${name} - ${message}`, details || '');
  };

  const runComprehensiveTest = async () => {
    if (!user || groups.length === 0) {
      toast({
        title: "Prerequisites Missing",
        description: "Please ensure you're signed in and have approved groups.",
        variant: "destructive"
      });
      return;
    }

    setIsRunning(true);
    setTestResults([]);
    
    try {
      addTestResult('Test Suite Start', 'info', 'Running comprehensive multi-image upload test');

      // Test 1: Create Draft
      addTestResult('Draft Creation', 'pending', 'Creating new post draft...');
      
      const { data: draft, error: draftError } = await supabase
        .from('post_drafts')
        .insert({
          user_id: user.id,
          group_id: groups[0].id,
          title: "Multi-Image Upload Test",
          content: "Testing multiple image upload functionality",
          status: 'editing'
        })
        .select()
        .single();

      if (draftError) throw new Error(`Draft creation failed: ${draftError.message}`);
      
      setDraftId(draft.id);
      addTestResult('Draft Creation', 'success', 'Draft created successfully', { draftId: draft.id });

      // Test 2: Test Multi-Image Upload via API
      addTestResult('Multi-Upload API', 'pending', 'Testing upload API with 3 test files...');
      
      const testFiles = [
        { name: 'test-image-1.jpg', type: 'image/jpeg', content: 'fake-jpg-content-1' },
        { name: 'test-image-2.png', type: 'image/png', content: 'fake-png-content-2' },
        { name: 'test-image-3.webp', type: 'image/webp', content: 'fake-webp-content-3' }
      ];

      const uploadResults = [];
      
      for (let i = 0; i < testFiles.length; i++) {
        const testFile = testFiles[i];
        addTestResult(`Upload ${i+1}/3`, 'pending', `Uploading ${testFile.name}...`);
        
        // Create a real File object for testing
        const file = new File([testFile.content], testFile.name, { type: testFile.type });
        
        // Step 1: Initialize upload
        const { data: initData, error: initError } = await supabase.functions.invoke('uploads', {
          body: {
            filename: file.name,
            mimeType: file.type,
            size: file.size,
            draftId: draft.id
          }
        });

        if (initError) {
          addTestResult(`Upload ${i+1} Init`, 'error', `Init failed: ${initError.message}`);
          continue;
        }
        
        addTestResult(`Upload ${i+1} Init`, 'success', 'Upload initialized', { uploadId: initData.uploadId });

        // Step 2: Simulate file upload to signed URL (in real test, would be actual PUT)
        try {
          const uploadResponse = await fetch(initData.uploadUrl, {
            method: 'PUT',
            body: file,
            headers: { 'Content-Type': file.type }
          });

          if (!uploadResponse.ok) {
            throw new Error(`Upload failed: ${uploadResponse.statusText}`);
          }
          
          addTestResult(`Upload ${i+1} PUT`, 'success', 'File uploaded to storage');
        } catch (putError) {
          addTestResult(`Upload ${i+1} PUT`, 'error', `PUT failed: ${putError}`);
          continue;
        }

        // Step 3: Complete upload
        const { data: completeData, error: completeError } = await supabase.functions.invoke('uploads', {
          body: { uploadId: initData.uploadId }
        });

        if (completeError) {
          addTestResult(`Upload ${i+1} Complete`, 'error', `Complete failed: ${completeError.message}`);
          continue;
        }
        
        addTestResult(`Upload ${i+1} Complete`, 'success', 'Upload completed', { url: completeData.url });
        uploadResults.push(completeData);
      }

      addTestResult('Multi-Upload API', 'success', `Successfully uploaded ${uploadResults.length}/${testFiles.length} files`);

      // Test 3: Verify draft_media entries
      addTestResult('Draft Media Check', 'pending', 'Verifying draft_media database entries...');
      
      const { data: draftMedia, error: mediaError } = await supabase
        .from('draft_media')
        .select('*')
        .eq('draft_id', draft.id)
        .order('order_index');

      if (mediaError) {
        addTestResult('Draft Media Check', 'error', `Database query failed: ${mediaError.message}`);
      } else {
        const expectedCount = uploadResults.length;
        const actualCount = draftMedia?.length || 0;
        
        if (actualCount === expectedCount && actualCount > 0) {
          addTestResult('Draft Media Check', 'success', `✅ Found ${actualCount} media entries in database`, { 
            entries: draftMedia.map(m => ({ fileId: m.file_id, orderIndex: m.order_index, status: m.status }))
          });
        } else {
          addTestResult('Draft Media Check', 'error', `❌ Expected ${expectedCount} entries, found ${actualCount}`);
        }
      }

      // Test 4: Test Publishing
      addTestResult('Post Publishing', 'pending', 'Publishing draft as post...');
      
      const { data: publishData, error: publishError } = await supabase.functions.invoke('publish-post', {
        body: {
          draftId: draft.id,
          visibility: 'public'
        }
      });

      if (publishError) {
        addTestResult('Post Publishing', 'error', `Publish failed: ${publishError.message}`);
      } else {
        setPublishedPostId(publishData.postId);
        addTestResult('Post Publishing', 'success', 'Post published successfully', publishData);
      }

      // Test 5: Verify post_media entries
      if (publishData?.postId) {
        addTestResult('Post Media Check', 'pending', 'Verifying post_media entries...');
        
        const { data: postMedia, error: postMediaError } = await supabase
          .from('post_media')
          .select('*')
          .eq('post_id', publishData.postId)
          .order('order_index');

        if (postMediaError) {
          addTestResult('Post Media Check', 'error', `Query failed: ${postMediaError.message}`);
        } else {
          const expectedCount = uploadResults.length;
          const actualCount = postMedia?.length || 0;
          
          if (actualCount === expectedCount && actualCount > 0) {
            addTestResult('Post Media Check', 'success', `✅ Found ${actualCount} media files in published post`, {
              entries: postMedia.map(m => ({ fileId: m.file_id, orderIndex: m.order_index, status: m.status }))
            });
          } else {
            addTestResult('Post Media Check', 'error', `❌ Expected ${expectedCount} entries, found ${actualCount}`);
          }
        }
      }

      // Test 6: Test Text-Only Post
      addTestResult('Text-Only Test', 'pending', 'Testing text-only post creation...');
      
      const { data: textDraft, error: textDraftError } = await supabase
        .from('post_drafts')
        .insert({
          user_id: user.id,
          group_id: groups[0].id,
          title: "Text-Only Post Test",
          content: "This is a text-only post with no images",
          status: 'editing'
        })
        .select()
        .single();

      if (textDraftError) {
        addTestResult('Text-Only Test', 'error', `Text draft creation failed: ${textDraftError.message}`);
      } else {
        const { data: textPublishData, error: textPublishError } = await supabase.functions.invoke('publish-post', {
          body: {
            draftId: textDraft.id,
            visibility: 'public'
          }
        });

        if (textPublishError) {
          addTestResult('Text-Only Test', 'error', `Text post publish failed: ${textPublishError.message}`);
        } else {
          addTestResult('Text-Only Test', 'success', 'Text-only post published successfully', textPublishData);
        }
      }

      addTestResult('Test Suite Complete', 'success', '🎉 All tests completed! Check individual results above.');
      
      toast({
        title: "Test Suite Completed!",
        description: "Check the detailed results below.",
      });

    } catch (error) {
      console.error('Test suite error:', error);
      addTestResult('Test Suite Error', 'error', error instanceof Error ? error.message : 'Unknown error');
      
      toast({
        title: "Test Suite Failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      });
    } finally {
      setIsRunning(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
    setDraftId(null);
    setPublishedPostId(null);
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'pending': return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'info': return <Database className="h-4 w-4 text-blue-500" />;
      default: return null;
    }
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <p className="text-lg font-medium mb-2">Authentication Required</p>
          <p className="text-muted-foreground">Please sign in to run multi-image upload tests</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            Multi-Image Upload Demo & Test Suite
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Network className="h-4 w-4" />
            <AlertDescription>
              This demo tests the complete multi-image upload workflow: draft creation → file uploads → database entries → post publishing.
            </AlertDescription>
          </Alert>

          <div className="flex gap-2 flex-wrap">
            <Button onClick={runComprehensiveTest} disabled={isRunning || groups.length === 0} size="lg">
              {isRunning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Running Tests...
                </>
              ) : (
                'Run Comprehensive Test Suite'
              )}
            </Button>
            
            <Button variant="outline" onClick={clearResults} disabled={isRunning}>
              Clear Results
            </Button>
            
            <Button variant="outline" onClick={() => setShowComposer(!showComposer)}>
              {showComposer ? 'Hide Manual Test' : 'Show Manual Test Composer'}
            </Button>
          </div>

          {groups.length === 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                No approved groups found. Please create and approve a group first to run tests.
              </AlertDescription>
            </Alert>
          )}

          {/* Test Results */}
          {testResults.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-medium text-lg">Test Results ({testResults.length})</h3>
              <div className="max-h-96 overflow-y-auto space-y-2">
                {testResults.map((result, index) => (
                  <Card key={index} className="p-3">
                    <div className="flex items-start gap-3">
                      {getStatusIcon(result.status)}
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{result.name}</span>
                          <Badge variant={
                            result.status === 'success' ? 'default' : 
                            result.status === 'error' ? 'destructive' : 
                            result.status === 'info' ? 'secondary' : 'outline'
                          }>
                            {result.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{result.timestamp}</span>
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-2">{result.message}</p>
                        
                        {result.details && (
                          <details className="text-xs">
                            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                              Show details
                            </summary>
                            <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-w-full">
                              {JSON.stringify(result.details, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual Test Composer */}
      {showComposer && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Manual Test - Post Composer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Use this composer to manually test multi-image upload. Try selecting 2-3 images and monitor the browser console for upload logs.
              </AlertDescription>
            </Alert>
            
            <PostComposer
              groups={groups}
              onSuccess={() => {
                toast({
                  title: "Success!",
                  description: "Manual test post created successfully!"
                });
                addTestResult('Manual Test', 'success', 'User successfully created post via manual test composer');
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* Quick Database Queries */}
      {(draftId || publishedPostId) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Database Verification Queries
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Run these queries in your Supabase SQL editor to verify the data:
            </p>
            
            {draftId && (
              <div className="space-y-2">
                <p className="font-medium text-sm">Draft Media Check:</p>
                <pre className="text-xs bg-muted p-3 rounded overflow-auto">
{`SELECT id, file_id, url, status, order_index, mime_type, created_at
FROM draft_media 
WHERE draft_id = '${draftId}'
ORDER BY order_index;`}
                </pre>
              </div>
            )}
            
            {publishedPostId && (
              <div className="space-y-2">
                <p className="font-medium text-sm">Post Media Check:</p>
                <pre className="text-xs bg-muted p-3 rounded overflow-auto">
{`SELECT id, file_id, url, status, order_index, mime_type, created_at
FROM post_media 
WHERE post_id = '${publishedPostId}'
ORDER BY order_index;`}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};