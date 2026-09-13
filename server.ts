import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

import type { VercelRequest, VercelResponse } from "@vercel/node";
import healthHandler from "./api/health";
import chatHandler from "./api/chat";
import adminHandler from "./api/admin";
import profileHandler from "./api/profile";
import postsHandler from "./api/posts";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "15mb" }));

// Helper to adapt Express request/response to Vercel serverless function handler
function adapt(handler: (req: VercelRequest, res: VercelResponse) => any) {
  return async (req: express.Request, res: express.Response) => {
    try {
      // Merge URL route params into query for complete Vercel query parameter parity
      if (req.params) {
        req.query = { ...req.query, ...req.params };
      }
      await handler(
        req as unknown as VercelRequest,
        res as unknown as VercelResponse
      );
    } catch (err: any) {
      console.error("API handler unhandled error:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: err?.message || "Internal server error" });
      }
    }
  };
}

// ==============================================================================
// VERCEL API FUNCTIONS MOUNTED TO DEV / CONTAINER SERVER
// ==============================================================================
app.all("/api/health", adapt(healthHandler));
app.all("/api/chat", adapt(chatHandler));
app.all("/api/chat/*", adapt(chatHandler));
app.all("/api/admin", adapt(adminHandler));
app.all("/api/admin/*", adapt(adminHandler));
app.all("/api/profile", adapt(profileHandler));
app.all("/api/profile/*", adapt(profileHandler));
app.all("/api/posts", adapt(postsHandler));
app.all("/api/posts/*", adapt(postsHandler));

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
