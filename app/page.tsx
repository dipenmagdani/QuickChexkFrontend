"use client";

import {
  Mail,
  Lock,
  Key,
  HelpCircle,
  Check,
  XCircle,
  AlertTriangle,
  Eye,
  EyeOff,
  Trash2,
  Copy,
  X,
  Clock,
  History,
  CheckCircle2,
  Edit3,
  LogIn,
  LogOut,
  Wifi,
  WifiOff,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from "lucide-react";
import { useEffect, useRef, useState, useCallback } from "react";
import { ProgressBar } from "./components/ProgressBar";
import type { Credentials, StatusMessage as StatusMessageType } from "./types";

const REQUEST_TIMEOUT = 20000;

export default function Home() {
  const formRef = useRef<HTMLFormElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessages, setStatusMessages] = useState<StatusMessageType[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSubmittingRef = useRef(false);

  const [hasStoredCredentials, setHasStoredCredentials] = useState(false);
  const [loadedCredentials, setLoadedCredentials] =
    useState<Credentials | null>(null);

  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");

  const [showDataModal, setShowDataModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);

  // Manual entry state
  const [manualType, setManualType] = useState<"check_in" | "check_out">(
    "check_in"
  );
  const [manualDate, setManualDate] = useState(
    () => new Date().toISOString().split("T")[0]
  );
  const [manualTime, setManualTime] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes()
    ).padStart(2, "0")}`;
  });
  const [manualSubmitting, setManualSubmitting] = useState(false);

  // Today's attendance from server
  const [todayAttendance, setTodayAttendance] = useState<{
    checkIn?: string;
    checkOut?: string;
  } | null>(null);

  // Attendance history from server
  const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // PWA online status
  const [isOnline, setIsOnline] = useState(true);

  // Register service worker
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then(() => console.log("SW registered"))
        .catch((err) => console.error("SW registration failed:", err));
    }

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    setIsOnline(navigator.onLine);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Load credentials on mount
  useEffect(() => {
    const savedCredentialsStr = localStorage.getItem("quickchex_credentials");
    if (savedCredentialsStr) {
      try {
        const saved = JSON.parse(savedCredentialsStr) as Credentials;
        if (
          saved.quickchexEmail &&
          saved.quickchexPassword &&
          saved.googlePassword
        ) {
          setLoadedCredentials(saved);
          setHasStoredCredentials(true);
          fetchAttendanceHistory(saved.quickchexEmail);
        } else {
          localStorage.removeItem("quickchex_credentials");
        }
      } catch {
        localStorage.removeItem("quickchex_credentials");
      }
    }
  }, []);

  const fetchAttendanceHistory = useCallback(async (userEmail: string) => {
    setHistoryLoading(true);
    try {
      const resp = await fetch(
        `/api/attendance-history?user_email=${encodeURIComponent(
          userEmail
        )}&days_back=7`
      );
      if (resp.ok) {
        const data = await resp.json();
        const records = data.records || [];
        setAttendanceHistory(records);

        const today = new Date().toISOString().split("T")[0];
        const todayRecord = records.find((r: any) => r.date === today);
        if (todayRecord) {
          setTodayAttendance({
            checkIn: todayRecord.check_in_time
              ? new Date(todayRecord.check_in_time).toLocaleTimeString(
                  "en-US",
                  {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  }
                )
              : undefined,
            checkOut: todayRecord.check_out_time
              ? new Date(todayRecord.check_out_time).toLocaleTimeString(
                  "en-US",
                  {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  }
                )
              : undefined,
          });
        } else {
          setTodayAttendance(null);
        }
      }
    } catch (e) {
      console.error("Failed to fetch attendance history:", e);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const displayToast = useCallback(
    (message: string, type: "success" | "error") => {
      setToastMessage(message);
      setToastType(type);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3500);
    },
    []
  );

  const clearStoredData = () => {
    localStorage.removeItem("quickchex_credentials");
    setHasStoredCredentials(false);
    setLoadedCredentials(null);
    setTodayAttendance(null);
    setAttendanceHistory([]);
    formRef.current?.reset();
    setShowDataModal(false);
    displayToast("Stored data cleared!", "success");
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      displayToast("Copied!", "success");
    } catch {
      displayToast("Failed to copy", "error");
    }
  };

  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [statusMessages, scrollToBottom]);

  const cleanup = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    isSubmittingRef.current = false;
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const loginFailureKeywords = [
    "Invalid email or password",
    "Login failed. Check credentials",
    "Gmail login failed",
  ];

  const handleClick = useCallback(
    async (retryWithoutSession = false) => {
      if (isSubmittingRef.current || isProcessing) return;

      let credentialsToUse: Credentials | null = null;

      if (hasStoredCredentials && loadedCredentials) {
        credentialsToUse = { ...loadedCredentials };
        if (retryWithoutSession) {
          credentialsToUse._quikchex_app_session = undefined;
          credentialsToUse.remember_user_token = undefined;
        }
      } else if (formRef.current) {
        const formData = new FormData(formRef.current);
        const emailVal = formData.get("email") as string;
        const password = formData.get("password") as string;
        const gmail_password = formData.get("gmail_password") as string;

        if (!emailVal || !password || !gmail_password) {
          displayToast("Please fill in all fields.", "error");
          return;
        }
        credentialsToUse = {
          quickchexEmail: emailVal,
          quickchexPassword: password,
          googlePassword: gmail_password,
        };
      }

      if (!credentialsToUse) {
        displayToast("Could not retrieve credentials.", "error");
        return;
      }

      const finalCredentials = { ...credentialsToUse };
      isSubmittingRef.current = true;

      try {
        setIsProcessing(true);
        setStatusMessages([]);
        cleanup();

        const requestBody: Record<string, string> = {
          user_email: finalCredentials.quickchexEmail,
          quickchex_pass: finalCredentials.quickchexPassword,
          gmail_app_password: finalCredentials.googlePassword,
        };

        if (finalCredentials._quikchex_app_session) {
          requestBody._quikchex_app_session =
            finalCredentials._quikchex_app_session;
        }
        if (finalCredentials.remember_user_token) {
          requestBody.remember_user_token =
            finalCredentials.remember_user_token;
        }

        abortControllerRef.current = new AbortController();

        let hasReceivedSuccess = false;

        timeoutRef.current = setTimeout(() => {
          if (!hasReceivedSuccess) {
            cleanup();
            setStatusMessages((prev) => [
              ...prev,
              {
                status: "app_error",
                message: "Request timed out. Check your connection.",
              },
            ]);
            setIsProcessing(false);
            displayToast("Request timed out.", "error");
          }
        }, REQUEST_TIMEOUT);

        const response = await fetch("/api/mark-attendance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error(`Server error: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response stream");

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith("data:")) continue;

            const jsonStr = trimmed.substring(5).trim();
            if (!jsonStr) continue;

            try {
              const data = JSON.parse(jsonStr) as StatusMessageType;
              setStatusMessages((prev) => [...prev, data]);

              if (data.status === "app_error") {
                hasReceivedSuccess = true;
                cleanup();

                const isCsrfError =
                  data.message.includes("CSRF") ||
                  data.message.includes("Session expired") ||
                  data.message.includes("Session recovery failed");

                const isLoginFailure = loginFailureKeywords.some((kw) =>
                  data.message.includes(kw)
                );

                if (isCsrfError && !retryWithoutSession) {
                  setStatusMessages((prev) => [
                    ...prev,
                    {
                      status: "info",
                      message: "🔄 Retrying with fresh session...",
                    },
                  ]);
                  setIsProcessing(false);
                  isSubmittingRef.current = false;
                  const updatedCreds = { ...finalCredentials };
                  delete updatedCreds._quikchex_app_session;
                  delete updatedCreds.remember_user_token;
                  localStorage.setItem(
                    "quickchex_credentials",
                    JSON.stringify(updatedCreds)
                  );
                  setLoadedCredentials(updatedCreds);
                  setTimeout(() => handleClick(true), 500);
                  return;
                }

                if (isLoginFailure) {
                  localStorage.removeItem("quickchex_credentials");
                  setHasStoredCredentials(false);
                  setLoadedCredentials(null);
                }

                setIsProcessing(false);
                displayToast(data.message, "error");
              } else if (data.status === "cookies_update" && data.cookies) {
                const { _quikchex_app_session, remember_user_token } =
                  data.cookies;
                const updatedCredentials = {
                  ...finalCredentials,
                  _quikchex_app_session,
                  remember_user_token,
                };
                localStorage.setItem(
                  "quickchex_credentials",
                  JSON.stringify(updatedCredentials)
                );
                setLoadedCredentials(updatedCredentials);
                setHasStoredCredentials(true);
              } else if (data.status === "app_success") {
                hasReceivedSuccess = true;
                cleanup();

                if (!localStorage.getItem("quickchex_credentials")) {
                  localStorage.setItem(
                    "quickchex_credentials",
                    JSON.stringify(finalCredentials)
                  );
                }
                setHasStoredCredentials(true);
                setIsProcessing(false);
                fetchAttendanceHistory(finalCredentials.quickchexEmail);
                displayToast(data.message || "Attendance marked!", "success");
              }
            } catch (parseError) {
              console.error("SSE parse error:", parseError, "data:", jsonStr);
            }
          }
        }

        if (!hasReceivedSuccess) {
          cleanup();
          setIsProcessing(false);
        }
      } catch (error: any) {
        if (error.name === "AbortError") return;
        console.error("Submission error:", error);
        cleanup();
        setStatusMessages([
          {
            status: "app_error",
            message: "Connection failed. Please try again.",
          },
        ]);
        setIsProcessing(false);
        displayToast("Connection failed.", "error");
      }
    },
    [
      hasStoredCredentials,
      loadedCredentials,
      isProcessing,
      cleanup,
      fetchAttendanceHistory,
      displayToast,
    ]
  );

  // Manual attendance submission
  const handleManualSubmit = useCallback(async () => {
    if (!loadedCredentials?.quickchexEmail) {
      displayToast("No user credentials found.", "error");
      return;
    }
    if (!manualDate || !manualTime) {
      displayToast("Please select date and time.", "error");
      return;
    }

    setManualSubmitting(true);
    try {
      const localDatetime = `${manualDate}T${manualTime}:00`;
      const isoDatetime = new Date(localDatetime).toISOString();

      const resp = await fetch("/api/manual-attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_email: loadedCredentials.quickchexEmail,
          datetime: isoDatetime,
          type: manualType,
        }),
      });

      const data = await resp.json();

      if (resp.ok && data.status === "success") {
        displayToast(
          `${
            manualType === "check_in" ? "Check-In" : "Check-Out"
          } recorded for ${manualDate} at ${manualTime}!`,
          "success"
        );
        setShowManualModal(false);
        fetchAttendanceHistory(loadedCredentials.quickchexEmail);
      } else {
        displayToast(data.message || "Failed to record attendance.", "error");
      }
    } catch (e) {
      displayToast("Network error. Please try again.", "error");
    } finally {
      setManualSubmitting(false);
    }
  }, [
    loadedCredentials,
    manualDate,
    manualTime,
    manualType,
    displayToast,
    fetchAttendanceHistory,
  ]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (timeStr: string | null | undefined) => {
    if (!timeStr) return "—";
    try {
      return new Date(timeStr).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return timeStr;
    }
  };

  const getWorkDuration = (checkIn: string | null, checkOut: string | null) => {
    if (!checkIn || !checkOut) return null;
    try {
      const dur = new Date(checkOut).getTime() - new Date(checkIn).getTime();
      const hours = Math.floor(dur / 3600000);
      const mins = Math.floor((dur % 3600000) / 60000);
      return `${hours}h ${mins}m`;
    } catch {
      return null;
    }
  };

  const lastError =
    statusMessages.length > 0 &&
    !isProcessing &&
    (statusMessages[statusMessages.length - 1].status === "app_error" ||
      statusMessages[statusMessages.length - 1].status === "step_error")
      ? statusMessages[statusMessages.length - 1]
      : null;

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center p-4 sm:p-6 relative">
      {/* Toast Notification */}
      {showToast && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:right-5 sm:top-5
            px-4 py-3 rounded-2xl shadow-xl text-white animate-fade-in-down z-50 
            flex items-center gap-2.5 min-w-[220px] max-w-[calc(100vw-2rem)] sm:max-w-[340px]
            ${
              toastType === "success"
                ? "bg-gradient-to-r from-emerald-500 to-green-600"
                : "bg-gradient-to-r from-red-500 to-rose-600"
            }`}
        >
          {toastType === "success" ? (
            <CheckCircle2 size={18} className="shrink-0" />
          ) : (
            <XCircle size={18} className="shrink-0" />
          )}
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Main Card */}
      <div className="relative w-full max-w-sm sm:max-w-md">
        {/* Glow effect */}
        <div className="absolute inset-0 bg-primary/15 rounded-full blur-[80px] -z-10 scale-110" />

        <div className="glass-effect rounded-3xl p-6 sm:p-8 animate-fade-in shadow-2xl shadow-secondary/10">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-secondary tracking-tight">
                QuickChex
              </h1>
              <p className="text-secondary/60 mt-0.5 text-xs sm:text-sm">
                Attendance Automation
              </p>
            </div>
            {/* Online indicator */}
            <div className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full bg-secondary/5 border border-secondary/10">
              {isOnline ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 pulse-dot" />
                  <Wifi size={12} className="text-emerald-600" />
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  <WifiOff size={12} className="text-red-500" />
                </>
              )}
            </div>
          </div>

          {/* Processing state */}
          {isProcessing ? (
            <div className="py-4 px-1">
              <ProgressBar statusMessages={statusMessages} />
              <div ref={messagesEndRef} />
            </div>
          ) : (
            <>
              {/* Credential Form */}
              {!hasStoredCredentials && (
                <form
                  ref={formRef}
                  className="space-y-3"
                  onSubmit={(e) => e.preventDefault()}
                >
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary/70">
                      <Mail size={16} />
                    </div>
                    <input
                      type="email"
                      name="email"
                      placeholder="QuickChex Email"
                      className="input-field"
                      required
                      autoComplete="email"
                      defaultValue={loadedCredentials?.quickchexEmail || ""}
                    />
                  </div>

                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary/70">
                      <Lock size={16} />
                    </div>
                    <input
                      type="password"
                      name="password"
                      placeholder="QuickChex Password"
                      className="input-field"
                      required
                      autoComplete="current-password"
                      defaultValue={loadedCredentials?.quickchexPassword || ""}
                    />
                  </div>

                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary/70">
                      <Key size={16} />
                    </div>
                    <input
                      type="password"
                      name="gmail_password"
                      placeholder="Google App Password"
                      className="input-field"
                      required
                      defaultValue={loadedCredentials?.googlePassword || ""}
                    />
                  </div>

                  <a
                    href="/google-password-instructions"
                    className="text-primary hover:text-primary/80 transition-colors flex items-center text-xs mt-1 w-fit"
                  >
                    <HelpCircle size={12} className="mr-1" />
                    How to get Google App Password?
                  </a>
                </form>
              )}

              {/* Saved credentials badge */}
              {hasStoredCredentials && !isProcessing && (
                <div className="gradient-border p-4 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
                      <Check size={18} className="text-emerald-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-secondary">
                        Ready to Mark
                      </p>
                      <p className="text-xs text-secondary/60 truncate">
                        {loadedCredentials?.quickchexEmail}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Today's Attendance Summary */}
              {todayAttendance &&
                (todayAttendance.checkIn || todayAttendance.checkOut) && (
                  <div className="mb-3 p-4 rounded-2xl bg-secondary/5 border border-secondary/10">
                    <p className="text-xs font-semibold text-secondary/50 uppercase tracking-wider mb-3">
                      Today&apos;s Attendance
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-emerald-500/10 rounded-xl p-2.5 text-center">
                        <LogIn
                          size={14}
                          className="text-emerald-600 mx-auto mb-1"
                        />
                        <p className="text-xs text-secondary/50 mb-0.5">
                          Check In
                        </p>
                        <p className="text-sm font-bold text-emerald-600">
                          {todayAttendance.checkIn || "—"}
                        </p>
                      </div>
                      <div className="bg-orange-500/10 rounded-xl p-2.5 text-center">
                        <LogOut
                          size={14}
                          className="text-orange-500 mx-auto mb-1"
                        />
                        <p className="text-xs text-secondary/50 mb-0.5">
                          Check Out
                        </p>
                        <p className="text-sm font-bold text-orange-500">
                          {todayAttendance.checkOut || "—"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

              {/* Error message */}
              {lastError && (
                <div className="mb-3 p-3 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-sm flex items-start gap-2">
                  <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                  <span>{lastError.message}</span>
                </div>
              )}

              {/* Main Mark Attendance Button */}
              <button
                onClick={() => handleClick(false)}
                type="button"
                disabled={isProcessing || !isOnline}
                className="btn-primary w-full py-3.5 px-4 mt-4 font-semibold flex items-center justify-center gap-2
                  text-base shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40
                  disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
              >
                <Check className="w-5 h-5" />
                <span>Mark Attendance</span>
              </button>

              {/* Action Buttons Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
                {hasStoredCredentials && (
                  <button
                    onClick={() => {
                      setShowHistory(!showHistory);
                      if (!showHistory && loadedCredentials) {
                        fetchAttendanceHistory(
                          loadedCredentials.quickchexEmail
                        );
                      }
                    }}
                    type="button"
                    className="btn-secondary py-2.5 text-xs col-span-1"
                  >
                    <History className="w-3.5 h-3.5 mr-1.5" />
                    History
                    {showHistory ? (
                      <ChevronUp className="w-3 h-3 ml-1" />
                    ) : (
                      <ChevronDown className="w-3 h-3 ml-1" />
                    )}
                  </button>
                )}

                {hasStoredCredentials && (
                  <button
                    onClick={() => {
                      // Set default time to now
                      const now = new Date();
                      setManualDate(now.toISOString().split("T")[0]);
                      setManualTime(
                        `${String(now.getHours()).padStart(2, "0")}:${String(
                          now.getMinutes()
                        ).padStart(2, "0")}`
                      );
                      setShowManualModal(true);
                    }}
                    type="button"
                    className="btn-secondary py-2.5 text-xs col-span-1"
                  >
                    <Edit3 className="w-3.5 h-3.5 mr-1.5" />
                    Manual
                  </button>
                )}

                <button
                  onClick={() => setShowDataModal(true)}
                  type="button"
                  className="btn-secondary py-2.5 text-xs col-span-1"
                >
                  <Eye className="w-3.5 h-3.5 mr-1.5" />
                  Data
                </button>

                <button
                  onClick={clearStoredData}
                  type="button"
                  className="py-2.5 px-3 text-xs font-medium text-red-400 hover:text-red-300 
                    border border-red-400/20 hover:border-red-400/40 rounded-xl transition-all duration-200
                    flex items-center justify-center touch-manipulation col-span-1"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                  Clear
                </button>
              </div>

              {/* Attendance History Panel */}
              {showHistory && hasStoredCredentials && (
                <div className="mt-3 rounded-2xl overflow-hidden border border-secondary/10 animate-fade-in">
                  <div className="px-4 py-3 bg-secondary/5 border-b border-secondary/10 flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-secondary/70 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      Last 7 Days
                    </h3>
                    <button
                      onClick={() =>
                        loadedCredentials &&
                        fetchAttendanceHistory(loadedCredentials.quickchexEmail)
                      }
                      className="p-1 rounded-lg hover:bg-secondary/10 transition-colors"
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 text-secondary/50 ${
                          historyLoading ? "animate-spin" : ""
                        }`}
                      />
                    </button>
                  </div>
                  {historyLoading ? (
                    <div className="p-6 text-center">
                      <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-2" />
                      <p className="text-xs text-secondary/50">Loading...</p>
                    </div>
                  ) : attendanceHistory.length === 0 ? (
                    <div className="p-6 text-center text-sm text-secondary/50">
                      No attendance records found
                    </div>
                  ) : (
                    <div className="divide-y divide-secondary/5 max-h-[280px] overflow-y-auto scrollbar-thin">
                      {attendanceHistory.map((record, idx) => {
                        const duration = getWorkDuration(
                          record.check_in_time,
                          record.check_out_time
                        );
                        return (
                          <div
                            key={record.id || idx}
                            className="px-4 py-3 hover:bg-secondary/3 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-secondary/80">
                                {formatDate(record.date)}
                              </span>
                              {duration && (
                                <span className="text-xs text-secondary/40 bg-secondary/5 px-2 py-0.5 rounded-full">
                                  {duration}
                                </span>
                              )}
                            </div>
                            <div className="flex gap-4 mt-1.5">
                              <span className="text-xs text-emerald-600">
                                <span className="text-secondary/40 mr-1">
                                  In:
                                </span>
                                {formatTime(record.check_in_time)}
                              </span>
                              <span className="text-xs text-orange-500">
                                <span className="text-secondary/40 mr-1">
                                  Out:
                                </span>
                                {formatTime(record.check_out_time)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Manual Attendance Modal */}
      {showManualModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 animate-fade-in">
          <div className="bg-light rounded-t-3xl sm:rounded-3xl p-6 w-full sm:max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base font-bold text-secondary">
                  Manual Entry
                </h3>
                <p className="text-xs text-secondary/50 mt-0.5">
                  Record missed check-in or check-out
                </p>
              </div>
              <button
                onClick={() => setShowManualModal(false)}
                className="p-2 rounded-xl hover:bg-secondary/10 text-secondary/50 hover:text-secondary transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Type Toggle */}
            <div className="flex bg-secondary/5 rounded-2xl p-1 mb-5">
              <button
                onClick={() => setManualType("check_in")}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2
                  ${
                    manualType === "check_in"
                      ? "bg-white text-emerald-600 shadow-sm"
                      : "text-secondary/50 hover:text-secondary/80"
                  }`}
              >
                <LogIn size={15} />
                Check In
              </button>
              <button
                onClick={() => setManualType("check_out")}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2
                  ${
                    manualType === "check_out"
                      ? "bg-white text-orange-500 shadow-sm"
                      : "text-secondary/50 hover:text-secondary/80"
                  }`}
              >
                <LogOut size={15} />
                Check Out
              </button>
            </div>

            {/* Date & Time inputs */}
            <div className="space-y-3 mb-5">
              <div>
                <label className="block text-xs font-semibold text-secondary/60 uppercase tracking-wider mb-1.5">
                  Date
                </label>
                <input
                  type="date"
                  value={manualDate}
                  max={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setManualDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-secondary/20 bg-white/80
                    text-secondary text-sm focus:outline-none focus:ring-2 focus:ring-primary/30
                    focus:border-primary/40 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-secondary/60 uppercase tracking-wider mb-1.5">
                  Time
                </label>
                <input
                  type="time"
                  value={manualTime}
                  onChange={(e) => setManualTime(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-secondary/20 bg-white/80
                    text-secondary text-sm focus:outline-none focus:ring-2 focus:ring-primary/30
                    focus:border-primary/40 transition-all"
                />
              </div>
            </div>

            {/* User info */}
            <div className="mb-5 px-3 py-2.5 rounded-xl bg-secondary/5 border border-secondary/10 flex items-center gap-2">
              <Mail size={13} className="text-secondary/40 shrink-0" />
              <span className="text-xs text-secondary/60 truncate">
                {loadedCredentials?.quickchexEmail}
              </span>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowManualModal(false)}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-secondary/70
                  border border-secondary/20 hover:bg-secondary/5 transition-all touch-manipulation"
              >
                Cancel
              </button>
              <button
                onClick={handleManualSubmit}
                disabled={manualSubmitting}
                className={`flex-1 py-3 rounded-xl text-sm font-semibold text-white transition-all
                  touch-manipulation disabled:opacity-60 flex items-center justify-center gap-2
                  ${
                    manualType === "check_in"
                      ? "bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700"
                      : "bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700"
                  }`}
              >
                {manualSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <Check size={16} />
                )}
                {manualSubmitting ? "Saving..." : "Save Record"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Data Display Modal */}
      {showDataModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 animate-fade-in">
          <div className="bg-light rounded-t-3xl sm:rounded-3xl p-6 w-full sm:max-w-md shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-secondary">
                Stored Credentials
              </h3>
              <button
                onClick={() => setShowDataModal(false)}
                className="p-2 rounded-xl hover:bg-secondary/10 text-secondary/50 hover:text-secondary transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadedCredentials ? (
              <div className="space-y-4">
                {[
                  {
                    label: "QuickChex Email",
                    value: loadedCredentials.quickchexEmail,
                    masked: false,
                  },
                  {
                    label: "QuickChex Password",
                    value: loadedCredentials.quickchexPassword,
                    masked: true,
                  },
                  {
                    label: "Google App Password",
                    value: loadedCredentials.googlePassword,
                    masked: true,
                  },
                ].map(({ label, value, masked }) => (
                  <div key={label}>
                    <label className="block text-xs font-semibold text-secondary/50 uppercase tracking-wider mb-1.5">
                      {label}
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type={masked && !showPassword ? "password" : "text"}
                        value={value}
                        readOnly
                        className="flex-1 px-3 py-2.5 border border-secondary/15 rounded-xl 
                          bg-white/60 text-secondary text-sm focus:outline-none"
                      />
                      {masked && (
                        <button
                          onClick={() => setShowPassword(!showPassword)}
                          className="p-2.5 rounded-xl hover:bg-secondary/10 text-secondary/40 hover:text-secondary/70 transition-all"
                        >
                          {showPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => copyToClipboard(value)}
                        className="p-2.5 rounded-xl hover:bg-secondary/10 text-secondary/40 hover:text-secondary/70 transition-all"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <AlertTriangle className="w-10 h-10 text-secondary/30 mx-auto mb-3" />
                <p className="text-secondary/50 text-sm">
                  No stored credentials found
                </p>
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowDataModal(false)}
                className="flex-1 py-3 px-4 text-sm font-semibold text-secondary/70 
                  border border-secondary/20 rounded-xl hover:bg-secondary/5 transition-all touch-manipulation"
              >
                Close
              </button>
              {loadedCredentials && (
                <button
                  onClick={clearStoredData}
                  className="flex-1 py-3 px-4 text-sm font-semibold text-red-500 
                    border border-red-300/40 rounded-xl hover:bg-red-50/50 transition-all touch-manipulation"
                >
                  Clear All Data
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
