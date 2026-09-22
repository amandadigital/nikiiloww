import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  supabaseAdmin,
  readStoredProfiles,
  readStoredLikes,
  writeStoredLikes,
} from "./_lib/supabaseAdmin.ts";
import { moderateContentWithAI, VIOLATION_MESSAGE } from "./chat.ts";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const url = req.url || "";
  const subpath = (req.query.subpath as string) || "";
  const isDeleteAction =
    req.method === "DELETE" ||
    subpath === "delete" ||
    url.includes("/delete") ||
    req.body?.action === "delete";

  const isToggleLikeAction =
    req.method === "POST" &&
    (subpath === "like" ||
      url.includes("/like") ||
      req.body?.action === "toggle_like" ||
      req.body?.action === "like");

  const isCreateAction =
    req.method === "POST" && !isDeleteAction && !isToggleLikeAction;

  // 1. DELETE POST
  if (isDeleteAction) {
    try {
      const postId =
        req.body?.postId ||
        req.body?.id ||
        (req.query.postId as string) ||
        (req.query.id as string);
      const userId = req.body?.userId || (req.query.userId as string);

      if (!postId) {
        res.status(400).json({ error: "postId is required" });
        return;
      }

      let query = supabaseAdmin.from("posts").delete().eq("id", postId);
      if (userId) {
        query = query.eq("user_id", userId);
      }

      const { error } = await query;
      if (error) {
        console.error("Failed to delete post via supabaseAdmin:", error);
        res.status(500).json({ error: error.message || "Failed to delete post" });
        return;
      }

      res.status(200).json({ success: true });
      return;
    } catch (err) {
      const error = err as Error;
      console.error("Delete post handler exception:", error);
      res.status(500).json({ error: error.message || "Server error deleting post" });
      return;
    }
  }

  // 2. TOGGLE LIKE ON POST (Instant & Resilient: persists to DB & server backup store)
  if (isToggleLikeAction) {
    try {
      const postId =
        req.body?.postId ||
        req.body?.id ||
        (req.query.postId as string);
      const userId = req.body?.userId || (req.query.userId as string);

      if (!postId || !userId) {
        res.status(400).json({ error: "postId and userId are required to like a post" });
        return;
      }

      // Resilient local store toggle
      const storedLikes = readStoredLikes();
      const userLiked = storedLikes[userId] || [];
      const alreadyLikedLocal = userLiked.includes(postId);
      let isLiked = !alreadyLikedLocal;

      if (alreadyLikedLocal) {
        storedLikes[userId] = userLiked.filter((id) => id !== postId);
      } else {
        storedLikes[userId] = Array.from(new Set([...userLiked, postId]));
      }
      writeStoredLikes(storedLikes);

      // Synchronize with Supabase post_likes table
      try {
        const { data: existingLike } = await supabaseAdmin
          .from("post_likes")
          .select("post_id")
          .eq("post_id", postId)
          .eq("user_id", userId)
          .maybeSingle();

        if (existingLike) {
          await supabaseAdmin
            .from("post_likes")
            .delete()
            .eq("post_id", postId)
            .eq("user_id", userId);
          isLiked = false;
        } else {
          await supabaseAdmin
            .from("post_likes")
            .insert({ post_id: postId, user_id: userId });
          isLiked = true;
        }
      } catch (dbLikeErr) {
        console.warn("supabaseAdmin post_likes toggle notice:", dbLikeErr);
      }

      // Compute likes count from Supabase or backup
      let realLikesCount = 0;
      try {
        const { count } = await supabaseAdmin
          .from("post_likes")
          .select("post_id", { count: "exact", head: true })
          .eq("post_id", postId);

        if (typeof count === "number") {
          realLikesCount = count;
        } else {
          // Count across all users in local store
          let localCount = 0;
          for (const uId of Object.keys(storedLikes)) {
            if (storedLikes[uId]?.includes(postId)) localCount++;
          }
          realLikesCount = Math.max(localCount, isLiked ? 1 : 0);
        }
      } catch {
        let localCount = 0;
        for (const uId of Object.keys(storedLikes)) {
          if (storedLikes[uId]?.includes(postId)) localCount++;
        }
        realLikesCount = Math.max(localCount, isLiked ? 1 : 0);
      }

      // Cache likes_count on posts table
      try {
        await supabaseAdmin
          .from("posts")
          .update({ likes_count: realLikesCount })
          .eq("id", postId);
      } catch {}

      res.status(200).json({
        success: true,
        isLiked,
        likesCount: realLikesCount,
      });
      return;
    } catch (err) {
      const error = err as Error;
      console.error("Toggle like handler exception:", error);
      res.status(500).json({ error: error.message || "Server error toggling like" });
      return;
    }
  }

  // 3. CREATE POST (POST)
  if (isCreateAction) {
    try {
      const {
        content,
        userId,
        authorName,
        authorUsername,
        authorAvatar,
        isVerified,
        decorations,
      } = req.body || {};

      const trimmed = (content || "").trim();
      if (!trimmed) {
        res.status(400).json({ error: "Post content cannot be empty" });
        return;
      }

      if (trimmed.length > 300) {
        res.status(400).json({ error: "Post cannot exceed 300 characters" });
        return;
      }

      // Contextual Safety Check evaluated exclusively by AI (no hardcoded word lists)
      const safetyCheck = await moderateContentWithAI(trimmed);
      if (safetyCheck.isViolating) {
        res.status(400).json({ error: VIOLATION_MESSAGE });
        return;
      }

      if (!userId || !authorUsername) {
        res.status(400).json({ error: "userId and authorUsername are required" });
        return;
      }

      const cleanAuthor = authorUsername.toLowerCase().replace(/^@/, "");
      const isSpecialVerified =
        cleanAuthor === "kodewt" || cleanAuthor === "misiori";

      // If decorations not explicitly in request, check author's profile
      const storedProfiles = readStoredProfiles();
      const authorProfile = storedProfiles[userId];
      const isAuthorVerified =
        isSpecialVerified || Boolean(isVerified) || Boolean(authorProfile?.is_verified);
      const rawDecorations = decorations || authorProfile?.decorations || null;
      const postDecorations = rawDecorations
        ? {
            ...rawDecorations,
            badge: isAuthorVerified ? rawDecorations.badge !== false : false,
          }
        : null;

      const postPayload: Record<string, any> = {
        user_id: userId,
        author_name: authorName || authorUsername,
        author_username: authorUsername.replace(/^@/, ""),
        author_avatar: authorAvatar || "",
        content: trimmed,
        likes_count: 0,
        is_verified: isAuthorVerified,
      };
      if (postDecorations) {
        postPayload.decorations = postDecorations;
      }

      let insertedPost: any = null;
      const { data, error } = await supabaseAdmin
        .from("posts")
        .insert(postPayload)
        .select()
        .single();

      if (error) {
        // If column decorations doesn't exist yet in Supabase, retry without decorations column
        if (error.message?.includes("decorations")) {
          delete postPayload.decorations;
          const retry = await supabaseAdmin.from("posts").insert(postPayload).select().single();
          if (!retry.error) {
            insertedPost = retry.data;
          }
        }
        if (!insertedPost) {
          console.error("Failed to insert post via supabaseAdmin:", error);
          res.status(500).json({ error: error.message || "Database insert failed" });
          return;
        }
      } else {
        insertedPost = data;
      }

      res.status(201).json({
        success: true,
        post: {
          id: insertedPost.id,
          userId: insertedPost.user_id,
          authorName: insertedPost.author_name || insertedPost.author_username,
          authorUsername: insertedPost.author_username,
          authorAvatar: insertedPost.author_avatar || "",
          content: insertedPost.content,
          createdAt: new Date(insertedPost.created_at).getTime(),
          likesCount: insertedPost.likes_count || 0,
          isLiked: false,
          isVerified: insertedPost.is_verified || isSpecialVerified,
          decorations: insertedPost.decorations || postDecorations || undefined,
        },
      });
      return;
    } catch (err) {
      const error = err as Error;
      console.error("Create post handler exception:", error);
      res.status(500).json({ error: error.message || "Server error creating post" });
      return;
    }
  }

  // 4. GET POSTS OR LIKES (GET)
  if (req.method === "GET") {
    try {
      const action = (req.query.action as string) || subpath;
      const userId = (req.query.userId as string) || "";

      // Fetch user's liked post IDs
      if (action === "likes" || req.query.likes === "true") {
        if (!userId) {
          res.status(200).json({ success: true, likedPostIds: [] });
          return;
        }

        const likedSet = new Set<string>();

        // Check local store
        const storedLikes = readStoredLikes();
        if (Array.isArray(storedLikes[userId])) {
          storedLikes[userId].forEach((id) => likedSet.add(id));
        }

        // Check Supabase post_likes
        try {
          const { data: likesData } = await supabaseAdmin
            .from("post_likes")
            .select("post_id")
            .eq("user_id", userId);

          if (likesData) {
            likesData.forEach((l: any) => likedSet.add(l.post_id));
          }
        } catch (likesErr) {
          console.warn("supabaseAdmin post_likes lookup notice:", likesErr);
        }

        res.status(200).json({ success: true, likedPostIds: Array.from(likedSet) });
        return;
      }

      let dbPosts: any[] | null = null;
      const storedProfiles = readStoredProfiles();

      // Fetch with profiles relationship join so username & decorations changes are immediately reflected
      const { data: joinedPosts, error: joinError } = await supabaseAdmin
        .from("posts")
        .select(`
          *,
          profiles:user_id (
            id,
            name,
            username,
            avatar_url,
            is_verified,
            decorations
          )
        `)
        .order("created_at", { ascending: false });

      if (!joinError && joinedPosts) {
        dbPosts = joinedPosts;
      } else {
        const { data: fallbackPosts, error: fallbackError } = await supabaseAdmin
          .from("posts")
          .select("*")
          .order("created_at", { ascending: false });

        if (fallbackError) {
          console.error("Failed to fetch posts via supabaseAdmin:", fallbackError);
        }
        dbPosts = fallbackPosts || [];
      }

      // If a userId was passed in query, prepare user's liked posts set for instant verification
      const userLikedSet = new Set<string>();
      if (userId) {
        const storedLikes = readStoredLikes();
        if (Array.isArray(storedLikes[userId])) {
          storedLikes[userId].forEach((id) => userLikedSet.add(id));
        }
        try {
          const { data: uLikes } = await supabaseAdmin
            .from("post_likes")
            .select("post_id")
            .eq("user_id", userId);
          if (uLikes) {
            uLikes.forEach((l: any) => userLikedSet.add(l.post_id));
          }
        } catch {}
      }

      const posts = (dbPosts || []).map((p) => {
        const profile = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
        const authorUsername = profile?.username || p.author_username;
        const authorName = profile?.name || profile?.username || p.author_name || authorUsername;
        const authorAvatar = profile?.avatar_url || p.author_avatar || "";
        const cleanAuthor = authorUsername?.toLowerCase().replace(/^@/, "");
        const isSpecial = cleanAuthor === "kodewt" || cleanAuthor === "misiori";
        const isVerified = Boolean(profile?.is_verified ?? p.is_verified) || isSpecial;
        const rawDecorations =
          profile?.decorations ||
          p.decorations ||
          storedProfiles[p.user_id]?.decorations ||
          null;
        const decorations = rawDecorations
          ? {
              ...rawDecorations,
              badge: isVerified ? rawDecorations.badge !== false : false,
            }
          : null;

        return {
          id: p.id,
          userId: p.user_id,
          authorName,
          authorUsername,
          authorAvatar,
          content: p.content,
          createdAt: new Date(p.created_at).getTime(),
          likesCount: p.likes_count || 0,
          isLiked: userId ? userLikedSet.has(p.id) : false,
          isVerified,
          decorations,
        };
      });

      res.status(200).json({
        success: true,
        posts,
      });
      return;
    } catch (err) {
      const error = err as Error;
      console.error("Get posts handler exception:", error);
      res.status(200).json({ success: true, posts: [] });
      return;
    }
  }

  res.status(405).json({ error: "Method not allowed" });
}
