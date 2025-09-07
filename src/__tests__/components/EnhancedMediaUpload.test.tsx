import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
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
    const { getByText } = render(
      <TestWrapper>
        <EnhancedMediaUpload {...mockProps} />
      </TestWrapper>
    );
    
    expect(getByText('Upload your media files')).toBeDefined();
  });

  it('shows file constraints', () => {
    const { getByText } = render(
      <TestWrapper>
        <EnhancedMediaUpload {...mockProps} />
      </TestWrapper>
    );
    
    expect(getByText(/Max 5 files/)).toBeDefined();
    expect(getByText(/Up to 10MB each/)).toBeDefined();
  });

  it('shows tips section', () => {
    const { getByText } = render(
      <TestWrapper>
        <EnhancedMediaUpload {...mockProps} />
      </TestWrapper>
    );
    
    expect(getByText('Tips:')).toBeDefined();
  });
});