'use client';

import { Mail, Lock, Key, HelpCircle, Check, XCircle, AlertTriangle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { StatusMessage } from './components/StatusMessage';
import type { Credentials, StatusMessage as StatusMessageType } from './types';

export default function Home() {
  const formRef = useRef<HTMLFormElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessages, setStatusMessages] = useState<StatusMessageType[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const [hasStoredCredentials, setHasStoredCredentials] = useState(false);
  const [loadedCredentials, setLoadedCredentials] = useState<Credentials | null>(null);

  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  const displayToast = (message: string, type: 'success' | 'error') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 3000);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [statusMessages]);

  useEffect(() => {
    const savedCredentialsStr = localStorage.getItem('quickchex_credentials');
    if (savedCredentialsStr) {
      try {
        const savedCredentials = JSON.parse(savedCredentialsStr) as Credentials;
        if (savedCredentials.quickchexEmail && savedCredentials.quickchexPassword && savedCredentials.googlePassword) {
          setLoadedCredentials(savedCredentials);
          setHasStoredCredentials(true);
        } else {
          localStorage.removeItem('quickchex_credentials');
          setHasStoredCredentials(false);
          setLoadedCredentials(null);
        }
      } catch (err: any) {
        console.error('Error loading saved credentials:', err);
        localStorage.removeItem('quickchex_credentials');
        setHasStoredCredentials(false);
        setLoadedCredentials(null);
      }
    }
  }, []);

  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const handleCredentialsError = (message: string) => {
    localStorage.removeItem('quickchex_credentials');
    setHasStoredCredentials(false);
    setLoadedCredentials(null);
    setIsProcessing(false);
    formRef.current?.reset();
    displayToast(message, 'error');
  };

  const handleClick = async () => {
    let credentialsToUse: Credentials | null = null;

    if (hasStoredCredentials && loadedCredentials) {
      credentialsToUse = loadedCredentials;
    } else if (formRef.current) {
      const formData = new FormData(formRef.current);
      const email = formData.get('email') as string;
      const password = formData.get('password') as string;
      const gmail_password = formData.get('gmail_password') as string;

      if (!email || !password || !gmail_password) {
        const validationMsg = { status: 'info' as const, message: 'Please fill in all credential fields.' };
        setStatusMessages([validationMsg]);
        displayToast(validationMsg.message, 'error');
        return;
      }
      credentialsToUse = {
        quickchexEmail: email,
        quickchexPassword: password,
        googlePassword: gmail_password,
      };
    }

    if (!credentialsToUse) {
      displayToast('Could not retrieve credentials.', 'error');
      return;
    }
    
    const finalCredentials = { ...credentialsToUse };

    try {
      setIsProcessing(true);
      setStatusMessages([]);

      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const params = new URLSearchParams({
        user_email: finalCredentials.quickchexEmail,
        quickchex_pass: finalCredentials.quickchexPassword,
        gmail_app_password: finalCredentials.googlePassword,
      });
      
      const eventSourceUrl = `/api/mark-attendance?${params.toString()}`;

      eventSourceRef.current = new EventSource(eventSourceUrl);

      eventSourceRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as StatusMessageType;
          setStatusMessages((prev) => [...prev, data]);

          if (data.status === 'app_error') {
            eventSourceRef.current?.close();
            handleCredentialsError(data.message || 'An error occurred during processing.');
          } else if (data.status === 'app_success') {
            eventSourceRef.current?.close();
            setIsProcessing(false);
            localStorage.setItem('quickchex_credentials', JSON.stringify(finalCredentials));
            setHasStoredCredentials(true);
            setLoadedCredentials(finalCredentials);
            displayToast('Attendance marked successfully!', 'success');
          }
        } catch (error) {
          console.error('Error parsing SSE message:', error, "Raw data:", event.data);
          const errorMessage = `Error processing message: ${event.data || 'Malformed data received.'}`;
          setStatusMessages((prev) => [...prev, { status: 'app_error', message: errorMessage}]);
          eventSourceRef.current?.close();
          handleCredentialsError(errorMessage);
        }
      };

      eventSourceRef.current.onerror = (err) => {
        console.error('SSE Error with /api/mark-attendance:', err);
        eventSourceRef.current?.close();
        const errMsg = 'Connection to server streaming service lost. Please try again.';
        setStatusMessages((prev) => [...prev, { status: 'app_error', message: errMsg }]);
        handleCredentialsError(errMsg);
      };
    } catch (error: any) {
      console.error('Form submission error (client-side): ', error);
      const errMsg = 'Failed to initiate attendance marking. Please try again later.';
      setStatusMessages([{ status: 'app_error', message: errMsg }]);
      handleCredentialsError(errMsg);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      {showToast && (
        <div className={`fixed top-5 right-5 p-4 rounded-md shadow-lg text-white animate-fade-in-down z-50 ${toastType === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
          <div className="flex items-center">
            {toastType === 'success' ? <Check size={20} className="mr-2"/> : <XCircle size={20} className="mr-2"/>}
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
            <p className="text-secondary/80 mt-1 text-sm">Attendance Automation</p>
          </div>

          {isProcessing ? (
            <div className="space-y-3 max-h-[300px] overflow-y-auto scrollbar-thin py-1 px-1">
              {statusMessages.map((msg, index) => {
                const isLatest = index === statusMessages.length - 1;
                return (
                  <div
                    key={`${msg.message}-${index}`}
                    className={`transition-all duration-500 ease-in-out ${!isLatest ? 'opacity-50 blur-xs filter saturate-50' : 'opacity-100'}`}
                  >
                    <StatusMessage status={msg.status} message={msg.message} />
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          ) : (
            <>
              {!hasStoredCredentials && (
                <form ref={formRef} className="space-y-4" onSubmit={(e) => e.preventDefault()}>
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
                        defaultValue={loadedCredentials?.quickchexEmail || ''}
                      />
                    </div>
                    <p className="text-xs text-secondary/70 ml-1">Enter your QuickChex account email</p>
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
                        defaultValue={loadedCredentials?.quickchexPassword || ''}
                      />
                    </div>
                    <p className="text-xs text-secondary/70 ml-1">Your QuickChex account password</p>
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
                        defaultValue={loadedCredentials?.googlePassword || ''}
                      />
                    </div>
                    <div className="ml-1 flex items-center justify-between">
                       <span className="font-semibold text-amber-500 text-xs">Enter without spaces.</span>
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
              
              {statusMessages.length > 0 && !isProcessing && 
                (statusMessages[0].status === 'info' || statusMessages[0].status === 'app_error' || statusMessages[0].status === 'step_error') && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-md text-red-400 text-sm flex items-center">
                  <AlertTriangle size={18} className="mr-2 shrink-0"/> 
                  {statusMessages[0].message}
                </div>
              )}

              <button
                onClick={handleClick}
                type="button"
                className="btn-primary w-full py-3 px-4 mt-6 font-medium flex items-center justify-center
                  transition-all duration-300 hover:shadow-md active:scale-[0.98]"
              >
                <Check className="w-4 h-4 mr-2" />
                <span>Mark Attendance</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
} 