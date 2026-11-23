import { api } from "@/lib/api";
import { User, UserRole } from "@/types";

export interface LoginPayload {
  email: string;
  password: string;
}

export interface StudentRegisterPayload {
  email: string;
  password: string;
  full_name: string;
  registration_number: string;
  phone_number?: string | null;
  department_id?: string | null;
}

export interface LecturerRegisterPayload {
  email: string;
  password: string;
  full_name: string;
  phone_number?: string | null;
  department_id?: string | null;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface AuthMessageResponse {
  success: boolean;
  message: string;
  token?: string | null;
}

export const authService = {
  async login(payload: LoginPayload): Promise<TokenResponse> {
    const response = await api.post<TokenResponse>("/auth/login", payload);
    return response.data;
  },

  async registerStudent(payload: StudentRegisterPayload): Promise<AuthMessageResponse> {
    const response = await api.post<AuthMessageResponse>("/auth/register/student", payload);
    return response.data;
  },

  async registerLecturer(payload: LecturerRegisterPayload): Promise<AuthMessageResponse> {
    const response = await api.post<AuthMessageResponse>("/auth/register/lecturer", payload);
    return response.data;
  },

  async verifyEmail(token: string): Promise<AuthMessageResponse> {
    const response = await api.post<AuthMessageResponse>("/auth/verify-email", { token });
    return response.data;
  },

  async resendVerification(email: string): Promise<AuthMessageResponse> {
    const response = await api.post<AuthMessageResponse>("/auth/resend-verification", { email });
    return response.data;
  },

  async forgotPassword(email: string): Promise<AuthMessageResponse> {
    const response = await api.post<AuthMessageResponse>("/auth/forgot-password", { email });
    return response.data;
  },

  async resetPassword(token: string, newPassword: string): Promise<AuthMessageResponse> {
    const response = await api.post<AuthMessageResponse>("/auth/reset-password", {
      token,
      new_password: newPassword,
    });
    return response.data;
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<AuthMessageResponse> {
    const response = await api.patch<AuthMessageResponse>("/auth/change-password", {
      current_password: currentPassword,
      new_password: newPassword,
    });
    return response.data;
  },

  async getCurrentUser(): Promise<User> {
    const response = await api.get<User>("/auth/me");
    return response.data;
  },

  async logout(): Promise<void> {
    const refreshToken = typeof window !== "undefined" ? localStorage.getItem("refresh_token") : null;
    if (refreshToken) {
      try {
        await api.post("/auth/logout", { refresh_token: refreshToken });
      } catch (err) {
        // Suppress logout error on server if token expired
      }
    }
    if (typeof window !== "undefined") {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("user");
    }
  },

  storeSession(data: TokenResponse) {
    if (typeof window !== "undefined") {
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("refresh_token", data.refresh_token);
      localStorage.setItem("user", JSON.stringify(data.user));
    }
  },

  getStoredUser(): User | null {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    try {
      return JSON.parse(raw) as User;
    } catch {
      return null;
    }
  },

  isAuthenticated(): boolean {
    if (typeof window === "undefined") return false;
    return !!localStorage.getItem("access_token");
  },
};
