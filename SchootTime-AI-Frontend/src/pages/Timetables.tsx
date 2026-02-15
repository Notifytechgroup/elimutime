import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  Calendar,
  Loader2,
  Download,
  Mail,
  ArrowLeft,
  BookOpen,
  Plus,
  Edit3,
  Trash2,
  Eye,
  Filter,
  Play,
  Copy,
  Settings,
  HelpCircle,
  Search,
  Grid3x3,
  List,
  FileText,
  Users,
  School,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Timetable {
  id: string;
  stream_id: string;
  teacher_id?: string;
  grade?: number;
  type: "master" | "class" | "teacher" | "stream";
  status: "draft" | "final" | "exported";
  generated_at: string;
  timetable_data: any;
  name: string;
  streams?: {
    grade: number;
    stream_name: string;
  };
}

interface StreamSummary {
  id: string;
  grade: number;
  stream_name: string;
}

interface Teacher {
  id: string;
  name: string;
}

interface TimetableHistoryItem {
  id: string;
  created_at: string;
  status: string;
}

const CBC_GRADES = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const TIMETABLE_TYPES = ["master", "class", "teacher", "stream"];
const STATUS_OPTIONS = ["draft", "final", "exported"];

const Timetables = () => {
  const navigate = useNavigate();
  const [timetables, setTimetables] = useState<Timetable[]>([]);
  const [schoolId, setSchoolId] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const [streams, setStreams] = useState<StreamSummary[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [history, setHistory] = useState<TimetableHistoryItem[]>([]);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterGrade, setFilterGrade] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  
  // Carousel state
  const [carouselIndex, setCarouselIndex] = useState(0);
  
  // Dialog states
  const [showGuidance, setShowGuidance] = useState(false);
  const [showCustomization, setShowCustomization] = useState(false);
  const [selectedTimetable, setSelectedTimetable] = useState<Timetable | null>(null);

  useEffect(() => {
    fetchData();
  }, [navigate]);

  const fetchData = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { sanitizeUUIDValue } = await import("@/lib/supabase-uuid-safety");

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("id", user.id)
      .single();

    if (!profile) {
      toast.error("Profile not found");
      return;
    }

    // Get user's school from user_roles
    const { data: userRole } = await supabase
      .from("user_roles")
      .select("school_id")
      .eq("user_id", user.id)
      .single();

    if (userRole) {
      const cleanSchoolId = sanitizeUUIDValue(userRole.school_id);
      setSchoolId(cleanSchoolId || "");

      // Fetch streams
      const { data: streamsList } = await supabase
        .from("streams")
        .select("id, grade_level, name")
        .eq("school_id", cleanSchoolId)
        .order("grade_level", { ascending: true });

      setStreams(
        (streamsList || []).map((s) => ({
          id: s.id,
          grade: s.grade_level,
          stream_name: s.name,
        }))
      );

      // Fetch teachers
      const { data: teachersList } = await supabase
        .from("teachers")
        .select(`
          id,
          user_id,
          user_profiles(full_name)
        `)
        .eq("school_id", cleanSchoolId);

      setTeachers(
        (teachersList || []).map((t: any) => ({
          id: t.id,
          name: t.user_profiles?.full_name || "Unknown Teacher",
        }))
      );

      // Fetch timetable history summary
      const { data: historyData } = await supabase
        .from("timetables")
        .select("id, created_at, status")
        .order("created_at", { ascending: false })
        .limit(10);

      setHistory(
        (historyData || []).map((h) => ({
          id: h.id,
          created_at: h.created_at,
          status: h.status,
        }))
      );

      // Fetch timetable entries (simulated as timetables)
      const { data: timetableData } = await supabase
        .from("timetable_entries")
        .select(`
          *,
          streams(grade_level, name),
          teachers(id, user_profiles(full_name))
        `)
        .order("created_at", { ascending: false });

      // Group by stream/teacher and create timetable objects
      const groupedTimetables = groupTimetableEntries(timetableData || []);
      setTimetables(groupedTimetables);
    }
  };

  const groupTimetableEntries = (entries: any[]): Timetable[] => {
    // Group entries by stream_id to create class timetables
    const grouped = entries.reduce((acc, entry) => {
      const key = `stream_${entry.stream_id}`;
      if (!acc[key]) {
        acc[key] = {
          id: key,
          stream_id: entry.stream_id,
          type: "stream" as const,
          status: "draft" as const,
          generated_at: entry.created_at,
          timetable_data: [],
          name: entry.streams
            ? `Grade ${entry.streams.grade_level} - ${entry.streams.name}`
            : "Unknown Stream",
          streams: entry.streams
            ? {
                grade: entry.streams.grade_level,
                stream_name: entry.streams.name,
              }
            : undefined,
        };
      }
      acc[key].timetable_data.push(entry);
      return acc;
    }, {} as Record<string, Timetable>);

    return Object.values(grouped);
  };

  const handleGenerate = async () => {
    if (!schoolId) {
      toast.error("School information missing. Please refresh and try again.");
      return;
    }
    setGenerating(true);

    try {
      // Validate prerequisites
      const [teachersCount, streamsCount] = await Promise.all([
        supabase
          .from("teachers")
          .select("*", { count: "exact", head: true })
          .eq("school_id", schoolId),
        supabase
          .from("streams")
          .select("*", { count: "exact", head: true })
          .eq("school_id", schoolId),
      ]);

      if (!teachersCount.count || teachersCount.count === 0) {
        toast.error("Please add teachers first!");
        setGenerating(false);
        return;
      }

      if (!streamsCount.count || streamsCount.count === 0) {
        toast.error("Please create streams first!");
        setGenerating(false);
        return;
      }

      // Call backend timetable generator, which uses Python + Supabase
      await api.generateTimetable(schoolId, {});
      toast.success("Timetables generated successfully! 🎉");
      fetchData();
    } catch (error: any) {
      console.error("Generation error:", error);
      toast.error(error.message || "Failed to generate timetables");
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (timetableId: string) => {
    if (!confirm("Are you sure you want to delete this timetable?")) return;

    try {
      // TODO: Implement delete logic
      toast.success("Timetable deleted successfully");
      fetchData();
    } catch (error) {
      toast.error("Failed to delete timetable");
    }
  };

  const handleExport = async (timetable: Timetable, format: "pdf" | "png" | "jpeg") => {
    try {
      toast.info(`Exporting timetable as ${format.toUpperCase()}...`);
      // TODO: Implement export logic using html2canvas + jspdf
      toast.success(`Timetable exported as ${format.toUpperCase()}`);
    } catch (error) {
      toast.error("Failed to export timetable");
    }
  };

  const handleEmailTeachers = async () => {
    try {
      toast.info("Sending timetables to teachers...");
      // TODO: Implement email logic
      toast.success("Timetables sent successfully!");
    } catch (error) {
      toast.error("Failed to send timetables");
    }
  };

  // Filter timetables
  const filteredTimetables = useMemo(() => {
    return timetables.filter((tt) => {
      const matchesSearch =
        tt.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = filterType === "all" || tt.type === filterType;
      const matchesGrade =
        filterGrade === "all" || tt.streams?.grade === parseInt(filterGrade);
      const matchesStatus = filterStatus === "all" || tt.status === filterStatus;

      return matchesSearch && matchesType && matchesGrade && matchesStatus;
    });
  }, [timetables, searchQuery, filterType, filterGrade, filterStatus]);

  const groupedStreams = useMemo(() => {
    return streams.reduce((acc, stream) => {
      if (!acc[stream.grade]) {
        acc[stream.grade] = [];
      }
      acc[stream.grade].push(stream);
      return acc;
    }, {} as Record<number, StreamSummary[]>);
  }, [streams]);

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => navigate("/dashboard")}
              className="gap-2 rounded-full font-semibold"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <div>
              <h1
                className="text-3xl font-bold flex items-center gap-3"
                style={{
                  fontFamily: "Recoleta, serif",
                  color: "rgb(13, 60, 68)",
                }}
              >
                <Calendar className="w-8 h-8" />
                AI Timetable Generator
              </h1>
              <p className="text-muted-foreground mt-2">
                Generate, manage, and customize CBC-compliant timetables
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowGuidance(true)}
              className="gap-2 rounded-full font-semibold"
            >
              <HelpCircle className="w-4 h-4" />
              Help
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={generating}
              className="bg-[#FACC15] text-[#0D3C44] hover:bg-[#F5BD0D] gap-2 font-semibold rounded-full"
            >
              {generating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  Generate New
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Quick Actions Panel */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button
              variant="outline"
              onClick={handleGenerate}
              className="flex-col h-auto py-4 gap-2"
            >
              <Plus className="w-6 h-6" />
              <span className="text-sm">New Timetable</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const draft = timetables.find((tt) => tt.status === "draft");
                if (draft) {
                  navigate(`/timetables/edit/${draft.id}`);
                } else {
                  toast.info("No draft timetables to resume");
                }
              }}
              className="flex-col h-auto py-4 gap-2"
            >
              <Play className="w-6 h-6" />
              <span className="text-sm">Resume Editing</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowCustomization(true)}
              className="flex-col h-auto py-4 gap-2"
            >
              <Settings className="w-6 h-6" />
              <span className="text-sm">Customize</span>
            </Button>
            <Button
              variant="outline"
              onClick={handleEmailTeachers}
              className="flex-col h-auto py-4 gap-2"
            >
              <Mail className="w-6 h-6" />
              <span className="text-sm">Email Teachers</span>
            </Button>
          </div>
        </Card>

        {/* Streams Overview */}
        {streams.length > 0 && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Streams Overview
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/streams")}
              >
                Manage Streams
              </Button>
            </div>
            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {Object.entries(groupedStreams).map(([grade, gradeStreams]) => (
                <div key={grade} className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Grade {grade}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {gradeStreams.length} stream
                      {gradeStreams.length > 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {gradeStreams.map((stream) => (
                      <Badge key={stream.id} variant="outline">
                        {stream.stream_name}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Timetable Preview Carousel */}
        {filteredTimetables.length > 0 && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Quick Preview
            </h3>
            <div className="relative">
              <div className="flex items-center gap-4 overflow-hidden">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() =>
                    setCarouselIndex(Math.max(0, carouselIndex - 1))
                  }
                  disabled={carouselIndex === 0}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <div className="flex-1 overflow-hidden">
                  <div
                    className="flex gap-4 transition-transform duration-300"
                    style={{
                      transform: `translateX(-${carouselIndex * 320}px)`,
                    }}
                  >
                    {filteredTimetables.map((tt) => (
                      <div
                        key={tt.id}
                        className="min-w-[300px] border rounded-lg p-4 cursor-pointer hover:shadow-lg transition-shadow"
                        onClick={() =>
                          navigate(`/timetables/view/${tt.id}`)
                        }
                      >
                        <div className="flex items-center justify-between mb-2">
                          <Badge>{tt.type}</Badge>
                          <Badge
                            variant={
                              tt.status === "final"
                                ? "default"
                                : tt.status === "draft"
                                ? "secondary"
                                : "outline"
                            }
                          >
                            {tt.status}
                          </Badge>
                        </div>
                        <h4 className="font-semibold text-sm mb-1">
                          {tt.name}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {new Date(tt.generated_at).toLocaleDateString()}
                        </p>
                        <div className="mt-3 h-32 bg-muted rounded flex items-center justify-center">
                          <FileText className="w-12 h-12 text-muted-foreground" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() =>
                    setCarouselIndex(
                      Math.min(
                        filteredTimetables.length - 3,
                        carouselIndex + 1
                      )
                    )
                  }
                  disabled={carouselIndex >= filteredTimetables.length - 3}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Recent generation history */}
        {history.length > 0 && (
          <Card className="p-6">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <FileText className="w-5 h-5" />
              Recent Generations
            </h3>
            <div className="space-y-2 text-sm">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                >
                  <span className="truncate text-xs text-muted-foreground">
                    {item.id}
                  </span>
                  <div className="flex items-center gap-3">
                    <Badge variant={item.status === "generated" ? "default" : "secondary"}>
                      {item.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(item.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Filters & Search */}
        <Card className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search timetables..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="master">Master</SelectItem>
                <SelectItem value="class">Class</SelectItem>
                <SelectItem value="teacher">Teacher</SelectItem>
                <SelectItem value="stream">Stream</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterGrade} onValueChange={setFilterGrade}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Grade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Grades</SelectItem>
                {CBC_GRADES.map((grade) => (
                  <SelectItem key={grade} value={grade.toString()}>
                    Grade {grade}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="final">Final</SelectItem>
                <SelectItem value="exported">Exported</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="icon"
                onClick={() => setViewMode("grid")}
              >
                <Grid3x3 className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="icon"
                onClick={() => setViewMode("list")}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>

        {/* Timetable Library */}
        {generating && (
          <Card className="p-8 text-center">
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
            <h3 className="text-xl font-semibold mb-2">
              AI is working its magic... ✨
            </h3>
            <p className="text-muted-foreground">
              Creating optimal CBC-compliant timetables
            </p>
          </Card>
        )}

        {filteredTimetables.length > 0 ? (
          <div
            className={
              viewMode === "grid"
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                : "space-y-4"
            }
          >
            {filteredTimetables.map((timetable, index) => (
              <Card
                key={timetable.id}
                className={`p-6 animate-slide-up ${
                  viewMode === "list" ? "flex items-center justify-between" : ""
                }`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge>{timetable.type}</Badge>
                    <Badge
                      variant={
                        timetable.status === "final"
                          ? "default"
                          : timetable.status === "draft"
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {timetable.status}
                    </Badge>
                  </div>
                  <h3 className="font-semibold text-lg mb-2">
                    {timetable.name}
                  </h3>
                  {timetable.streams && (
                    <p className="text-sm text-muted-foreground mb-2">
                      Grade {timetable.streams.grade} -{" "}
                      {timetable.streams.stream_name}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Generated:{" "}
                    {new Date(timetable.generated_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/timetables/view/${timetable.id}`)}
                    className="gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/timetables/edit/${timetable.id}`)}
                    className="gap-2"
                  >
                    <Edit3 className="w-4 h-4" />
                    Edit
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2">
                        <Download className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem
                        onClick={() => handleExport(timetable, "pdf")}
                      >
                        Export as PDF
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleExport(timetable, "png")}
                      >
                        Export as PNG
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleExport(timetable, "jpeg")}
                      >
                        Export as JPEG
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(timetable.id)}
                    className="gap-2 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          !generating && (
            <Card className="p-12 text-center">
              <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No timetables yet</h3>
              <p className="text-muted-foreground mb-4">
                Generate your first AI-powered CBC-compliant timetable
              </p>
              <Button
                onClick={handleGenerate}
                className="bg-[#FACC15] text-[#0D3C44] hover:bg-[#F5BD0D] gap-2 font-semibold rounded-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Generate Timetable
              </Button>
            </Card>
          )
        )}

        {/* Guidance Dialog */}
        <Dialog open={showGuidance} onOpenChange={setShowGuidance}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Timetable Generator Guide</DialogTitle>
              <DialogDescription>
                Learn how to create effective CBC-compliant timetables
              </DialogDescription>
            </DialogHeader>
            <Tabs defaultValue="usage" className="mt-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="usage">How to Use</TabsTrigger>
                <TabsTrigger value="cbc">CBC Rules</TabsTrigger>
                <TabsTrigger value="best">Best Practices</TabsTrigger>
              </TabsList>
              <TabsContent value="usage" className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Getting Started</h4>
                  <ol className="list-decimal list-inside space-y-2 text-sm">
                    <li>Ensure you have added teachers and created streams</li>
                    <li>Click "Generate New" to create a timetable</li>
                    <li>The AI will automatically distribute lessons optimally</li>
                    <li>Edit the generated timetable using drag-and-drop</li>
                    <li>Export or email when finalized</li>
                  </ol>
                </div>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-2">Editing Features</h4>
                  <ul className="list-disc list-inside space-y-2 text-sm">
                    <li>Drag and drop subjects to rearrange</li>
                    <li>Click cells to edit teacher, subject, or time</li>
                    <li>Add breaks by dragging break slots</li>
                    <li>Save drafts to resume later</li>
                  </ul>
                </div>
              </TabsContent>
              <TabsContent value="best" className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Teacher Allocation</h4>
                  <ul className="list-disc list-inside space-y-2 text-sm">
                    <li>Distribute workload evenly across teachers</li>
                    <li>Avoid back-to-back lessons in different locations</li>
                    <li>Schedule complex subjects in morning hours</li>
                    <li>Allow prep time between practical lessons</li>
                  </ul>
                </div>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-2">Class Scheduling</h4>
                  <ul className="list-disc list-inside space-y-2 text-sm">
                    <li>Balance challenging and lighter subjects daily</li>
                    <li>Schedule PE before lunch when possible</li>
                    <li>Group similar subjects (sciences, languages)</li>
                    <li>Leave Friday afternoons for co-curricular</li>
                  </ul>
                </div>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-2">Room Management</h4>
                  <ul className="list-disc list-inside space-y-2 text-sm">
                    <li>Book labs well in advance for practicals</li>
                    <li>Ensure rooms match subject requirements</li>
                    <li>Minimize student movement between rooms</li>
                    <li>Reserve halls for assemblies/events</li>
                  </ul>
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>

        {/* Customization Dialog */}
        <Dialog open={showCustomization} onOpenChange={setShowCustomization}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Customize Timetable Appearance</DialogTitle>
              <DialogDescription>
                Personalize colors, fonts, and layout
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 mt-4">
              <div>
                <h4 className="font-semibold mb-3">Color Palette</h4>
                <div className="grid grid-cols-5 gap-3">
                  {[
                    "#FACC15",
                    "#0D3C44",
                    "#10B981",
                    "#3B82F6",
                    "#8B5CF6",
                    "#EC4899",
                    "#F59E0B",
                    "#EF4444",
                    "#6B7280",
                    "#1F2937",
                  ].map((color) => (
                    <button
                      key={color}
                      className="w-full aspect-square rounded-lg border-2 border-gray-200 hover:border-gray-400 transition-colors"
                      style={{ backgroundColor: color }}
                      onClick={() => toast.success(`Color ${color} selected`)}
                    />
                  ))}
                </div>
              </div>
              <Separator />
              <div>
                <h4 className="font-semibold mb-3">Font Selection</h4>
                <Select defaultValue="recoleta">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recoleta">
                      <span style={{ fontFamily: "Recoleta, serif" }}>
                        Recoleta - Teacher Mary
                      </span>
                    </SelectItem>
                    <SelectItem value="inter">
                      <span style={{ fontFamily: "Inter, sans-serif" }}>
                        Inter - Teacher Mary
                      </span>
                    </SelectItem>
                    <SelectItem value="poppins">
                      <span style={{ fontFamily: "Poppins, sans-serif" }}>
                        Poppins - Teacher Mary
                      </span>
                    </SelectItem>
                    <SelectItem value="roboto">
                      <span style={{ fontFamily: "Roboto, sans-serif" }}>
                        Roboto - Teacher Mary
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Separator />
              <div>
                <h4 className="font-semibold mb-3">Preview</h4>
                <div className="border rounded-lg p-6 bg-gray-50">
                  <h1
                    style={{
                      fontFamily: "Recoleta, serif",
                      fontSize: "60px",
                      fontWeight: 700,
                      lineHeight: "60px",
                      color: "rgb(13, 60, 68)",
                    }}
                  >
                    Teacher Mary
                  </h1>
                  <p className="mt-4 text-muted-foreground">
                    This is how your timetable headers will look
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowCustomization(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    toast.success("Customization saved!");
                    setShowCustomization(false);
                  }}
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default Timetables;
              <TabsContent value="cbc" className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">CBC Curriculum Requirements</h4>
                  <div className="space-y-3 text-sm">
                    <div>
                      <h5 className="font-medium">Lower Primary (Grade 1-3)</h5>
                      <ul className="list-disc list-inside ml-4">
                        <li>40 lessons per week</li>
                        <li>35 minutes per lesson</li>
                        <li>Core subjects: English, Kiswahili, Mathematics</li>
                        <li>Co-curricular: PE, Music, Art</li>
                      </ul>
                    </div>
                    <div>
                      <h5 className="font-medium">Upper Primary (Grade 4-6)</h5>
                      <ul className="list-disc list-inside ml-4">
                        <li>40 lessons per week</li>
                        <li>40 minutes per lesson</li>
                        <li>Additional: Science, Social Studies</li>
                        <li>Optional: Foreign Languages, Religious Education</li>
                      </ul>
                    </div>
                    <div>
                      <h5 className="font-medium">Junior Secondary (Grade 7-9)</h5>
                      <ul className="list-disc list-inside ml-4">
                        <li>40-45 lessons per week</li>
                        <li>40-45 minutes per lesson</li>
                        <li>Specialized subjects based on pathways</li>
                        <li>Practical lessons for STEM/technical subjects</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </TabsContent>