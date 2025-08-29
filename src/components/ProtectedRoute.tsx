import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();

  console.log('ProtectedRoute - loading:', loading, 'user:', user ? 'authenticated' : 'not authenticated');

  if (loading) {
    console.log('ProtectedRoute - showing loading state');
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-lg">Loading...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    console.log('ProtectedRoute - no user, redirecting to /auth');
    return <Navigate to="/auth" replace />;
  }

  console.log('ProtectedRoute - user authenticated, rendering children');
  return <>{children}</>;
};

export default ProtectedRoute;