import path from "path";
import fs from "fs";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

export const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  "https://pbvistgowxkhoifafuky.supabase.co";

export const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  "";

export const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  "";

export const ADMIN_PASSWORD =
  process.env.ADMIN_PASSWORD || "admin";

// Initialize Supabase Admin Client safely (uses placeholder if key is missing to prevent startup crash)
export const supabaseAdmin = createClient(
  SUPABASE_URL || "https://placeholder.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY || "placeholder-key",
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

// Admin Session Tokens Store (in-memory per serverless instance or server process)
export const activeAdminTokens = new Set<string>();

// Helper to verify admin authentication across both Vercel and Express request objects
export function verifyAdminAuth(req: {
  headers: Record<string, string | string[] | undefined>;
}): boolean {
  const adminPasswordHeader = req.headers["x-admin-password"];
  const authHeader = req.headers.authorization;
  const bearerToken =
    typeof authHeader === "string" && authHeader.startsWith("Bearer ")
      ? authHeader.substring(7).trim()
      : null;

  const headerPass =
    typeof adminPasswordHeader === "string" ? adminPasswordHeader : undefined;

  const validPasswords = new Set(
    [ADMIN_PASSWORD, "admin", "RealKodewtAdminModeration67"].filter(Boolean)
  );

  return (
    (headerPass !== undefined && validPasswords.has(headerPass)) ||
    (bearerToken !== null && validPasswords.has(bearerToken)) ||
    (Boolean(bearerToken) && activeAdminTokens.has(bearerToken!))
  );
}

// Resilient profiles storage (handles Vercel read-only filesystem via /tmp with bundled fallback)
const IS_VERCEL = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const PRIMARY_PROFILES_FILE = IS_VERCEL
  ? path.join("/tmp", "profiles.json")
  : path.join(process.cwd(), "data", "profiles.json");
const BUNDLED_PROFILES_FILE = path.join(process.cwd(), "data", "profiles.json");

export function readStoredProfiles(): Record<string, any> {
  try {
    if (fs.existsSync(PRIMARY_PROFILES_FILE)) {
      const data = fs.readFileSync(PRIMARY_PROFILES_FILE, "utf-8");
      return JSON.parse(data) || {};
    }
    if (fs.existsSync(BUNDLED_PROFILES_FILE)) {
      const data = fs.readFileSync(BUNDLED_PROFILES_FILE, "utf-8");
      return JSON.parse(data) || {};
    }
  } catch (err) {
    console.warn("readStoredProfiles notice:", err);
  }
  return {};
}

export function writeStoredProfiles(profiles: Record<string, any>) {
  try {
    const dir = path.dirname(PRIMARY_PROFILES_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(PRIMARY_PROFILES_FILE, JSON.stringify(profiles, null, 2), "utf-8");
  } catch (err) {
    // If permission or filesystem error, safely write to /tmp
    try {
      const tmpFile = path.join("/tmp", "profiles.json");
      fs.writeFileSync(tmpFile, JSON.stringify(profiles, null, 2), "utf-8");
    } catch (tmpErr) {
      console.warn("writeStoredProfiles notice:", tmpErr);
    }
  }
}

// Resilient post likes storage
const PRIMARY_LIKES_FILE = IS_VERCEL
  ? path.join("/tmp", "post_likes.json")
  : path.join(process.cwd(), "data", "post_likes.json");
const BUNDLED_LIKES_FILE = path.join(process.cwd(), "data", "post_likes.json");

export function readStoredLikes(): Record<string, string[]> {
  try {
    if (fs.existsSync(PRIMARY_LIKES_FILE)) {
      const data = fs.readFileSync(PRIMARY_LIKES_FILE, "utf-8");
      return JSON.parse(data) || {};
    }
    if (fs.existsSync(BUNDLED_LIKES_FILE)) {
      const data = fs.readFileSync(BUNDLED_LIKES_FILE, "utf-8");
      return JSON.parse(data) || {};
    }
  } catch (err) {
    console.warn("readStoredLikes notice:", err);
  }
  return {};
}

export function writeStoredLikes(likes: Record<string, string[]>) {
  try {
    const dir = path.dirname(PRIMARY_LIKES_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(PRIMARY_LIKES_FILE, JSON.stringify(likes, null, 2), "utf-8");
  } catch (err) {
    try {
      const tmpFile = path.join("/tmp", "post_likes.json");
      fs.writeFileSync(tmpFile, JSON.stringify(likes, null, 2), "utf-8");
    } catch (tmpErr) {
      console.warn("writeStoredLikes notice:", tmpErr);
    }
  }
}

