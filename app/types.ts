export interface Credentials {
  quickchexEmail: string;
  quickchexPassword: string;
  googlePassword: string;
}

export interface StatusMessage {
  status: 'processing' | 'step_success' | 'app_success' | 'step_error' | 'app_error' | 'info';
  message: string;
}

export interface AttendanceResult {
  success: boolean;
  message: string;
} 