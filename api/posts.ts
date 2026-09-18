import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabaseAdmin } from "./_lib/supabaseAdmin.ts";

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

  // 2. TOGGLE LIKE ON POST (Enforces one like per user account across all devices)
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

      // Check if user already liked this post
      const { data: existingLike } = await supabaseAdmin
        .from("post_likes")
        .select("post_id")
        .eq("post_id", postId)
        .eq("user_id", userId)
        .maybeSingle();

      let isLiked = false;
      if (existingLike) {
        // Unlike post
        await supabaseAdmin
          .from("post_likes")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", userId);
        isLiked = false;
      } else {
        // Like post (unique primary key ensures one like per account)
        await supabaseAdmin
          .from("post_likes")
          .insert({ post_id: postId, user_id: userId });
        isLiked = true;
      }

      // Compute exact real likes count from the post_likes table
      const { count } = await supabaseAdmin
        .from("post_likes")
        .select("post_id", { count: "exact", head: true })
        .eq("post_id", postId);

      const realLikesCount = typeof count === "number" ? count : (isLiked ? 1 : 0);

      // Keep posts.likes_count cached in the posts table
      await supabaseAdmin
        .from("posts")
        .update({ likes_count: realLikesCount })
        .eq("id", postId);

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

  // 3. GET POSTS OR LIKES (GET)
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

        const { data: likesData, error: likesError } = await supabaseAdmin
          .from("post_likes")
          .select("post_id")
          .eq("user_id", userId);

        if (likesError) {
          console.warn("Failed to fetch user likes via supabaseAdmin:", likesError);
          res.status(200).json({ success: true, likedPostIds: [] });
          return;
        }

        const likedPostIds = (likesData || []).map((l: any) => l.post_id);
        res.status(200).json({ success: true, likedPostIds });
        return;
      }

      let dbPosts: any[] | null = null;

      // Try fetching with profiles relationship join so username changes are immediately reflected
      const { data: joinedPosts, error: joinError } = await supabaseAdmin
        .from("posts")
        .select(`
          *,
          profiles:user_id (
            id,
            name,
            username,
            avatar_url,
            is_verified
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

      const posts = (dbPosts || []).map((p) => {
        const profile = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
        const authorUsername = profile?.username || p.author_username;
        const authorName = profile?.name || profile?.username || p.author_name || authorUsername;
        const authorAvatar = profile?.avatar_url || p.author_avatar || "";
        const isKodewt =
          authorUsername?.toLowerCase() === "kodewt" ||
          authorUsername?.toLowerCase() === "@kodewt";
        const isVerified = Boolean(profile?.is_verified ?? p.is_verified) || isKodewt;

        return {
          id: p.id,
          userId: p.user_id,
          authorName,
          authorUsername,
          authorAvatar,
          content: p.content,
          createdAt: new Date(p.created_at).getTime(),
          likesCount: p.likes_count || 0,
          isLiked: false,
          isVerified,
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
