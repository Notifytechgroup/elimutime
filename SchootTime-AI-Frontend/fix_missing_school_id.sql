-- Fix Missing School ID Issue

-- 1. Ensure RLS is enabled on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policy to ensure clean slate (ignore error if not exists)
DROP POLICY IF EXISTS "users_read_own_roles" ON public.user_roles;

-- 3. Re-create the policy for users to read their own roles
CREATE POLICY "users_read_own_roles" ON public.user_roles
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

-- 4. EMERGENCY FIX: If the user has no role, insert a default one (Optional/Diagnostic)
-- (We cannot easily do this in SQL without knowing the specific User ID, but we can ensure the school exists)

-- 5. Enable RLS on profiles just in case
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_read_own_profiles" ON public.profiles;
CREATE POLICY "users_read_own_profiles" ON public.profiles
    FOR SELECT TO authenticated
    USING (auth.uid() = id);

-- 6. Grant usage on schema just in case
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
