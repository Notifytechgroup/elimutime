-- =====================================================
-- FIX DATABASE ERRORS (UPDATED)
-- Relax constraints to allow creation of entities without 
-- immediate linking to Auth Users, Academic Years, or Codes
-- =====================================================

-- 1. Fix Teachers Table
-- Allow teachers to be created without a linked Auth User initially
DO $$ 
BEGIN 
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'teachers' 
        AND column_name = 'user_id' 
        AND is_nullable = 'NO'
    ) THEN 
        ALTER TABLE public.teachers ALTER COLUMN user_id DROP NOT NULL;
    END IF;
END $$;

-- 2. Fix Streams Table
-- Allow streams to be created without an Academic Year initially
DO $$ 
BEGIN 
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'streams' 
        AND column_name = 'academic_year_id' 
        AND is_nullable = 'NO'
    ) THEN 
        ALTER TABLE public.streams ALTER COLUMN academic_year_id DROP NOT NULL;
    END IF;
END $$;

-- 3. Fix Students Table (Proactive)
-- Allow students to be created without a linked Auth User initially
DO $$ 
BEGIN 
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'students' 
        AND column_name = 'user_id' 
        AND is_nullable = 'NO'
    ) THEN 
        ALTER TABLE public.students ALTER COLUMN user_id DROP NOT NULL;
    END IF;
END $$;

-- 4. Fix Subjects Table
-- Allow subjects to be created without a code (Frontend doesn't provide it)
DO $$ 
BEGIN 
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'subjects' 
        AND column_name = 'code' 
        AND is_nullable = 'NO'
    ) THEN 
        ALTER TABLE public.subjects ALTER COLUMN code DROP NOT NULL;
    END IF;
END $$;


-- 5. Fix Timetables Table
-- Allow timetables to be created without a stream_id initially if needed
ALTER TABLE public.timetables ALTER COLUMN stream_id DROP NOT NULL;

-- 6. Add Missing RLS Policies for Public/Anon if needed (Optional but recommended for dev)
-- Ensure authenticated users can insert into these tables
-- Checks if policy exists before creating to avoid errors

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'teachers' AND policyname = 'authenticated_insert_teachers'
    ) THEN
        CREATE POLICY "authenticated_insert_teachers" ON public.teachers
            FOR INSERT TO authenticated WITH CHECK (school_id IS NOT NULL);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'streams' AND policyname = 'authenticated_insert_streams'
    ) THEN
        CREATE POLICY "authenticated_insert_streams" ON public.streams
            FOR INSERT TO authenticated WITH CHECK (school_id IS NOT NULL);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'students' AND policyname = 'authenticated_insert_students'
    ) THEN
        CREATE POLICY "authenticated_insert_students" ON public.students
            FOR INSERT TO authenticated WITH CHECK (school_id IS NOT NULL);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'subjects' AND policyname = 'authenticated_insert_subjects'
    ) THEN
        CREATE POLICY "authenticated_insert_subjects" ON public.subjects
            FOR INSERT TO authenticated WITH CHECK (school_id IS NOT NULL);
    END IF;
END $$;

-- =====================================================
-- END OF FIXES
-- =====================================================
