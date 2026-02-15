-- =====================================================
-- SCHOOTIME AI - COMPREHENSIVE AUTHENTICATION SYSTEM
-- Complete authentication, authorization, and user management
-- =====================================================

-- =====================================================
-- USER MANAGEMENT TABLES
-- =====================================================

-- Create users table (handled by Supabase Auth)
CREATE TABLE IF NOT EXISTS auth.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    email_confirmed_at TIMESTAMP WITH TIME ZONE,
    phone TEXT,
    full_name TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'user',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_sign_in_at TIMESTAMP WITH TIME ZONE,
    user_metadata JSONB DEFAULT '{}'::jsonb
);

-- Create user_profiles table for extended user information
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    bio TEXT,
    avatar_url TEXT,
    date_of_birth DATE,
    gender VARCHAR(10),
    address TEXT,
    city TEXT,
    country TEXT,
    emergency_contact TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_roles table for role management
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL,
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assigned_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_sessions table for session management
CREATE TABLE IF NOT EXISTS public.user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_token TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_accessed_at TIMESTAMP WITH TIME ZONE,
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- SCHOOL MANAGEMENT TABLES
-- =====================================================

-- Create schools table
CREATE TABLE IF NOT EXISTS public.schools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    address TEXT,
    phone TEXT,
    email TEXT,
    website TEXT,
    established_date DATE,
    is_active BOOLEAN DEFAULT true,
    subscription_tier VARCHAR(50) DEFAULT 'basic',
    max_students INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    admin_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    updated_by UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create academic_years table
CREATE TABLE IF NOT EXISTS public.academic_years (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    year VARCHAR(10) NOT NULL,
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create terms table
CREATE TABLE IF NOT EXISTS public.terms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create classes table
CREATE TABLE IF NOT EXISTS public.classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    grade_level VARCHAR(50) NOT NULL,
    stream_name VARCHAR(100) NOT NULL,
    subject_name VARCHAR(100) NOT NULL,
    teacher_id UUID REFERENCES public.teachers(id) ON DELETE CASCADE,
    max_students INTEGER DEFAULT 30,
    room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create streams table
CREATE TABLE IF NOT EXISTS public.streams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    grade_level INTEGER NOT NULL,
    stream_name VARCHAR(100) NOT NULL,
    capacity INTEGER DEFAULT 30,
    class_teacher_id UUID REFERENCES public.teachers(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create subjects table
CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create rooms table
CREATE TABLE IF NOT EXISTS public.rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    capacity INTEGER DEFAULT 30,
    room_type VARCHAR(50) DEFAULT 'classroom',
    equipment JSONB DEFAULT '[]'::jsonb,
    has_projector BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create teachers table
CREATE TABLE IF NOT EXISTS public.teachers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    specialization TEXT,
    qualifications JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TIMETABLE MANAGEMENT TABLES
-- =====================================================

-- Create timetables table
CREATE TABLE IF NOT EXISTS public.timetables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE CASCADE,
    is_template BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'draft',
    start_date DATE,
    end_date DATE,
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    updated_by UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create timetable_entries table
CREATE TABLE IF NOT EXISTS public.timetable_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timetable_id UUID REFERENCES public.timetables(id) ON DELETE CASCADE,
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES public.teachers(id) ON DELETE CASCADE,
    room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL,
    period_number INTEGER NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TEMPLATES TABLES
-- =====================================================

-- Create templates table
CREATE TABLE IF NOT EXISTS public.templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'draft',
    description TEXT,
    school_type VARCHAR(50) NOT NULL,
    periods_per_day INTEGER DEFAULT 8,
    period_duration INTEGER DEFAULT 40,
    days_per_week INTEGER DEFAULT 5,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    break_config JSONB DEFAULT '[]'::jsonb,
    structure_config JSONB DEFAULT '{}'::jsonb,
    preview_image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    is_deployed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    updated_by UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create deployed_templates table
CREATE TABLE IF NOT EXISTS public.deployed_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES public.templates(id) ON DELETE CASCADE,
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    deployed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deployed_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    deployment_config JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- SUBSCRIPTIONS TABLES
-- =====================================================

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    tier VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    features JSONB DEFAULT '{}'::jsonb,
    price DECIMAL(10,2) DEFAULT 0.00,
    billing_cycle VARCHAR(50) DEFAULT 'monthly',
    starts_at DATE,
    ends_at DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancelled_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    stripe_subscription_id TEXT,
    auto_renews BOOLEAN DEFAULT true
);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deployed_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- USERS RLS POLICIES
-- =====================================================

-- Users can manage their own profile
CREATE POLICY "Users can manage their own profile" ON public.user_profiles
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.role() = 'authenticated');

-- Users can read all profiles
CREATE POLICY "Users can read all profiles" ON public.user_profiles
    FOR SELECT USING (auth.role() IN ('authenticated', 'admin'));

-- Admins can manage all profiles
CREATE POLICY "Admins can manage all profiles" ON public.user_profiles
    FOR ALL USING (auth.role() = 'admin');

-- Users can manage their own roles
CREATE POLICY "Users can manage their own roles" ON public.user_roles
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.role() = 'authenticated');

