import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "../db/pool.js";

const PgSession = connectPgSimple(session);

export const sessionMiddleware = session({
  store: new PgSession({
    pool,
    tableName: "session",
    createTableIfMissing: false, // schema.sql already created it
  }),
  secret: process.env.SESSION_SECRET!,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true, // per D-02
    sameSite: "strict", // per D-02
    secure: false, // local/internal network, no HTTPS required
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
});
