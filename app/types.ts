export type Credentials = {
  quickchexEmail: string;
  quickchexPassword: string;
  googlePassword: string;
  _quikchex_app_session?: string;
  remember_user_token?: string;
};

export type StatusMessage =
  | { status: 'info' | 'step_success' | 'step_error' | 'app_success' | 'app_error'; message: string; cookies?: never; }
  | { status: 'cookies_update'; message?: string; cookies: { _quikchex_app_session: string; remember_user_token: string; }; };

export interface AttendanceResult {
  success: boolean;
  message: string;
} 