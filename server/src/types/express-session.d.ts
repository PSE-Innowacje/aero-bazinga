import { UserRole } from "shared/roles";

declare module "express-session" {
  interface SessionData {
    userId: number;
    email: string;
    role: UserRole;
    firstName: string;
    lastName: string;
    crewMemberId: number | null;
  }
}
