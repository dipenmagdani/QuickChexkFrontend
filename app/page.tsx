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
  Trash2,
  Copy,
  X,
  Clock,
  History,
} from "lucide-react";
import { useEffect, useRef, useState, useCallback } from "react";
import { StatusMessage } from "./components/StatusMessage";
import { ProgressBar } from "./components/ProgressBar";
import type { Credentials, StatusMessage as StatusMessageType } from "./types";

const REQUEST_TIMEOUT = 20000; // 20 seconds timeout (reduced from 30)
const DEBOUNCE_DELAY = 500;
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace("/mark", "") || "";

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

  // Today's attendance from server
  const [todayAttendance, setTodayAttendance] = useState<{
    checkIn?: string;
    checkOut?: string;
  } | null>(null);

  // Attendance history from server
  const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

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
          // Fetch attendance history for this user
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

        // Set today's attendance from server data
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
        }
      }
    } catch (e) {
      console.error("Failed to fetch attendance history:", e);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const displayToast = (message: string, type: "success" | "error") => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

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
        // If retrying without session, clear session cookies
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

        // Build request body (credentials in POST body, not URL params)
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

        // Use fetch + POST + ReadableStream instead of EventSource GET
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
          buffer = lines.pop() || ""; // Keep incomplete line in buffer

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

                // Check if this is a CSRF/session error (auto-retry)
                const isCsrfError =
                  data.message.includes("CSRF") ||
                  data.message.includes("Session expired") ||
                  data.message.includes("Session recovery failed");

                const isLoginFailure = loginFailureKeywords.some((kw) =>
                  data.message.includes(kw)
                );

                if (isCsrfError && !retryWithoutSession) {
                  // Auto-retry without session cookies
                  setStatusMessages((prev) => [
                    ...prev,
                    {
                      status: "info",
                      message: "🔄 Retrying with fresh session...",
                    },
                  ]);
                  setIsProcessing(false);
                  isSubmittingRef.current = false;
                  // Clear session from stored credentials
                  const updatedCreds = { ...finalCredentials };
                  delete updatedCreds._quikchex_app_session;
                  delete updatedCreds.remember_user_token;
                  localStorage.setItem(
                    "quickchex_credentials",
                    JSON.stringify(updatedCreds)
                  );
                  setLoadedCredentials(updatedCreds);
                  // Retry
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

                // Save credentials if not already saved
                if (!localStorage.getItem("quickchex_credentials")) {
                  localStorage.setItem(
                    "quickchex_credentials",
                    JSON.stringify(finalCredentials)
                  );
                }
                setHasStoredCredentials(true);
                setIsProcessing(false);

                // Refresh attendance from server
                fetchAttendanceHistory(finalCredentials.quickchexEmail);

                displayToast(data.message || "Attendance marked!", "success");
              }
            } catch (parseError) {
              console.error("SSE parse error:", parseError, "data:", jsonStr);
            }
          }
        }

        // Stream ended without success/error
        if (!hasReceivedSuccess) {
          cleanup();
          setIsProcessing(false);
        }
      } catch (error: any) {
        if (error.name === "AbortError") return; // Intentional abort
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
    ]
  );

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

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      {showToast && (
        <div
          className={`fixed top-5 right-5 p-4 rounded-md shadow-lg text-white animate-fade-in-down z-50 ${
            toastType === "success" ? "bg-green-500" : "bg-red-500"
          }`}
        >
          <div className="flex items-center">
            {toastType === "success" ? (
              <Check size={20} className="mr-2" />
            ) : (
              <XCircle size={20} className="mr-2" />
            )}
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      <div className="relative w-full max-w-md">
        <div className="absolute inset-0 bg-primary/10 rounded-full blur-[100px] -z-10" />
        <div className="glass-effect rounded-lg p-8 md:px-6 animate-fade-in shadow-lg">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-secondary tracking-tight">
              QuickChex
            </h1>
            <p className="text-secondary/80 mt-1 text-sm">
              Attendance Automation
            </p>
          </div>

          {isProcessing ? (
            <div className="py-6 px-2">
              <ProgressBar statusMessages={statusMessages} />
              <div ref={messagesEndRef} />
            </div>
          ) : (
            <>
              {!hasStoredCredentials && (
                <form
                  ref={formRef}
                  className="space-y-4"
                  onSubmit={(e) => e.preventDefault()}
                >
                  <div className="space-y-1">
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-primary">
                        <Mail size={16} />
                      </div>
                      <input
                        type="email"
                        name="email"
                        placeholder="QuickChex Email"
                        className="input-field"
                        required
                        defaultValue={loadedCredentials?.quickchexEmail || ""}
                      />
                    </div>
                    <p className="text-xs text-secondary/70 ml-1">
                      Enter your QuickChex account email
                    </p>
                  </div>

                  <div className="space-y-1 mt-2">
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-primary">
                        <Lock size={16} />
                      </div>
                      <input
                        type="password"
                        name="password"
                        placeholder="QuickChex Password"
                        className="input-field"
                        required
                        defaultValue={
                          loadedCredentials?.quickchexPassword || ""
                        }
                      />
                    </div>
                    <p className="text-xs text-secondary/70 ml-1">
                      Your QuickChex account password
                    </p>
                  </div>

                  <div className="space-y-1 mt-2">
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-primary">
                        <Key size={16} />
                      </div>
                      <input
                        type="password"
                        name="gmail_password"
                        placeholder="Google Mail Password"
                        className="input-field"
                        required
                        defaultValue={loadedCredentials?.googlePassword || ""}
                      />
                    </div>
                    <div className="ml-1 flex items-center justify-between">
                      <a
                        href="/google-password-instructions"
                        className="text-primary hover:text-primary/80 transition-colors flex items-center text-xs mt-1 md:mt-0 md:ml-2"
                      >
                        <HelpCircle size={12} className="mr-1" />
                        How to get it?
                      </a>
                    </div>
                  </div>
                </form>
              )}

              {hasStoredCredentials && !isProcessing && (
                <div className="text-center my-6 p-4 border border-green-500/30 bg-green-500/10 rounded-lg">
                  <Check size={24} className="mx-auto text-green-500 mb-2" />
                  <p className="text-sm text-secondary/90">
                    Credentials are saved. Ready to mark attendance.
                  </p>
                  <p className="text-xs text-secondary/70 mt-1">
                    Using: {loadedCredentials?.quickchexEmail}
                  </p>
                </div>
              )}

              {/* Today's Attendance Times */}
              {todayAttendance &&
                (todayAttendance.checkIn || todayAttendance.checkOut) &&
                !isProcessing && (
                  <div className="my-4 p-4 border border-blue-500/30 bg-blue-500/10 rounded-lg">
                    <p className="text-sm font-medium text-secondary/90 mb-2 text-center">
                      📅 Today&apos;s Attendance
                    </p>
                    <div className="flex justify-around text-center">
                      <div>
                        <p className="text-xs text-secondary/70">Check In</p>
                        <p className="text-sm font-semibold text-green-500">
                          {todayAttendance.checkIn || "—"}
                        </p>
                      </div>
                      <div className="border-l border-secondary/20"></div>
                      <div>
                        <p className="text-xs text-secondary/70">Check Out</p>
                        <p className="text-sm font-semibold text-orange-500">
                          {todayAttendance.checkOut || "—"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

              {statusMessages.length > 0 &&
                !isProcessing &&
                (statusMessages[statusMessages.length - 1].status === "info" ||
                  statusMessages[statusMessages.length - 1].status ===
                    "app_error" ||
                  statusMessages[statusMessages.length - 1].status ===
                    "step_error") && (
                  <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-md text-red-400 text-sm flex items-center">
                    <AlertTriangle size={18} className="mr-2 shrink-0" />
                    {statusMessages[statusMessages.length - 1].message}
                  </div>
                )}

              <button
                onClick={() => handleClick(false)}
                type="button"
                disabled={isProcessing}
                className="btn-primary w-full py-3 px-4 mt-6 font-medium flex items-center justify-center
                  transition-all duration-300 hover:shadow-md active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Check className="w-4 h-4 mr-2" />
                <span>
                  {isProcessing ? "Processing..." : "Mark Attendance"}
                </span>
              </button>

              {/* Buttons Row */}
              <div className="flex gap-2 mt-4">
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
                    className="flex-1 py-2 px-3 text-sm font-medium text-secondary/80 hover:text-secondary 
                      border border-secondary/20 hover:border-secondary/40 rounded-md transition-all duration-200
                      flex items-center justify-center"
                  >
                    <History className="w-4 h-4 mr-2" />
                    History
                  </button>
                )}
                <button
                  onClick={() => setShowDataModal(true)}
                  type="button"
                  className="flex-1 py-2 px-3 text-sm font-medium text-secondary/80 hover:text-secondary 
                    border border-secondary/20 hover:border-secondary/40 rounded-md transition-all duration-200
                    flex items-center justify-center"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Show Data
                </button>
                <button
                  onClick={clearStoredData}
                  type="button"
                  className="flex-1 py-2 px-3 text-sm font-medium text-red-400 hover:text-red-300 
                    border border-red-400/20 hover:border-red-400/40 rounded-md transition-all duration-200
                    flex items-center justify-center"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear Data
                </button>
              </div>

              {/* Attendance History */}
              {showHistory && hasStoredCredentials && (
                <div className="mt-4 border border-secondary/20 rounded-lg overflow-hidden">
                  <div className="p-3 bg-secondary/5 border-b border-secondary/10">
                    <h3 className="text-sm font-semibold text-secondary flex items-center">
                      <Clock className="w-4 h-4 mr-2" />
                      Last 7 Days
                    </h3>
                  </div>
                  {historyLoading ? (
                    <div className="p-4 text-center text-sm text-secondary/60">
                      Loading...
                    </div>
                  ) : attendanceHistory.length === 0 ? (
                    <div className="p-4 text-center text-sm text-secondary/60">
                      No attendance records found
                    </div>
                  ) : (
                    <div className="divide-y divide-secondary/10 max-h-[250px] overflow-y-auto">
                      {attendanceHistory.map((record, idx) => (
                        <div
                          key={record.id || idx}
                          className="flex items-center justify-between px-4 py-3 text-sm"
                        >
                          <span className="text-secondary/80 font-medium min-w-[90px]">
                            {formatDate(record.date)}
                          </span>
                          <div className="flex gap-4 text-xs">
                            <span className="text-green-500">
                              <span className="text-secondary/50 mr-1">
                                In:
                              </span>
                              {formatTime(record.check_in_time)}
                            </span>
                            <span className="text-orange-500">
                              <span className="text-secondary/50 mr-1">
                                Out:
                              </span>
                              {formatTime(record.check_out_time)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Data Display Modal */}
      {showDataModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Stored Credentials
              </h3>
              <button
                onClick={() => setShowDataModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadedCredentials ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    QuickChex Email
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={loadedCredentials.quickchexEmail}
                      readOnly
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                        bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    />
                    <button
                      onClick={() =>
                        copyToClipboard(loadedCredentials.quickchexEmail)
                      }
                      className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    QuickChex Password
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={loadedCredentials.quickchexPassword}
                      readOnly
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                        bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    />
                    <button
                      onClick={() => setShowPassword(!showPassword)}
                      className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() =>
                        copyToClipboard(loadedCredentials.quickchexPassword)
                      }
                      className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Google App Password
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={loadedCredentials.googlePassword}
                      readOnly
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                        bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    />
                    <button
                      onClick={() => setShowPassword(!showPassword)}
                      className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() =>
                        copyToClipboard(loadedCredentials.googlePassword)
                      }
                      className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  No stored credentials found
                </p>
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowDataModal(false)}
                className="flex-1 py-2 px-4 text-sm font-medium text-gray-700 dark:text-gray-300 
                  border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700
                  transition-colors duration-200"
              >
                Close
              </button>
              {loadedCredentials && (
                <button
                  onClick={clearStoredData}
                  className="flex-1 py-2 px-4 text-sm font-medium text-red-600 dark:text-red-400 
                    border border-red-300 dark:border-red-600 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20
                    transition-colors duration-200"
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
