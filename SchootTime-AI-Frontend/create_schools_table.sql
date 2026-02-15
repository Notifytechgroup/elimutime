-- =====================================================
-- SCHOOTIME AI - MISSING SCHOOLS TABLE FIX
-- =====================================================

-- Create schools table for stream management
CREATE TABLE IF NOT EXISTS public.schools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    email TEXT,
    website TEXT,
    logo_url TEXT,
    school_code VARCHAR(50) UNIQUE NOT NULL,
    principal_name VARCHAR(255),
    established_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for schools
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

-- Create policy for users to manage schools
CREATE POLICY "Users can manage their own schools" ON public.schools
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.role() IN ('admin', 'school_admin'));

-- Create policy for admins to manage all schools
CREATE POLICY "Admins can manage all schools" ON public.schools
    FOR ALL USING (auth.role() = 'admin')
    WITH CHECK (auth.role() IN ('admin', 'super_admin'));

-- Insert default school (for testing)
INSERT INTO public.schools (id, name, type, address, phone, email, website, school_code, principal_name, established_date, is_active, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    'Test School',
    'primary',
    '123 Test Street',
    '555-0123',
    'test@example.com',
    '+1-555-0123',
    'Principal Smith',
    '2023-01-15',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM public.schools LIMIT 1
);

-- =====================================================
-- SUMMARY
-- This migration adds:
-- 1. Schools table
-- 2. RLS policies
-- 3. Default school data
-- =====================================================
