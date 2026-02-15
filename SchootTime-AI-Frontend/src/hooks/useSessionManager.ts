import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useSessionManager = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Handle auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          navigate('/auth');
        } else if (event === 'TOKEN_REFRESHED') {
          // Token was refreshed successfully
          console.log('Token refreshed successfully');
        } else if (event === 'SIGNED_IN') {
          // User just signed in
          console.log('User signed in');
        }
      }
    );

    // Handle JWT expiration errors
    const handleApiError = (error: Error) => {
      const errorMessage = error.message.toLowerCase();
      if (
        errorMessage.includes('jwt') ||
        errorMessage.includes('expired') ||
        errorMessage.includes('unauthorized') ||
        errorMessage.includes('401')
      ) {
        toast.error('Your session has expired. Please log in again.');
        supabase.auth.signOut();
        navigate('/auth');
      }
    };

    // Store the handler globally for use in API calls
    (window as any).__handleApiError = handleApiError;

    return () => {
      subscription?.unsubscribe();
    };
  }, [navigate]);

  const refreshSession = async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) throw error;
      return data.session;
    } catch (error) {
      console.error('Failed to refresh session:', error);
      toast.error('Session refresh failed. Please log in again.');
      await supabase.auth.signOut();
      navigate('/auth');
      return null;
    }
  };

  return { refreshSession };
};
