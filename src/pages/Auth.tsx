import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import CosmosBackground from '@/components/CosmosBackground';
import { LoginCard } from '@/components/LoginCard';

const Auth = () => {
  const { user, loading } = useAuth();

  // Redirect if already authenticated
  if (!loading && user) {
    console.log('User authenticated, redirecting to home');
    return <Navigate to="/" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
        <CosmosBackground />
        <div className="flex items-center gap-3 text-lg relative z-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <CosmosBackground />
      <div className="relative z-20 w-full max-w-md mx-auto">
        <LoginCard />
      </div>
    </div>
  );
};

export default Auth;