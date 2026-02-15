-- REPLACE 'YOUR_USER_ID_HERE' with the actual UUID from the users table or Debug console
-- You can find this ID in the "User" column of the auth.users table
DO $$
DECLARE
  target_user_id uuid := 'YOUR_USER_ID_HERE'; -- <--- PUT ID HERE
  new_school_id uuid;
BEGIN
  -- 1. Create a School for them
  INSERT INTO public.schools (name, type)
  VALUES ('My Recovered School', 'primary')
  RETURNING id INTO new_school_id;

  -- 2. Create the Role
  INSERT INTO public.user_roles (user_id, role, school_id)
  VALUES (target_user_id, 'admin', new_school_id);

  -- 3. Create the Profile
  INSERT INTO public.profiles (id, first_name, school_id, role)
  VALUES (target_user_id, 'Recovered Admin', new_school_id, 'admin');
  
  RAISE NOTICE 'Fixed user % with new School ID %', target_user_id, new_school_id;
END;
$$;
