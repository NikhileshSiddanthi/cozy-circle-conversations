import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

export const LoginCard = () => {
  const { signUp, signIn, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      if (isSignUp) {
        const { error: signUpError } = await signUp(email, password, username);
        if (signUpError) {
          setError(signUpError.message);
        } else {
          toast({
            title: 'Success!',
            description: 'Your account has been created. Please check your email to verify.',
          });
          navigate('/');
        }
      } else {
        const { error: signInError } = await signIn(email, password);
        if (signInError) {
          setError(signInError.message);
        } else {
          navigate('/');
        }
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    try {
      await signInWithGoogle();
    } catch (err) {
      setError('Failed to sign in with Google');
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Glassmorphism Card */}
      <div 
        className="relative rounded-[18px] p-8 backdrop-blur-[10px]"
        style={{
          background: 'rgba(5, 8, 10, 0.7)',
          border: '1px solid rgba(0, 229, 199, 0.12)',
          boxShadow: '0 8px 32px 0 rgba(0, 229, 199, 0.1)'
        }}
      >
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2" style={{ color: '#E8FFFB' }}>
            COZI Chat
          </h1>
          <p className="text-sm" style={{ color: 'rgba(232, 255, 251, 0.6)' }}>
            {isSignUp ? 'Create your account' : 'Sign in to continue'}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div className="space-y-2">
              <Label htmlFor="username" style={{ color: '#E8FFFB' }}>
                Username
              </Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required={isSignUp}
                disabled={isSubmitting}
                className="bg-white/5 border-white/10 text-[#E8FFFB] placeholder:text-white/40 focus:border-[#00E5C7] transition-all duration-200"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email" style={{ color: '#E8FFFB' }}>
              <Mail className="inline w-4 h-4 mr-2" />
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isSubmitting}
              className="bg-white/5 border-white/10 text-[#E8FFFB] placeholder:text-white/40 focus:border-[#00E5C7] transition-all duration-200"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" style={{ color: '#E8FFFB' }}>
              <Lock className="inline w-4 h-4 mr-2" />
              Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isSubmitting}
                className="bg-white/5 border-white/10 text-[#E8FFFB] placeholder:text-white/40 focus:border-[#00E5C7] transition-all duration-200 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-[#00E5C7] transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-12 text-base font-semibold transition-all duration-200"
            disabled={isSubmitting}
            style={{
              background: 'linear-gradient(135deg, #00E5C7 0%, #14FF72 100%)',
              color: '#05080a',
              boxShadow: '0 4px 20px rgba(0, 229, 199, 0.3)'
            }}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isSignUp ? 'Creating account...' : 'Signing in...'}
              </>
            ) : (
              isSignUp ? 'Create Account' : 'Sign In'
            )}
          </Button>
        </form>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t" style={{ borderColor: 'rgba(232, 255, 251, 0.1)' }} />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="px-2" style={{ background: 'rgba(5, 8, 10, 0.7)', color: 'rgba(232, 255, 251, 0.5)' }}>
              Or continue with
            </span>
          </div>
        </div>

        {/* Google Sign In */}
        <Button
          type="button"
          onClick={handleGoogleSignIn}
          variant="outline"
          className="w-full h-12 bg-white/5 border-white/10 hover:bg-white/10 hover:border-[#00E5C7] transition-all duration-200"
          style={{ color: '#E8FFFB' }}
        >
          <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </Button>

        {/* Toggle Sign Up / Sign In */}
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError('');
            }}
            className="text-sm transition-colors duration-200"
            style={{ color: 'rgba(232, 255, 251, 0.6)' }}
          >
            {isSignUp ? (
              <>
                Already have an account?{' '}
                <span style={{ color: '#00E5C7' }} className="font-semibold hover:underline">
                  Sign in
                </span>
              </>
            ) : (
              <>
                Don't have an account?{' '}
                <span style={{ color: '#00E5C7' }} className="font-semibold hover:underline">
                  Sign up
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
