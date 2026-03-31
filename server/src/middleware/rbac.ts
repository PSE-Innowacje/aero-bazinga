import { Request, Response, NextFunction } from "express";
import { PERMISSIONS, PermissionLevel, MenuSection } from "shared/permissions";
import { UserRole } from "shared/roles";

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

export function requirePermission(section: MenuSection, minLevel: PermissionLevel) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.session.userId) {
      return res
        .status(401)
        .json({ error: "unauthorized", message: "Wymagane zalogowanie" });
    }
    const role = req.session.role as UserRole;
    const level = PERMISSIONS[role]?.[section];
    if (!level || level === PermissionLevel.NONE) {
      return res
        .status(403)
        .json({ error: "forbidden", message: "Brak uprawnień do tej sekcji" });
    }
    if (minLevel === PermissionLevel.CRUD && level === PermissionLevel.READ) {
      return res.status(403).json({
        error: "forbidden",
        message: "Brak uprawnień do modyfikacji",
      });
    }
    if (minLevel === PermissionLevel.CRUD && level === PermissionLevel.EDIT_VIEW) {
      return res.status(403).json({
        error: "forbidden",
        message: "Brak uprawnień do tworzenia",
      });
    }
    next();
  };
}
