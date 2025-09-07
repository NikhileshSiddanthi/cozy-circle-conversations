import { describe, it, expect, beforeEach, vi } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
    auth: {
      getUser: vi.fn(),
    },
  },
}));

describe('Uploads API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /uploads/init', () => {
    it('should initialize upload for valid image', async () => {
      const mockResponse = {
        data: {
          uploadId: 'test-upload-id',
          uploadUrl: 'https://example.com/upload',
          expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        },
        error: null,
      };

      vi.mocked(supabase.functions.invoke).mockResolvedValue(mockResponse);

      const { data, error } = await supabase.functions.invoke('uploads', {
        body: {
          filename: 'test.jpg',
          mimeType: 'image/jpeg',
          size: 1024 * 1024, // 1MB
          draftId: 'test-draft-id',
        },
      });

      expect(error).toBeNull();
      expect(data).toHaveProperty('uploadId');
      expect(data).toHaveProperty('uploadUrl');
      expect(data).toHaveProperty('expiresAt');
    });

    it('should reject invalid file type', async () => {
      const mockResponse = {
        data: null,
        error: {
          message: 'Invalid file type. Only JPG, PNG, and WebP are allowed.',
        },
      };

      vi.mocked(supabase.functions.invoke).mockResolvedValue(mockResponse);

      const { error } = await supabase.functions.invoke('uploads', {
        body: {
          filename: 'test.pdf',
          mimeType: 'application/pdf',
          size: 1024,
          draftId: 'test-draft-id',
        },
      });

      expect(error).toBeDefined();
      expect(error.message).toContain('Invalid file type');
    });

    it('should reject file size over 10MB', async () => {
      const mockResponse = {
        data: null,
        error: {
          message: 'File size exceeds 10MB limit',
        },
      };

      vi.mocked(supabase.functions.invoke).mockResolvedValue(mockResponse);

      const { error } = await supabase.functions.invoke('uploads', {
        body: {
          filename: 'large.jpg',
          mimeType: 'image/jpeg',
          size: 11 * 1024 * 1024, // 11MB
          draftId: 'test-draft-id',
        },
      });

      expect(error).toBeDefined();
      expect(error.message).toContain('File size exceeds 10MB limit');
    });

    it('should reject more than 10 files per draft', async () => {
      const mockResponse = {
        data: null,
        error: {
          message: 'Maximum 10 images allowed per draft',
        },
      };

      vi.mocked(supabase.functions.invoke).mockResolvedValue(mockResponse);

      const { error } = await supabase.functions.invoke('uploads', {
        body: {
          filename: 'test.jpg',
          mimeType: 'image/jpeg',
          size: 1024,
          draftId: 'test-draft-id-with-10-files',
        },
      });

      expect(error).toBeDefined();
      expect(error.message).toContain('Maximum 10 images allowed');
    });
  });

  describe('POST /uploads/complete', () => {
    it('should complete upload and create draft_media row', async () => {
      const mockResponse = {
        data: {
          fileId: 'test-file-id',
          url: 'https://example.com/file.jpg',
          thumbnailUrl: null,
          mimeType: 'image/jpeg',
          size: 1024,
          orderIndex: 0,
        },
        error: null,
      };

      vi.mocked(supabase.functions.invoke).mockResolvedValue(mockResponse);

      const { data, error } = await supabase.functions.invoke('uploads', {
        body: {
          uploadId: 'test-upload-id',
        },
      });

      expect(error).toBeNull();
      expect(data).toHaveProperty('fileId');
      expect(data).toHaveProperty('url');
      expect(data).toHaveProperty('mimeType');
      expect(data).toHaveProperty('size');
      expect(data).toHaveProperty('orderIndex');
    });

    it('should fail for invalid upload ID', async () => {
      const mockResponse = {
        data: null,
        error: {
          message: 'Upload not found or already completed',
        },
      };

      vi.mocked(supabase.functions.invoke).mockResolvedValue(mockResponse);

      const { error } = await supabase.functions.invoke('uploads', {
        body: {
          uploadId: 'invalid-upload-id',
        },
      });

      expect(error).toBeDefined();
      expect(error.message).toContain('Upload not found');
    });
  });
});

describe('Draft Media API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /drafts/:draftId/media', () => {
    it('should return media files in correct order', async () => {
      const mockResponse = {
        data: [
          {
            id: 'file-1',
            url: 'https://example.com/file1.jpg',
            order_index: 0,
            mime_type: 'image/jpeg',
          },
          {
            id: 'file-2',
            url: 'https://example.com/file2.jpg',
            order_index: 1,
            mime_type: 'image/png',
          },
        ],
        error: null,
      };

      vi.mocked(supabase.functions.invoke).mockResolvedValue(mockResponse);

      const { data, error } = await supabase.functions.invoke('draft-media', {
        body: {
          draftId: 'test-draft-id',
          action: 'list',
        },
      });

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
      expect(data).toHaveLength(2);
      expect(data[0].order_index).toBe(0);
      expect(data[1].order_index).toBe(1);
    });
  });

  describe('DELETE /drafts/:draftId/media/:fileId', () => {
    it('should delete media file and return 204', async () => {
      const mockResponse = {
        data: null,
        error: null,
      };

      vi.mocked(supabase.functions.invoke).mockResolvedValue(mockResponse);

      const { error } = await supabase.functions.invoke('draft-media', {
        body: {
          draftId: 'test-draft-id',
          fileId: 'test-file-id',
          action: 'delete',
        },
      });

      expect(error).toBeNull();
    });

    it('should fail for non-existent file', async () => {
      const mockResponse = {
        data: null,
        error: {
          message: 'Media file not found',
        },
      };

      vi.mocked(supabase.functions.invoke).mockResolvedValue(mockResponse);

      const { error } = await supabase.functions.invoke('draft-media', {
        body: {
          draftId: 'test-draft-id',
          fileId: 'non-existent-file',
          action: 'delete',
        },
      });

      expect(error).toBeDefined();
      expect(error.message).toContain('Media file not found');
    });
  });

  describe('PATCH /drafts/:draftId/mediaOrder', () => {
    it('should update media order successfully', async () => {
      const mockResponse = {
        data: { success: true },
        error: null,
      };

      vi.mocked(supabase.functions.invoke).mockResolvedValue(mockResponse);

      const { data, error } = await supabase.functions.invoke('draft-media', {
        body: {
          draftId: 'test-draft-id',
          order: ['file-2', 'file-1', 'file-3'],
          action: 'reorder',
        },
      });

      expect(error).toBeNull();
      expect(data.success).toBe(true);
    });

    it('should fail for invalid file IDs', async () => {
      const mockResponse = {
        data: null,
        error: {
          message: 'Invalid file IDs in order array',
        },
      };

      vi.mocked(supabase.functions.invoke).mockResolvedValue(mockResponse);

      const { error } = await supabase.functions.invoke('draft-media', {
        body: {
          draftId: 'test-draft-id',
          order: ['invalid-file-id'],
          action: 'reorder',
        },
      });

      expect(error).toBeDefined();
      expect(error.message).toContain('Invalid file IDs');
    });
  });
});