import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabaseAdmin } from "./_lib/supabaseAdmin";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const url = req.url || "";
  const subpath = (req.query.subpath as string) || "";
  const isDeleteAction =
    req.method === "DELETE" ||
    subpath === "delete" ||
    url.includes("/delete") ||
    req.body?.action === "delete";

  const isCreateAction =
    req.method === "POST" && !isDeleteAction;

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

  // 2. CREATE POST (POST)
  if (isCreateAction) {
    try {
      const {
        content,
        userId,
        authorName,
        authorUsername,
        authorAvatar,
        isVerified,
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

      if (!userId || !authorUsername) {
        res.status(400).json({ error: "userId and authorUsername are required" });
        return;
      }

      const isKodewt =
        authorUsername.toLowerCase() === "kodewt" ||
        authorUsername.toLowerCase() === "@kodewt";

      const { data: insertedPost, error } = await supabaseAdmin
        .from("posts")
        .insert({
          user_id: userId,
          author_name: authorName || authorUsername,
          author_username: authorUsername.replace(/^@/, ""),
          author_avatar: authorAvatar || "",
          content: trimmed,
          likes_count: 0,
          is_verified: isKodewt || Boolean(isVerified),
        })
        .select()
        .single();

      if (error) {
        console.error("Failed to insert post via supabaseAdmin:", error);
        res.status(500).json({ error: error.message || "Database insert failed" });
        return;
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
          isVerified: insertedPost.is_verified || isKodewt,
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

  // 3. GET POSTS (GET)
  if (req.method === "GET") {
    try {
      const { data: dbPosts, error } = await supabaseAdmin
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Failed to fetch posts via supabaseAdmin:", error);
        res.status(200).json({ success: true, posts: [] });
        return;
      }

      const posts = (dbPosts || []).map((p) => {
        const isKodewt = p.author_username?.toLowerCase() === "kodewt";
        return {
          id: p.id,
          userId: p.user_id,
          authorName: p.author_name || p.author_username,
          authorUsername: p.author_username,
          authorAvatar: p.author_avatar || "",
          content: p.content,
          createdAt: new Date(p.created_at).getTime(),
          likesCount: p.likes_count || 0,
          isLiked: false,
          isVerified: p.is_verified || isKodewt,
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
