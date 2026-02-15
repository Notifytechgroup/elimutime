-- =====================================================
-- SCHOOLTIME AI - SCHOOL TYPES AND TEMPLATES
-- SQL for admin dashboard template management
-- =====================================================

-- =====================================================
-- 1. SAMPLE SCHOOL TYPES WITH DEFAULT TEMPLATES
-- =====================================================

-- Insert sample templates for each school type
INSERT INTO public.templates (name, type, status, is_deployed, is_active, school_type, description, periods_per_day, period_duration, days_per_week, start_time, end_time, break_config, structure_config, created_at, updated_at) VALUES
-- Lower Primary School Template
('Lower Primary Template', 'graphical', 'deployed', true, true, 'lower_primary', 
'Optimized template for lower primary schools (Grades 1-3) with basic subjects and shorter periods', 
8, 30, 5, '08:00', '12:30', 
'[
  {"afterPeriod": 2, "duration": 15, "label": "Short Break"},
  {"afterPeriod": 4, "duration": 20, "label": "Long Break"}
]',
'{
  "subjects": ["Mathematics", "English", "Kiswahili", "Science", "Social Studies", "CRE/IRE", "PE", "Art & Music"],
  "gradeLevels": ["Grade 1", "Grade 2", "Grade 3"],
  "features": ["Simple timetable", "Shorter periods", "More breaks", "Basic subjects"]
}',
NOW(), NOW()),

-- Upper Primary School Template  
('Upper Primary Template', 'graphical', 'deployed', true, true, 'upper_primary',
'Comprehensive template for upper primary schools (Grades 4-8) with full subject range',
8, 40, 5, '08:00', '15:30',
'[
  {"afterPeriod": 2, "duration": 15, "label": "Short Break"},
  {"afterPeriod": 4, "duration": 30, "label": "Lunch Break"}
]',
'{
  "subjects": ["Mathematics", "English", "Kiswahili", "Science", "Social Studies", "CRE/IRE", "Agriculture", "Business Studies", "PE", "Art & Music"],
  "gradeLevels": ["Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8"],
  "features": ["Full subject range", "Standard periods", "Lunch break", "KCPE preparation"]
}',
NOW(), NOW()),

-- Junior High School Template
('Junior High Template', 'graphical', 'deployed', true, true, 'junior_high',
'Template for junior high schools (Forms 1-3) with specialized subjects and labs',
9, 40, 5, '08:00', '16:00',
'[
  {"afterPeriod": 2, "duration": 15, "label": "Short Break"},
  {"afterPeriod": 5, "duration": 40, "label": "Lunch Break"}
]',
'{
  "subjects": ["Mathematics", "English", "Kiswahili", "Physics", "Chemistry", "Biology", "History", "Geography", "CRE/IRE", "Business Studies", "Agriculture", "Computer Studies"],
  "gradeLevels": ["Form 1", "Form 2", "Form 3"],
  "features": ["Science labs", "Specialized subjects", "Longer school day", "KCSE preparation"]
}',
NOW(), NOW()),

-- Senior High School Template
('Senior High Template', 'graphical', 'deployed', true, true, 'senior_high',
'Advanced template for senior high schools (Forms 4-5) with exam focus and electives',
10, 40, 5, '08:00', '17:00',
'[
  {"afterPeriod": 2, "duration": 15, "label": "Short Break"},
  {"afterPeriod": 5, "duration": 40, "label": "Lunch Break"},
  {"afterPeriod": 8, "duration": 15, "label": "Evening Break"}
]',
'{
  "subjects": ["Mathematics", "English", "Kiswahili", "Physics", "Chemistry", "Biology", "History", "Geography", "CRE/IRE", "Business Studies", "Agriculture", "Computer Studies", "Home Science"],
  "gradeLevels": ["Form 4", "Form 5"],
  "features": ["Elective subjects", "Extended hours", "Exam preparation", "Career guidance"]
}',
NOW(), NOW()),

-- International School Template
('International School Template', 'graphical', 'deployed', true, true, 'international',
'International curriculum template (IGCSE/IB) with flexible scheduling and modern subjects',
8, 45, 5, '08:30', '16:30',
'[
  {"afterPeriod": 2, "duration": 20, "label": "Morning Break"},
  {"afterPeriod": 5, "duration": 60, "label": "Lunch Break"}
]',
'{
  "subjects": ["Mathematics", "English Language", "English Literature", "Physics", "Chemistry", "Biology", "History", "Geography", "Economics", "Business Studies", "Computer Science", "Art & Design", "Physical Education"],
  "gradeLevels": ["Year 7", "Year 8", "Year 9", "Year 10", "Year 11"],
  "features": ["International curriculum", "Longer periods", "Modern subjects", "Flexible scheduling"]
}',
NOW(), NOW()),

