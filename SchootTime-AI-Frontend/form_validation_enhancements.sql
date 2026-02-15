-- =====================================================
-- SCHOOTIME AI - FORM VALIDATION ENHANCEMENTS
-- SQL migrations for signup form validation improvements
-- =====================================================

-- =====================================================
-- FORM VALIDATION RULES
-- Centralized validation configuration for all forms
-- =====================================================

-- Create form_validation_rules table
CREATE TABLE IF NOT EXISTS public.form_validation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_name VARCHAR(100) NOT NULL,
    field_name VARCHAR(100) NOT NULL,
    rule_type VARCHAR(50) NOT NULL, -- 'required', 'min_length', 'pattern', 'custom'
    rule_value JSONB NOT NULL,
    error_message TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for validation rules
ALTER TABLE public.form_validation_rules ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to read validation rules
CREATE POLICY "Authenticated users can read validation rules" ON public.form_validation_rules
    FOR SELECT USING (auth.role() IN ('authenticated', 'admin'));

-- Create policy for admins to manage validation rules
CREATE POLICY "Admins can manage validation rules" ON public.form_validation_rules
    FOR ALL USING (auth.role() = 'admin')
    WITH CHECK (auth.role() IN ('admin'));

-- Insert validation rules for signup form
INSERT INTO public.form_validation_rules (form_name, field_name, rule_type, rule_value, error_message)
VALUES 
    ('signup', 'email', 'required', '{"required": true}', 'Email address is required'),
    ('signup', 'email', 'pattern', '{"pattern": "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$"}', 'Please enter a valid email address'),
    ('signup', 'password', 'required', '{"required": true}', 'Password is required'),
    ('signup', 'password', 'min_length', '{"min": 6}', 'Password must be at least 6 characters long'),
    ('signup', 'password', 'pattern', '{"pattern": "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)[a-zA-Z\\d@$!%*?&]{8,}$"}', 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
    ('signup', 'confirm_password', 'required', '{"required": true}', 'Password confirmation is required'),
    ('signup', 'confirm_password', 'match', '{"field": "password"}', 'Passwords must match'),
    ('signup', 'full_name', 'required', '{"required": true, "min": 2}', 'Full name must be at least 2 characters long'),
    ('signup', 'full_name', 'pattern', '{"pattern": "^[a-zA-Z\\s\\-\\'\\.]{2,50}$"}', 'Full name can only contain letters, spaces, hyphens, and apostrophes'),
    ('signup', 'school_name', 'required', '{"required": true, "min": 3}', 'School name must be at least 3 characters long'),
    ('signup', 'school_name', 'pattern', '{"pattern": "^[a-zA-Z0-9\\s\\-&\\'\\.]{3,100}$"}', 'School name can only contain letters, numbers, spaces, hyphens, and apostrophes'),
    ('signup', 'school_type', 'required', '{"required": true}', 'School type is required'),
    ('signup', 'school_type', 'in_list', '{"options": ["primary", "highschool", "college", "university", "training", "international"]}', 'Please select a valid school type');

-- =====================================================
-- VALIDATION LOGGING
-- Track validation failures for analytics
-- =====================================================

-- Create form_validation_log table
CREATE TABLE IF NOT EXISTS public.form_validation_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    form_name VARCHAR(100) NOT NULL,
    field_name VARCHAR(100) NOT NULL,
    validation_rule VARCHAR(100),
    input_value TEXT,
    is_valid BOOLEAN NOT NULL,
    error_message TEXT,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for validation log
ALTER TABLE public.form_validation_log ENABLE ROW LEVEL SECURITY;

-- Create policy for users to log their own validation attempts
CREATE POLICY "Users can log their validation attempts" ON public.form_validation_log
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Create policy for admins to view validation logs
CREATE POLICY "Admins can view validation logs" ON public.form_validation_log
    FOR SELECT USING (auth.role() = 'admin');

-- Create policy for system to insert validation logs
CREATE POLICY "System can insert validation logs" ON public.form_validation_log
    FOR INSERT WITH CHECK (true);

-- =====================================================
-- TRIGGER FOR AUTOMATIC VALIDATION LOGGING
-- Automatically log validation attempts
-- =====================================================

-- Create function to log validation attempts
CREATE OR REPLACE FUNCTION log_validation_attempt()
RETURNS TRIGGER AS $$
BEGIN
    -- Log validation attempts for signup form
    INSERT INTO public.form_validation_log (
        user_id,
        form_name,
        field_name,
        validation_rule,
        input_value,
        is_valid,
        error_message,
        ip_address,
        created_at
    ) VALUES (
        COALESCE(auth.uid(), NULL),
        'signup',
        TG_OP,
        NEW.validation_rule,
        NEW.input_value,
        NEW.is_valid,
        NEW.error_message,
        inet_client_addr(),
        NOW()
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically log validation failures
-- Note: This would be called by your backend validation logic
CREATE TRIGGER validation_logging_trigger
AFTER INSERT OR UPDATE ON public.form_validation_log
FOR EACH ROW EXECUTE FUNCTION log_validation_attempt();

-- =====================================================
-- HELPER FUNCTIONS FOR VALIDATION
-- Reusable validation functions
-- =====================================================

-- Function to validate email format
CREATE OR REPLACE FUNCTION validate_email_format(email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN email ~* '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to validate password strength
CREATE OR REPLACE FUNCTION validate_password_strength(password TEXT)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
    has_upper BOOLEAN := FALSE;
    has_lower BOOLEAN := FALSE;
    has_number BOOLEAN := FALSE;
    has_special BOOLEAN := FALSE;
    length_ok BOOLEAN := FALSE;
BEGIN
    -- Check length
    length_ok := LENGTH(password) >= 6;
    
    -- Check for uppercase
    has_upper := password ~* '[A-Z]';
    
    -- Check for lowercase
    has_lower := password ~* '[a-z]';
    
    -- Check for numbers
    has_number := password ~* '[0-9]';
    
    -- Check for special characters
    has_special := password ~* '[@!#$%^&*()]';
    
    -- Build result JSON
    result := jsonb_build_object(
        'is_valid', length_ok AND has_upper AND has_lower AND has_number,
        'length', LENGTH(password),
        'has_upper', has_upper,
        'has_lower', has_lower,
        'has_number', has_number,
        'has_special', has_special,
        'strength_score', 
            CASE 
                WHEN LENGTH(password) >= 12 THEN 4
                WHEN LENGTH(password) >= 8 THEN 3
                WHEN LENGTH(password) >= 6 THEN 2
                ELSE 1
            END
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to check if passwords match
CREATE OR REPLACE FUNCTION passwords_match(password1 TEXT, password2 TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN password1 = password2;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- VIEWS FOR VALIDATION DASHBOARD
-- Admin views for form validation management
-- =====================================================

-- View for validation rules management
CREATE OR REPLACE VIEW admin_validation_rules_view AS
SELECT 
    fvr.id,
    fvr.form_name,
    fvr.field_name,
    fvr.rule_type,
    fvr.rule_value,
    fvr.error_message,
    fvr.is_active,
    fvr.created_at,
    fvr.updated_at,
    -- Count usage statistics
    (SELECT COUNT(*) FROM public.form_validation_log WHERE validation_rule = fvr.rule_type) as usage_count
FROM public.form_validation_rules fvr
ORDER BY fvr.form_name, fvr.field_name;

-- View for validation analytics
CREATE OR REPLACE VIEW admin_validation_analytics_view AS
SELECT 
    fvl.form_name,
    fvl.field_name,
    COUNT(*) as total_attempts,
    COUNT(*) FILTER (WHERE fvl.is_valid = true) as successful_attempts,
    COUNT(*) FILTER (WHERE fvl.is_valid = false) as failed_attempts,
    MAX(fvl.created_at) as last_attempt_at,
    -- Most common error messages
    (SELECT array_agg(error_message) FROM public.form_validation_log WHERE is_valid = false GROUP BY error_message ORDER BY COUNT(*) DESC LIMIT 5) as common_errors
FROM public.form_validation_log fvl
GROUP BY fvl.form_name, fvl.field_name
ORDER BY fvl.form_name, fvl.field_name;

-- =====================================================
-- INDEXES FOR VALIDATION PERFORMANCE
-- Improve validation query performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_form_validation_rules_form_field ON public.form_validation_rules(form_name, field_name);
CREATE INDEX IF NOT EXISTS idx_form_validation_log_user_id ON public.form_validation_log(user_id);
CREATE INDEX IF NOT EXISTS idx_form_validation_log_created_at ON public.form_validation_log(created_at);
CREATE INDEX IF NOT EXISTS idx_form_validation_log_form_field ON public.form_validation_log(form_name, field_name);

-- =====================================================
-- SUMMARY
-- This migration adds:
-- 1. Centralized form validation rules
-- 2. Validation logging and analytics
-- 3. Helper functions for validation
-- 4. Performance optimizations
-- 5. Admin dashboard views
-- =====================================================
