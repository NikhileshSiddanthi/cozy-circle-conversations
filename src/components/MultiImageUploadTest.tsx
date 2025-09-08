import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { PostComposer } from './PostComposer';
import { Loader2, CheckCircle, XCircle, Image, FileText } from 'lucide-react';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  details?: any;
}

interface Group {
  id: string;
  name: string;
  is_public: boolean;
}

export const MultiImageUploadTest = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [groups, setGroups] = useState<Group[]>([]);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [showComposer, setShowComposer] = useState(false);

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      const { data } = await supabase
        .from('groups')
        .select('id, name, is_public')
        .eq('is_approved', true)
        .limit(1);
      
      setGroups(data || []);
    } catch (error) {
      console.error('Failed to load groups:', error);
    }
  };

  const addTestResult = (name: string, status: TestResult['status'], message: string, details?: any) => {
    setTestResults(prev => [...prev, { name, status, message, details }]);
  };

  const runTests = async () => {
    if (!user || groups.length === 0) {
      toast({
        title: "Setup Required",
        description: "Please ensure you're logged in and have at least one approved group.",
        variant: "destructive"
      });
      return;
    }

    setIsRunning(true);
    setTestResults([]);

    try {
      // Test 1: Create Draft
      addTestResult("Create Draft", "pending", "Creating new draft...");
      
      const { data: draft, error: draftError } = await supabase
        .from('post_drafts')
        .insert({
          user_id: user.id,
          group_id: groups[0].id,
          title: "Test Multi-Image Post",
          content: "This is a test post with multiple images",
          status: 'editing'
        })
        .select()
        .single();

      if (draftError) throw new Error(`Draft creation failed: ${draftError.message}`);
      
      addTestResult("Create Draft", "success", "Draft created successfully", { draftId: draft.id });

      // Test 2: Test Upload API with multiple files
      addTestResult("Upload API Test", "pending", "Testing multi-image upload API...");
      
      // Create test files
      const testFiles = [
        new File(['test1'], 'test1.jpg', { type: 'image/jpeg' }),
        new File(['test2'], 'test2.png', { type: 'image/png' }),
        new File(['test3'], 'test3.webp', { type: 'image/webp' })
      ];

      const uploadResults = [];
      
      for (let i = 0; i < testFiles.length; i++) {
        const file = testFiles[i];
        
        // Step 1: Initialize upload
        const { data: initData, error: initError } = await supabase.functions.invoke('uploads', {
          body: {
            filename: file.name,
            mimeType: file.type,
            size: file.size,
            draftId: draft.id
          }
        });

        if (initError) throw new Error(`Upload init failed for ${file.name}: ${initError.message}`);
        
        // Step 2: Upload to signed URL
        const uploadResponse = await fetch(initData.uploadUrl, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': file.type }
        });

        if (!uploadResponse.ok) {
          throw new Error(`File upload failed for ${file.name}: ${uploadResponse.statusText}`);
        }

        // Step 3: Complete upload
        const { data: completeData, error: completeError } = await supabase.functions.invoke('uploads', {
          body: { uploadId: initData.uploadId }
        });

        if (completeError) throw new Error(`Upload complete failed for ${file.name}: ${completeError.message}`);
        
        uploadResults.push(completeData);
      }

      addTestResult("Upload API Test", "success", `Successfully uploaded ${uploadResults.length} files`, { uploadResults });

      // Test 3: Verify draft_media entries
      addTestResult("Draft Media Verification", "pending", "Verifying draft_media entries...");
      
      const { data: draftMedia, error: mediaError } = await supabase
        .from('draft_media')
        .select('*')
        .eq('draft_id', draft.id)
        .order('order_index');

      if (mediaError) throw new Error(`Draft media query failed: ${mediaError.message}`);
      
      if (!draftMedia || draftMedia.length !== testFiles.length) {
        throw new Error(`Expected ${testFiles.length} media entries, got ${draftMedia?.length || 0}`);
      }

      addTestResult("Draft Media Verification", "success", `Found ${draftMedia.length} media entries in correct order`, { draftMedia });

      // Test 4: Test Publish
      addTestResult("Publish Test", "pending", "Publishing draft as post...");
      
      const { data: publishData, error: publishError } = await supabase.functions.invoke('publish-post', {
        body: {
          draftId: draft.id,
          visibility: 'public'
        }
      });

      if (publishError) throw new Error(`Publish failed: ${publishError.message}`);
      
      addTestResult("Publish Test", "success", "Post published successfully", publishData);

      // Test 5: Verify post_media entries
      addTestResult("Post Media Verification", "pending", "Verifying post_media entries...");
      
      const { data: postMedia, error: postMediaError } = await supabase
        .from('post_media')
        .select('*')
        .eq('post_id', publishData.postId)
        .order('order_index');

      if (postMediaError) throw new Error(`Post media query failed: ${postMediaError.message}`);
      
      if (!postMedia || postMedia.length !== testFiles.length) {
        throw new Error(`Expected ${testFiles.length} post media entries, got ${postMedia?.length || 0}`);
      }

      addTestResult("Post Media Verification", "success", `Found ${postMedia.length} media entries attached to post`, { postMedia });

      // Test 6: Test text-only post
      addTestResult("Text-Only Post Test", "pending", "Testing text-only post creation...");
      
      const { data: textDraft, error: textDraftError } = await supabase
        .from('post_drafts')
        .insert({
          user_id: user.id,
          group_id: groups[0].id,
          title: "Text-Only Post",
          content: "This is a text-only post with no images",
          status: 'editing'
        })
        .select()
        .single();

      if (textDraftError) throw new Error(`Text draft creation failed: ${textDraftError.message}`);

      const { data: textPublishData, error: textPublishError } = await supabase.functions.invoke('publish-post', {
        body: {
          draftId: textDraft.id,
          visibility: 'public'
        }
      });

      if (textPublishError) throw new Error(`Text post publish failed: ${textPublishError.message}`);
      
      addTestResult("Text-Only Post Test", "success", "Text-only post published successfully", textPublishData);

      toast({
        title: "All Tests Passed!",
        description: "Multi-image upload and text-only posting are working correctly."
      });

    } catch (error) {
      console.error('Test failed:', error);
      addTestResult("Test Failed", "error", error instanceof Error ? error.message : 'Unknown error');
      
      toast({
        title: "Test Failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      });
    } finally {
      setIsRunning(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Please sign in to run tests</p>
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
            Multi-Image Upload Test Suite
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={runTests} disabled={isRunning || groups.length === 0}>
              {isRunning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Running Tests...
                </>
              ) : (
                'Run Full Test Suite'
              )}
            </Button>
            <Button variant="outline" onClick={clearResults} disabled={isRunning}>
              Clear Results
            </Button>
            <Button variant="outline" onClick={() => setShowComposer(!showComposer)}>
              {showComposer ? 'Hide Composer' : 'Show Test Composer'}
            </Button>
          </div>

          {groups.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No approved groups found. Please create and approve a group first.
            </p>
          )}

          {testResults.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-medium">Test Results:</h3>
              {testResults.map((result, index) => (
                <div key={index} className="flex items-center gap-2 p-2 border rounded">
                  {result.status === 'pending' && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
                  {result.status === 'success' && <CheckCircle className="h-4 w-4 text-green-500" />}
                  {result.status === 'error' && <XCircle className="h-4 w-4 text-red-500" />}
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{result.name}</span>
                      <Badge variant={
                        result.status === 'success' ? 'default' : 
                        result.status === 'error' ? 'destructive' : 'secondary'
                      }>
                        {result.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{result.message}</p>
                    {result.details && (
                      <details className="text-xs text-muted-foreground mt-1">
                        <summary className="cursor-pointer">Show details</summary>
                        <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-auto">
                          {JSON.stringify(result.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {showComposer && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Test Post Composer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PostComposer
              groups={groups}
              onSuccess={() => {
                toast({
                  title: "Success",
                  description: "Test post created successfully!"
                });
              }}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
};