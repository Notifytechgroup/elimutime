import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Plus,
  BookOpen,
  Trash2,
  Loader2,
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  Terminal,
  RefreshCw
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { optimizedCreateStreams } from "@/lib/supabase-optimizations";
import { sanitizeUUIDValue } from "@/lib/supabase-uuid-safety";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface Stream {
  id: string;
  grade: number;
  stream_name: string;
}

const Streams = () => {
  const navigate = useNavigate();
  const [streams, setStreams] = useState<Stream[]>([]);
  const [schoolId, setSchoolId] = useState<string>("");

  // Separate loading states
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    firstGrade: "",
    lastGrade: "",
    streamNames: "",
  });
  const [missingSchoolIdError, setMissingSchoolIdError] = useState(false);

  // Debug log state
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const addLog = (msg: string) => {
    console.log(`[StreamsDebug] ${msg}`);
    setDebugLogs(prev => [...prev.slice(-6), `${new Date().toLocaleTimeString()}: ${msg}`]);
  };

  // Confirmation State
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingStreams, setPendingStreams] = useState<{ grade: number, name: string }[]>([]);

  useEffect(() => {
    fetchStreams();
    addLog("Streams page mounted.");
  }, [navigate]);

  const fetchStreams = async () => {
    try {
      if (isLoadingData) return; // Prevent double fetch
      setIsLoadingData(true);
      addLog("Fetching user session...");

      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser();

      if (userError) {
        addLog(`User Error: ${userError.message}`);
        throw userError;
      }

      if (!user) {
        addLog("No user found, redirecting.");
        navigate("/auth");
        return;
      }

      addLog(`User found: ${user.id}`);

      // Try to get school_id from user_roles first (primary source)
      let cleanSchoolId: string | null = null;

      addLog("Checking user_roles...");
      const { data: userRole, error: roleError } = await supabase
        .from("user_roles")
        .select("school_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (roleError) addLog(`Role Check Error: ${roleError.message}`);

      if (userRole?.school_id) {
        cleanSchoolId = sanitizeUUIDValue(userRole.school_id);
        addLog(`Found School ID in user_roles: ${cleanSchoolId}`);
      } else {
        addLog("No role found. Checking profiles...");
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("school_id")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) addLog(`Profile Check Error: ${profileError.message}`);

        if (profile?.school_id) {
          cleanSchoolId = sanitizeUUIDValue(profile.school_id);
          addLog(`Found School ID in profiles: ${cleanSchoolId}`);
        }
      }

      if (!cleanSchoolId) {
        addLog("CRITICAL: No School ID found in either table!");
        setMissingSchoolIdError(true);
        setIsLoadingData(false);
        return;
      }

      setMissingSchoolIdError(false);
      setSchoolId(cleanSchoolId);

      addLog(`Fetching streams for school: ${cleanSchoolId}`);
      const { data: streamsData, error: streamsError } = await supabase
        .from("streams")
        .select("id, grade_level, name")
        .eq("school_id", cleanSchoolId)
        .order("grade_level", { ascending: true })
        .order("name", { ascending: true });

      if (streamsError) {
        addLog(`Streams Fetch Error: ${streamsError.message}`);
        throw streamsError;
      }

      addLog(`Found ${streamsData?.length || 0} streams.`);
      setStreams(
        (streamsData || []).map((s: any) => ({
          id: s.id,
          grade: s.grade_level,
          stream_name: s.name,
        }))
      );
    } catch (err: any) {
      addLog(`EXCEPTION: ${err?.message}`);
      console.error("Fetch Streams Exception:", err);
      toast.error(`Error loading streams: ${err?.message}`);
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleInitialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Validate inputs
    const firstGrade = parseInt(formData.firstGrade);
    const lastGrade = parseInt(formData.lastGrade);
    const streamNamesArray = formData.streamNames
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s);

    if (isNaN(firstGrade) || isNaN(lastGrade)) {
      toast.error("Please enter valid grade numbers");
      return;
    }

    if (firstGrade > lastGrade) {
      toast.error("First grade must be less than or equal to lastGrade");
      return;
    }

    if (streamNamesArray.length === 0) {
      toast.error("Please enter at least one stream name");
      return;
    }

    // Generate preview
    const preview = [];
    for (let g = firstGrade; g <= lastGrade; g++) {
      for (const name of streamNamesArray) {
        preview.push({ grade: g, name: name });
      }
    }
    setPendingStreams(preview);
    setShowConfirm(true);
  };

  const handleConfirmCreate = async () => {
    if (isSubmitting) return; // Prevent double submit
    setIsSubmitting(true);
    addLog("Starting stream creation...");
    setShowConfirm(false); // Close dialog

    try {
      if (!schoolId) {
        toast.error("School ID is missing. Refresh page.");
        addLog("Aborted: Missing School ID");
        return;
      }

      const firstGrade = parseInt(formData.firstGrade);
      const lastGrade = parseInt(formData.lastGrade);
      const streamNamesArray = formData.streamNames
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s);

      // Generate grade array
      const grades = Array.from(
        { length: lastGrade - firstGrade + 1 },
        (_, i) => firstGrade + i
      );

      addLog(`Creating streams for grades ${firstGrade}-${lastGrade}`);

      // Use optimized batch insert
      const { data, errors } = await optimizedCreateStreams(
        schoolId,
        grades,
        streamNamesArray
      );

      if (errors.length > 0) {
        addLog(`Created with errors: ${errors.length} failed`);
        console.error("[Streams] Some chunks failed:", errors);
        toast.error(`Created ${data.length} streams, but ${errors.length} chunks had errors. Check console for details.`);
      } else {
        addLog(`Success! Created ${data.length} streams.`);
        toast.success(
          `Successfully created ${data.length} streams! ✨`
        );
      }

      setFormData({
        firstGrade: "",
        lastGrade: "",
        streamNames: "",
      });
      setShowForm(false);
      await fetchStreams(); // Refresh list
    } catch (error: any) {
      addLog(`Creation Error: ${error.message}`);
      console.error("[Streams] Error:", error);
      toast.error(error.message || "Failed to create streams");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (streamId: string) => {
    if (!confirm("Are you sure you want to delete this stream?")) return;
    try {
      // Optimistic upate (remove from UI immediately)
      const originalStreams = [...streams];
      setStreams(streams.filter(s => s.id !== streamId));

      const { error } = await supabase
        .from("streams")
        .delete()
        .eq("id", streamId);

      if (error) {
        // Rollback if failed
        setStreams(originalStreams);
        throw error;
      }

      toast.success("Stream deleted");
      // No need to fetchStreams() again if optimistic worked
    } catch (error: any) {
      toast.error(error.message || "Failed to delete stream");
    }
  };

  const groupedStreams = streams.reduce((acc, stream) => {
    if (!acc[stream.grade]) {
      acc[stream.grade] = [];
    }
    acc[stream.grade].push(stream);
    return acc;
  }, {} as Record<number, Stream[]>);

  if (missingSchoolIdError) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4 relative">
          {/* Debug Log Box */}
          {debugLogs.length > 0 && (
            <div className="absolute top-4 right-4 w-64 bg-black/90 text-green-400 p-2 rounded-md font-mono text-[10px] z-50 pointer-events-none border border-green-500/30 opacity-80">
              <div className="flex items-center gap-2 border-b border-green-500/50 mb-1 pb-1 font-bold">
                <Terminal className="h-3 w-3" /> Debug Console
              </div>
              {debugLogs.map((log, i) => (
                <div key={i} className="truncate">{log}</div>
              ))}
            </div>
          )}

          <Card className="p-8 max-w-md text-center border-destructive/50 bg-destructive/5">
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-destructive" />
            </div>
            <h2 className="text-xl font-bold text-destructive mb-2">Missing School ID</h2>
            <p className="text-muted-foreground mb-6">
              We couldn't find a School ID associated with your account...
            </p>
            <div className="flex flex-col gap-3">
              <Button
                variant="default"
                onClick={() => navigate('/debug-session')}
                className="w-full"
              >
                Open Debug Session (Fix This)
              </Button>
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
                className="w-full"
              >
                Retry
              </Button>
            </div>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-6 relative"
      >
        {/* Helper Debug Log (Top Right) */}
        {debugLogs.length > 0 && (
          <div className="absolute top-0 right-0 w-64 bg-black/90 text-green-400 p-2 rounded-md font-mono text-[10px] z-50 pointer-events-none border border-green-500/30 opacity-70 hover:opacity-100 transition-opacity">
            <div className="flex items-center gap-2 border-b border-green-500/50 mb-1 pb-1 font-bold">
              <Terminal className="h-3 w-3" /> Debug Console
            </div>
            {debugLogs.map((log, i) => (
              <div key={i} className="truncate">{log}</div>
            ))}
          </div>
        )}

        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex items-center justify-between w-full"
        >
          {/* Back Button (Left) */}
          <div>
            <Button
              variant="outline"
              onClick={() => navigate("/dashboard")}
              className="gap-2 font-semibold rounded-full"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </div>

          {/* Centered Title + Subtitle */}
          <div className="text-center">
            <h1 className="text-3xl font-bold text-black flex items-center justify-center gap-3">
              <BookOpen className="w-8 h-8" />
              Streams & Classes
            </h1>
            <p className="text-muted-foreground mt-2">
              Configure grades and stream organization
            </p>
          </div>

          {/* Next Button (Right) */}
          <div className="flex gap-2">
            {/* Refresh Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={fetchStreams}
              disabled={isLoadingData}
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingData ? 'animate-spin' : ''}`} />
            </Button>

            <Button
              onClick={() => navigate("/teachers")}
              className="bg-[#FACC15] text-[#000000] hover:bg-[#F5BD0D] text-base gap-2 font-semibold rounded-full"
            >
              Next →
            </Button>
          </div>
        </motion.div>


        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="p-6 glass shimmer">
                <h2 className="text-xl font-semibold mb-4">Create Streams</h2>
                <form onSubmit={handleInitialSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstGrade">First Grade *</Label>
                      <Input
                        id="firstGrade"
                        type="number"
                        min="1"
                        max="12"
                        placeholder="e.g., 1"
                        value={formData.firstGrade}
                        onChange={(e) =>
                          setFormData({ ...formData, firstGrade: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastGrade">Last Grade *</Label>
                      <Input
                        id="lastGrade"
                        type="number"
                        min="1"
                        max="12"
                        placeholder="e.g., 9"
                        value={formData.lastGrade}
                        onChange={(e) =>
                          setFormData({ ...formData, lastGrade: e.target.value })
                        }
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="streamNames">Stream Names *</Label>
                    <Input
                      id="streamNames"
                      placeholder="e.g., Blue, Pink (comma-separated)"
                      value={formData.streamNames}
                      onChange={(e) =>
                        setFormData({ ...formData, streamNames: e.target.value })
                      }
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter stream names separated by commas. Each stream will be
                      created for every grade in the range.
                    </p>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button
                      type="submit"
                      disabled={isSubmitting} // Correctly using isSubmitting now!
                      className="flex-1 bg-[#FACC15] text-[#000000] hover:bg-[#F5BD0D] font-semibold rounded-full"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        "Preview & Create"
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowForm(false)}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Confirmation Dialog */}
        <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                Confirm Stream Creation
              </DialogTitle>
              <DialogDescription>
                You are about to create <strong>{pendingStreams.length}</strong> new streams.
                Please review the list below before confirming.
              </DialogDescription>
            </DialogHeader>

            <div className="max-h-[200px] overflow-y-auto border rounded-md p-2 bg-secondary/50 text-sm">
              <ul className="space-y-1">
                {pendingStreams.map((s, i) => (
                  <li key={i} className="flex justify-between items-center px-2 py-1 border-b last:border-0 border-border/50">
                    <span>Grade {s.grade}</span>
                    <span className="font-semibold">{s.name}</span>
                  </li>
                ))}
              </ul>
            </div>

            <DialogFooter className="gap-2 sm:justify-start">
              <Button
                className="w-full sm:w-auto bg-[#FACC15] text-black hover:bg-[#E5B80B]"
                onClick={handleConfirmCreate}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Yes, Create {pendingStreams.length} Streams
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => setShowConfirm(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Loading State for Initial Data */}
        {isLoadingData && streams.length === 0 && (
          <div className="flex justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {/* Streams Display */}
        {Object.keys(groupedStreams).length > 0 ? (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: { staggerChildren: 0.1 },
              },
            }}
            className="space-y-6"
          >
            <AnimatePresence mode="popLayout">
              {Object.entries(groupedStreams)
                .sort(([a], [b]) => parseInt(a) - parseInt(b))
                .map(([grade, gradeStreams], index) => (
                  <motion.div
                    key={grade}
                    variants={{
                      hidden: { opacity: 0, x: -20 },
                      visible: { opacity: 1, x: 0 },
                    }}
                    exit={{ opacity: 0, x: 20 }}
                  >
                    <Card className="p-6 relative overflow-hidden group">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="relative z-10">
                        <h3 className="text-xl font-bold text-primary mb-4">
                          Grade {grade}
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                          {gradeStreams.map((stream) => (
                            <motion.div
                              key={stream.id}
                              whileHover={{ scale: 1.05 }}
                              transition={{ type: "spring", stiffness: 400 }}
                              className="flex items-center justify-between p-3 bg-secondary rounded-lg hover:bg-accent transition-colors group/item"
                            >
                              <Badge variant="outline" className="font-semibold">
                                {stream.stream_name}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(stream.id)}
                                className="opacity-0 group-hover/item:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          !showForm && !isLoadingData && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="p-12 text-center">
                <BookOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">
                  No streams configured yet
                </h3>
                <p className="text-muted-foreground mb-4">
                  Create your first stream to organize classes
                </p>
                <Button
                  onClick={() => setShowForm(true)}
                  className="rounded-full bg-[#FACC15] text-[#000000] hover:bg-[#F5BD0D]"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Streams
                </Button>
              </Card>
            </motion.div>
          )
        )}
      </motion.div>
    </DashboardLayout>
  );
};

export default Streams;