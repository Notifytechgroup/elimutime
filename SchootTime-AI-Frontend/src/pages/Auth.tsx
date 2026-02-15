import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Header } from "@/components/Header";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { GraduationCap, Loader2, Eye, EyeOff } from "lucide-react";
import authBackground from "@/assets/auth-background.jpg";

/**
 * Auth component with VISUAL DEBUG LOGGING enabled.
 */

interface AuthProps {
  isSignUp?: boolean;
}

const AUTH_TIMEOUT_MS = 20000; // 20s request-level timeout
const SESSION_FALLBACK_MS = 10000; // wait after successful signIn for onAuthStateChange session

const Auth = ({ isSignUp = false }: AuthProps) => {
  const navigate = useNavigate();

  // Debug log state
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const addLog = (msg: string) => {
    console.log(`[AuthDebug] ${msg}`);
    setDebugLogs(prev => [...prev.slice(-6), `${new Date().toLocaleTimeString()}: ${msg}`]);
  };

  // UI state
  const [isLogin, setIsLogin] = useState(!isSignUp);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    schoolName: "",
    schoolType: "",
  });

  // password reset / magic link
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetStep, setResetStep] = useState<"email" | "password">("email");
  const [resetData, setResetData] = useState({
    email: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [isResetting, setIsResetting] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  // UI helpers
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // timeout refs (use number for browser setTimeout id)
  const requestTimeoutRef = useRef<number | null>(null);
  const sessionFallbackRef = useRef<number | null>(null);

  // Ref to prevent timeout errors if auth succeeded via listener
  const isAuthCompleteRef = useRef(false);

  // refs for current values used in the auth listener to avoid re-registering it
  const isLoginRef = useRef(isLogin);
  useEffect(() => {
    isLoginRef.current = isLogin;
  }, [isLogin]);

  const loadingRef = useRef(loading);
  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (requestTimeoutRef.current) {
        clearTimeout(requestTimeoutRef.current);
        requestTimeoutRef.current = null;
      }
      if (sessionFallbackRef.current) {
        clearTimeout(sessionFallbackRef.current);
        sessionFallbackRef.current = null;
      }
    };
  }, []);

  // runWithTimeout helper: wraps a promise and rejects with Error('timeout') after ms
  const runWithTimeout = useCallback(<T,>(p: Promise<T>, ms = AUTH_TIMEOUT_MS) => {
    return new Promise<T>((resolve, reject) => {
      const id = window.setTimeout(() => {
        reject(new Error("timeout"));
      }, ms);

      p.then((res) => {
        clearTimeout(id);
        resolve(res);
      }).catch((err) => {
        clearTimeout(id);
        reject(err);
      });
    });
  }, []);

  // Stable auth listener registered once
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      addLog(`Event: ${event} | User: ${session?.user?.id ? 'Yes' : 'No'}`);
      try {
        if (session && isLoginRef.current) {
          addLog("SIGNED_IN event. Checking role...");
          isAuthCompleteRef.current = true;

          // Clear pending timeouts
          if (requestTimeoutRef.current) {
            clearTimeout(requestTimeoutRef.current);
            requestTimeoutRef.current = null;
          }
          if (sessionFallbackRef.current) {
            clearTimeout(sessionFallbackRef.current);
            sessionFallbackRef.current = null;
          }

          // Role lookup and navigation
          try {
            const { data: roleData, error: roleError } = await supabase
              .from("user_roles")
              .select("role")
              .eq("user_id", session.user.id)
              .eq("role", "admin")
              .maybeSingle();

            if (roleError) {
              addLog(`Role Error: ${roleError.message}`);
              console.error("Role lookup failed:", roleError);
              navigate("/dashboard");
            } else if (roleData) {
              addLog(`Role found: ${roleData.role}`);
              navigate("/role-selection");
            } else {
              addLog("No specific role found.");
              navigate("/dashboard");
            }
            if (loadingRef.current) toast.success("Welcome back!");
          } catch (roleErr: any) {
            addLog(`Role Exception: ${roleErr.message}`);
            console.error("Role check exception:", roleErr);
            navigate("/dashboard");
          } finally {
            setLoading(false);
          }
        } else if (event === "PASSWORD_RECOVERY") {
          addLog("Password Recovery mode");
          setShowResetDialog(true);
          setResetStep("password");
        } else {
          // For other events, ensure UI unlocked if needed
          if (event === "SIGNED_OUT") {
            setLoading(false);
            // Clear timeouts
            if (requestTimeoutRef.current) {
              clearTimeout(requestTimeoutRef.current);
              requestTimeoutRef.current = null;
            }
            if (sessionFallbackRef.current) {
              clearTimeout(sessionFallbackRef.current);
              sessionFallbackRef.current = null;
            }
          }
        }
      } catch (err) {
        console.error("Error in auth state handler:", err);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  // Magic link / reset handlers
  const handleSendMagicLink = async () => {
    if (!resetData.email) {
      toast.error("Please enter your email address");
      return;
    }
    setIsResetting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetData.email, {
        redirectTo: `${window.location.origin}/auth?type=recovery`,
      });
      if (error) throw error;
      toast.success("Magic link sent! Check your email to reset your password.");
      setMagicLinkSent(true);
    } catch (err: any) {
      console.error("Magic link error:", err);
      toast.error(err?.message || "Failed to send magic link");
    } finally {
      setIsResetting(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!resetData.newPassword || !resetData.confirmPassword) {
      toast.error("Please enter both password fields");
      return;
    }
    if (resetData.newPassword !== resetData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (resetData.newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setIsResetting(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: resetData.newPassword,
      });
      if (error) throw error;
      toast.success("Password updated successfully! You can now log in.");
      setShowResetDialog(false);
      setResetStep("email");
      setMagicLinkSent(false);
      setResetData({ email: "", newPassword: "", confirmPassword: "" });
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (err: any) {
      console.error("Update password error:", err);
      toast.error(err?.message || "Failed to update password");
    } finally {
      setIsResetting(false);
    }
  };

  // Main submit (sign-in or sign-up)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    isAuthCompleteRef.current = false;
    addLog(`Starting login: ${formData.email}`);

    // Clear any existing timeouts
    if (requestTimeoutRef.current) {
      clearTimeout(requestTimeoutRef.current);
      requestTimeoutRef.current = null;
    }
    if (sessionFallbackRef.current) {
      clearTimeout(sessionFallbackRef.current);
      sessionFallbackRef.current = null;
    }

    try {
      if (isLogin) {
        addLog("Calling signInWithPassword...");

        const signInPromise = supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        let result;
        try {
          result = await runWithTimeout(signInPromise, AUTH_TIMEOUT_MS);
          addLog("signIn returned success.");
        } catch (err: any) {
          addLog(`signIn error/timeout: ${err.message}`);
          // If auth was already completed via event listener, ignore this timeout/error
          if (isAuthCompleteRef.current) {
            addLog("Auth completed via listener. Ignoring.");
            return;
          }

          addLog("Checking if session exists...");

          // Emergency check: did we actually get a session despite the timeout?
          const { data: checkData } = await supabase.auth.getSession();
          if (checkData?.session) {
            addLog("Session EXISTS! Recovering...");
            isAuthCompleteRef.current = true;
            result = { data: checkData, error: null };
          } else {
            if (err?.message === "timeout") {
              console.error("Login request timed out (client-side).");
              toast.error("Login request timed out. Please check your network.");
            } else {
              console.error("Login request failed:", err);
              toast.error(err?.message || "Login failed. Please try again.");
            }
            throw err;
          }
        }

        const { data, error } = result as any;

        if (error) {
          addLog(`Auth Error: ${error.message}`);
          console.error("Login failed with error:", error);
          if (error.status === 400) {
            toast.error("Invalid login credentials");
          } else if (error.status === 422) {
            toast.error("Invalid or expired login flow. Try again.");
          } else {
            toast.error(error.message || "Login failed");
          }
          throw error;
        }

        if (data?.session) {
          addLog("Has session. Checking role...");
          isAuthCompleteRef.current = true;
          try {
            const { data: roleData, error: roleError } = await supabase
              .from("user_roles")
              .select("role")
              .eq("user_id", data.session.user.id)
              .eq("role", "admin")
              .maybeSingle();

            if (roleError) {
              addLog(`Role lookup error: ${roleError.message}`);
              console.error("Role lookup failed:", roleError);
              navigate("/dashboard");
            } else if (roleData) {
              navigate("/role-selection");
            } else {
              navigate("/dashboard");
            }
            toast.success("Welcome back!");
          } catch (roleErr) {
            console.error("Role check exception:", roleErr);
            navigate("/dashboard");
          } finally {
            setLoading(false);
          }
        } else {
          addLog("Success but no session yet. Waiting...");
          sessionFallbackRef.current = window.setTimeout(() => {
            if (!isAuthCompleteRef.current) {
              addLog("Fallback timeout reached.");
              toast.error("Login is taking longer than expected. Please try again.");
              setLoading(false);
            }
            sessionFallbackRef.current = null;
          }, SESSION_FALLBACK_MS);
          console.info("SignIn completed; awaiting onAuthStateChange for session.");
        }
      } else {
        // Sign-up logic
        if (formData.password !== formData.confirmPassword) {
          toast.error("Passwords do not match");
          setLoading(false);
          return;
        }

        if (formData.password.length < 6) {
          toast.error("Password must be at least 6 characters");
          setLoading(false);
          return;
        }

        addLog("Calling signUp...");
        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              full_name: formData.fullName,
              school_name: formData.schoolName,
              school_type: formData.schoolType,
            },
            emailRedirectTo:
              import.meta.env.VITE_EMAIL_REDIRECT_TO || `${window.location.origin}/dashboard`,
          },
        });

        if (error) {
          addLog(`SignUp Error: ${error.message}`);
          console.error("Sign up error:", error);
          toast.error(error.message || "Registration failed");
          setLoading(false);
          return;
        }

        if (!data?.session) {
          addLog("SignUp success. Check email.");
          toast.success(
            "Registration successful! Please check your email and confirm your account before signing in."
          );
          setIsLogin(true);
          setLoading(false);
          return;
        }

        addLog("SignUp success with session!");
        toast.success("Registration successful! Welcome aboard! 🎉");
      }
    } catch (err) {
      console.error("Auth error (handleSubmit):", err);
      // Only reset loading if we didn't complete auth (navigating)
      if (!isAuthCompleteRef.current) {
        setLoading(false);
      }
      if (requestTimeoutRef.current) {
        clearTimeout(requestTimeoutRef.current);
        requestTimeoutRef.current = null;
      }
      if (sessionFallbackRef.current) {
        clearTimeout(sessionFallbackRef.current);
        sessionFallbackRef.current = null;
      }
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4 relative"
      style={{
        backgroundImage: `url(${authBackground})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <Header />
      <div className="absolute inset-0 bg-primary/20 backdrop-blur-sm"></div>

      {/* Debug Log Box */}
      {debugLogs.length > 0 && (
        <div className="absolute bottom-4 left-4 right-4 bg-black/90 text-green-400 p-4 rounded-md font-mono text-xs z-50 pointer-events-none border border-green-500/30 shadow-lg">
          <h4 className="border-b border-green-500/50 mb-2 pb-1 font-bold flex justify-between">
            <span>Debug Console</span>
            <span className="text-[10px] opacity-70">Logs clear on refresh</span>
          </h4>
          <div className="space-y-1">
            {debugLogs.map((log, i) => (
              <div key={i}>{log}</div>
            ))}
          </div>
        </div>
      )}

      <Card className="w-full max-w-md mx-auto p-4 sm:p-6 md:p-8 shadow-2xl animate-scale-in relative z-10 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md mt-20 sm:mt-10 md:mt-20">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mb-4">
            <GraduationCap className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">ElimuTime</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            {isLogin ? "Welcome back!" : "Enroll your school to ElimuTime"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-md mx-auto">
          {!isLogin && (
            <>
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-gray-900 dark:text-white">
                  Contact Name *
                </Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John Doe"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  required={!isLogin}
                  className="transition-all focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="schoolName" className="text-gray-900 dark:text-white">
                  School Name *
                </Label>
                <Input
                  id="schoolName"
                  type="text"
                  placeholder="Springfield High School"
                  value={formData.schoolName}
                  onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                  required={!isLogin}
                  className="transition-all focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="schoolType" className="text-gray-900 dark:text-white">
                  School Type *
                </Label>
                <select
                  id="schoolType"
                  value={formData.schoolType}
                  onChange={(e) => setFormData({ ...formData, schoolType: e.target.value })}
                  required={!isLogin}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-all focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                >
                  <option value="" disabled>
                    Select school type
                  </option>
                  <option value="primary">Primary</option>
                  <option value="highschool">High School/Secondary</option>
                  <option value="college">College</option>
                  <option value="university">University</option>
                  <option value="training">Training Institute</option>
                  <option value="international">International School</option>
                </select>
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="email" className="text-gray-900 dark:text-white">
              School Email *
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="you@school.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              className="transition-all focus:ring-2 focus:ring-primary"
            />
          </div>

          {!isLogin && (
            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-900 dark:text-white">
                Password *
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="•••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required={!isLogin}
                  className="transition-all focus:ring-2 focus:ring-primary pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}

          {!isLogin && (
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-gray-900 dark:text-white">
                Confirm Password *
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="•••••••"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  required={!isLogin}
                  className="transition-all focus:ring-2 focus:ring-primary pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}

          {isLogin && (
            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-900 dark:text-white">
                Password *
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="•••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  className="transition-all focus:ring-2 focus:ring-primary pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}

          <Button
            type="submit"
            className="font-semibold w-full gradient-primary text-white hover:opacity-90 transition-all rounded-full text-sm sm:text-base py-2 sm:py-3"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : isLogin ? (
              "Sign In"
            ) : (
              "Enroll"
            )}
          </Button>

          {isLogin && (
            <button
              type="button"
              onClick={() => {
                setResetData({ ...resetData, email: formData.email });
                setShowResetDialog(true);
              }}
              className="w-full text-sm text-primary hover:underline transition-all mt-2"
            >
              Forgot Password?
            </button>
          )}
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-primary hover:underline transition-all"
          >
            {isLogin ? "Don't have an account? Enroll" : "Already have an account? Sign in"}
          </button>
        </div>
      </Card>

      <Dialog
        open={showResetDialog}
        onOpenChange={(open) => {
          setShowResetDialog(open);
          if (!open) {
            setResetStep("email");
            setMagicLinkSent(false);
            setResetData({ email: "", newPassword: "", confirmPassword: "" });
          }
        }}
      >
        <DialogContent className="sm:max-w-md bg-white dark:bg-gray-800">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">Reset Password</DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-300">
              {resetStep === "email" && "Enter your email address to receive a magic link to reset your password."}
              {resetStep === "password" && "Create your new password."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {resetStep === "email" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="reset-email" className="text-gray-900 dark:text-white">
                    Email Address
                  </Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="you@school.com"
                    value={resetData.email}
                    onChange={(e) => setResetData({ ...resetData, email: e.target.value })}
                    disabled={magicLinkSent}
                  />
                </div>

                {magicLinkSent && (
                  <div className="p-3 bg-primary/10 border border-primary/20 rounded-md">
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      ✉️ Magic link sent to <strong>{resetData.email}</strong>. Check your inbox and click the link to continue.
                    </p>
                  </div>
                )}

                <Button onClick={handleSendMagicLink} disabled={isResetting || magicLinkSent} className="w-full">
                  {isResetting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : magicLinkSent ? (
                    "Link Sent"
                  ) : (
                    "Send Magic Link"
                  )}
                </Button>
              </>
            )}

            {resetStep === "password" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="new-password" className="text-gray-900 dark:text-white">
                    New Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showNewPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={resetData.newPassword}
                      onChange={(e) => setResetData({ ...resetData, newPassword: e.target.value })}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="text-gray-900 dark:text-white">
                    Confirm Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={resetData.confirmPassword}
                      onChange={(e) => setResetData({ ...resetData, confirmPassword: e.target.value })}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button onClick={handleUpdatePassword} disabled={isResetting} className="w-full">
                  {isResetting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Update Password"
                  )}
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Auth;