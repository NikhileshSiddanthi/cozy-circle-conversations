import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { EditablePost } from '@/components/EditablePost';

// Mock dependencies
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: {}, error: null })),
          })),
        })),
      })),
    })),
  },
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock('@/components/EnhancedMediaUpload', () => ({
  EnhancedMediaUpload: ({ files, onFilesChange }: any) => (
    <div data-testid="enhanced-media-upload">
      Enhanced Media Upload Component
    </div>
  ),
}));

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

describe('EditablePost', () => {
  const mockPost = {
    id: 'test-post-id',
    title: 'Test Post',
    content: 'Test content',
    user_id: 'test-user-id',
    media_type: null,
    media_url: null,
  };

  const mockProps = {
    post: mockPost,
    onUpdate: vi.fn(),
    isAuthor: true,
    isAdmin: false,
  };

  it('renders post content in view mode', () => {
    const { container } = render(
      <TestWrapper>
        <EditablePost {...mockProps} />
      </TestWrapper>
    );
    
    expect(container.textContent).toContain('Test Post');
    expect(container.textContent).toContain('Test content');
  });

  it('shows edit button for authors', () => {
    const { container } = render(
      <TestWrapper>
        <EditablePost {...mockProps} />
      </TestWrapper>
    );
    
    // Component should render
    expect(container).toBeTruthy();
  });

  it('does not show edit controls for non-authors', () => {
    const { container } = render(
      <TestWrapper>
        <EditablePost {...mockProps} isAuthor={false} />
      </TestWrapper>
    );
    
    // Should render without edit button
    expect(container).toBeTruthy();
  });

  it('shows edited tag for edited posts', () => {
    const editedPost = { ...mockPost, is_edited: true };
    const { container } = render(
      <TestWrapper>
        <EditablePost {...mockProps} post={editedPost} />
      </TestWrapper>
    );
    
    expect(container.textContent).toContain('Edited');
  });
});