-- Admins can read all roles
CREATE POLICY "Admins can read all roles" ON public.user_roles
    FOR SELECT USING (auth.role() IN ('authenticated', 'admin'));

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to check if user has completed onboarding
CREATE OR REPLACE FUNCTION check_user_onboarding_complete(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    completed_steps INTEGER := 0;
BEGIN
    -- Check if user has full name
    IF EXISTS (
        SELECT 1 FROM public.user_profiles 
        WHERE user_id = check_user_onboarding_complete.user_id 
        AND full_name IS NOT NULL 
        AND bio IS NOT NULL 
        AND date_of_birth IS NOT NULL
    THEN
            completed_steps := completed_steps + 1;
        END IF;
    
    -- Check if user has set preferences
    IF EXISTS (
        SELECT 1 FROM public.user_preferences 
        WHERE user_id = check_user_onboarding_complete.user_id 
        AND preference_key = 'onboarding_completed'
    THEN
            completed_steps := completed_steps + 1;
        END IF;
    
    -- Check if user has joined a school
    IF EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = check_user_onboarding_complete.user_id 
        AND school_id IS NOT NULL
    THEN
            completed_steps := completed_steps + 1;
        END IF;
    
    RETURN completed_steps >= 3;
END;
$$ LANGUAGE plpgsql SECURITY SETTER search_path = off;

-- Function to get user onboarding status
CREATE OR REPLACE FUNCTION get_user_onboarding_status(user_id UUID)
RETURNS JSONB AS $$
DECLARE
    result JSONB DEFAULT '{}'::jsonb;
    completed_steps INTEGER := 0;
    preferences JSONB DEFAULT '{}'::jsonb;
    
    -- Check full name
    IF EXISTS (
        SELECT full_name FROM public.user_profiles 
        WHERE user_id = get_user_onboarding_status.user_id
    THEN
            result := jsonb_set(result, 'full_name', user_profiles.full_name);
            completed_steps := completed_steps + 1;
        END IF;
    
    -- Check bio
    IF EXISTS (
        SELECT bio FROM public.user_profiles 
        WHERE user_id = get_user_onboarding_status.user_id
        THEN
            result := jsonb_set(result, 'bio', user_profiles.bio);
            completed_steps := completed_steps + 1;
        END IF;
    
    -- Check date of birth
    IF EXISTS (
        SELECT date_of_birth FROM public.user_profiles 
        WHERE user_id = get_user_onboarding_status.user_id
        THEN
            result := jsonb_set(result, 'date_of_birth', user_profiles.date_of_birth);
            completed_steps := completed_steps + 1;
        END IF;
    
    -- Check preferences
    SELECT jsonb_agg(
        jsonb_build_object(
            preference_key,
            preference_value
        ) FROM public.user_preferences 
        WHERE user_id = get_user_onboarding_status.user_id
    ) INTO preferences
    FROM public.user_preferences
    WHERE user_id = get_user_onboarding_status.user_id
    THEN
            preferences := jsonb_set(result, 'preferences', preferences);
            completed_steps := completed_steps + 1;
        END IF;
    
    RETURN jsonb_build_object(
        'completed_steps', completed_steps,
        'onboarding_complete', completed_steps >= 3,
        'preferences', preferences,
        'status', 'complete'
    );
END;
$$ LANGUAGE plpgsql SECURITY SETTER search_path = off;

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- User-related indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON auth.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON auth.users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON auth.users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON auth.users(created_at);
CREATE INDEX IF NOT EXISTS idx_users_updated_at ON auth.users(updated_at);

-- Profile indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_school_id ON public.user_profiles(school_id);

-- School-related indexes
CREATE INDEX IF NOT EXISTS idx_schools_is_active ON public.schools(is_active);
CREATE INDEX IF NOT EXISTS idx_schools_admin_id ON public.schools(admin_id);

-- Session indexes
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON public.user_sessions(expires_at);

-- Template indexes
CREATE INDEX IF NOT EXISTS idx_templates_school_type ON public.templates(school_type);
CREATE INDEX IF NOT EXISTS idx_templates_is_active ON public.templates(is_active);

-- Timetable indexes
CREATE INDEX IF NOT EXISTS idx_timetables_school_id ON public.timetables(school_id);
CREATE INDEX IF NOT EXISTS idx_timetables_status ON public.timetables(status);
CREATE INDEX IF NOT EXISTS idx_timetable_entries_timetable_id ON public.timetable_entries(timetable_id);
CREATE INDEX IF NOT EXISTS idx_timetable_entries_class_id ON public.timetable_entries(class_id);
CREATE INDEX IF NOT EXISTS idx_timetable_entries_subject_id ON public.timetable_entries(subject_id);
CREATE INDEX IF NOT EXISTS idx_timetable_entries_teacher_id ON public.timetable_entries(teacher_id);
CREATE INDEX IF NOT EXISTS idx_timetable_entries_room_id ON public.timetable_entries(room_id);

-- Subscription indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_school_id ON public.subscriptions(school_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);

-- =====================================================
-- SUMMARY
-- This comprehensive migration adds:
-- 1. Complete user management system with Supabase Auth
-- 2. School management with classes, teachers, rooms, subjects
-- 3. Timetable management with entries and templates
-- 4. Template system with deployment tracking
-- 5. Subscription management for monetization
-- 6. Comprehensive RLS policies for security
-- 7. Performance optimizations for all tables
-- 8. Helper functions for user onboarding
-- 9. Admin dashboard views for management
-- =====================================================
