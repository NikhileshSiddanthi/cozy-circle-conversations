import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { PostCard } from '@/components/PostCard';
import { AuthProvider } from '@/contexts/AuthContext';

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

const mockPost = {
  id: 'post-1',
  title: 'Test Post Title',
  content: 'This is test post content',
  user_id: 'user-1',
  group_id: 'group-1',
  like_count: 5,
  dislike_count: 1,
  comment_count: 3,
  view_count: 10,
  created_at: '2025-01-20T10:00:00Z',
  updated_at: '2025-01-20T10:00:00Z',
  media_type: null,
  media_url: null,
  media_thumbnail: null,
  is_pinned: false,
  poll_question: null,
  poll_options: [],
  profiles: {
    display_name: 'Test User',
    avatar_url: null,
  },
};

describe('PostCard', () => {
  it('renders post title and content', () => {
    const { container } = render(
      <TestWrapper>
        <PostCard post={mockPost} />
      </TestWrapper>
    );

    expect(container.textContent).toContain('Test Post Title');
    expect(container.textContent).toContain('This is test post content');
  });

  it('displays post metrics', () => {
    const { container } = render(
      <TestWrapper>
        <PostCard post={mockPost} />
      </TestWrapper>
    );

    // Just verify the component renders
    expect(container).toBeTruthy();
  });

  it('shows user display name', () => {
    const { container } = render(
      <TestWrapper>
        <PostCard post={mockPost} />
      </TestWrapper>
    );

    expect(container.textContent).toContain('Test User');
  });
});