-- Allow public read access to user_roles for approved users (for stats display)
CREATE POLICY "Allow public read access to approved user_roles" 
ON public.user_roles 
FOR SELECT 
USING (status = 'approved');