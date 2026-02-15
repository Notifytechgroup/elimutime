-- Drop existing trigger/function to update it
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create the refined function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  school_id_val uuid;
  generated_school_code text;
BEGIN
  -- Generate a random unique school code (SCH-XXXXXX)
  generated_school_code := 'SCH-' || upper(substring(md5(random()::text) from 1 for 6));

  -- 1. Create a School ID
  INSERT INTO public.schools (name, school_code, school_type, created_at)
  VALUES (
    COALESCE(new.raw_user_meta_data->>'school_name', 'My School'),
    generated_school_code,
    COALESCE(new.raw_user_meta_data->>'school_type', 'primary'),
    NOW()
  )
  RETURNING id INTO school_id_val;

  -- 2. Create the User Role
  INSERT INTO public.user_roles (user_id, role, school_id)
  VALUES (new.id, 'admin', school_id_val);

  -- 3. Create the Profile
  -- Note: Profiles table requires full_name and email
  INSERT INTO public.profiles (id, full_name, email, school_id)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', 'Admin'),
    new.email,
    school_id_val
  );

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-attach the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
