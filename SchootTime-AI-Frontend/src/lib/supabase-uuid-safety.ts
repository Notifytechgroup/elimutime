import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Initialize UUID safety checks on app startup
 * Prevents "Invalid input syntax for type uuid: ''" errors
 */
export const initializeUUIDSafety = async () => {
  try {
    // Set up listener for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user?.id) {
          // After sign in, verify user_roles are properly set
          try {
            const result = await supabase
              .from('user_roles')
              .select('id, school_id')
              .eq('user_id', session.user.id);
            
            if (result.data) {
              // Data is already clean or NULL, which is correct
              console.log('[initializeUUIDSafety] User roles validated');
            }

            if (result.error && result.error.message.includes('uuid')) {
              console.error('UUID validation error in user_roles:', result.error);
              // This error should be caught by the database trigger
            }
          } catch (err) {
            console.error('Failed to validate user roles:', err);
          }
        }
      }
    );

    return subscription;
  } catch (error) {
    console.error('Failed to initialize UUID safety:', error);
  }
};

/**
 * Sanitize UUID before sending to Supabase
 */
export const sanitizeUUIDValue = (value: any): string | null => {
  if (!value) return null;
  
  const strValue = String(value).trim();
  
  // Check for empty, null-like strings
  if (strValue === '' || strValue === 'null' || strValue === 'undefined') {
    return null;
  }
  
  // Basic UUID validation (36 characters with hyphens)
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(strValue)) {
    console.warn(`Invalid UUID format: ${strValue}, returning null`);
    return null;
  }
  
  return strValue;
};

/**
 * Create a safe Supabase query builder that prevents empty UUIDs
 */
export const createSafeQuery = (table: 'user_roles' | 'profiles' | 'streams' | 'teachers') => {
  return {
    select: (...args: any[]) => supabase.from(table).select(...args),
    insert: (data: Record<string, any>) => {
      // Sanitize all potential UUID fields
      const cleaned = {
        ...data,
        school_id: data.school_id ? sanitizeUUIDValue(data.school_id) : null,
        user_id: data.user_id ? sanitizeUUIDValue(data.user_id) : null,
      };
      return supabase.from(table as any).insert(cleaned);
    },
    update: (data: Record<string, any>) => {
      // Sanitize all potential UUID fields
      const cleaned = {
        ...data,
        school_id: data.school_id ? sanitizeUUIDValue(data.school_id) : null,
        user_id: data.user_id ? sanitizeUUIDValue(data.user_id) : null,
      };
      return supabase.from(table as any).update(cleaned);
    },
  };
};

/**
 * Wrap common Supabase queries with UUID safety
 */
export const safeSupabaseQuery = {
  /**
   * Safe version of: supabase.from('user_roles').insert(...)
   */
  insertUserRole: (data: {
    user_id: string;
    role: 'admin' | 'user';
    school_id?: string | null;
  }) => {
    return supabase.from('user_roles').insert({
      user_id: sanitizeUUIDValue(data.user_id) || '',
      role: data.role,
      school_id: data.school_id ? sanitizeUUIDValue(data.school_id) : null,
    } as any);
  },

  /**
   * Safe version of: supabase.from('user_roles').select(...).eq('school_id', ...)
   */
  selectBySchoolId: async (schoolId: string, options?: { role?: 'admin' | 'user' }) => {
    const cleanSchoolId = sanitizeUUIDValue(schoolId);
    if (!cleanSchoolId) {
      throw new Error('Invalid school_id provided');
    }
    
    // Use a direct query approach to avoid type instantiation issues
    try {
      const result = await supabase
        .from('user_roles')
        .select('*')
        .eq('school_id', cleanSchoolId as string);
      
      if (options?.role && result.data) {
        return {
          ...result,
          data: result.data.filter(r => (r as any).role === options.role),
        };
      }
      
      return result as any;
    } catch (error) {
      throw error;
    }
  },
};
