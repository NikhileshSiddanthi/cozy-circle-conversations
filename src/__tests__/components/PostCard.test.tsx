import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PostCard } from '@/components/PostCard';

// Mock dependencies
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'test@example.com' },
    loading: false,
  }),
}));

vi.mock('@/hooks/useUserRole', () => ({
  useUserRole: () => ({
    role: 'user',
    loading: false,
    isAdmin: false,
    isModerator: false,
  }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
      insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
      update: vi.fn(() => Promise.resolve({ data: null, error: null })),
    })),
  },
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
    render(
      <TestWrapper>
        <PostCard post={mockPost} />
      </TestWrapper>
    );

    expect(screen.getByText('Test Post Title')).toBeDefined();
    expect(screen.getByText('This is test post content')).toBeDefined();
  });

  it('displays post metrics', () => {
    render(
      <TestWrapper>
        <PostCard post={mockPost} />
      </TestWrapper>
    );

    expect(screen.getByText('5')).toBeDefined(); // like count
    expect(screen.getByText('3')).toBeDefined(); // comment count
  });

  it('shows user display name', () => {
    render(
      <TestWrapper>
        <PostCard post={mockPost} />
      </TestWrapper>
    );

    expect(screen.getByText('Test User')).toBeDefined();
  });
});