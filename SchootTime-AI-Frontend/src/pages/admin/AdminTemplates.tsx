import { useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Plus, Edit, Trash2, Eye, Rocket } from "lucide-react";
import { templatesApi } from "@/lib/api/templates";
import { toast } from "sonner";
import type { Template } from "@/lib/api/templates";
import { GraphicalTemplateEditor } from "@/components/admin/GraphicalTemplateEditor";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const AdminTemplates = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editorType, setEditorType] = useState<'form' | 'graphical'>('form');
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "deployed">("all");
  const [schoolTypeFilter, setSchoolTypeFilter] = useState<"all" | Template["school_type"]>("all");

  const fetchTemplates = async () => {
    try {
      const data = await templatesApi.getTemplates();
      console.debug('AdminTemplates fetchTemplates:', data);
      setTemplates(data);
    } catch (error) {
      console.error("Error fetching templates:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleEdit = (template: any) => {
    setEditingTemplate(template);
    setShowEditor(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      await templatesApi.deleteTemplate(deleteId);
      fetchTemplates();
      toast.success("Template deleted successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete template");
    } finally {
      setDeleteId(null);
    }
  };

  const handleSave = () => {
    setShowEditor(false);
    setEditingTemplate(null);
    fetchTemplates();
  };
  const handleToggleActive = async (template: Template) => {
    try {
      await templatesApi.updateTemplate(template.id, { is_active: !template.is_active });
      fetchTemplates();
    } catch (error: any) {
      toast.error(error.message || "Failed to update template status");
    }
  };

  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => {
      const matchesSearch =
        !search ||
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        (t.description || "").toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "all" ? true : t.status === statusFilter;

      const matchesSchoolType =
        schoolTypeFilter === "all" ? true : t.school_type === schoolTypeFilter;

      return matchesSearch && matchesStatus && matchesSchoolType;
    });
  }, [templates, search, statusFilter, schoolTypeFilter]);


  const handleCancel = () => {
    setShowEditor(false);
    setEditingTemplate(null);
  };

  const handleDeploy = async (templateId: string) => {
    try {
      await templatesApi.deployTemplate(templateId);
      fetchTemplates();
    } catch (error: any) {
      toast.error(error.message || "Failed to deploy template");
    }
  };

  if (showEditor) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-primary">
              {editingTemplate ? "Edit Template" : "Create New Template"}
            </h1>
          </div>

          <GraphicalTemplateEditor
            templateId={editingTemplate?.id}
            onSave={(template) => {
              fetchTemplates();
              setShowEditor(false);
              setEditingTemplate(null);
            }}
          />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary">
              Template Management
            </h1>
            <p className="text-muted-foreground">
              Create, filter and deploy timetable templates for your schools
            </p>
          </div>
          <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
            <input
              type="text"
              placeholder="Search templates..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:w-56"
            />
            <Button onClick={() => setShowEditor(true)} className="whitespace-nowrap">
              <Plus className="w-4 h-4 mr-2" />
              Create Template
            </Button>
          </div>
        </div>

        {/* Filters row */}
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex flex-wrap gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="rounded-md border px-2 py-1 text-xs md:text-sm bg-background"
            >
              <option value="all">All statuses</option>
              <option value="draft">Draft</option>
              <option value="deployed">Deployed</option>
            </select>
            <select
              value={schoolTypeFilter || "all"}
              onChange={(e) =>
                setSchoolTypeFilter(
                  e.target.value === "all"
                    ? "all"
                    : (e.target.value as Template["school_type"])
                )
              }
              className="rounded-md border px-2 py-1 text-xs md:text-sm bg-background"
            >
              <option value="all">All school types</option>
              <option value="lower_primary">Lower Primary</option>
              <option value="middle_primary">Middle Primary</option>
              <option value="junior_high">Junior High</option>
              <option value="senior_high">Senior High</option>
            </select>
          </div>
          <p className="text-xs text-muted-foreground">
            Showing {filteredTemplates.length} of {templates.length} templates
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <div className="h-48 bg-secondary" />
                <div className="p-6 space-y-4">
                  <div className="h-6 bg-secondary rounded w-3/4" />
                  <div className="h-4 bg-secondary rounded w-full" />
                </div>
              </Card>
            ))}
          </div>
        ) : filteredTemplates.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground mb-4">
              No templates created yet. Create your first template to get started!
            </p>
            <Button onClick={() => setShowEditor(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Template
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredTemplates.map((template) => (
              <Card
                key={template.id}
                className="overflow-hidden transition-transform duration-200 hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="relative">
                  {template.preview_image ? (
                    <img
                      src={template.preview_image}
                      alt={template.name}
                      className="w-full h-48 object-cover"
                    />
                  ) : (
                    <div className="w-full h-48 bg-secondary flex items-center justify-center">
                      <Eye className="w-12 h-12 text-muted-foreground" />
                    </div>
                  )}
                  <Badge
                    variant={template.is_active ? "default" : "secondary"}
                    className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm"
                  >
                    {template.status === "deployed"
                      ? "Deployed"
                      : template.is_active
                      ? "Active"
                      : "Inactive"}
                  </Badge>
                </div>
                
                <div className="p-6 space-y-4">
                  <div>
                    <h3 className="text-xl font-bold text-foreground mb-2">
                      {template.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {template.school_type === "lower_primary" && "Lower Primary (Grade 1-3)"}
                      {template.school_type === "middle_primary" && "Middle Primary (Grade 4-6)"}
                      {template.school_type === "junior_high" && "Junior High School (Grade 7-9)"}
                      {template.school_type === "senior_high" && "Senior High School (Grade 10-12)"}
                    </p>
                    {template.description && (
                      <p className="text-sm text-muted-foreground mt-2">
                        {template.description}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Periods:</span>
                      <span className="font-medium">{template.periods_per_day}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Duration:</span>
                      <span className="font-medium">{template.period_duration}min</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Usage:</span>
                      <span className="font-medium">
                        {template.usage_count ?? 0} schools
                      </span>
                    </div>
                  </div>

                  {/* Deploy & Active Status */}
                  <div className="flex items-center justify-between rounded-lg bg-accent/20 p-3">
                    <div className="flex items-center gap-2">
                      <Rocket className="w-4 h-4" />
                      <Label>
                        {template.status === 'deployed' ? "Deployed to Schools" : "Private Template"}
                      </Label>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleDeploy(template.id)}
                      disabled={template.status === 'deployed'}
                    >
                      {template.status === 'deployed' ? "Deployed" : "Deploy"}
                    </Button>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Visible to schools
                    </span>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={!!template.is_active}
                        onCheckedChange={() => handleToggleActive(template)}
                      />
                      <span className="text-xs">
                        {template.is_active ? "Active" : "Hidden"}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleEdit(template)}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeleteId(template.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this template? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default AdminTemplates;
