'use client';

import { Mail, Lock, Key, HelpCircle, Check, XCircle, AlertTriangle, Eye, Trash2, Copy, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { StatusMessage } from './components/StatusMessage';
import { ProgressBar } from './components/ProgressBar';
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
  
  const [showDataModal, setShowDataModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const displayToast = (message: string, type: 'success' | 'error') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 3000);
  };

  const showStoredData = () => {
    setShowDataModal(true);
  };

  const clearStoredData = () => {
    localStorage.removeItem('quickchex_credentials');
    setHasStoredCredentials(false);
    setLoadedCredentials(null);
    formRef.current?.reset();
    setShowDataModal(false);
    displayToast('Stored data cleared successfully!', 'success');
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      displayToast('Copied to clipboard!', 'success');
    } catch (err) {
      displayToast('Failed to copy to clipboard', 'error');
    }
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

  const loginFailureKeywords = [
    "Failed to obtain initial QuikChex session cookie",
    "Login failed. Check credentials",
    "failed to extract necessary token"
  ];

  const handleCredentialsError = (message: string, shouldClearCredentials = false) => {
    if (shouldClearCredentials) {
      localStorage.removeItem('quickchex_credentials');
      setHasStoredCredentials(false);
      setLoadedCredentials(null);
      formRef.current?.reset(); // Reset form only if we are clearing credentials and showing it
    }
    setIsProcessing(false); 
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

      const paramsData: Record<string, string> = {
        user_email: finalCredentials.quickchexEmail,
        quickchex_pass: finalCredentials.quickchexPassword,
        gmail_app_password: finalCredentials.googlePassword,
      };

      if (finalCredentials._quikchex_app_session) {
        paramsData._quikchex_app_session = finalCredentials._quikchex_app_session;
      }
      if (finalCredentials.remember_user_token) {
        paramsData.remember_user_token = finalCredentials.remember_user_token;
      }
      
      const params = new URLSearchParams(paramsData);
      const eventSourceUrl = `/api/mark-attendance?${params.toString()}`;

      eventSourceRef.current = new EventSource(eventSourceUrl);

      eventSourceRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as StatusMessageType;
          setStatusMessages((prev) => [...prev, data]);

          if (data.status === 'app_error') { 
            eventSourceRef.current?.close();
            const isLoginFailure = loginFailureKeywords.some(keyword => data.message.includes(keyword));
            handleCredentialsError(data.message || 'An critical error occurred.', isLoginFailure);
          } else if (data.status === 'cookies_update' && data.cookies) {
            eventSourceRef.current?.close();
            const { _quikchex_app_session, remember_user_token } = data.cookies;
            const updatedCredentials = {
              ...finalCredentials,
              _quikchex_app_session,
              remember_user_token,
            };
            localStorage.setItem('quickchex_credentials', JSON.stringify(updatedCredentials));
            setLoadedCredentials(updatedCredentials);
            setHasStoredCredentials(true);
            setIsProcessing(false);
            displayToast('Attendance marked successfully!', 'success');
          } else if (data.status === 'app_success') {
            // Do not close the eventSourceRef here, to allow cookies_update to arrive.
            setIsProcessing(false);
            // Store the credentials that led to this success.
            // If cookies_update follows, it will overwrite localStorage with newer cookie data.
            localStorage.setItem('quickchex_credentials', JSON.stringify(finalCredentials));
            setHasStoredCredentials(true);
            setLoadedCredentials(finalCredentials);
            displayToast(data.message || 'Attendance marked successfully!', 'success');
            // If the stream closes naturally after this without a cookies_update, 
            // then these were the correct final credentials for this successful operation.
          }
        } catch (error: any) {
          console.error('Error parsing SSE message:', error, "Raw data:", event.data);
          const errorMessage = `Error processing server message: ${event.data || 'Malformed data received.'}`;
          setStatusMessages((prev) => [...prev, { status: 'app_error', message: errorMessage}]);
          eventSourceRef.current?.close();
          // Do NOT clear credentials for a parsing error, but do stop processing and show toast.
          setIsProcessing(false);
          displayToast(errorMessage, 'error');
        }
      };

      eventSourceRef.current.onerror = (err: Event) => { // Typed err as Event
        console.error('SSE Error with /api/mark-attendance:', err);
        eventSourceRef.current?.close();
        const errMsg = 'Connection to server streaming service lost. Please try again.';
        setStatusMessages((prev) => [...prev, { status: 'app_error', message: errMsg }]);
        // Do NOT clear credentials for a connection error, but do stop processing and show toast.
        setIsProcessing(false);
        displayToast(errMsg, 'error');
      };
    } catch (error: any) { 
      console.error('Form submission error (client-side): ', error);
      const errMsg = 'Failed to initiate attendance marking. Please check your network and try again.';
      setStatusMessages([{ status: 'app_error', message: errMsg }]);
      // Do NOT clear credentials for an initial connection error, but do stop processing and show toast.
      setIsProcessing(false);
      displayToast(errMsg, 'error');
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
            <div className="py-6 px-2">
              <ProgressBar statusMessages={statusMessages} />
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

              {/* LocalStorage Management Buttons */}
              <div className="flex gap-2 mt-4">
                <button
                  onClick={showStoredData}
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
                      onClick={() => copyToClipboard(loadedCredentials.quickchexEmail)}
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
                      onClick={() => copyToClipboard(loadedCredentials.quickchexPassword)}
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
                      onClick={() => copyToClipboard(loadedCredentials.googlePassword)}
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
                <p className="text-gray-500 dark:text-gray-400">No stored credentials found</p>
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