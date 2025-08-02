-- Create categories table for dynamic category management
CREATE TABLE public.categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  description text,
  icon text DEFAULT 'Flag',
  color_class text DEFAULT 'bg-primary',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create groups table for community management
CREATE TABLE public.groups (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('topic', 'personality', 'institutional')),
  is_public boolean NOT NULL DEFAULT true,
  is_approved boolean NOT NULL DEFAULT false,
  creator_id uuid NOT NULL,
  member_count integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create group members table
CREATE TABLE public.group_members (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'moderator', 'member')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  joined_at timestamp with time zone DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- Enable RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- Categories policies (public read, admin write)
CREATE POLICY "Anyone can view categories" 
ON public.categories 
FOR SELECT 
USING (true);

CREATE POLICY "Only admins can modify categories" 
ON public.categories 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Groups policies
CREATE POLICY "Anyone can view approved public groups" 
ON public.groups 
FOR SELECT 
USING (is_approved = true AND is_public = true);

CREATE POLICY "Admins can view all groups" 
ON public.groups 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own groups" 
ON public.groups 
FOR SELECT 
USING (creator_id = auth.uid());

CREATE POLICY "Authenticated users can suggest groups" 
ON public.groups 
FOR INSERT 
WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Admins can modify all groups" 
ON public.groups 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Group creators can update their pending groups" 
ON public.groups 
FOR UPDATE 
USING (creator_id = auth.uid() AND is_approved = false);

-- Group members policies
CREATE POLICY "Users can view group members for approved groups" 
ON public.group_members 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.groups 
    WHERE id = group_id AND is_approved = true
  )
);

CREATE POLICY "Admins can manage all group members" 
ON public.group_members 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can join groups" 
ON public.group_members 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create triggers for updated_at columns
CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_groups_updated_at
  BEFORE UPDATE ON public.groups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default categories
INSERT INTO public.categories (name, description, icon, color_class) VALUES
('Politics', 'Political discussions, parties, and governance', 'Flag', 'bg-primary'),
('Economy & Business', 'Economic policies, business regulations, and financial matters', 'TrendingUp', 'bg-secondary'),
('International Issues', 'Global affairs, international relations, and world events', 'Globe', 'bg-accent'),
('Social Issues', 'Social policies, civil rights, and community matters', 'Users', 'bg-primary'),
('Personalities', 'Political leaders, public figures, and influencers', 'Crown', 'bg-secondary'),
('Organizations', 'Political parties, institutions, and committees', 'Building2', 'bg-accent');