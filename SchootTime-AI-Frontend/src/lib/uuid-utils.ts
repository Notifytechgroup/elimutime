/**
 * Utility functions to prevent UUID validation errors
 */

/**
 * Sanitize UUID input - converts empty strings to null
 */
export const sanitizeUUID = (value: string | undefined | null): string | null => {
  if (!value || value.trim() === '') {
    return null;
  }
  return value;
};

/**
 * Validate if string is a valid UUID format
 */
export const isValidUUID = (value: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
};

/**
 * Sanitize an object of potential UUID fields
 */
export const sanitizeUUIDs = (
  obj: Record<string, any>,
  uuidFields: string[] = ['school_id', 'user_id']
): Record<string, any> => {
  const sanitized = { ...obj };
  
  uuidFields.forEach(field => {
    if (field in sanitized) {
      sanitized[field] = sanitizeUUID(sanitized[field]);
    }
  });
  
  return sanitized;
};

/**
 * Validate object before sending to Supabase
 */
export const validateUUIDFields = (
  obj: Record<string, any>,
  uuidFields: string[] = ['school_id', 'user_id']
): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  uuidFields.forEach(field => {
    const value = obj[field];
    if (value && value.trim && value.trim() !== '' && !isValidUUID(value)) {
      errors.push(`Invalid UUID format for field: ${field}`);
    }
  });
  
  return {
    valid: errors.length === 0,
    errors,
  };
};