-- College/University Template
('College Template', 'graphical', 'deployed', true, true, 'college',
'Higher education template with flexible scheduling for colleges and universities',
6, 60, 5, '09:00', '17:00',
'[
  {"afterPeriod": 2, "duration": 30, "label": "Coffee Break"},
  {"afterPeriod": 4, "duration": 90, "label": "Lunch Break"}
]',
'{
  "subjects": ["Core Courses", "Electives", "Lab Sessions", "Seminars", "Study Periods", "Extra-Curricular"],
  "gradeLevels": ["Year 1", "Year 2", "Year 3", "Year 4"],
  "features": ["Flexible scheduling", "Longer periods", "Self-study time", "Professional focus"]
}',
NOW(), NOW()),

-- Training/Vocational Template
('Training Center Template', 'graphical', 'deployed', true, true, 'training',
'Vocational training template with practical sessions and workshop time',
8, 50, 5, '08:00', '17:00',
'[
  {"afterPeriod": 2, "duration": 20, "label": "Break"},
  {"afterPeriod": 5, "duration": 60, "label": "Lunch & Workshop"}
]',
'{
  "subjects": ["Technical Skills", "Practical Sessions", "Theory Classes", "Workshop Time", "Industry Projects", "Certification Prep"],
  "gradeLevels": ["Level 1", "Level 2", "Level 3"],
  "features": ["Hands-on training", "Workshop integration", "Industry focus", "Certification ready"]
}',
NOW(), NOW());

-- =====================================================
-- 2. ADMIN DASHBOARD ACCESSIBLE QUERIES
-- =====================================================

-- Query to get all templates available for admin dashboard
SELECT 
    t.id,
    t.name,
    t.type,
    t.status,
    t.is_deployed,
    t.is_active,
    t.school_type,
    t.description,
    t.periods_per_day,
    t.period_duration,
    t.days_per_week,
    t.start_time,
    t.end_time,
    t.preview_image,
    t.created_at,
    t.updated_at,
    COUNT(dt.id) as deployment_count,
    MAX(dt.deployed_at) as last_deployed_at
FROM public.templates t
LEFT JOIN public.deployed_templates dt ON t.id = dt.template_id
WHERE t.is_active = true
GROUP BY t.id, t.name, t.type, t.status, t.is_deployed, t.is_active, 
         t.school_type, t.description, t.periods_per_day, t.period_duration, 
         t.days_per_week, t.start_time, t.end_time, t.preview_image, 
         t.created_at, t.updated_at
ORDER BY t.school_type, t.name;

-- Query to get templates by school type (for filtering in admin dashboard)
-- Replace 'primary' with desired school type: 'primary', 'highschool', 'college', 'university', 'training', 'international'
SELECT 
    t.id,
    t.name,
    t.description,
    t.school_type,
    t.periods_per_day,
    t.period_duration,
    t.days_per_week,
    t.start_time,
    t.end_time,
    t.is_deployed,
    t.created_at
FROM public.templates t
WHERE t.is_active = true 
  AND t.is_deployed = true
  AND t.school_type = 'primary'  -- Change this value as needed
ORDER BY t.created_at DESC;

-- Query to get school types with available templates
SELECT 
    t.school_type,
    COUNT(t.id) as template_count,
    STRING_AGG(DISTINCT t.name, ', ') as available_templates
FROM public.templates t
WHERE t.is_active = true 
  AND t.is_deployed = true
  AND t.school_type IS NOT NULL
GROUP BY t.school_type
ORDER BY t.school_type;

-- Query to get template deployment history for admin dashboard
SELECT 
    t.name as template_name,
    t.school_type,
    dt.deployed_at,
    u.email as deployed_by_email,
    up.full_name as deployed_by_name,
    s.name as school_name
FROM public.deployed_templates dt
JOIN public.templates t ON dt.template_id = t.id
LEFT JOIN auth.users u ON dt.deployed_by = u.id
LEFT JOIN public.profiles up ON u.id = up.id
LEFT JOIN public.schools s ON t.school_type = s.school_type
ORDER BY dt.deployed_at DESC;

-- =====================================================
-- 3. ADMIN DASHBOARD HELPER VIEWS
-- =====================================================

-- View for admin dashboard template management
CREATE OR REPLACE VIEW admin_template_overview AS
SELECT 
    t.id,
    t.name,
    t.type,
    t.status,
    t.is_deployed,
    t.is_active,
    t.school_type,
    t.description,
    t.periods_per_day,
    t.period_duration,
    t.days_per_week,
    t.start_time,
    t.end_time,
    t.break_config,
    t.structure_config,
    t.preview_image,
    t.created_at,
    t.updated_at,
    COUNT(DISTINCT dt.id) as deployment_count,
    MAX(dt.deployed_at) as last_deployed_at,
    COUNT(DISTINCT s.id) as schools_using_template
FROM public.templates t
LEFT JOIN public.deployed_templates dt ON t.id = dt.template_id
LEFT JOIN public.schools s ON t.id = s.timetable_template
WHERE t.is_active = true
GROUP BY t.id, t.name, t.type, t.status, t.is_deployed, t.is_active, 
         t.school_type, t.description, t.periods_per_day, t.period_duration, 
         t.days_per_week, t.start_time, t.end_time, t.break_config, 
         t.structure_config, t.preview_image, t.created_at, t.updated_at;

