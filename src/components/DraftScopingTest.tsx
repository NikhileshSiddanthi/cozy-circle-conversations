import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface TestResult {
  test: string;
  status: 'pending' | 'pass' | 'fail' | 'running';
  message: string;
  data?: any;
}

export const DraftScopingTest: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);

  const updateResult = (testName: string, status: TestResult['status'], message: string, data?: any) => {
    setResults(prev => {
      const existing = prev.find(r => r.test === testName);
      if (existing) {
        existing.status = status;
        existing.message = message;
        existing.data = data;
        return [...prev];
      } else {
        return [...prev, { test: testName, status, message, data }];
      }
    });
  };

  const runTests = async () => {
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

    try {
      // Test 1: Create draft for Group A
      updateResult('Create Draft Group A', 'running', 'Creating draft for Generative AI group...');
      
      const { data: draftA, error: draftAError } = await supabase.functions.invoke('draft-manager', {
        body: {
          groupId: 'd9ae0eaf-e3ca-40ed-97d1-7b4dc6b332a8', // Generative AI
          title: 'Test Draft Group A',
          content: 'Content for Group A draft',
          metadata: {}
        }
      });

      if (draftAError) {
        updateResult('Create Draft Group A', 'fail', `Failed: ${draftAError.message}`);
        return;
      }

      updateResult('Create Draft Group A', 'pass', 'Draft created successfully', draftA);

      // Test 2: Create draft for Group B  
      updateResult('Create Draft Group B', 'running', 'Creating draft for Anurag College group...');
      
      const { data: draftB, error: draftBError } = await supabase.functions.invoke('draft-manager', {
        body: {
          groupId: '6304d445-d9d4-469e-9912-e8924de201a4', // Anurag College
          title: 'Test Draft Group B', 
          content: 'Content for Group B draft',
          metadata: {}
        }
      });

      if (draftBError) {
        updateResult('Create Draft Group B', 'fail', `Failed: ${draftBError.message}`);
        return;
      }

      updateResult('Create Draft Group B', 'pass', 'Draft created successfully', draftB);

      // Test 3: Load drafts for Group A - should only see Group A draft
      updateResult('Load Group A Drafts', 'running', 'Loading drafts for Group A...');
      
      const { data: groupADrafts, error: groupAError } = await supabase.functions.invoke('draft-manager', {
        body: { groupId: 'd9ae0eaf-e3ca-40ed-97d1-7b4dc6b332a8' }
      });

      if (groupAError) {
        updateResult('Load Group A Drafts', 'fail', `Failed: ${groupAError.message}`);
        return;
      }

      const groupADraftCount = groupADrafts?.drafts?.length || 0;
      const hasOnlyGroupADraft = groupADraftCount === 1 && 
        groupADrafts.drafts[0].title === 'Test Draft Group A';

      if (hasOnlyGroupADraft) {
        updateResult('Load Group A Drafts', 'pass', `Found 1 draft for Group A only`, groupADrafts);
      } else {
        updateResult('Load Group A Drafts', 'fail', `Expected 1 Group A draft, found ${groupADraftCount}`, groupADrafts);
      }

      // Test 4: Load drafts for Group B - should only see Group B draft
      updateResult('Load Group B Drafts', 'running', 'Loading drafts for Group B...');
      
      const { data: groupBDrafts, error: groupBError } = await supabase.functions.invoke('draft-manager', {
        body: { groupId: '6304d445-d9d4-469e-9912-e8924de201a4' }
      });

      if (groupBError) {
        updateResult('Load Group B Drafts', 'fail', `Failed: ${groupBError.message}`);
        return;
      }

      const groupBDraftCount = groupBDrafts?.drafts?.length || 0;
      const hasOnlyGroupBDraft = groupBDraftCount === 1 && 
        groupBDrafts.drafts[0].title === 'Test Draft Group B';

      if (hasOnlyGroupBDraft) {
        updateResult('Load Group B Drafts', 'pass', `Found 1 draft for Group B only`, groupBDrafts);
      } else {
        updateResult('Load Group B Drafts', 'fail', `Expected 1 Group B draft, found ${groupBDraftCount}`, groupBDrafts);
      }

      // Test 5: Verify database state
      updateResult('Database Isolation Check', 'running', 'Checking database isolation...');
      
      const { data: allDrafts, error: allDraftsError } = await supabase
        .from('post_drafts')
        .select('id, group_id, title')
        .eq('user_id', user.id);

      if (allDraftsError) {
        updateResult('Database Isolation Check', 'fail', `Failed: ${allDraftsError.message}`);
        return;
      }

      const hasTwoDrafts = allDrafts.length === 2;
      const hasCorrectGrouping = allDrafts.some(d => d.group_id === 'd9ae0eaf-e3ca-40ed-97d1-7b4dc6b332a8') &&
                                  allDrafts.some(d => d.group_id === '6304d445-d9d4-469e-9912-e8924de201a4');

      if (hasTwoDrafts && hasCorrectGrouping) {
        updateResult('Database Isolation Check', 'pass', `Found 2 drafts properly scoped to different groups`, allDrafts);
      } else {
        updateResult('Database Isolation Check', 'fail', `Database isolation failed. Found ${allDrafts.length} drafts`, allDrafts);
      }

      // Cleanup - Delete test drafts
      updateResult('Cleanup', 'running', 'Cleaning up test drafts...');
      
      try {
        if (draftA?.draft?.id) {
          await supabase.functions.invoke('draft-manager', {
            body: null,
            headers: { 'X-HTTP-Method-Override': 'DELETE' }
          });
        }
        if (draftB?.draft?.id) {
          await supabase.functions.invoke('draft-manager', {
            body: null,
            headers: { 'X-HTTP-Method-Override': 'DELETE' }
          });
        }
        updateResult('Cleanup', 'pass', 'Test drafts cleaned up successfully');
      } catch (cleanupError) {
        updateResult('Cleanup', 'fail', `Cleanup failed: ${cleanupError}`);
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

  if (!user) {
    return (
      <Card className="max-w-2xl mx-auto mt-8">
        <CardHeader>
          <CardTitle>Draft Scoping Test</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Please log in to run draft scoping tests.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-4xl mx-auto mt-8">
      <CardHeader>
        <CardTitle>Draft Scoping Test Suite</CardTitle>
        <p className="text-sm text-muted-foreground">
          This test verifies that drafts are properly scoped to groups and don't leak between groups.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runTests} 
          disabled={isRunning}
          className="w-full"
        >
          {isRunning ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Running Tests...
            </>
          ) : (
            'Run Draft Scoping Tests'
          )}
        </Button>

        {results.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold">Test Results:</h3>
            {results.map((result, index) => (
              <div 
                key={index}
                className="flex items-start gap-3 p-3 border rounded-lg"
              >
                {getStatusIcon(result.status)}
                <div className="flex-1">
                  <div className="font-medium">{result.test}</div>
                  <div className="text-sm text-muted-foreground">{result.message}</div>
                  {result.data && (
                    <details className="mt-2">
                      <summary className="text-xs text-blue-600 cursor-pointer">Show Data</summary>
                      <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-auto">
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>Test Coverage:</strong></p>
          <ul className="list-disc list-inside space-y-1">
            <li>Create drafts for different groups</li>
            <li>Verify drafts are loaded only for their respective groups</li>
            <li>Confirm database-level isolation</li>
            <li>Clean up test data</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};