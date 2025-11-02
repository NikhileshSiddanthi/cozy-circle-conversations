-- QA Schema Import - Corrected for execution
-- This file fixes the USER-DEFINED type issues and sets proper execution order

-- Step 1: Create custom enum types first
CREATE TYPE media_status AS ENUM ('pending', 'uploaded', 'attached', 'deleted');
CREATE TYPE draft_status AS ENUM ('editing', 'publishing', 'published', 'failed');
CREATE TYPE app_role AS ENUM ('user', 'moderator', 'admin');

-- Step 2: Create tables without foreign key dependencies first
CREATE TABLE public.categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  icon text DEFAULT 'Flag'::text,
  color_class text DEFAULT 'bg-primary'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  image_url text,
  CONSTRAINT categories_pkey PRIMARY KEY (id)
);

CREATE TABLE public.news_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  icon text DEFAULT 'Newspaper'::text,
  color_class text DEFAULT 'bg-primary'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT news_categories_pkey PRIMARY KEY (id)
);

CREATE TABLE public.news_sources (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  domain text NOT NULL UNIQUE,
  description text,
  logo_url text,
  is_verified boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT news_sources_pkey PRIMARY KEY (id)
);

CREATE TABLE public.link_previews (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  url text NOT NULL UNIQUE,
  url_hash text NOT NULL UNIQUE,
  title text,
  description text,
  image_url text,
  provider text,
  embed_html text,
  content_type text,
  favicon_url text,
  fetched_at timestamp with time zone NOT NULL DEFAULT now(),
  fetch_error text,
  checksums jsonb,
  last_refresh_attempt timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT link_previews_pkey PRIMARY KEY (id)
);

CREATE TABLE public.visitor_stats (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  total_visits bigint NOT NULL DEFAULT 0,
  unique_visitors bigint NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT visitor_stats_pkey PRIMARY KEY (id)
);

-- Step 3: Create auth-related tables (these reference auth.users which exists in Supabase)
CREATE TABLE public.auth_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  event_type text NOT NULL CHECK (event_type = ANY (ARRAY['SIGNUP'::text, 'SIGNIN'::text, 'SIGNOUT'::text, 'LINK'::text, 'UNLINK'::text, 'REFRESH'::text, 'TOKEN_REVOKED'::text, 'SESSION_EXPIRED'::text, 'CONSENT_REVOKED'::text, 'ERROR'::text])),
  provider text,
  ip_address inet,
  user_agent text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT auth_events_pkey PRIMARY KEY (id),
  CONSTRAINT auth_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE TABLE public.auth_identities (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  provider text NOT NULL CHECK (provider = ANY (ARRAY['google'::text, 'apple'::text, 'email'::text])),
  provider_sub text NOT NULL,
  email text,
  email_verified boolean DEFAULT false,
  raw_profile jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT auth_identities_pkey PRIMARY KEY (id),
  CONSTRAINT auth_identities_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE TABLE public.user_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role app_role NOT NULL DEFAULT 'user'::app_role,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_roles_pkey PRIMARY KEY (id),
  CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE TABLE public.sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL,
  last_activity_at timestamp with time zone NOT NULL DEFAULT now(),
  user_agent text,
  ip_address inet,
  revoked_at timestamp with time zone,
  CONSTRAINT sessions_pkey PRIMARY KEY (id),
  CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE TABLE public.profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  display_name text DEFAULT 'User'::text,
  avatar_url text,
  bio text,
  phone text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  username text UNIQUE,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE TABLE public.refresh_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_id uuid NOT NULL,
  token_hash text NOT NULL UNIQUE,
  issued_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL,
  revoked_at timestamp with time zone,
  previous_token_id uuid,
  CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id),
  CONSTRAINT refresh_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT refresh_tokens_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id),
  CONSTRAINT refresh_tokens_previous_token_id_fkey FOREIGN KEY (previous_token_id) REFERENCES public.refresh_tokens(id)
);

-- Step 4: Create groups and related tables
CREATE TABLE public.groups (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category_id uuid,
  type text NOT NULL CHECK (type = ANY (ARRAY['topic'::text, 'personality'::text, 'institutional'::text])),
  is_public boolean NOT NULL DEFAULT true,
  is_approved boolean NOT NULL DEFAULT false,
  creator_id uuid NOT NULL,
  member_count integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  icon text DEFAULT 'Users'::text,
  image_url text,
  CONSTRAINT groups_pkey PRIMARY KEY (id),
  CONSTRAINT groups_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id)
);

CREATE TABLE public.group_members (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member'::text CHECK (role = ANY (ARRAY['admin'::text, 'moderator'::text, 'member'::text])),
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])),
  joined_at timestamp with time zone DEFAULT now(),
  CONSTRAINT group_members_pkey PRIMARY KEY (id),
  CONSTRAINT group_members_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id)
);

-- Step 5: Create posts and related tables
CREATE TABLE public.posts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL,
  user_id uuid NOT NULL,
  title text NOT NULL,
  content text,
  media_type text CHECK (media_type = ANY (ARRAY['image'::text, 'video'::text, 'youtube'::text, 'link'::text, 'file'::text])),
  media_url text,
  media_thumbnail text,
  poll_question text,
  poll_options jsonb DEFAULT '[]'::jsonb,
  like_count integer DEFAULT 0,
  dislike_count integer DEFAULT 0,
  comment_count integer DEFAULT 0,
  is_pinned boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  edited_at timestamp with time zone,
  is_edited boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  view_count integer DEFAULT 0,
  is_flagged boolean DEFAULT false,
  flagged_at timestamp with time zone,
  CONSTRAINT posts_pkey PRIMARY KEY (id),
  CONSTRAINT posts_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id)
);