-- View for school type statistics
CREATE OR REPLACE VIEW school_type_statistics AS
SELECT 
    t.school_type,
    COUNT(t.id) as total_templates,
    COUNT(CASE WHEN t.is_deployed = true THEN 1 END) as deployed_templates,
    COUNT(CASE WHEN t.is_active = true THEN 1 END) as active_templates,
    COUNT(DISTINCT s.id) as schools_count,
    AVG(t.periods_per_day) as avg_periods_per_day,
    AVG(t.period_duration) as avg_period_duration
FROM public.templates t
LEFT JOIN public.schools s ON t.school_type = s.school_type
WHERE t.school_type IS NOT NULL
GROUP BY t.school_type
ORDER BY t.school_type;

-- =====================================================
-- 4. SAMPLE ADMIN DASHBOARD QUERIES
-- =====================================================

-- Sample admin dashboard queries with filters
-- Uncomment and modify the WHERE clause as needed

-- Get all templates for admin dashboard
SELECT * FROM admin_template_overview
ORDER BY created_at DESC;

-- Get templates by school type (uncomment to use)
-- SELECT * FROM admin_template_overview 
-- WHERE school_type = 'primary'  -- Change as needed
-- ORDER BY created_at DESC;

-- Get only deployed templates (uncomment to use)
-- SELECT * FROM admin_template_overview 
-- WHERE is_deployed = true
-- ORDER BY created_at DESC;

-- Get only active templates (uncomment to use)
-- SELECT * FROM admin_template_overview 
-- WHERE is_active = true
-- ORDER BY created_at DESC;

-- Get template usage statistics
SELECT 
    school_type,
    total_templates,
    deployed_templates,
    active_templates,
    schools_count,
    ROUND((deployed_templates::decimal / NULLIF(total_templates, 0)) * 100, 2) as deployment_rate
FROM school_type_statistics
ORDER BY deployment_rate DESC;

-- Get recently deployed templates
SELECT 
    template_name,
    school_type,
    deployed_at,
    deployed_by_name,
    deployed_by_email
FROM (
    SELECT 
        t.name as template_name,
        t.school_type,
        dt.deployed_at,
        up.full_name as deployed_by_name,
        u.email as deployed_by_email,
        ROW_NUMBER() OVER (PARTITION BY t.id ORDER BY dt.deployed_at DESC) as rn
    FROM public.deployed_templates dt
    JOIN public.templates t ON dt.template_id = t.id
    LEFT JOIN auth.users u ON dt.deployed_by = u.id
    LEFT JOIN public.profiles up ON u.id = up.id
) recent_deployments
WHERE rn = 1
ORDER BY deployed_at DESC
LIMIT 10;

-- =====================================================
-- 5. TEMPLATE MANAGEMENT FUNCTIONS
-- =====================================================

-- Function to deploy template to school
CREATE OR REPLACE FUNCTION deploy_template_to_school(
    p_template_id UUID,
    p_school_id UUID,
    p_deployed_by UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_school_type TEXT;
    v_template_type TEXT;
BEGIN
    -- Get school and template types
    SELECT school_type INTO v_school_type FROM public.schools WHERE id = p_school_id;
    SELECT school_type INTO v_template_type FROM public.templates WHERE id = p_template_id;
    
    -- Validate template matches school type
    IF v_school_type != v_template_type THEN
        RAISE EXCEPTION 'Template type (%) does not match school type (%)', v_template_type, v_school_type;
    END IF;
    
    -- Update school with template
    UPDATE public.schools 
    SET timetable_template = p_template_id, updated_at = NOW()
    WHERE id = p_school_id;
    
    -- Record deployment
    INSERT INTO public.deployed_templates (template_id, deployed_by, deployed_at)
    VALUES (p_template_id, p_deployed_by, NOW());
    
    RETURN TRUE;
END;
$$;

-- Function to get recommended templates for school
CREATE OR REPLACE FUNCTION get_recommended_templates(p_school_id UUID)
RETURNS TABLE (
    template_id UUID,
    template_name TEXT,
    match_score INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id as template_id,
        t.name as template_name,
        CASE 
            WHEN t.school_type = s.school_type THEN 100
            WHEN t.school_type IN ('primary', 'highschool') AND s.school_type IN ('primary', 'highschool') THEN 80
            ELSE 50
        END as match_score
    FROM public.templates t
    CROSS JOIN public.schools s
    WHERE s.id = p_school_id
      AND t.is_deployed = true
      AND t.is_active = true
    ORDER BY match_score DESC, t.created_at DESC;
END;
$$;

-- =====================================================
-- COMPLETION
-- =====================================================

-- This SQL provides:
-- ✅ 7 pre-configured templates for different school types
-- ✅ Admin dashboard queries for template management
-- ✅ Helper views for easy data access
-- ✅ Template deployment functions
-- ✅ School type statistics and recommendations
-- ✅ Ready for admin dashboard integration
