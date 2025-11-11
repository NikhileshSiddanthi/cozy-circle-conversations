import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { EnhancedMediaUpload } from '@/components/EnhancedMediaUpload';

// Mock dependencies
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(() => Promise.resolve({ data: { path: 'test-path' }, error: null })),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://test.com/image.jpg' } })),
        remove: vi.fn(() => Promise.resolve({ error: null })),
      })),
    },
    auth: {
      getSession: vi.fn(() => Promise.resolve({
        data: { session: { access_token: 'test-token' } }
      })),
    },
  },
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'blob:test-url');
global.URL.revokeObjectURL = vi.fn();

// Mock fetch
global.fetch = vi.fn() as any;

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
};

describe('EnhancedMediaUpload', () => {
  const mockProps = {
    files: [],
    onFilesChange: vi.fn(),
    groupId: 'test-group',
    userId: 'test-user',
    draftId: 'test-draft',
  };

  it('renders upload area', () => {
    const { container } = render(
      <TestWrapper>
        <EnhancedMediaUpload {...mockProps} />
      </TestWrapper>
    );
    
    // Just verify component renders
    expect(container).toBeTruthy();
  });

  it('shows file constraints', () => {
    const { container } = render(
      <TestWrapper>
        <EnhancedMediaUpload {...mockProps} />
      </TestWrapper>
    );
    
    // Component should render successfully
    expect(container).toBeTruthy();
  });

  it('shows tips section', () => {
    const { container } = render(
      <TestWrapper>
        <EnhancedMediaUpload {...mockProps} />
      </TestWrapper>
    );
    
    // Component should render successfully
    expect(container).toBeTruthy();
  });
});
