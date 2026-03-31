import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { sessionMiddleware } from "./middleware/session.js";
import { requireAuth, requirePermission } from "./middleware/rbac.js";
import { authRouter } from "./routes/auth.js";
import { helicoptersRouter } from "./routes/helicopters.js";
import { PermissionLevel } from "shared/permissions";

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

// Phase 2+ endpoints will be mounted here
app.use(
  "/api/admin",
  requireAuth,
  requirePermission("administracja", PermissionLevel.READ)
);

// Admin CRUD routers (Phase 2)
app.use("/api/admin/helicopters", helicoptersRouter);
app.use(
  "/api/operations",
  requireAuth,
  requirePermission("planowanie_operacji", PermissionLevel.READ)
);
app.use(
  "/api/flight-orders",
  requireAuth,
  requirePermission("zlecenia_na_lot", PermissionLevel.READ)
);

app.listen(PORT, () => {
  console.log(`AERO server running on port ${PORT}`);
});

export default app;
