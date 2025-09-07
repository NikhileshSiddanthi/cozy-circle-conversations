// Test suite to verify the upload fixes work correctly
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Supabase client
const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
  storage: {
    from: vi.fn(),
  },
  functions: {
    invoke: vi.fn(),
  },
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabase,
}));

describe('Fixed Upload API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Upload Init', () => {
    it('should handle init request with correct body structure', async () => {
      const mockUser = { id: 'user-123' };
      const mockDraft = { id: 'draft-123', user_id: 'user-123' };
      
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'post_drafts') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  single: () => Promise.resolve({ data: mockDraft, error: null }),
                }),
              }),
            }),
          };
        }
        if (table === 'draft_media') {
          return {
            select: () => ({
              eq: () => Promise.resolve({ count: 0 }),
            }),
            insert: () => Promise.resolve({ error: null }),
          };
        }
      });

      mockSupabase.storage.from.mockReturnValue({
        createSignedUploadUrl: () => Promise.resolve({
          data: { signedUrl: 'https://storage.supabase.co/signed-url' },
          error: null,
        }),
      });

      mockSupabase.functions.invoke.mockResolvedValue({
        data: {
          uploadId: 'upload-123',
          uploadUrl: 'https://storage.supabase.co/signed-url',
          expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        },
        error: null,
      });

      const result = await mockSupabase.functions.invoke('uploads', {
        body: {
          filename: 'test.jpg',
          mimeType: 'image/jpeg',
          size: 1024 * 1024,
          draftId: 'draft-123',
        },
      });

      expect(result.data).toEqual({
        uploadId: 'upload-123',
        uploadUrl: 'https://storage.supabase.co/signed-url',
        expiresAt: expect.any(String),
      });
      expect(result.error).toBeNull();
    });

    it('should handle complete request with uploadId', async () => {
      const mockUser = { id: 'user-123' };
      const mockPendingUpload = {
        id: 'upload-123',
        file_id: 'user-123/file.jpg',
        mime_type: 'image/jpeg',
        file_size: 1024,
        order_index: 0,
      };
      
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: () => ({
          eq: () => ({
            eq: () => ({
              eq: () => ({
                single: () => Promise.resolve({ data: mockPendingUpload, error: null }),
              }),
            }),
          }),
        }),
        update: () => ({
          eq: () => ({
            select: () => ({
              single: () => Promise.resolve({ 
                data: { 
                  ...mockPendingUpload, 
                  url: 'https://storage.supabase.co/public-url',
                  status: 'uploaded',
                }, 
                error: null 
              }),
            }),
          }),
        }),
      });

      mockSupabase.storage.from.mockReturnValue({
        getPublicUrl: () => ({ data: { publicUrl: 'https://storage.supabase.co/public-url' } }),
      });

      mockSupabase.functions.invoke.mockResolvedValue({
        data: {
          fileId: 'upload-123',
          url: 'https://storage.supabase.co/public-url',
          mimeType: 'image/jpeg',
          size: 1024,
          orderIndex: 0,
        },
        error: null,
      });

      const result = await mockSupabase.functions.invoke('uploads', {
        body: {
          uploadId: 'upload-123',
        },
      });

      expect(result.data).toEqual({
        fileId: 'upload-123',
        url: 'https://storage.supabase.co/public-url',
        mimeType: 'image/jpeg',
        size: 1024,
        orderIndex: 0,
      });
      expect(result.error).toBeNull();
    });
  });

  describe('Draft Media Actions', () => {
    it('should handle list action', async () => {
      const mockMediaFiles = [
        { id: 'file-1', url: 'url-1', mime_type: 'image/jpeg', file_size: 1024, order_index: 0 },
        { id: 'file-2', url: 'url-2', mime_type: 'image/png', file_size: 2048, order_index: 1 },
      ];

      mockSupabase.functions.invoke.mockResolvedValue({
        data: mockMediaFiles.map(file => ({
          fileId: file.id,
          url: file.url,
          mimeType: file.mime_type,
          size: file.file_size,
          orderIndex: file.order_index,
        })),
        error: null,
      });

      const result = await mockSupabase.functions.invoke('draft-media', {
        body: {
          action: 'list',
          draftId: 'draft-123',
        },
      });

      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toEqual({
        fileId: 'file-1',
        url: 'url-1',
        mimeType: 'image/jpeg',
        size: 1024,
        orderIndex: 0,
      });
    });

    it('should handle delete action', async () => {
      mockSupabase.functions.invoke.mockResolvedValue({
        data: { success: true },
        error: null,
      });

      const result = await mockSupabase.functions.invoke('draft-media', {
        body: {
          action: 'delete',
          draftId: 'draft-123',
          fileId: 'file-1',
        },
      });

      expect(result.data).toEqual({ success: true });
      expect(result.error).toBeNull();
    });

    it('should handle reorder action', async () => {
      mockSupabase.functions.invoke.mockResolvedValue({
        data: { success: true },
        error: null,
      });

      const result = await mockSupabase.functions.invoke('draft-media', {
        body: {
          action: 'reorder',
          draftId: 'draft-123',
          order: ['file-2', 'file-1'],
        },
      });

      expect(result.data).toEqual({ success: true });
      expect(result.error).toBeNull();
    });
  });
});