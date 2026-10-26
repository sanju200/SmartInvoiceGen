import "dotenv/config";
import express from "express";
import type { ErrorRequestHandler } from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import { prisma } from "./db";
import {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject
} from "./routes/projects";
import {
  handleSignup,
  handleLogin,
  handleLogout,
  handleMe,
  handleUpdatePassword,
  handleUpdateProfile,
  handleFindUserByEmail
} from "./routes/auth";
import invitationsRoutes from "./routes/invitations";
import { authenticateToken } from "./auth";
import employeeRoutes from "./routes/employees";
import currencyAccountRoutes from "./routes/currencyAccounts";
import {
  getCompany,
  upsertCompany,
  deleteCompany
} from "./routes/company";

export function createServer() {
  const app = express();

  // Safe startup diagnostics (no secrets)
  try {
    const dbUrl = process.env.DATABASE_URL;
    if (dbUrl) {
      const parsed = new URL(dbUrl);
      // eslint-disable-next-line no-console
      console.log(
        `[Startup] DB host=${parsed.hostname} db=${parsed.pathname.replace(/^\//, '')} env=${process.env.NODE_ENV}`
      );
    } else {
      // eslint-disable-next-line no-console
      console.warn('[Startup] DATABASE_URL not set');
    }
    // Debug logging for JWT secret
    // eslint-disable-next-line no-console
    console.log(`[Startup] JWT secret set=${Boolean(process.env.JWT_SECRET)}`);
    // eslint-disable-next-line no-console
    console.log(`[Startup] NODE_ENV=${process.env.NODE_ENV}`);
    // eslint-disable-next-line no-console
    console.log(`[Startup] Current directory: ${process.cwd()}`);
    // eslint-disable-next-line no-console
    console.log(`[Startup] Environment keys: ${Object.keys(process.env).filter(k => k.includes('JWT') || k.includes('NODE_ENV')).join(', ')}`);
  } catch {
    // ignore parse errors
  }

  // CORS configuration - Allow all origins for simplicity
  const corsOptions = {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow all origins
      callback(null, true);
    },
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    exposedHeaders: ['Authorization']
  };

  // Middleware
  app.use(cors(corsOptions));

  // Handle preflight requests
  app.options('*', cors(corsOptions));
  // Increase body size limits to allow large base64 images (sign/stamp)
  // Configure via BODY_SIZE_LIMIT env var, e.g., '10mb', '20mb'
  const bodyLimit = process.env.BODY_SIZE_LIMIT ?? "50mb";
  app.use(express.json({ limit: bodyLimit }));
  app.use(express.urlencoded({ extended: true, limit: bodyLimit }));

  // Body parser error handling (413, malformed JSON) -> consistent JSON error responses
  const bodyParserErrorHandler: ErrorRequestHandler = (err, _req, res, next) => {
    if (!err) return next();
    // Payload too large
    if (
      (err as { type?: string } | undefined)?.type === 'entity.too.large' ||
      (err as { status?: number } | undefined)?.status === 413
    ) {
      return res.status(413).json({ error: 'Payload too large. Please reduce image sizes and try again.' });
    }
    // Malformed JSON
    if (err instanceof SyntaxError) {
      return res.status(400).json({ error: 'Invalid JSON payload' });
    }
    const status = (err as { status?: number } | undefined)?.status ?? 500;
    const message = (err as { message?: string } | undefined)?.message ?? 'Server error';
    return res.status(status).json({ error: message });
  };
  app.use(bodyParserErrorHandler);

  // Public routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  // API root for quick diagnostics
  app.get("/api", (_req, res) => {
    res.json({
      message: "SmartInvoGen API",
      endpoints: [
        "GET /api/ping",
        "GET /api/demo",
        "POST /api/auth/login",
        "GET /api/auth/me"
      ]
    });
  });

  app.get("/api/demo", handleDemo);

  // Health endpoint: verifies DB connectivity and env flags (safe, no secrets)
  app.get("/api/healthz", async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      let dbInfo: { host?: string; database?: string } = {};
      try {
        if (process.env.DATABASE_URL) {
          const u = new URL(process.env.DATABASE_URL);
          dbInfo = { host: u.hostname, database: u.pathname.replace(/^\//, '') };
        }
      } catch (_err) { void 0; }
      res.json({
        status: "ok",
        db: "connected",
        jwtSecretSet: Boolean(process.env.JWT_SECRET),
        dbInfo,
      });
    } catch (e) {
      res.status(500).json({
        status: "error",
        db: "disconnected",
        error: e instanceof Error ? e.message : "Unknown error",
      });
    }
  });

  // Authentication routes
  app.post("/api/auth/signup", handleSignup);
  app.post("/api/auth/login", handleLogin);
  app.post("/api/auth/logout", handleLogout);
  // No refresh-token route in single-token strategy
  app.use("/api", invitationsRoutes);

  // Protected routes
  app.get("/api/auth/me", authenticateToken, handleMe);
  app.get("/api/auth/user-by-email", authenticateToken, handleFindUserByEmail);
  app.put("/api/auth/update-password", authenticateToken, handleUpdatePassword);
  app.put("/api/auth/update-profile", authenticateToken, handleUpdateProfile);

  // Projects API routes (protected)
  app.get("/api/projects", authenticateToken, getProjects);
  app.get("/api/projects/:id", authenticateToken, getProjectById);
  app.post("/api/projects", authenticateToken, createProject);
  app.put("/api/projects/:id", authenticateToken, updateProject);
  app.delete("/api/projects/:id", authenticateToken, deleteProject);

  // Employee API routes (protected)
  app.use("/api/employees", employeeRoutes);

  // Company API routes (protected)
  app.get("/api/company", authenticateToken, getCompany);
  app.post("/api/company", authenticateToken, upsertCompany);
  app.delete("/api/company", authenticateToken, deleteCompany);

  // Currency Accounts API routes (admin-only, protected)
  app.use("/api/currency-accounts", currencyAccountRoutes);

  // Fallback 404 for unmapped API routes (consistent JSON)
  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "API endpoint not found" });
  });

  return app;
}
