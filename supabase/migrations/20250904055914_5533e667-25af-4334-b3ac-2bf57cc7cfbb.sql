-- Update the first user to have admin role so they can create categories
UPDATE public.user_roles 
SET role = 'admin'::app_role 
WHERE user_id = 'b375e50e-a6de-499e-81a1-608744aa47ca';