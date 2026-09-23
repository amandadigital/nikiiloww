import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  readStoredProfiles,
  writeStoredProfiles,
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  supabaseAdmin,
} from "./_lib/supabaseAdmin.ts";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const url = req.url || "";
  const subpath = (req.query.subpath as string) || "";

  // 1. GET PROFILE (GET /api/profile/:userId or /api/profile?userId=...)
  if (req.method === "GET") {
    try {
      let userId = (req.query.userId as string) || "";
      if (!userId && subpath && subpath !== "personality" && subpath !== "update") {
        userId = subpath;
      }
      if (!userId) {
        const parts = url.split("?")[0].split("/").filter(Boolean);
        const last = parts[parts.length - 1];
        if (last && last !== "profile") {
          userId = last;
        }
      }

      if (!userId) {
        res.status(200).json({ profile: null });
        return;
      }

      // Check local cache
      const profiles = readStoredProfiles();
      const cached = profiles[userId];
      if (cached) {
        res.status(200).json({ profile: cached });
        return;
      }

      // Check Supabase profiles table directly
      try {
        const { data: dbProfile } = await supabaseAdmin
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .maybeSingle();

        if (dbProfile) {
          res.status(200).json({ profile: dbProfile });
          return;
        }
      } catch (dbErr) {
        console.warn("Supabase profile lookup notice:", dbErr);
      }

      res.status(200).json({ profile: null });
      return;
    } catch (err) {
      console.error("Get profile error:", err);
      res.status(200).json({ profile: null });
      return;
    }
  }

  // 2. POST PROFILE OPERATIONS (update or personality)
  if (req.method === "POST") {
    const isPersonality =
      subpath === "personality" ||
      url.includes("/personality") ||
      (req.body && "personality" in req.body);

    if (isPersonality) {
      try {
        const { userId, personality, authToken } = req.body || {};
        if (!userId || !personality) {
          res.status(400).json({ error: "userId and personality are required" });
          return;
        }

        // Persist to server store
        const profiles = readStoredProfiles();
        const existing = profiles[userId] || {};
        const updated = {
          ...existing,
          id: userId,
          companion_name: personality.name,
          companion_prompt: personality.prompt,
          companion_avatar_url: personality.avatarUrl,
          companion_personality: personality,
          companion_relationship_status:
            personality.relationshipStatus || 'dating_user',
          companion_partner_name: personality.partnerName || null,
          updated_at: new Date().toISOString(),
        };
        profiles[userId] = updated;
        writeStoredProfiles(profiles);

        // Synchronize to Supabase profiles table via supabaseAdmin (service role)
        try {
          await supabaseAdmin
            .from("profiles")
            .update({
              companion_name: personality.name,
              companion_prompt: personality.prompt,
              companion_avatar_url: personality.avatarUrl,
              companion_personality: personality,
              companion_relationship_status:
                personality.relationshipStatus || 'dating_user',
              companion_partner_name: personality.partnerName || null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", userId);
        } catch (adminErr) {
          console.warn("supabaseAdmin profiles table personality update notice:", adminErr);
        }

        res.status(200).json({ success: true, personality, profile: updated });
        return;
      } catch (err) {
        const error = err as Error;
        res.status(500).json({ error: error.message || "Failed to save personality" });
        return;
      }
    }

    // Default POST: Profile update
    try {
      const { userId, profile, authToken } = req.body || {};
      if (!userId || !profile) {
        res.status(400).json({ error: "userId and profile are required" });
        return;
      }

      // Immediately persist to server storage
      const profiles = readStoredProfiles();
      const existing = profiles[userId] || {};
      // Check if user is verified before allowing badge in decorations
      const existingUser = existing.username?.toLowerCase().replace(/^@/, "");
      const incomingUser = profile.username?.toLowerCase().replace(/^@/, "");
      const isVerified =
        Boolean(existing.is_verified) ||
        existingUser === "kodewt" ||
        existingUser === "misiori" ||
        incomingUser === "kodewt" ||
        incomingUser === "misiori";

      const sanitizedProfile = { ...profile };
      if (!isVerified) {
        sanitizedProfile.decorations = undefined;
      } else if (sanitizedProfile.decorations) {
        sanitizedProfile.decorations = {
          ...sanitizedProfile.decorations,
          badge: sanitizedProfile.decorations.badge !== false,
        };
      }

      const updated = {
        ...existing,
        ...sanitizedProfile,
        id: userId,
        updated_at: new Date().toISOString(),
      };
      profiles[userId] = updated;
      writeStoredProfiles(profiles);

      // Forward to Supabase database from server if applicable
      (async () => {
        try {
          const headers: Record<string, string> = {
            apikey: SUPABASE_ANON_KEY,
            "Content-Type": "application/json",
            Prefer: "return=representation",
            Authorization: authToken
              ? `Bearer ${authToken}`
              : `Bearer ${SUPABASE_ANON_KEY}`,
          };

          const payload: Record<string, any> = {
            id: userId,
            name: updated.name || updated.username || "User",
            username: updated.username || "user",
            bio: updated.bio || "",
            updated_at: updated.updated_at,
          };
          if (updated.decorations) {
            payload.decorations = updated.decorations;
          }
          if (updated.avatar_url && updated.avatar_url.length < 50000) {
            payload.avatar_url = updated.avatar_url;
          }
          if (updated.companion_name) {
            payload.companion_name = updated.companion_name;
          }
          if (updated.companion_prompt) {
            payload.companion_prompt = updated.companion_prompt;
          }
          if (updated.companion_avatar_url) {
            payload.companion_avatar_url = updated.companion_avatar_url;
          }
          if (updated.companion_personality) {
            payload.companion_personality = updated.companion_personality;
          }

          // Use supabaseAdmin to persist directly to profiles table
          try {
            await supabaseAdmin
              .from("profiles")
              .update(payload)
              .eq("id", userId);

            // If decorations updated, also synchronize decorations to author's posts so everybody sees them immediately
            if (updated.decorations) {
              await supabaseAdmin
                .from("posts")
                .update({ decorations: updated.decorations })
                .eq("user_id", userId);
            }
          } catch (dbSyncErr) {
            console.warn("supabaseAdmin profile update notice:", dbSyncErr);
          }

          await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`, {
            method: "PATCH",
            headers,
            body: JSON.stringify(payload),
          }).catch(() => {});
        } catch (err) {
          console.warn("Supabase background sync skipped:", err);
        }
      })();

      res.status(200).json({ success: true, profile: updated });
      return;
    } catch (err) {
      const error = err as Error;
      res.status(500).json({ error: error.message || "Failed to update profile" });
      return;
    }
  }

  res.status(405).json({ error: "Method not allowed" });
}
