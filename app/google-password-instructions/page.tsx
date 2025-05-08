'use client';

import { ChevronLeft, Key, Lock, Shield, UserCircle } from 'lucide-react';
import Link from 'next/link';

export default function GooglePasswordInstructionsPage() {
  const steps = [
    {
      icon: <UserCircle className="w-8 h-8 text-blue-500" />,
      title: "Access Your Google Account",
      description: "Navigate to myaccount.google.com in your web browser and sign in with the Google account you use for company emails.",
      link: "https://myaccount.google.com",
    },
    {
      icon: <Shield className="w-8 h-8 text-green-500" />,
      title: "Navigate to Security Settings",
      description: "Once logged in, find and click on the 'Security' tab, usually located in the left-hand sidebar.",
    },
    {
      icon: <Lock className="w-8 h-8 text-red-500" />,
      title: "Enable 2-Step Verification (if not already)",
      description: "Scroll down to the 'How you sign in to Google' section. If 2-Step Verification is off, you must enable it first. Click on '2-Step Verification' and follow the on-screen prompts.",
    },
    {
      icon: <Key className="w-8 h-8 text-yellow-500" />,
      title: "Generate an App Password",
      description: "After 2-Step Verification is active, go back to the 'Security' tab. Scroll to 'How you sign in to Google' and click on 'App passwords'. You might be asked to sign in again.",
    },
    {
      icon: <Key className="w-8 h-8 text-purple-500" />,
      title: "Create and Copy Your App Password",
      description: "Under 'App passwords', click on 'Select app' and choose 'Other (Custom name)'. Give it a recognizable name (e.g., \"QuickChex Attendance\"). Click 'Generate'. Google will display a 16-character app password. Copy this password immediately (it won't be shown again). This is the password you need for the attendance system.",
    },
    {
      icon: <Key className="w-8 h-8 text-indigo-500" />,
      title: "Important Note on Usage",
      description: "The generated 16-character app password might have spaces (e.g., xxxx xxxx xxxx xxxx). When entering this into the attendance system, make sure to type it WITHOUT any spaces.",
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white flex flex-col items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-2xl bg-slate-800/50 backdrop-blur-lg rounded-xl shadow-2xl p-6 md:p-10 animate-fade-in">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-primary tracking-tight mb-2">
            How to Get a Google App Password
          </h1>
          <p className="text-slate-300 text-sm md:text-base">
            Follow these steps to generate an App Password for use with third-party applications like ours.
          </p>
        </div>

        <div className="space-y-6">
          {steps.map((step, index) => (
            <div key={index} className="flex items-start space-x-4 p-4 bg-slate-700/30 rounded-lg hover:bg-slate-700/50 transition-all duration-200">
              <div className="flex-shrink-0 mt-1">
                {step.icon}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-100 mb-1">{index + 1}. {step.title}</h3>
                <p className="text-slate-300 text-sm leading-relaxed">{step.description}</p>
                {step.link && (
                  <a 
                    href={step.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-400 hover:text-blue-300 transition-colors mt-2 inline-block"
                  >
                    Go to {step.title.startsWith('Access') ? 'Google Account' : step.title} &rarr;
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link href="/" legacyBehavior>
            <a className="inline-flex items-center justify-center px-8 py-3 bg-primary hover:bg-primary/80 text-white font-semibold rounded-lg shadow-md transition-all duration-300 hover:shadow-lg active:scale-[0.98] group">
              <ChevronLeft size={20} className="mr-2 transition-transform group-hover:-translate-x-1" />
              Back to Login
            </a>
          </Link>
        </div>
      </div>
    </div>
  );
} 