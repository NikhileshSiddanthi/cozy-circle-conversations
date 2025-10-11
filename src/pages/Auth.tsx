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
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
        <GraphBackground seed={1} density="auto" glow={0.65} labelChance={0.2} showMap={true} />
        <div className="flex items-center gap-3 text-lg relative z-20">
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: '#00E5C7' }} />
          <span style={{ color: '#E8FFFB' }}>Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <GraphBackground seed={1} density="auto" glow={0.65} labelChance={0.2} showMap={true} />
      <div className="relative z-20 w-full max-w-md mx-auto">
        <LoginCard />
      </div>
    </div>
  );
};

export default Auth;