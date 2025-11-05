import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ShieldCheck, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export default function MakeAdmin() {
  const { user } = useAuth();
  const [isGranting, setIsGranting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleMakeAdmin = async () => {
    if (!user) {
      toast.error('No user logged in');
      return;
    }

    try {
      setIsGranting(true);
      setResult(null);

      // Insert admin role for current user
      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: user.id,
          role: 'admin'
        });

      if (error) {
        // If it's a duplicate key error, that means user is already an admin
        if (error.code === '23505') {
          setResult({
            success: true,
            message: 'You already have admin privileges!'
          });
          toast.info('Already an admin');
        } else {
          throw error;
        }
      } else {
        setResult({
          success: true,
          message: 'Admin privileges granted successfully!'
        });
        toast.success('Admin privileges granted!', {
          description: 'You now have admin access to the platform.'
        });
      }

    } catch (error) {
      console.error('Error granting admin access:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      setResult({
        success: false,
        message: `Failed to grant admin access: ${errorMessage}`
      });

      toast.error('Error granting admin access', {
        description: errorMessage
      });
    } finally {
      setIsGranting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Grant Admin Access</h1>
          <p className="text-muted-foreground">
            Grant yourself admin privileges on the COZI platform
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Admin Role Management
            </CardTitle>
            <CardDescription>
              Click the button below to grant yourself admin access. This will allow you to:
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500 flex-shrink-0" />
                <span>Access the admin dashboard</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500 flex-shrink-0" />
                <span>Manage categories and groups</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500 flex-shrink-0" />
                <span>Moderate posts and comments</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500 flex-shrink-0" />
                <span>Generate seed data with AI</span>
              </li>
            </ul>

            <Alert>
              <ShieldCheck className="h-4 w-4" />
              <AlertDescription>
                <strong>Current User:</strong> {user?.email || 'Not logged in'}
              </AlertDescription>
            </Alert>

            <Button
              onClick={handleMakeAdmin}
              disabled={isGranting || !user}
              size="lg"
              className="w-full"
            >
              {isGranting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Granting Admin Access...
                </>
              ) : (
                <>
                  <ShieldCheck className="mr-2 h-5 w-5" />
                  Make Me Admin
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
                  {result.message}
                </AlertDescription>
              </Alert>
            )}

            {result?.success && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  You can now access admin features:
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.location.href = '/admin'}
                  >
                    Go to Admin Dashboard
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.location.href = '/admin/seed-data'}
                  >
                    Generate Seed Data
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
