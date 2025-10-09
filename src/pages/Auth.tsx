import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { GraphBackground } from '@/components/GraphBackground';
import { LoginCard } from '@/components/LoginCard';

const Auth = () => {
  const { user, loading } = useAuth();

  // Redirect if already authenticated
  if (!loading && user) {
    return <Navigate to="/" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center relative">
        <GraphBackground seed={1} density="medium" glow={0.6} labelChance={0.1} />
        <div className="flex items-center gap-3 text-lg relative z-10">
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: '#00E5C7' }} />
          <span style={{ color: '#E8FFFB' }}>Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <GraphBackground seed={1} density="medium" glow={0.6} labelChance={0.1} />
      <div className="relative z-10 w-full">
        <LoginCard />
      </div>
    </div>
  );
};

export default Auth;