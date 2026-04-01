import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { sessionMiddleware } from "./middleware/session.js";
import { requireAuth, requirePermission } from "./middleware/rbac.js";
import { authRouter } from "./routes/auth.js";
import { helicoptersRouter } from "./routes/helicopters.js";
import { crewRouter } from "./routes/crew.js";
import { airfieldsRouter } from "./routes/airfields.js";
import { usersRouter } from "./routes/users.js";
import { operationsRouter } from "./routes/operations.js";
import { flightOrdersRouter } from "./routes/flight-orders.js";
import { PermissionLevel } from "shared/permissions";
import { loadPermissions } from "./db/permissions-cache.js";
import { permissionsRouter } from "./routes/permissions.js";
import { dashboardRouter } from "./routes/dashboard.js";

// Startup validation for required env vars
const REQUIRED_ENV = ["DATABASE_URL", "SESSION_SECRET"];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`FATAL: Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());

// Session middleware — must come before routes
app.use(sessionMiddleware);

// Auth routes (public)
app.use("/api/auth", authRouter);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Dashboard API (auth required, no section permission)
app.use("/api/dashboard", requireAuth, dashboardRouter);

// Admin section — auth + administracja READ required for all sub-routes
const adminRouter = express.Router();
adminRouter.use(requireAuth, requirePermission("administracja", PermissionLevel.READ));
adminRouter.use("/helicopters", helicoptersRouter);
adminRouter.use("/crew", crewRouter);
adminRouter.use("/airfields", airfieldsRouter);
adminRouter.use("/users", usersRouter);
adminRouter.use("/permissions", permissionsRouter);
app.use("/api/admin", adminRouter);

// Operations section — auth + planowanie_operacji READ required
const opsRouter = express.Router();
opsRouter.use(requireAuth, requirePermission("planowanie_operacji", PermissionLevel.READ));
opsRouter.use("/", operationsRouter);
app.use("/api/operations", opsRouter);

// Flight orders section — auth + zlecenia_na_lot READ required
const foRouter = express.Router();
foRouter.use(requireAuth, requirePermission("zlecenia_na_lot", PermissionLevel.READ));
foRouter.use("/", flightOrdersRouter);
app.use("/api/flight-orders", foRouter);

// Load dynamic permissions from DB, then start server
loadPermissions()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`AERO server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to load permissions:", err);
    // Start anyway with static fallback
    app.listen(PORT, () => {
      console.log(`AERO server running on port ${PORT} (static permissions fallback)`);
    });
  });

export default app;
