import { UserRole } from "./roles";

export interface SessionUser {
  userId: number;
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  crewMemberId: number | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: SessionUser;
}

export interface ApiError {
  error: string;
  message: string;
}
