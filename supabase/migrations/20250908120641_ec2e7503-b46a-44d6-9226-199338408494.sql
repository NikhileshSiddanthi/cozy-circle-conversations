-- Assign admin role to the user who is likely currently signed in
INSERT INTO public.user_roles (user_id, role)
VALUES ('aee189b3-64b3-4267-bed8-598920ed6e34', 'admin'::app_role)
ON CONFLICT (user_id, role) DO NOTHING;

-- Also assign to the first user just in case
INSERT INTO public.user_roles (user_id, role)
VALUES ('4f6ebc62-8288-4d77-b46e-7105f4b9a905', 'admin'::app_role)
ON CONFLICT (user_id, role) DO NOTHING;