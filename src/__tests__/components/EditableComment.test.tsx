import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EditableComment } from '@/components/EditableComment';

// Mock dependencies
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id' },
  }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: {}, error: null })),
      })),
    })),
  },
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

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

describe('EditableComment', () => {
  const mockComment = {
    id: 'test-comment-id',
    content: 'Test comment content',
    user_id: 'test-user-id',
    is_edited: false,
    edited_at: null,
  };

  const mockProps = {
    comment: mockComment,
    onUpdate: vi.fn(),
    isAuthor: true,
    isAdmin: false,
  };

  it('renders comment content in view mode', () => {
    const { getByText } = render(
      <TestWrapper>
        <EditableComment {...mockProps} />
      </TestWrapper>
    );
    
    expect(getByText('Test comment content')).toBeDefined();
  });

  it('does not show edit controls for non-authors', () => {
    const { container } = render(
      <TestWrapper>
        <EditableComment {...mockProps} isAuthor={false} />
      </TestWrapper>
    );
    
    const editButton = container.querySelector('button');
    expect(editButton).toBeNull();
  });

  it('shows edited tag for edited comments', () => {
    const editedComment = { ...mockComment, is_edited: true };
    const { getByText } = render(
      <TestWrapper>
        <EditableComment {...mockProps} comment={editedComment} />
      </TestWrapper>
    );
    
    expect(getByText('Edited')).toBeDefined();
  });
});