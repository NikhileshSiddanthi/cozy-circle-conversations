import { z } from 'zod';

// Post visibility options
export const postVisibilitySchema = z.enum(['public', 'group', 'private']);
export type PostVisibility = z.infer<typeof postVisibilitySchema>;

// Media item schema
export const mediaItemSchema = z.object({
  url: z.string().url('Invalid media URL'),
  type: z.enum(['image', 'video']),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  thumbnail_url: z.string().url().optional(),
  caption: z.string().max(200).optional(),
  alt: z.string().max(200).optional(),
});

export type MediaItem = z.infer<typeof mediaItemSchema>;

// Post creation schema
export const createPostSchema = z.object({
  title: z.string()
    .max(100, 'Title must be 100 characters or less')
    .optional()
    .transform(val => val?.trim() || undefined),
  
  content: z.string()
    .min(1, 'Content is required')
    .max(5000, 'Content must be 5000 characters or less')
    .transform(val => val.trim()),
  
  group_id: z.string().uuid('Invalid group ID'),
  
  media: z.array(mediaItemSchema)
    .max(10, 'Maximum 10 media items allowed')
    .optional(),
  
  visibility: postVisibilitySchema.default('public'),
  
  poll_question: z.string().max(200).optional(),
  poll_options: z.array(z.string().max(100)).min(2).max(5).optional(),
}).refine(
  (data) => {
    // At least one of title, content, media, or poll must be provided
    return data.title || data.content || (data.media && data.media.length > 0) || data.poll_question;
  },
  {
    message: 'Post must have title, content, media, or a poll',
  }
);

export type CreatePostInput = z.infer<typeof createPostSchema>;

// Post update schema (similar but all fields optional)
export const updatePostSchema = z.object({
  post_id: z.string().uuid('Invalid post ID'),
  title: z.string().max(100).optional(),
  content: z.string().min(1).max(5000).optional(),
  group_id: z.string().uuid().optional(),
  media: z.array(mediaItemSchema).max(10).optional(),
  visibility: postVisibilitySchema.optional(),
  poll_question: z.string().max(200).optional(),
  poll_options: z.array(z.string().max(100)).min(2).max(5).optional(),
});

export type UpdatePostInput = z.infer<typeof updatePostSchema>;

// Report creation schema
export const createReportSchema = z.object({
  post_id: z.string().uuid('Invalid post ID'),
  reason: z.enum([
    'spam',
    'harassment',
    'hate_speech',
    'violence',
    'misinformation',
    'inappropriate_content',
    'other'
  ]),
  details: z.string()
    .max(500, 'Details must be 500 characters or less')
    .optional(),
});

export type CreateReportInput = z.infer<typeof createReportSchema>;
