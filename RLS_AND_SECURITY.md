# Row Level Security (RLS) and Security Architecture

## Overview

This document explains the RLS policies and security measures implemented for the post functionality in CoziChat.

## Database Schema

### Posts Table
- `id`: UUID primary key
- `author_id` (user_id): UUID foreign key to auth.users
- `group_id`: UUID foreign key to groups
- `title`: TEXT (nullable, max 100 chars client-side)
- `content`: TEXT (required, max 5000 chars client-side)
- `media_type`: TEXT (nullable)
- `media_url`: TEXT or JSONB (nullable)
- `media_thumbnail`: TEXT (nullable)
- `visibility`: TEXT (public, group, private)
- `like_count`, `comment_count`: INTEGER (computed via triggers)
- `is_flagged`: BOOLEAN (for moderation)
- `created_at`, `updated_at`: TIMESTAMP WITH TIME ZONE

### Reports Table
- `id`: UUID primary key
- `reporter_id`: UUID (user who reported)
- `post_id`: UUID foreign key to posts
- `reason`: ENUM (spam, harassment, hate_speech, violence, misinformation, inappropriate_content, other)
- `details`: TEXT (optional, max 500 chars)
- `status`: ENUM (pending, reviewed, dismissed, actioned)
- `reviewed_by`: UUID (nullable)
- `reviewed_at`: TIMESTAMP (nullable)
- `created_at`, `updated_at`: TIMESTAMP WITH TIME ZONE

## RLS Policies

### Posts Table Policies

#### SELECT (Read) Policies
1. **Public posts**: Anyone can view posts in approved public groups
   ```sql
   (EXISTS (
     SELECT 1 FROM groups g
     WHERE g.id = posts.group_id
       AND g.is_approved = true
       AND g.is_public = true
   ))
   ```

2. **Private group posts**: Only group members can view posts in private groups
   ```sql
   (EXISTS (
     SELECT 1 FROM groups g
     JOIN group_members gm ON g.id = gm.group_id
     WHERE g.id = posts.group_id
       AND g.is_approved = true
       AND g.is_public = false
       AND gm.user_id = auth.uid()
       AND gm.status = 'approved'
   ))
   ```

#### INSERT Policies
- Only authenticated users can create posts
- Must be posting to an approved group
- `author_id` is set server-side to `auth.uid()` (client cannot override)

#### UPDATE Policies
- Post creator can edit their own posts
- Admins and group moderators can edit any post in their groups
- Uses `has_role()` and `is_group_admin_or_moderator()` functions

#### DELETE Policies
- Post creator can delete their own posts
- Admins and group moderators can delete posts
- Cascade deletion handles related media, comments, reactions

### Reports Table Policies

#### SELECT (Read) Policies
1. **Own reports**: Users can view their own reports
2. **Admin/Moderator access**: Admins and moderators can view all reports

#### INSERT Policies
- Authenticated users can create reports
- `reporter_id` is set server-side to `auth.uid()`
- Cannot report own posts (enforced server-side)
- Unique constraint prevents duplicate reports

#### UPDATE Policies
- Only admins and moderators can update report status

## Security Measures

### 1. Server-Side Validation
All post creation goes through the `publish-post` edge function which:
- Authenticates the user via JWT
- Validates input using Zod schemas
- Sanitizes HTML content using DOMPurify
- Enforces `author_id = auth.uid()` (prevents impersonation)
- Checks group membership for private groups
- Validates media references

### 2. Content Sanitization
- HTML content is sanitized server-side using DOMPurify
- Only safe tags allowed: p, strong, em, a, ul, ol, li, h1-h6, blockquote, code, pre
- Allowed attributes: href, target, rel
- No data attributes or unknown protocols

### 3. Rate Limiting & Moderation
- Multiple reports (≥3) auto-flag posts for review
- Flagged posts appear in admin moderation queue
- Posts can be deleted by admins/moderators
- Reporters are anonymous to post authors

### 4. Media Upload Security
- Media uploaded to Supabase Storage with proper RLS
- Only validated references stored in database
- File size limits enforced
- MIME type validation

### 5. Database Functions
- `has_role(user_id, role)`: Check user role (security definer)
- `is_group_member(group_id, user_id)`: Check group membership
- `is_group_admin_or_moderator(group_id, user_id)`: Check moderation rights

## Testing RLS Policies

### Test Setup
1. Create test users with different roles (user, moderator, admin)
2. Create test groups (public and private)
3. Add users to groups with different membership statuses

### Test Cases

#### Public Post Access
```sql
-- As unauthenticated user
SELECT * FROM posts WHERE group_id = '<public_group_id>';
-- Should return posts from approved public groups only
```

#### Private Post Access
```sql
-- As authenticated non-member
SELECT * FROM posts WHERE group_id = '<private_group_id>';
-- Should return empty (no access)

-- As authenticated member
SET request.jwt.claims TO '{"sub": "<member_user_id>"}';
SELECT * FROM posts WHERE group_id = '<private_group_id>';
-- Should return posts (has access)
```

#### Post Creation
```sql
-- Try to create post with different author_id
INSERT INTO posts (user_id, group_id, content)
VALUES ('<different_user_id>', '<group_id>', 'Test');
-- Should fail (RLS prevents setting wrong user_id)
```

#### Report Creation
```sql
-- Try to report own post
-- Should fail (enforced in edge function)

-- Try to create duplicate report
-- Should fail (unique constraint)
```

### Testing via Edge Functions

#### Test Post Creation
```bash
curl -X POST https://your-project.supabase.co/functions/v1/publish-post \
  -H "Authorization: Bearer <user_jwt>" \
  -H "Content-Type: application/json" \
  -d '{"draftId": "<draft_id>", "visibility": "public"}'
```

#### Test Report Creation
```bash
curl -X POST https://your-project.supabase.co/functions/v1/create-report \
  -H "Authorization: Bearer <user_jwt>" \
  -H "Content-Type: application/json" \
  -d '{"post_id": "<post_id>", "reason": "spam"}'
```

## Security Checklist

- [x] All sensitive operations go through server-side functions
- [x] Input validation with Zod schemas
- [x] HTML content sanitization with DOMPurify
- [x] RLS policies enforced on all tables
- [x] `author_id` cannot be spoofed by client
- [x] Group membership checked for private posts
- [x] Media references validated before storage
- [x] Report system prevents abuse (unique constraint, no self-reporting)
- [x] Auto-flagging based on report threshold
- [x] Moderation tools for admins

## Common Security Pitfalls to Avoid

1. **Never trust client-provided user IDs**: Always use `auth.uid()` server-side
2. **Always sanitize HTML**: Client-side rendering of user content requires sanitization
3. **Check group membership**: For private content, verify membership server-side
4. **Validate media references**: Ensure media URLs point to your storage
5. **Rate limit reports**: Prevent report abuse with unique constraints
6. **Audit logs**: Consider adding audit logs for sensitive operations

## Maintenance

### Regular Security Reviews
- Review RLS policies quarterly
- Update DOMPurify configuration as needed
- Monitor flagged content and reports
- Review admin actions and moderation logs

### Performance Monitoring
- Monitor query performance on posts and reports tables
- Add indexes as needed based on query patterns
- Consider materialized views for heavy aggregations

## Contact
For security concerns or questions, contact the development team.
