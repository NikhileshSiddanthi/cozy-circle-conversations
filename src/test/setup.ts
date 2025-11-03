import '@testing-library/jest-dom';
import { vi, beforeEach } from 'vitest';

// Create comprehensive mock for Supabase client
const mockSupabaseClient = {
  auth: {
    getSession: vi.fn(() => Promise.resolve({ 
      data: { session: null }, 
      error: null 
    })),
    onAuthStateChange: vi.fn(() => ({
      data: { subscription: { unsubscribe: vi.fn() } }
    })),
    signOut: vi.fn(() => Promise.resolve({ error: null })),
    signInWithPassword: vi.fn(() => Promise.resolve({ 
      data: { user: null, session: null }, 
      error: null 
    })),
    signUp: vi.fn(() => Promise.resolve({ 
      data: { user: null, session: null }, 
      error: null 
    })),
    signInWithOAuth: vi.fn(() => Promise.resolve({ 
      data: { provider: 'google', url: 'https://example.com' }, 
      error: null 
    })),
    signInWithOtp: vi.fn(() => Promise.resolve({ error: null })),
    verifyOtp: vi.fn(() => Promise.resolve({ 
      data: { user: null, session: null }, 
      error: null 
    })),
    getUser: vi.fn(() => Promise.resolve({ 
      data: { user: null }, 
      error: null 
    })),
  },
  from: vi.fn((table: string) => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn(() => Promise.resolve({ data: null, error: null })),
    maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
  })),
  storage: {
    from: vi.fn((bucket: string) => ({
      upload: vi.fn(() => Promise.resolve({ 
        data: { path: 'test-path' }, 
        error: null 
      })),
      remove: vi.fn(() => Promise.resolve({ error: null })),
      getPublicUrl: vi.fn(() => ({ 
        data: { publicUrl: 'https://test-url.com/test-path' } 
      })),
      createSignedUrl: vi.fn(() => Promise.resolve({ 
        data: { signedUrl: 'https://test-url.com/signed' }, 
        error: null 
      })),
    })),
  },
  functions: {
    invoke: vi.fn((functionName: string, options?: any) => Promise.resolve({ 
      data: null, 
      error: null 
    })),
  },
  rpc: vi.fn((functionName: string, params?: any) => Promise.resolve({ 
    data: null, 
    error: null 
  })),
};

// Mock the Supabase client module
vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabaseClient,
}));

// Mock environment variables
if (typeof process !== 'undefined') {
  process.env.VITE_SUPABASE_URL = 'https://test-project.supabase.co';
  process.env.VITE_SUPABASE_ANON_KEY = 'test-anon-key';
}

// Mock window.matchMedia for responsive components
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() { return []; }
  unobserve() {}
} as any;

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
} as any;

// Reset mocks between tests
beforeEach(() => {
  vi.clearAllMocks();
});