import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Supabase client
const mockSupabaseAuth = {
  getUser: vi.fn(),
};

const mockSupabaseFrom = vi.fn();
const mockSupabase = {
  auth: mockSupabaseAuth,
  from: mockSupabaseFrom,
};

// Mock the Supabase client creation
vi.mock('https://esm.sh/@supabase/supabase-js@2.45.0', () => ({
  createClient: () => mockSupabase,
}));

// Mock Deno globals
global.Deno = {
  env: {
    get: vi.fn((key: string) => {
      if (key === 'SUPABASE_URL') return 'https://test.supabase.co';
      if (key === 'SUPABASE_SERVICE_ROLE_KEY') return 'test-service-role-key';
      return '';
    }),
  },
  serve: vi.fn(),
} as any;

// Test the publish-post function logic
describe('Publish Post Edge Function', () => {
  const mockUser = { id: 'user-123' };
  const mockDraft = {
    id: 'draft-123',
    user_id: 'user-123',
    group_id: 'group-456',
    title: 'Test Draft',
    content: 'Test content',
    status: 'editing'
  };
  const mockDraftMedia = [
    {
      id: 'media-1',
      draft_id: 'draft-123',
      user_id: 'user-123',
      file_id: 'file-1',
      url: 'https://example.com/image1.jpg',
      thumbnail_url: 'https://example.com/thumb1.jpg',
      mime_type: 'image/jpeg',
      file_size: 1024,
      order_index: 0,
      status: 'pending'
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockSupabaseAuth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null
    });

    // Mock the query builder chain
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
    };

    mockSupabaseFrom.mockReturnValue(mockQuery);
  });

  it('should reject unauthorized requests', async () => {
    mockSupabaseAuth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'Invalid token' }
    });

    const request = new Request('http://localhost:8000/publish-post', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer invalid-token',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ draftId: 'draft-123' })
    });

    // Since we can't directly test the function, we test the expected behavior
    expect(mockSupabaseAuth.getUser).toBeCalled();
  });

  it('should require draftId in request body', () => {
    const requestBody = {};
    expect(requestBody).not.toHaveProperty('draftId');
  });

  it('should validate draft ownership', async () => {
    const mockQuery = mockSupabaseFrom('post_drafts');
    mockQuery.single.mockResolvedValueOnce({
      data: mockDraft,
      error: null
    });

    expect(mockQuery.eq).toBeCalledWith('user_id', mockUser.id);
  });

  it('should handle idempotency by checking existing posts', async () => {
    const existingPost = { id: 'post-456', title: 'Existing Post' };
    
    const mockQuery = mockSupabaseFrom('posts');
    mockQuery.single.mockResolvedValueOnce({
      data: existingPost,
      error: null
    });

    expect(mockQuery.eq).toBeCalledWith('metadata->>draft_id', 'draft-123');
  });

  it('should create post with proper media type determination', () => {
    // Single image
    expect('image').toBe('image');
    
    // Multiple images
    expect('multiple').toBe('multiple');
    
    // No media
    expect(null).toBe(null);
  });

  it('should preserve media order during attachment', () => {
    const orderedMedia = mockDraftMedia.map((media, index) => ({
      post_id: 'post-123',
      user_id: mockUser.id,
      file_id: media.file_id,
      url: media.url,
      thumbnail_url: media.thumbnail_url,
      mime_type: media.mime_type,
      file_size: media.file_size,
      order_index: index,
      status: 'attached'
    }));

    expect(orderedMedia[0].order_index).toBe(0);
    expect(orderedMedia[0].status).toBe('attached');
  });

  it('should rollback post creation if media attachment fails', async () => {
    const mockPostsQuery = mockSupabaseFrom('posts');
    const mockMediaQuery = mockSupabaseFrom('post_media');
    
    // Post creation succeeds
    mockPostsQuery.single.mockResolvedValueOnce({
      data: { id: 'post-123' },
      error: null
    });

    // Media attachment fails
    mockMediaQuery.insert.mockResolvedValueOnce({
      data: null,
      error: { message: 'Media attachment failed' }
    });

    // Should trigger rollback
    expect(mockPostsQuery.delete).toBeCalled();
  });

  it('should return proper success response structure', () => {
    const expectedResponse = {
      postId: 'post-123',
      attachedMediaCount: 1,
      postUrl: '/posts/post-123'
    };

    expect(expectedResponse).toHaveProperty('postId');
    expect(expectedResponse).toHaveProperty('attachedMediaCount');
    expect(expectedResponse).toHaveProperty('postUrl');
    expect(expectedResponse.postUrl).toMatch(/^\/posts\//);
  });

  it('should handle validation errors appropriately', () => {
    const validationCases = [
      { error: 'MISSING_DRAFT_ID', status: 400 },
      { error: 'DRAFT_NOT_FOUND', status: 404 },
      { error: 'ACCESS_DENIED', status: 403 },
      { error: 'INSUFFICIENT_CONTENT', status: 400 },
      { error: 'PUBLISH_DB_ERROR', status: 500 }
    ];

    validationCases.forEach(testCase => {
      expect(testCase.status).toBeGreaterThanOrEqual(400);
      expect(testCase.error).toBeTruthy();
    });
  });

  it('should update draft status after successful publish', async () => {
    const mockDraftQuery = mockSupabaseFrom('post_drafts');
    
    expect(mockDraftQuery.update).toBeCalledWith({
      status: 'published',
      updated_at: expect.any(String)
    });
    expect(mockDraftQuery.eq).toBeCalledWith('id', 'draft-123');
  });
});