CREATE TABLE public.comments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL,
  user_id uuid NOT NULL,
  parent_comment_id uuid,
  content text NOT NULL,
  like_count integer DEFAULT 0,
  dislike_count integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  edited_at timestamp with time zone,
  is_edited boolean DEFAULT false,
  CONSTRAINT comments_pkey PRIMARY KEY (id),
  CONSTRAINT comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id),
  CONSTRAINT comments_parent_comment_id_fkey FOREIGN KEY (parent_comment_id) REFERENCES public.comments(id)
);

CREATE TABLE public.reactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  post_id uuid,
  comment_id uuid,
  reaction_type text NOT NULL CHECK (reaction_type = ANY (ARRAY['like'::text, 'dislike'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT reactions_pkey PRIMARY KEY (id),
  CONSTRAINT reactions_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id),
  CONSTRAINT reactions_comment_id_fkey FOREIGN KEY (comment_id) REFERENCES public.comments(id)
);

CREATE TABLE public.poll_votes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL,
  user_id uuid NOT NULL,
  option_index integer NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT poll_votes_pkey PRIMARY KEY (id),
  CONSTRAINT poll_votes_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id)
);

CREATE TABLE public.reports (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL,
  post_id uuid NOT NULL,
  reason text NOT NULL CHECK (reason = ANY (ARRAY['spam'::text, 'harassment'::text, 'hate_speech'::text, 'violence'::text, 'misinformation'::text, 'inappropriate_content'::text, 'other'::text])),
  details text,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'reviewed'::text, 'dismissed'::text, 'actioned'::text])),
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT reports_pkey PRIMARY KEY (id),
  CONSTRAINT reports_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id)
);

-- Step 6: Create draft and media tables
CREATE TABLE public.post_drafts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  group_id uuid,
  title text,
  content text,
  status draft_status NOT NULL DEFAULT 'editing'::draft_status,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT post_drafts_pkey PRIMARY KEY (id),
  CONSTRAINT post_drafts_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id)
);

CREATE TABLE public.draft_media (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  draft_id uuid NOT NULL,
  user_id uuid NOT NULL,
  file_id text NOT NULL,
  url text NOT NULL,
  mime_type text,
  file_size bigint,
  status media_status NOT NULL DEFAULT 'pending'::media_status,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  order_index integer DEFAULT 0,
  thumbnail_url text,
  caption text,
  alt text,
  CONSTRAINT draft_media_pkey PRIMARY KEY (id),
  CONSTRAINT draft_media_draft_id_fkey FOREIGN KEY (draft_id) REFERENCES public.post_drafts(id)
);

CREATE TABLE public.post_media (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL,
  file_id text NOT NULL,
  url text NOT NULL,
  mime_type text,
  file_size bigint,
  status text NOT NULL DEFAULT 'attached'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  user_id uuid NOT NULL,
  order_index integer DEFAULT 0,
  thumbnail_url text,
  caption text,
  alt text,
  CONSTRAINT post_media_pkey PRIMARY KEY (id),
  CONSTRAINT post_media_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id)
);

-- Step 7: Create messaging tables
CREATE TABLE public.conversations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  is_group boolean NOT NULL DEFAULT false,
  name text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  last_message_at timestamp with time zone,
  CONSTRAINT conversations_pkey PRIMARY KEY (id),
  CONSTRAINT conversations_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(user_id)
);

CREATE TABLE public.conversation_participants (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL,
  user_id uuid NOT NULL,
  joined_at timestamp with time zone NOT NULL DEFAULT now(),
  last_read_at timestamp with time zone,
  CONSTRAINT conversation_participants_pkey PRIMARY KEY (id),
  CONSTRAINT conversation_participants_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id),
  CONSTRAINT conversation_participants_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(user_id)
);

CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  content text NOT NULL,
  media_url text,
  media_type text,
  is_edited boolean DEFAULT false,
  edited_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT messages_pkey PRIMARY KEY (id),
  CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id),
  CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.profiles(user_id)
);

-- Step 8: Create connections and presence tables
CREATE TABLE public.connections (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'accepted'::text, 'rejected'::text, 'blocked'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  message text,
  CONSTRAINT connections_pkey PRIMARY KEY (id),
  CONSTRAINT connections_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES public.profiles(user_id),
  CONSTRAINT connections_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.profiles(user_id)
);

CREATE TABLE public.user_presence (
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'offline'::text CHECK (status = ANY (ARRAY['online'::text, 'offline'::text, 'away'::text])),
  last_seen timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_presence_pkey PRIMARY KEY (user_id),
  CONSTRAINT user_presence_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(user_id)
);

-- Step 9: Create news articles table
CREATE TABLE public.news_articles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  content text,
  url text NOT NULL UNIQUE,
  image_url text,
  published_at timestamp with time zone NOT NULL,
  source_id uuid NOT NULL,
  category_id uuid NOT NULL,
  author text,
  tags text[],
  view_count integer DEFAULT 0,
  like_count integer DEFAULT 0,
  is_featured boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT news_articles_pkey PRIMARY KEY (id),
  CONSTRAINT news_articles_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.news_sources(id),
  CONSTRAINT news_articles_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.news_categories(id)
);

-- Step 10: Create notifications table
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL CHECK (type = ANY (ARRAY['group_suggestion'::text, 'group_approved'::text, 'group_rejected'::text, 'new_post'::text, 'new_comment'::text, 'post_liked'::text])),
  title text NOT NULL,
  message text NOT NULL,
  data jsonb DEFAULT '{}'::jsonb,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id)
);
