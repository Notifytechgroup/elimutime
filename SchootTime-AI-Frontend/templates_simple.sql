-- SCHOOLTIME AI - SCHOOL TYPES AND TEMPLATES
-- SQL for admin dashboard template management

-- Insert sample templates for each school type
INSERT INTO public.templates (name, type, status, is_deployed, is_active, school_type, description, periods_per_day, period_duration, days_per_week, start_time, end_time, break_config, structure_config, created_at, updated_at) VALUES
('Lower Primary Template', 'graphical', 'deployed', true, true, 'lower_primary', 'Optimized template for lower primary schools (Grades 1-3) with basic subjects and shorter periods', 8, 30, 5, '08:00', '12:30', '[{"afterPeriod": 2, "duration": 15, "label": "Short Break"}, {"afterPeriod": 4, "duration": 20, "label": "Long Break"}]', '{"subjects": ["Mathematics", "English", "Kiswahili", "Science", "Social Studies", "CRE/IRE", "PE", "Art & Music"], "gradeLevels": ["Grade 1", "Grade 2", "Grade 3"], "features": ["Simple timetable", "Shorter periods", "More breaks", "Basic subjects"]}', NOW(), NOW()),
('Upper Primary Template', 'graphical', 'deployed', true, true, 'upper_primary', 'Comprehensive template for upper primary schools (Grades 4-8) with full subject range', 8, 40, 5, '08:00', '15:30', '[{"afterPeriod": 2, "duration": 15, "label": "Short Break"}, {"afterPeriod": 4, "duration": 30, "label": "Lunch Break"}]', '{"subjects": ["Mathematics", "English", "Kiswahili", "Science", "Social Studies", "CRE/IRE", "Agriculture", "Business Studies", "PE", "Art & Music"], "gradeLevels": ["Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8"], "features": ["Full subject range", "Standard periods", "Lunch break", "KCPE preparation"]}', NOW(), NOW()),
('Junior High Template', 'graphical', 'deployed', true, true, 'junior_high', 'Template for junior high schools (Forms 1-3) with specialized subjects and labs', 9, 40, 5, '08:00', '16:00', '[{"afterPeriod": 2, "duration": 15, "label": "Short Break"}, {"afterPeriod": 5, "duration": 40, "label": "Lunch Break"}]', '{"subjects": ["Mathematics", "English", "Kiswahili", "Physics", "Chemistry", "Biology", "History", "Geography", "CRE/IRE", "Business Studies", "Agriculture", "Computer Studies"], "gradeLevels": ["Form 1", "Form 2", "Form 3"], "features": ["Science labs", "Specialized subjects", "Longer school day", "KCSE preparation"]}', NOW(), NOW()),
('Senior High Template', 'graphical', 'deployed', true, true, 'senior_high', 'Advanced template for senior high schools (Forms 4-5) with exam focus and electives', 10, 40, 5, '08:00', '17:00', '[{"afterPeriod": 2, "duration": 15, "label": "Short Break"}, {"afterPeriod": 5, "duration": 40, "label": "Lunch Break"}, {"afterPeriod": 8, "duration": 15, "label": "Evening Break"}]', '{"subjects": ["Mathematics", "English", "Kiswahili", "Physics", "Chemistry", "Biology", "History", "Geography", "CRE/IRE", "Business Studies", "Agriculture", "Computer Studies", "Home Science"], "gradeLevels": ["Form 4", "Form 5"], "features": ["Elective subjects", "Extended hours", "Exam preparation", "Career guidance"]}', NOW(), NOW()),
('International School Template', 'graphical', 'deployed', true, true, 'international', 'International curriculum template (IGCSE/IB) with flexible scheduling and modern subjects', 8, 45, 5, '08:30', '16:30', '[{"afterPeriod": 2, "duration": 20, "label": "Morning Break"}, {"afterPeriod": 5, "duration": 60, "label": "Lunch Break"}]', '{"subjects": ["Mathematics", "English Language", "English Literature", "Physics", "Chemistry", "Biology", "History", "Geography", "Economics", "Business Studies", "Computer Science", "Art & Design", "Physical Education"], "gradeLevels": ["Year 7", "Year 8", "Year 9", "Year 10", "Year 11"], "features": ["International curriculum", "Longer periods", "Modern subjects", "Flexible scheduling"]}', NOW(), NOW()),
('College Template', 'graphical', 'deployed', true, true, 'college', 'Higher education template with flexible scheduling for colleges and universities', 6, 60, 5, '09:00', '17:00', '[{"afterPeriod": 2, "duration": 30, "label": "Coffee Break"}, {"afterPeriod": 4, "duration": 90, "label": "Lunch Break"}]', '{"subjects": ["Core Courses", "Electives", "Lab Sessions", "Seminars", "Study Periods", "Extra-Curricular"], "gradeLevels": ["Year 1", "Year 2", "Year 3", "Year 4"], "features": ["Flexible scheduling", "Longer periods", "Self-study time", "Professional focus"]}', NOW(), NOW()),
('Training Center Template', 'graphical', 'deployed', true, true, 'training', 'Vocational training template with practical sessions and workshop time', 8, 50, 5, '08:00', '17:00', '[{"afterPeriod": 2, "duration": 20, "label": "Break"}, {"afterPeriod": 5, "duration": 60, "label": "Lunch & Workshop"}]', '{"subjects": ["Technical Skills", "Practical Sessions", "Theory Classes", "Workshop Time", "Industry Projects", "Certification Prep"], "gradeLevels": ["Level 1", "Level 2", "Level 3"], "features": ["Hands-on training", "Workshop integration", "Industry focus", "Certification ready"]}', NOW(), NOW());

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

-- Get all templates for admin dashboard
SELECT * FROM admin_template_overview ORDER BY created_at DESC;

-- Get templates by school type
SELECT * FROM admin_template_overview WHERE school_type = 'primary' ORDER BY created_at DESC;

-- Get only deployed templates
SELECT * FROM admin_template_overview WHERE is_deployed = true ORDER BY created_at DESC;

-- Get only active templates
SELECT * FROM admin_template_overview WHERE is_active = true ORDER BY created_at DESC;
