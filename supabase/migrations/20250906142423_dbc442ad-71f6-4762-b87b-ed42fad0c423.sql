-- Create enum for draft status
CREATE TYPE public.draft_status AS ENUM ('editing', 'scheduled', 'published', 'discarded');

-- Create enum for media status  
CREATE TYPE public.media_status AS ENUM ('pending', 'uploaded', 'attached', 'expired', 'failed');

-- Create post_drafts table
CREATE TABLE public.post_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
    title TEXT,
    content TEXT,
    status draft_status NOT NULL DEFAULT 'editing',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create draft_media table
CREATE TABLE public.draft_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    draft_id UUID REFERENCES public.post_drafts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    file_id TEXT NOT NULL, -- storage file key
    url TEXT NOT NULL,
    mime_type TEXT,
    file_size BIGINT,
    status media_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX idx_post_drafts_user_group ON public.post_drafts(user_id, group_id);
CREATE INDEX idx_post_drafts_status ON public.post_drafts(status);
CREATE INDEX idx_draft_media_draft_id ON public.draft_media(draft_id);
CREATE INDEX idx_draft_media_user_status ON public.draft_media(user_id, status);
CREATE INDEX idx_draft_media_created_at ON public.draft_media(created_at);

-- Enable RLS
ALTER TABLE public.post_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draft_media ENABLE ROW LEVEL SECURITY;

-- RLS policies for post_drafts
CREATE POLICY "Users can manage their own drafts"
ON public.post_drafts
FOR ALL
USING (auth.uid() = user_id);

-- RLS policies for draft_media  
CREATE POLICY "Users can manage their own draft media"
ON public.draft_media
FOR ALL
USING (auth.uid() = user_id);

-- Admins can manage all drafts and media
CREATE POLICY "Admins can manage all drafts"
ON public.post_drafts
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage all draft media"
ON public.draft_media
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_post_drafts_updated_at
    BEFORE UPDATE ON public.post_drafts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_draft_media_updated_at
    BEFORE UPDATE ON public.draft_media
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();