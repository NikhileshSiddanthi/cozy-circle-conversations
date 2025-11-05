import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signInWithPhone: (phone: string) => Promise<{ error: Error | null }>;
  verifyOTP: (phone: string, otp: string) => Promise<{ error: Error | null }>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.id);
        
        // Handle different auth events
        if (event === 'SIGNED_OUT' || (event === 'TOKEN_REFRESHED' && !session)) {
          console.log('User signed out or token refresh failed');
          setSession(null);
          setUser(null);
          setLoading(false);
          return;
        }

        if (event === 'SIGNED_IN' && session) {
          console.log('User signed in successfully');
        }

        // Check if session is expired
        if (session && session.expires_at) {
          const now = Math.floor(Date.now() / 1000);
          const expiresAt = session.expires_at;
          
          if (now >= expiresAt) {
            console.log('Session expired, attempting refresh...');
            const { data: { session: refreshedSession }, error } = await supabase.auth.refreshSession();
            
            if (error || !refreshedSession) {
              console.log('Session refresh failed, signing out:', error);
              await supabase.auth.signOut();
              return;
            }
            
            setSession(refreshedSession);
            setUser(refreshedSession.user);
          } else {
            setSession(session);
            setUser(session?.user ?? null);
          }
        } else {
          setSession(session);
          setUser(session?.user ?? null);
        }
        
        setLoading(false);
      }
    );

    // Check for existing session with expiration validation
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.log('Session error:', error);
          await supabase.auth.signOut();
          return;
        }

        if (session && session.expires_at) {
          const now = Math.floor(Date.now() / 1000);
          const expiresAt = session.expires_at;
          
          if (now >= expiresAt) {
            console.log('Initial session expired, attempting refresh...');
            const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
            
            if (refreshError || !refreshedSession) {
              console.log('Initial session refresh failed, signing out:', refreshError);
              await supabase.auth.signOut();
              setSession(null);
              setUser(null);
              setLoading(false);
              return;
            }
            
            setSession(refreshedSession);
            setUser(refreshedSession.user);
          } else {
            setSession(session);
            setUser(session?.user ?? null);
          }
        } else {
          setSession(session);
          setUser(session?.user ?? null);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error checking session:', error);
        setSession(null);
        setUser(null);
        setLoading(false);
      }
    };

    checkSession();

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, displayName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          display_name: displayName,
        },
      },
    });
    
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    // First check if email exists by attempting to get user
    const { data: existingUser } = await supabase.auth.signUp({
      email,
      password: 'dummy_password_check',
    });

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    // Enhanced error handling for better user experience
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        // Check if it's a password issue or email doesn't exist
        const { data: resetData, error: resetError } = await supabase.auth.resetPasswordForEmail(
          email,
          { redirectTo: `${window.location.origin}/` }
        );
        
        if (resetError && resetError.message.includes('User not found')) {
          return { error: new Error('Account does not exist. Please sign up first.') };
        } else {
          return { error: new Error('Incorrect password. Please try again.') };
        }
      }
    }
    
    return { error };
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });

    return { error };
  };
  const signInWithPhone = async (phone: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      phone,
    });
    
    return { error };
  };

  const verifyOTP = async (phone: string, otp: string) => {
    const { error } = await supabase.auth.verifyOtp({
      phone,
      token: otp,
      type: 'sms'
    });
    
    return { error };
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth`,
    });
    
    return { error };
  };

  const signOut = async () => {
    try {
      // Sign out from Supabase first
      await supabase.auth.signOut({ scope: 'global' });
      
      // Clear local state - this will trigger ProtectedRoute redirect
      setSession(null);
      setUser(null);
      
      // Clear any cached tokens
      localStorage.removeItem('supabase.auth.token');
    } catch (error) {
      console.error('Error signing out:', error);
      // Clear state anyway to trigger redirect
      setSession(null);
      setUser(null);
      localStorage.removeItem('supabase.auth.token');
    }
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    signInWithPhone,
    verifyOTP,
    resetPassword,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};