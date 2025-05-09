'use client';

import { CheckCircle2, XCircle, Loader2, AlertCircle, Info } from 'lucide-react';

// Redefined StatusMessageProps
export interface StatusMessageProps {
  status: 'processing' | 'step_success' | 'app_success' | 'step_error' | 'app_error' | 'info' | 'cookies_update';
  message: string;
}

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
    case 'info': // 'cookies_update' will share this style
    case 'cookies_update': 
      bgColor = "bg-blue-50";
      iconBg = "bg-blue-200";
      icon = <AlertCircle className="w-5 h-5 text-blue-600" />; // Using AlertCircle for both
      textColor = "text-slate-700";
      break;
    default:
      bgColor = "bg-slate-100";
      iconBg = "bg-slate-300";
      // Using AlertCircle for default as well, or keep specific default icon
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