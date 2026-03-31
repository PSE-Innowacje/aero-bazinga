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

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());

// Session middleware — must come before routes
app.use(sessionMiddleware);

// Auth routes
app.use("/api/auth", authRouter);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Dashboard API
app.use("/api/dashboard", dashboardRouter);

// Phase 2+ endpoints will be mounted here
app.use(
  "/api/admin",
  requireAuth,
  requirePermission("administracja", PermissionLevel.READ)
);

// Admin CRUD routers (Phase 2)
app.use("/api/admin/helicopters", helicoptersRouter);
app.use("/api/admin/crew", crewRouter);
app.use("/api/admin/airfields", airfieldsRouter);
app.use("/api/admin/users", usersRouter);
app.use("/api/admin/permissions", permissionsRouter);
app.use(
  "/api/operations",
  requireAuth,
  requirePermission("planowanie_operacji", PermissionLevel.READ)
);

// Operations router (Phase 3)
app.use("/api/operations", operationsRouter);
app.use(
  "/api/flight-orders",
  requireAuth,
  requirePermission("zlecenia_na_lot", PermissionLevel.READ)
);

// Flight orders router (Phase 4)
app.use("/api/flight-orders", flightOrdersRouter);

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
