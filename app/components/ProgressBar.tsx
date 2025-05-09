'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import type { StatusMessage as StatusMessageType } from '../types';

// Helper function to shift a hex color
const shiftColor = (hex: string, amount: number): string => {
  // Remove the '#' if present
  hex = hex.replace('#', '');
  
  // Parse the hex values
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  // Lighten each component
  const newR = Math.min(255, r + amount);
  const newG = Math.min(255, g + amount);
  const newB = Math.min(255, b + amount);
  
  // Convert back to hex
  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
};

interface ProgressBarProps {
  statusMessages: StatusMessageType[];
}

export function ProgressBar({ statusMessages }: ProgressBarProps) {
  const [progress, setProgress] = useState(0);
  const [color, setColor] = useState('#f87171'); // Red
  const [isComplete, setIsComplete] = useState(false);
  const [latestMessage, setLatestMessage] = useState<string | null>(null);
  const [latestStatus, setLatestStatus] = useState<string | null>(null);

  useEffect(() => {
    if (statusMessages.length === 0) {
      setProgress(0);
      setColor('#f87171'); // Reset to red
      setIsComplete(false);
      setLatestMessage(null);
      setLatestStatus(null);
      return;
    }

    const latest = statusMessages[statusMessages.length - 1];
    
    // Extract message text
    const messageText = latest.message || 
      (latest.status === 'cookies_update' ? 'Cookies updated successfully' : 'Processing...');
    
    setLatestMessage(messageText);
    setLatestStatus(latest.status);

    // Calculate a basic progress percentage based on message count and status
    const baseProgress = Math.min(Math.max((statusMessages.length / 8) * 100, 10), 95);
    
    // Adjust based on status
    let adjustedProgress = baseProgress;
    let newColor = '#f87171'; // Default red
    let completed = false;

    switch (latest.status) {
      case 'step_error':
        newColor = '#f87171'; // Red
        break;
      case 'app_error':
        newColor = '#ef4444'; // Darker red
        adjustedProgress = 100; // Complete the bar but in red
        completed = true;
        break;
      case 'step_success':
        newColor = '#fbbf24'; // Amber/yellow
        adjustedProgress = baseProgress + 5;
        break;
      case 'info':
        newColor = '#60a5fa'; // Blue
        break;
      case 'app_success':
        newColor = '#4ade80'; // Light green
        adjustedProgress = 95; // Almost complete
        break;
      case 'cookies_update':
        newColor = '#22c55e'; // Green
        adjustedProgress = 100; // Complete
        completed = true;
        break;
      default:
        newColor = '#f87171'; // Default red
    }

    setProgress(adjustedProgress);
    setColor(newColor);
    setIsComplete(completed);
  }, [statusMessages]);

  return (
    <div className="w-full">
      <div className="mb-4 flex justify-between items-center">
        <div className="flex items-center">
          {latestStatus === 'app_error' && (
            <div className="bg-red-100 p-1 rounded-full mr-2">
              <XCircle className="w-5 h-5 text-red-500" />
            </div>
          )}
          {latestStatus === 'cookies_update' && (
            <div className="bg-green-100 p-1 rounded-full mr-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            </div>
          )}
          {latestStatus === 'app_success' && (
            <div className="bg-green-100 p-1 rounded-full mr-2"> 
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            </div>
          )}
          {!isComplete && !['app_error', 'cookies_update', 'app_success'].includes(latestStatus as string) && (
            <div className="bg-blue-100 p-1 rounded-full mr-2">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            </div>
          )}
          <span className="text-sm font-medium text-secondary">
            {latestMessage || 'Starting process...'}
          </span>
        </div>
        <span className="text-xs font-semibold text-secondary/60 bg-secondary/5 px-2 py-1 rounded-md">
          {isComplete ? '100%' : `${Math.round(progress)}%`}
        </span>
      </div>
      
      <div className="h-4 w-full bg-gray-200 rounded-full overflow-hidden shadow-inner">
        <motion.div 
          className={`h-full rounded-full relative ${!isComplete ? 'animate-progress-pulse' : ''}`}
          style={{ 
            background: isComplete 
              ? `linear-gradient(to right, ${color}, ${color})` 
              : `linear-gradient(to right, ${color}, ${shiftColor(color, 20)})`,
            width: `${progress}%`,
          }}
          initial={{ width: 0 }}
          animate={{ 
            width: `${progress}%`
          }}
          transition={{ 
            duration: 0.5,
            ease: "easeInOut"
          }}
        >
          {/* Shimmer effect */}
          {!isComplete && (
            <div className="absolute inset-0 overflow-hidden">
              <div 
                className="h-full w-20 bg-white/20 absolute -skew-x-12 -translate-x-full"
                style={{
                  animation: "shimmer 2s infinite",
                }}
              />
            </div>
          )}
        </motion.div>
      </div>

      {/* Add shimmer keyframes via style tag */}
      <style jsx>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%) skewX(-12deg);
          }
          100% {
            transform: translateX(200%) skewX(-12deg);
          }
        }
      `}</style>

      {/* Message history in minimal format */}
      <div className="mt-4 max-h-[150px] overflow-y-auto scrollbar-thin py-1 px-1">
        {statusMessages.map((msg, index) => {
          const isLatest = index === statusMessages.length - 1;
          const message = msg.message || (msg.status === 'cookies_update' ? 'Cookies updated.' : 'Status event.');
          
          // Determine dot color based on status
          let dotColor = 'bg-gray-400';
          if (msg.status === 'app_error' || msg.status === 'step_error') dotColor = 'bg-red-500';
          if (msg.status === 'app_success' || msg.status === 'step_success') dotColor = 'bg-green-500';
          if (msg.status === 'cookies_update') dotColor = 'bg-green-600';
          if (msg.status === 'info') dotColor = 'bg-blue-500';

          return (
            <div 
              key={`${msg.status}-${index}-${message}`}
              className={`flex items-center mb-2 text-xs ${isLatest ? 'opacity-100' : 'opacity-60'}`}
            >
              <span className={`${dotColor} w-2 h-2 rounded-full mr-2`}></span>
              <span className="text-secondary whitespace-normal">{message}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
} 