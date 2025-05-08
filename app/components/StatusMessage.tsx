'use client';

import { CheckCircle2, XCircle, Loader2, AlertCircle } from 'lucide-react';
import type { StatusMessage as StatusMessageType } from '../types';

interface StatusMessageProps extends StatusMessageType {}

export function StatusMessage({ status, message }: StatusMessageProps) {
  // Define minimal, theme-appropriate styles
  let bgColor, iconBg, icon, textColor;

  switch (status) {
    case 'processing':
      bgColor = "bg-slate-100";
      iconBg = "bg-slate-300";
      icon = <Loader2 className="w-5 h-5 text-slate-600 animate-spin" />;
      textColor = "text-slate-700";
      break;
    case 'step_success':
    case 'app_success':
      bgColor = "bg-green-50";
      iconBg = "bg-green-200";
      icon = <CheckCircle2 className="w-5 h-5 text-green-600" />;
      textColor = "text-slate-700";
      break;
    case 'step_error':
    case 'app_error':
      bgColor = "bg-red-50";
      iconBg = "bg-red-200";
      icon = <XCircle className="w-5 h-5 text-red-600" />;
      textColor = "text-slate-700";
      break;
    case 'info':
      bgColor = "bg-blue-50";
      iconBg = "bg-blue-200";
      icon = <AlertCircle className="w-5 h-5 text-blue-600" />;
      textColor = "text-slate-700";
      break;
    default:
      bgColor = "bg-slate-100";
      iconBg = "bg-slate-300";
      icon = <AlertCircle className="w-5 h-5 text-slate-600" />;
      textColor = "text-slate-700";
      break;
  }

  return (
    <div className={`${bgColor} rounded-lg p-4 mb-2 transition-colors`}>
      <div className="flex items-center">
        <div className={`${iconBg} rounded-full p-1.5 mr-3 flex-shrink-0`}>
          {icon}
        </div>
        <p className={`${textColor} text-sm font-medium`}>{message}</p>
      </div>
    </div>
  );
} 