-- ==========================================
-- 1. STREAMS OPTIMIZATIONS
-- ==========================================

-- Trigger to ensure Stream names are uppercase and trimmed
CREATE OR REPLACE FUNCTION public.clean_stream_data()
RETURNS TRIGGER AS $$
BEGIN
  new.stream_name := UPPER(TRIM(new.stream_name));
  new.name := new.grade_level || ' ' || new.stream_name; -- Force standard naming format "10 BLUE"
  RETURN new;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_stream_insert_update ON public.streams;
CREATE TRIGGER on_stream_insert_update
  BEFORE INSERT OR UPDATE ON public.streams
  FOR EACH ROW EXECUTE FUNCTION public.clean_stream_data();


-- ==========================================
-- 2. TEACHERS OPTIMIZATIONS
-- ==========================================

-- Trigger: When a Teacher is created in public.teachers, ensure they have a User Role
-- This handles cases where an Admin manually adds a teacher record
CREATE OR REPLACE FUNCTION public.ensure_teacher_role()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if a role exists for this user/school
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = new.user_id AND school_id = new.school_id
  ) THEN
    INSERT INTO public.user_roles (user_id, role, school_id)
    VALUES (new.user_id, 'teacher', new.school_id);
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_teacher_created ON public.teachers;
CREATE TRIGGER on_teacher_created
  AFTER INSERT ON public.teachers
  FOR EACH ROW EXECUTE FUNCTION public.ensure_teacher_role();


-- ==========================================
-- 3. TIMETABLE OPTIMIZATIONS
-- ==========================================

-- Prevent double-booking: Teacher cannot be in two places at the same time
CREATE OR REPLACE FUNCTION public.check_timetable_conflict()
RETURNS TRIGGER AS $$
BEGIN
  -- Check for Teacher Conflict
  IF EXISTS (
    SELECT 1 FROM public.timetable_entries
    WHERE teacher_id = new.teacher_id
      AND period_id = new.period_id
      AND day_of_week = new.day_of_week
      AND id != new.id -- Exclude self on update
  ) THEN
    RAISE EXCEPTION 'Teacher is already booked for this period and day.';
  END IF;

  -- Check for Room Conflict (if room is assigned)
  IF new.room_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.timetable_entries
    WHERE room_id = new.room_id
      AND period_id = new.period_id
      AND day_of_week = new.day_of_week
      AND id != new.id
  ) THEN
    RAISE EXCEPTION 'Room is already occupied for this period and day.';
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_timetable_entry_check ON public.timetable_entries;
CREATE TRIGGER on_timetable_entry_check
  BEFORE INSERT OR UPDATE ON public.timetable_entries
  FOR EACH ROW EXECUTE FUNCTION public.check_timetable_conflict();

-- ==========================================
-- 4. PERFORMANCE INDEXES
-- ==========================================

-- Streams lookup
CREATE INDEX IF NOT EXISTS idx_streams_school_grade ON public.streams(school_id, grade_level);

-- Timetable lookups (critical for speed)
CREATE INDEX IF NOT EXISTS idx_timetable_lookup ON public.timetable_entries(school_id, term_id, day_of_week); -- Assuming columns exist or add if missing
CREATE INDEX IF NOT EXISTS idx_timetable_teacher ON public.timetable_entries(teacher_id, day_of_week);

-- Teachers lookup
CREATE INDEX IF NOT EXISTS idx_teachers_school ON public.teachers(school_id);
