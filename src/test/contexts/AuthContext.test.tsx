import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';

// Mock Supabase
const mockSupabase = {
  auth: {
    getSession: vi.fn(() => Promise.resolve({ 
      data: { session: null }, 
      error: null 
    })),
    onAuthStateChange: vi.fn(() => ({ 
      data: { subscription: { unsubscribe: vi.fn() } } 
    })),
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    signInWithOAuth: vi.fn(),
    signInWithOtp: vi.fn(),
    verifyOtp: vi.fn(),
  },
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabase,
}));

// Test component to access auth context
const TestComponent = () => {
  const { user, loading, signOut } = useAuth();
  
  return (
    <div>
      <div data-testid="loading">{loading ? 'Loading...' : 'Ready'}</div>
      <div data-testid="user">{user ? 'Authenticated' : 'Not authenticated'}</div>
      <button onClick={signOut} data-testid="signout">Sign Out</button>
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('provides auth context with initial loading state', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Initially should be loading
    expect(screen.getByTestId('loading')).toHaveTextContent('Loading...');
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Ready');
    });

    // Should not be authenticated initially
    expect(screen.getByTestId('user')).toHaveTextContent('Not authenticated');
  });

  it('calls supabase auth methods on mount', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(mockSupabase.auth.getSession).toHaveBeenCalled();
    expect(mockSupabase.auth.onAuthStateChange).toHaveBeenCalled();
  });
});