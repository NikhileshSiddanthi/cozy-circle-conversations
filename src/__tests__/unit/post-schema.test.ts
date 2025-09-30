import { describe, it, expect } from 'vitest';
import { createPostSchema, createReportSchema, mediaItemSchema } from '@/lib/schemas/post';

describe('Post Validation Schema', () => {
  describe('createPostSchema', () => {
    it('should validate a valid post', () => {
      const validPost = {
        title: 'Test Post',
        content: 'This is a test post content',
        group_id: '123e4567-e89b-12d3-a456-426614174000',
        visibility: 'public' as const,
      };

      const result = createPostSchema.safeParse(validPost);
      expect(result.success).toBe(true);
    });

    it('should reject post with empty content', () => {
      const invalidPost = {
        content: '',
        group_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = createPostSchema.safeParse(invalidPost);
      expect(result.success).toBe(false);
    });

    it('should reject post with content exceeding 5000 characters', () => {
      const invalidPost = {
        content: 'a'.repeat(5001),
        group_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = createPostSchema.safeParse(invalidPost);
      expect(result.success).toBe(false);
    });

    it('should reject post with title exceeding 100 characters', () => {
      const invalidPost = {
        title: 'a'.repeat(101),
        content: 'Valid content',
        group_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = createPostSchema.safeParse(invalidPost);
      expect(result.success).toBe(false);
    });

    it('should reject post with invalid group_id', () => {
      const invalidPost = {
        content: 'Valid content',
        group_id: 'not-a-uuid',
      };

      const result = createPostSchema.safeParse(invalidPost);
      expect(result.success).toBe(false);
    });

    it('should accept post with media array', () => {
      const validPost = {
        content: 'Post with media',
        group_id: '123e4567-e89b-12d3-a456-426614174000',
        media: [
          {
            url: 'https://example.com/image.jpg',
            type: 'image' as const,
            width: 800,
            height: 600,
          },
        ],
      };

      const result = createPostSchema.safeParse(validPost);
      expect(result.success).toBe(true);
    });

    it('should reject post with more than 10 media items', () => {
      const invalidPost = {
        content: 'Post with too many media',
        group_id: '123e4567-e89b-12d3-a456-426614174000',
        media: Array(11).fill({
          url: 'https://example.com/image.jpg',
          type: 'image' as const,
        }),
      };

      const result = createPostSchema.safeParse(invalidPost);
      expect(result.success).toBe(false);
    });

    it('should trim whitespace from title and content', () => {
      const post = {
        title: '  Test Title  ',
        content: '  Test Content  ',
        group_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = createPostSchema.safeParse(post);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe('Test Title');
        expect(result.data.content).toBe('Test Content');
      }
    });
  });

  describe('mediaItemSchema', () => {
    it('should validate a valid media item', () => {
      const validMedia = {
        url: 'https://example.com/image.jpg',
        type: 'image' as const,
        width: 800,
        height: 600,
      };

      const result = mediaItemSchema.safeParse(validMedia);
      expect(result.success).toBe(true);
    });

    it('should reject media with invalid URL', () => {
      const invalidMedia = {
        url: 'not-a-url',
        type: 'image' as const,
      };

      const result = mediaItemSchema.safeParse(invalidMedia);
      expect(result.success).toBe(false);
    });

    it('should reject media with negative dimensions', () => {
      const invalidMedia = {
        url: 'https://example.com/image.jpg',
        type: 'image' as const,
        width: -800,
        height: 600,
      };

      const result = mediaItemSchema.safeParse(invalidMedia);
      expect(result.success).toBe(false);
    });
  });

  describe('createReportSchema', () => {
    it('should validate a valid report', () => {
      const validReport = {
        post_id: '123e4567-e89b-12d3-a456-426614174000',
        reason: 'spam' as const,
        details: 'This is spam content',
      };

      const result = createReportSchema.safeParse(validReport);
      expect(result.success).toBe(true);
    });

    it('should reject report with invalid reason', () => {
      const invalidReport = {
        post_id: '123e4567-e89b-12d3-a456-426614174000',
        reason: 'invalid_reason',
      };

      const result = createReportSchema.safeParse(invalidReport);
      expect(result.success).toBe(false);
    });

    it('should reject report with details exceeding 500 characters', () => {
      const invalidReport = {
        post_id: '123e4567-e89b-12d3-a456-426614174000',
        reason: 'spam' as const,
        details: 'a'.repeat(501),
      };

      const result = createReportSchema.safeParse(invalidReport);
      expect(result.success).toBe(false);
    });

    it('should accept report without details', () => {
      const validReport = {
        post_id: '123e4567-e89b-12d3-a456-426614174000',
        reason: 'harassment' as const,
      };

      const result = createReportSchema.safeParse(validReport);
      expect(result.success).toBe(true);
    });
  });
});
