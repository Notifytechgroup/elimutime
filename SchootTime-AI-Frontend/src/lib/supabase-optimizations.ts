import { supabase } from '@/integrations/supabase/client';
import { sanitizeUUIDValue } from './supabase-uuid-safety';
import { toast } from 'sonner';

/**
 * Batch insert with automatic chunking for large datasets
 * Prevents timeouts and performance issues
 */
export const batchInsert = async (
  table: string,
  data: Record<string, any>[],
  chunkSize: number = 100
) => {
  if (data.length === 0) {
    return { data: [], errors: [] };
  }

  const results: Record<string, any>[] = [];
  const errors: any[] = [];

  console.log(`[batchInsert] Starting ${table} with ${data.length} items in chunks of ${chunkSize}`);

  // Split into chunks
  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.slice(i, i + chunkSize);
    const chunkNum = Math.floor(i / chunkSize) + 1;
    
    console.log(`[batchInsert] Processing chunk ${chunkNum}/${Math.ceil(data.length / chunkSize)}: ${chunk.length} items`);
    
    // Sanitize UUID fields in each chunk
    const cleanedChunk = chunk.map(item => {
      const cleaned = { ...item };
      
      // Only sanitize if the field exists and is a string
      if (cleaned.school_id && typeof cleaned.school_id === 'string') {
        cleaned.school_id = sanitizeUUIDValue(cleaned.school_id);
      }
      if (cleaned.user_id && typeof cleaned.user_id === 'string') {
        cleaned.user_id = sanitizeUUIDValue(cleaned.user_id);
      }
      if (cleaned.stream_id && typeof cleaned.stream_id === 'string') {
        cleaned.stream_id = sanitizeUUIDValue(cleaned.stream_id);
      }
      
      return cleaned;
    });

    try {
      console.log(`[batchInsert] Inserting chunk ${chunkNum}...`, cleanedChunk[0]);
      
      const { data: insertedData, error } = await supabase
        .from(table as any)
        .insert(cleanedChunk as any);

      if (error) {
        console.error(`[batchInsert] Error in chunk ${chunkNum}:`, error);
        errors.push({ chunk: chunkNum, error: error.message });
        toast.error(`Chunk ${chunkNum} failed: ${error.message}`);
      } else {
        const itemCount = insertedData ? (Array.isArray(insertedData) ? (insertedData as any[]).length : 1) : 0;
        console.log(`[batchInsert] Chunk ${chunkNum} success: ${itemCount} items`);
        if (insertedData) {
          results.push(...(Array.isArray(insertedData) ? insertedData : [insertedData]));
        }
      }
    } catch (err: any) {
      console.error(`[batchInsert] Exception in chunk ${chunkNum}:`, err);
      errors.push({ chunk: chunkNum, error: err?.message || String(err) });
      toast.error(`Chunk ${chunkNum} exception: ${err?.message}`);
    }

    // Add small delay between chunks to avoid rate limiting
    if (i + chunkSize < data.length) {
      console.log(`[batchInsert] Waiting 100ms before next chunk...`);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  console.log(`[batchInsert] Complete. Inserted: ${results.length}, Errors: ${errors.length}`);
  return { data: results, errors };
};

/**
 * Optimized query builder with caching
 */
export const createOptimizedQuery = (table: string) => {
  const queryCache = new Map<string, any>();

  return {
    /**
     * Select with automatic caching
     */
    selectWithCache: async (
      columns: string,
      filters?: Record<string, any>,
      cacheKey?: string
    ) => {
      const key = cacheKey || `${table}:${columns}:${JSON.stringify(filters)}`;
      
      if (queryCache.has(key)) {
        return queryCache.get(key);
      }

      let query: any = supabase.from(table as any).select(columns);

      if (filters) {
        Object.entries(filters).forEach(([field, value]) => {
          if (value !== null && value !== undefined) {
            // Sanitize UUID values
            const cleanValue = value && typeof value === 'string' && value.includes?.('-') 
              ? sanitizeUUIDValue(value) 
              : value;
            query = query.eq(field, cleanValue);
          }
        });
      }

      const result = await query;
      queryCache.set(key, result);
      return result;
    },

    /**
     * Clear specific cache or all cache
     */
    clearCache: (key?: string) => {
      if (key) {
        queryCache.delete(key);
      } else {
        queryCache.clear();
      }
    },
  };
};

/**
 * Optimized stream creation with batch inserts
 */
export const optimizedCreateStreams = async (
  schoolId: string,
  grades: number[],
  streamNames: string[]
) => {
  console.log("[optimizedCreateStreams] Starting with schoolId:", schoolId);
  
  try {
    if (!schoolId || schoolId.trim() === "") {
      throw new Error("School ID is empty or invalid");
    }

    const streamsToCreate = [];
    for (const grade of grades) {
      for (const streamName of streamNames) {
        streamsToCreate.push({
          school_id: schoolId,
          grade_level: grade,
          name: streamName,
        });
      }
    }

    console.log("[optimizedCreateStreams] Total items to create:", streamsToCreate.length);

    // Try batch insert first
    try {
      const result = await batchInsert('streams', streamsToCreate, 50);
      return result;
    } catch (batchError) {
      console.warn("[optimizedCreateStreams] Batch insert failed, trying direct insert:", batchError);
      
      // Fallback: try direct insert
      const { data, error } = await supabase
        .from('streams')
        .insert(streamsToCreate);

      if (error) {
        throw error;
      }

      return { data: data || [], errors: [] };
    }
  } catch (error) {
    console.error("[optimizedCreateStreams] Fatal error:", error);
    throw error;
  }
};

/**
 * Optimized teacher creation with relationship linking
 */
export const optimizedCreateTeacher = async (
  schoolId: string,
  teacherData: {
    name: string;
    email: string;
    max_lessons_per_week: number;
  },
  subjects?: string[],
  classResponsibility?: string,
  assignedClasses?: string[]
) => {
  try {
    // Step 1: Insert teacher
    const { data: teacher, error: teacherError } = await supabase
      .from('teachers')
      .insert({
        school_id: schoolId,
        ...teacherData,
      })
      .select()
      .single();

    if (teacherError) throw teacherError;

    // Step 2: Handle subjects in parallel where possible
    if (subjects && subjects.length > 0) {
      // Get all existing subjects first
      const { data: existingSubjects } = await supabase
        .from('subjects')
        .select('id, name')
        .eq('school_id', schoolId)
        .in('name', subjects);

      const existingSubjectMap = new Map(
        existingSubjects?.map(s => [s.name, s.id]) || []
      );

      const subjectsToCreate = subjects
        .filter(name => !existingSubjectMap.has(name))
        .map(name => ({ school_id: schoolId, name }));

      // Create new subjects if needed
      if (subjectsToCreate.length > 0) {
        const { data: newSubjects } = await supabase
          .from('subjects')
          .insert(subjectsToCreate)
          .select();

        newSubjects?.forEach(s => existingSubjectMap.set(s.name, s.id));
      }

      // Link all subjects at once
      const teacherSubjectsToLink = subjects
        .map(name => ({
          teacher_id: teacher.id,
          subject_id: existingSubjectMap.get(name),
        }))
        .filter(ts => ts.subject_id);

      if (teacherSubjectsToLink.length > 0) {
        const { error: linkError } = await supabase
          .from('teacher_subjects')
          .insert(teacherSubjectsToLink);

        if (linkError) throw linkError;
      }
    }

    // Step 3: Link class responsibility
    if (classResponsibility) {
      const { error: responsibilityError } = await supabase
        .from('teacher_responsibilities')
        .insert({
          teacher_id: teacher.id,
          stream_id: classResponsibility,
        });

      if (responsibilityError) throw responsibilityError;
    }

    // Step 4: Link assigned classes in batch
    if (assignedClasses && assignedClasses.length > 0) {
      const { error: assignError } = await supabase
        .from('teacher_assigned_classes')
        .insert(
          assignedClasses.map(streamId => ({
            teacher_id: teacher.id,
            stream_id: streamId,
          }))
        );

      if (assignError) throw assignError;
    }

    return { success: true, teacher };
  } catch (error) {
    throw error;
  }
};

/**
 * Parallel fetch for multiple related tables
 */
export const optimizedParallelFetch = async (
  schoolId: string,
  resources: ('subjects' | 'streams' | 'teachers')[]
) => {
  const output: Record<string, any> = {};
  
  try {
    // Fetch subjects if requested
    if (resources.includes('subjects')) {
      const { data } = await supabase
        .from('subjects')
        .select('*')
        .eq('school_id', schoolId);
      output.subjects = data || [];
    }

    // Fetch streams if requested
    if (resources.includes('streams')) {
      const { data } = await supabase
        .from('streams')
        .select('*')
        .eq('school_id', schoolId)
        .order('grade_level', { ascending: true })
        .order('name', { ascending: true });
      output.streams = data || [];
    }

    // Fetch teachers if requested
    if (resources.includes('teachers')) {
      const { data } = await supabase
        .from('teachers')
        .select(
          `
          id, name, email, max_lessons_per_week,
          teacher_subjects(subject_id, subjects(name)),
          teacher_responsibilities(stream_id, streams(grade_level, name)),
          teacher_assigned_classes(stream_id, streams(id, grade_level, name))
          `
        )
        .eq('school_id', schoolId);
      output.teachers = data || [];
    }

    return output;
  } catch (error) {
    console.error('[optimizedParallelFetch] Error:', error);
    throw error;
  }
};
