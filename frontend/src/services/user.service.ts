import { api } from "@/lib/api";
import { Department, User } from "@/types";

export interface UserUpdatePayload {
  full_name?: string;
  phone_number?: string | null;
  department_id?: string | null;
}

export const userService = {
  async getProfile(): Promise<User> {
    const res = await api.get<User>("/auth/me");
    return res.data;
  },

  async updateProfile(payload: UserUpdatePayload): Promise<User> {
    const res = await api.patch<User>("/users/me", payload);
    return res.data;
  },

  async getDepartments(): Promise<Department[]> {
    const res = await api.get<Department[]>("/users/departments");
    return res.data;
  },
};
