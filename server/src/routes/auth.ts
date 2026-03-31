import { Router, Request, Response } from "express";
import bcryptjs from "bcryptjs";
import { pool } from "../db/pool.js";
import { UserRole } from "shared/roles";
import type { SessionUser, LoginRequest } from "shared/types";

export const authRouter = Router();

// POST /api/auth/login — AUTH-01
authRouter.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body as LoginRequest;

  if (!email || !password) {
    return res.status(400).json({
      error: "bad_request",
      message: "Uzupełnij wszystkie wymagane pola.",
    });
  }

  try {
    const result = await pool.query(
      `SELECT id, first_name, last_name, email, password_hash, role, crew_member_id
       FROM users
       WHERE email = $1 AND is_active = true`,
      [email]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({
        error: "invalid_credentials",
        message: "Nieprawidłowy email lub hasło. Spróbuj ponownie.",
      });
    }

    const user = result.rows[0];
    const passwordMatch = await bcryptjs.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({
        error: "invalid_credentials",
        message: "Nieprawidłowy email lub hasło. Spróbuj ponownie.",
      });
    }

    // Store session per D-03 / AUTH-04
    req.session.userId = user.id;
    req.session.email = user.email;
    req.session.role = user.role as UserRole;
    req.session.firstName = user.first_name;
    req.session.lastName = user.last_name;
    req.session.crewMemberId = user.crew_member_id ?? null;

    const sessionUser: SessionUser = {
      userId: user.id,
      email: user.email,
      role: user.role as UserRole,
      firstName: user.first_name,
      lastName: user.last_name,
      crewMemberId: user.crew_member_id ?? null,
    };

    return res.status(200).json({ user: sessionUser });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      error: "server_error",
      message: "Błąd serwera. Skontaktuj się z administratorem.",
    });
  }
});

// GET /api/auth/me — AUTH-02
authRouter.get("/me", (req: Request, res: Response) => {
  if (!req.session.userId) {
    return res
      .status(401)
      .json({ error: "unauthorized", message: "Sesja wygasła" });
  }

  const sessionUser: SessionUser = {
    userId: req.session.userId,
    email: req.session.email!,
    role: req.session.role as UserRole,
    firstName: req.session.firstName!,
    lastName: req.session.lastName!,
    crewMemberId: req.session.crewMemberId ?? null,
  };

  return res.status(200).json({ user: sessionUser });
});

// POST /api/auth/logout
authRouter.post("/logout", (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Logout error:", err);
      return res.status(500).json({
        error: "server_error",
        message: "Błąd serwera. Skontaktuj się z administratorem.",
      });
    }
    res.clearCookie("connect.sid");
    return res.status(200).json({ message: "Wylogowano" });
  });
});
