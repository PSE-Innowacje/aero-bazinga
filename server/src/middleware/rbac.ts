import { Request, Response, NextFunction } from "express";
import { PermissionLevel } from "shared/permissions";
import type { MenuSection } from "shared/permissions";
import { UserRole } from "shared/roles";
import { getPermissionLevel } from "../db/permissions-cache.js";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res
      .status(401)
      .json({ error: "unauthorized", message: "Wymagane zalogowanie" });
  }
  next();
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.session.userId) {
      return res
        .status(401)
        .json({ error: "unauthorized", message: "Wymagane zalogowanie" });
    }
    if (!roles.includes(req.session.role as UserRole)) {
      return res
        .status(403)
        .json({ error: "forbidden", message: "Brak uprawnień" });
    }
    next();
  };
}

// Permission level hierarchy: NONE < READ < EDIT_VIEW < CRUD
const LEVEL_RANK: Record<PermissionLevel, number> = {
  [PermissionLevel.NONE]: 0,
  [PermissionLevel.READ]: 1,
  [PermissionLevel.EDIT_VIEW]: 2,
  [PermissionLevel.CRUD]: 3,
};

export function requirePermission(section: MenuSection, minLevel: PermissionLevel) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.session.userId) {
      return res
        .status(401)
        .json({ error: "unauthorized", message: "Wymagane zalogowanie" });
    }
    const role = req.session.role as string;
    const level = getPermissionLevel(role, section);
    const userRank = LEVEL_RANK[level] ?? 0;
    const requiredRank = LEVEL_RANK[minLevel] ?? 0;

    if (userRank < requiredRank) {
      return res.status(403).json({
        error: "forbidden",
        message: "Brak uprawnień",
      });
    }
    next();
  };
}
