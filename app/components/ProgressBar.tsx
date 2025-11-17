"use client";

import { useMemo } from "react";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import type { StatusMessage as StatusMessageType } from "../types";

interface ProgressBarProps {
  statusMessages: StatusMessageType[];
}

export function ProgressBar({ statusMessages }: ProgressBarProps) {
  // Memoize progress calculation to avoid unnecessary recalculations
  const progressData = useMemo(() => {
    if (statusMessages.length === 0) {
      return {
        progress: 0,
        color: "#f87171",
        isComplete: false,
        latestMessage: null,
        latestStatus: null,
      };
    }

    const latest = statusMessages[statusMessages.length - 1];

    // Extract message text
    const messageText =
      latest.message ||
      (latest.status === "cookies_update"
        ? "Cookies updated successfully"
        : "Processing...");

    // Calculate a basic progress percentage based on message count and status
    const baseProgress = Math.min(
      Math.max((statusMessages.length / 8) * 100, 10),
      95
    );

    // Adjust based on status
    let adjustedProgress = baseProgress;
    let newColor = "#f87171"; // Default red
    let completed = false;

    switch (latest.status) {
      case "step_error":
        newColor = "#f87171"; // Red
        break;
      case "app_error":
        newColor = "#ef4444"; // Darker red
        adjustedProgress = 100; // Complete the bar but in red
        completed = true;
        break;
      case "step_success":
        newColor = "#fbbf24"; // Amber/yellow
        adjustedProgress = baseProgress + 5;
        break;
      case "info":
        newColor = "#60a5fa"; // Blue
        break;
      case "app_success":
        newColor = "#4ade80"; // Light green
        adjustedProgress = 95; // Almost complete
        break;
      case "cookies_update":
        newColor = "#22c55e"; // Green
        adjustedProgress = 100; // Complete
        completed = true;
        break;
      default:
        newColor = "#f87171"; // Default red
    }

    return {
      progress: adjustedProgress,
      color: newColor,
      isComplete: completed,
      latestMessage: messageText,
      latestStatus: latest.status,
    };
  }, [statusMessages]);

  const { progress, color, isComplete, latestMessage, latestStatus } =
    progressData;

  return (
    <div className="w-full">
      <div className="mb-4 flex justify-between items-center">
        <div className="flex items-center">
          {latestStatus === "app_error" && (
            <div className="bg-red-100 p-1 rounded-full mr-2">
              <XCircle className="w-5 h-5 text-red-500" />
            </div>
          )}
          {latestStatus === "cookies_update" && (
            <div className="bg-green-100 p-1 rounded-full mr-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            </div>
          )}
          {latestStatus === "app_success" && (
            <div className="bg-green-100 p-1 rounded-full mr-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            </div>
          )}
          {!isComplete &&
            latestStatus &&
            !["app_error", "cookies_update", "app_success"].includes(
              latestStatus
            ) && (
              <div className="bg-blue-100 p-1 rounded-full mr-2">
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
              </div>
            )}
          <span className="text-sm font-medium text-secondary">
            {latestMessage || "Starting process..."}
          </span>
        </div>
        <span className="text-xs font-semibold text-secondary/60 bg-secondary/5 px-2 py-1 rounded-md">
          {isComplete ? "100%" : `${Math.round(progress)}%`}
        </span>
      </div>

      <div className="h-4 w-full bg-gray-200 rounded-full overflow-hidden shadow-inner">
        <div
          className="h-full rounded-full transition-all duration-300 ease-out"
          style={{
            backgroundColor: color,
            width: `${progress}%`,
          }}
        />
      </div>

      {/* Message history in minimal format - limit rendering for performance */}
      {statusMessages.length > 0 && (
        <div className="mt-4 max-h-[150px] overflow-y-auto scrollbar-thin py-1 px-1">
          {statusMessages.slice(-10).map((msg, index) => {
            const actualIndex = statusMessages.length - 10 + index;
            const isLatest = actualIndex === statusMessages.length - 1;
            const message =
              msg.message ||
              (msg.status === "cookies_update"
                ? "Cookies updated."
                : "Status event.");

            // Determine dot color based on status
            let dotColor = "bg-gray-400";
            if (msg.status === "app_error" || msg.status === "step_error")
              dotColor = "bg-red-500";
            if (msg.status === "app_success" || msg.status === "step_success")
              dotColor = "bg-green-500";
            if (msg.status === "cookies_update") dotColor = "bg-green-600";
            if (msg.status === "info") dotColor = "bg-blue-500";

            return (
              <div
                key={`${msg.status}-${actualIndex}-${message.substring(0, 20)}`}
                className={`flex items-center mb-2 text-xs ${
                  isLatest ? "opacity-100" : "opacity-60"
                }`}
              >
                <span
                  className={`${dotColor} w-2 h-2 rounded-full mr-2 flex-shrink-0`}
                ></span>
                <span className="text-secondary whitespace-normal break-words">
                  {message}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
