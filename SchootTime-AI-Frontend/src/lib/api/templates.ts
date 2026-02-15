import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Template {
  id: string;
  name: string;
  content: any;
  type: 'graphical' | 'form';
  status: 'draft' | 'deployed';
  created_at: string;
  updated_at: string;
  created_by: string;
  // convenience fields
  preview_image?: string | null;
  periods_per_day?: number | null;
  period_duration?: number | null;
  days_per_week?: number | null;
  is_deployed?: boolean | null;
  is_active?: boolean | null;
  description?: string | null;
  school_type?: string | null;
}

export interface UploadedImage {
  id: string;
  file_url: string;
  file_name: string;
  uploaded_by: string;
  created_at: string;
  template_id?: string;
}

export const templatesApi = {
  // Create a new template
  async createTemplate(templateData: Omit<Template, 'id' | 'created_at' | 'updated_at' | 'created_by'>) {
    try {
      const { data, error } = await supabase
        .from('templates')
        .insert([templateData])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error: any) {
      toast.error(`Failed to create template: ${error.message}`);
      throw error;
    }
  },

  // Update an existing template
  async updateTemplate(id: string, templateData: Partial<Template>) {
    try {
      const { data, error } = await supabase
        .from('templates')
        .update(templateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error: any) {
      toast.error(`Failed to update template: ${error.message}`);
      throw error;
    }
  },

  // Deploy a template
  async deployTemplate(templateId: string) {
    try {
      // Get current user to attribute the deployment
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();

      if (userErr) throw userErr;

      // First, update template status and convenience flag
      const { error: templateError } = await supabase
        .from('templates')
        .update({ status: 'deployed', is_deployed: true })
        .eq('id', templateId);

      if (templateError) throw templateError;

      // Then create deployment record with deployed_by
      const { error: deployError } = await supabase
        .from('deployed_templates')
        .insert([{ template_id: templateId, deployed_by: user?.id }]);

      if (deployError) throw deployError;

      toast.success('Template deployed successfully');
    } catch (error: any) {
      toast.error(`Failed to deploy template: ${error.message}`);
      throw error;
    }
  },

  // Upload an image for a template
  async uploadImage(file: File, templateId?: string, uploadSession?: string) {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `template-images/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('templates')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('templates')
        .getPublicUrl(filePath);

      // Get current user for uploaded_by
      const { data: { user }, error: userErr } = await supabase.auth.getUser();
      if (userErr || !user) throw userErr || new Error('User not authenticated');

      // Create database record
      const insertPayload: any = {
        file_url: publicUrl,
        file_name: fileName,
        template_id: templateId ?? null,
        uploaded_by: user.id,
      };
      if (uploadSession) insertPayload.upload_session = uploadSession;

      const { data, error: dbError } = await supabase
        .from('uploaded_images')
        .insert([insertPayload])
        .select()
        .single();

      if (dbError) throw dbError;

      // If a templateId was provided, also set this image as the template preview
      if (templateId) {
        const { error: updateErr } = await supabase
          .from('templates')
          .update({ preview_image: publicUrl })
          .eq('id', templateId);

        if (updateErr) {
          // Don't fail the whole upload for preview update, but log
          console.warn('Failed to update template preview:', updateErr.message);
        }
      }

      return data;
    } catch (error: any) {
      toast.error(`Failed to upload image: ${error.message}`);
      throw error;
    }
  },

  // Associate pending uploads belonging to an upload session to a template
  async associateUploads(uploadSession: string, templateId: string) {
    try {
      const { error } = await supabase
        .from('uploaded_images')
        .update({ template_id: templateId, upload_session: null })
        .eq('upload_session', uploadSession);

      if (error) throw error;
      return true;
    } catch (error: any) {
      toast.error(`Failed to associate uploads: ${error.message}`);
      throw error;
    }
  },

  // Delete a template and its related resources (images, deployments)
  async deleteTemplate(templateId: string) {
    try {
      // fetch images for template
      const { data: images, error: imgErr } = await supabase
        .from('uploaded_images')
        .select('*')
        .eq('template_id', templateId);

      if (imgErr) throw imgErr;

      // remove files from storage
      if (images && images.length > 0) {
        const fileNames = images.map((i: any) => `template-images/${i.file_name}`);
        const { error: remErr } = await supabase.storage
          .from('templates')
          .remove(fileNames);
        if (remErr) console.warn('Failed to remove some files from storage:', remErr.message);
      }

      // delete uploaded_images records
      const { error: delImgsErr } = await supabase
        .from('uploaded_images')
        .delete()
        .eq('template_id', templateId);
      if (delImgsErr) throw delImgsErr;

      // delete deployed_templates records
      const { error: delDeployErr } = await supabase
        .from('deployed_templates')
        .delete()
        .eq('template_id', templateId);
      if (delDeployErr) throw delDeployErr;

      // finally delete template
      const { error: delTemplateErr } = await supabase
        .from('templates')
        .delete()
        .eq('id', templateId);
      if (delTemplateErr) throw delTemplateErr;

      toast.success('Template deleted');
      return true;
    } catch (error: any) {
      toast.error(`Failed to delete template: ${error.message}`);
      throw error;
    }
  },

  // Get images for a template
  async getTemplateImages(templateId: string) {
    try {
      const { data, error } = await supabase
        .from('uploaded_images')
        .select('*')
        .eq('template_id', templateId);

      if (error) throw error;
      return data;
    } catch (error: any) {
      toast.error(`Failed to fetch template images: ${error.message}`);
      throw error;
    }
  },

  // Delete an uploaded image
  async deleteImage(imageId: string) {
    try {
      const { data: image, error: fetchError } = await supabase
        .from('uploaded_images')
        .select('file_name')
        .eq('id', imageId)
        .single();

      if (fetchError) throw fetchError;

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('templates')
        .remove([`template-images/${image.file_name}`]);

      if (storageError) throw storageError;

      // Delete database record
      const { error: dbError } = await supabase
        .from('uploaded_images')
        .delete()
        .eq('id', imageId);

      if (dbError) throw dbError;

      // If this image was set as a template preview, clear it
      try {
        const { data: maybeTemplate } = await supabase
          .from('templates')
          .select('id, preview_image')
          .eq('preview_image', image.file_url)
          .single();

        if (maybeTemplate?.id) {
          await supabase
            .from('templates')
            .update({ preview_image: null })
            .eq('id', maybeTemplate.id);
        }
      } catch (e) {
        // non-fatal
      }

      toast.success('Image deleted successfully');
    } catch (error: any) {
      toast.error(`Failed to delete image: ${error.message}`);
      throw error;
    }
  },

  // Get all templates (with optional filters)
  async getTemplates(filters?: { status?: 'draft' | 'deployed', type?: 'graphical' | 'form' }) {
    try {
      // Check if Supabase is properly configured
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
        console.warn('Supabase not configured, returning empty templates array');
        return [];
      }

      let query = supabase.from('templates').select('*');

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.type) {
        query = query.eq('type', filters.type);
      }

      const { data, error } = await query;

      // debug log to help diagnose empty results / RLS issues
      console.debug('[templatesApi] getTemplates result:', { data, error, filters });

      if (error) {
        // Don't show toast for missing configuration
        if (error.message.includes('Invalid API key') || error.message.includes('JWT')) {
          console.warn('Supabase authentication error:', error.message);
          return [];
        }
        throw error;
      }
      return data || [];
    } catch (error: any) {
      // Only show toast for real errors
      if (error.message && !error.message.includes('placeholder') && !error.message.includes('Invalid API')) {
        toast.error(`Failed to fetch templates: ${error.message}`);
      }
      console.error('Error fetching templates:', error);
      return [];
    }
  },

  // Get a single template by id
  async getTemplate(id: string) {
    try {
      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error: any) {
      toast.error(`Failed to fetch template: ${error.message}`);
      throw error;
    }
  },

  // Get deployed templates available to users
  async getDeployedTemplates() {
    try {
      // Check if Supabase is properly configured
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
        console.warn('Supabase not configured, returning empty templates array');
        return [];
      }

      // Return templates that are marked deployed (status) or have the convenience flag
      const { data, error } = await supabase
        .from('templates')
        .select(`*, deployed_templates(*)`)
        .or('status.eq.deployed,is_deployed.eq.true')
        .eq('is_active', true);

      if (error) {
        // Don't show toast for missing configuration - just log and return empty
        if (error.message.includes('Invalid API key') || error.message.includes('JWT')) {
          console.warn('Supabase authentication error:', error.message);
          return [];
        }
        throw error;
      }
      return data || [];
    } catch (error: any) {
      // Only show toast for real errors, not configuration issues
      if (error.message && !error.message.includes('placeholder') && !error.message.includes('Invalid API')) {
        toast.error(`Failed to fetch deployed templates: ${error.message}`);
      }
      console.error('Error fetching deployed templates:', error);
      return [];
    }
  }
};