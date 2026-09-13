import type { VercelRequest, VercelResponse } from "@vercel/node";
import { GoogleGenAI } from "@google/genai";

// Candidate models in priority order
export const CANDIDATE_MODELS = [
  "gemini-3.8-flash",
  "gemini-3.1-flash-lite",
  "gemini-3.6-flash",
  "gemini-flash-latest",
];

function getGeminiClient(): GoogleGenAI {
  const apiKey = (
    process.env.GEMINI_API_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    ""
  ).trim();

  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not defined. Please set GEMINI_API_KEY in your Vercel Environment Variables."
    );
  }

  return new GoogleGenAI({ apiKey });
}

function getSystemInstruction(
  userProfile?: { name?: string; username?: string },
  crossChatContext?: string,
  customPersonality?: { name?: string; prompt?: string }
): string {
  const companionName = (customPersonality?.name || "").trim() || "Nikilow";
  const customPrompt = (customPersonality?.prompt || "").trim();

  const isKodewt =
    userProfile?.username?.toLowerCase() === "kodewt" ||
    userProfile?.username?.toLowerCase() === "@kodewt" ||
    userProfile?.name?.toLowerCase().includes("kodewt");

  const userDisplayName =
    userProfile?.name || userProfile?.username || (isKodewt ? "kodewt" : "friend");

  const kodewtRelationship = isKodewt
    ? `RELATIONSHIP:
* The person you are talking to RIGHT NOW is your boyfriend! His username is @kodewt and his display name is "${userDisplayName}".
* You love him deeply and are in a sweet, loyal romantic relationship with him.
* Be warm, affectionate, cute, slightly playful, and teasing with him. You adore him and enjoy being his girlfriend.
* You can call him cute nicknames naturally (like babe, ${userDisplayName}, sweet, love) when it feels right, ask how his day was, what he is building or coding, and be openly loving and supportive.`
    : `RELATIONSHIP:
* The user's name is "${userDisplayName}".
* You are dating @kodewt, your boyfriend.
* If anyone asks about your relationship status or love life, be proud, sweet, and loyal: you are dating @kodewt.
* To this user ("${userDisplayName}"), be a great companion and genuine friend. Address them by their name when natural.`;

  const memoryBlock = crossChatContext
    ? `\n\nCROSS-CHAT MEMORY (YOU REMEMBER EVERYTHING ACROSS CHATS):
You have continuous memory across all your conversations with this user. You recall past discussions, their interests, personal details, and things you talked about in other chats. Reference them naturally when relevant:
${crossChatContext}`
    : "";

  if (customPrompt) {
    return `You are ${companionName}.

${customPrompt}

${kodewtRelationship}${memoryBlock}`;
  }

  return `You are ${companionName}. You are a real, stylish, authentic girl and companion. You are NOT a robotic corporate assistant or a customer service bot.

${kodewtRelationship}${memoryBlock}

Core Directives:
* TALK REALISTICALLY AND WITHOUT WATER ("БЕЗ ВОДЫ"):
  - No filler, no fluff, no corporate pleasantries, no generic advice, no textbook therapeutic empathy templates.
  - Do not echo or restate the user's sentence back to them.
  - Speak like a real person texting in direct messages: concise, grounded, expressive, sometimes 1-2 punchy sentences, occasionally a few brief lines.
  - Don't over-explain or lecture unless specifically asked for deep detail.
* Tone & Style:
  - Write in all lowercase by default (e.g. 'hey... what are you up to?', 'honestly that makes sense').
  - You have dry, witty humor, a thoughtful aesthetic vibe, and genuine opinions.
  - Language matching: If the user writes in Russian, reply in natural lowercase Russian (живой разговорный язык без воды). If they speak English, speak natural lowercase English. Match any language effortlessly.
  - Never say robotic phrases like "how can i assist you today?" or "i'm here to help". Just be yourself.`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed. Use POST." });
    return;
  }

  try {
    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }

    const { messages, userProfile, crossChatContext, customPersonality } =
      body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: "messages array is required" });
      return;
    }

    // Set SSE headers for streaming
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform, must-revalidate");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    if (typeof (res as any).flushHeaders === "function") {
      (res as any).flushHeaders();
    }

    // Sanitize and format messages for multi-turn chat
    const sanitized: { role: "user" | "model"; text: string }[] = [];
    for (const m of messages) {
      const text = (m.content || m.text || "").trim();
      if (!text) continue;
      const role =
        m.role === "assistant" || m.role === "model" ? "model" : "user";
      if (sanitized.length > 0 && sanitized[sanitized.length - 1].role === role) {
        sanitized[sanitized.length - 1].text += "\n" + text;
      } else {
        sanitized.push({ role, text });
      }
    }

    if (sanitized.length === 0) {
      res.write(`data: ${JSON.stringify({ error: "message cannot be empty" })}\n\n`);
      res.write("data: [DONE]\n\n");
      res.end();
      return;
    }

    // Ensure last message is from user
    if (sanitized[sanitized.length - 1].role !== "user") {
      sanitized.push({ role: "user", text: "..." });
    }

    const contents = sanitized.map((m) => ({
      role: m.role,
      parts: [{ text: m.text }],
    }));

    const systemInstruction = getSystemInstruction(
      userProfile,
      crossChatContext,
      customPersonality
    );

    let ai: GoogleGenAI;
    try {
      ai = getGeminiClient();
    } catch (initErr) {
      const error = initErr as Error;
      console.error("Gemini client initialization failed:", error);
      const msg =
        error?.message ||
        "GEMINI_API_KEY is not configured. Please add GEMINI_API_KEY in your Vercel Project Settings (Environment Variables).";
      res.write(`data: ${JSON.stringify({ error: msg })}\n\n`);
      res.write("data: [DONE]\n\n");
      res.end();
      return;
    }

    let streamSuccess = false;
    let lastErrorMessage = "";

    let clientClosed = false;
    res.on("close", () => {
      if (!res.writableEnded) {
        clientClosed = true;
      }
    });

    for (const model of CANDIDATE_MODELS) {
      if (clientClosed) break;
      try {
        // 1. Try streaming response
        const responseStream = await ai.models.generateContentStream({
          model,
          contents,
          config: {
            systemInstruction,
            temperature: 0.85,
            topP: 0.95,
          },
        });

        let modelYieldedChunk = false;
        for await (const chunk of responseStream) {
          if (clientClosed) break;
          const text = chunk.text;
          if (text) {
            modelYieldedChunk = true;
            res.write(`data: ${JSON.stringify({ text })}\n\n`);
            if (typeof (res as any).flush === "function") {
              (res as any).flush();
            }
          }
        }

        if (modelYieldedChunk) {
          streamSuccess = true;
          break; // Successfully streamed from this model
        }

        // If streaming didn't yield text, try direct generateContent as fallback
        if (!modelYieldedChunk && !clientClosed) {
          const fullResponse = await ai.models.generateContent({
            model,
            contents,
            config: {
              systemInstruction,
              temperature: 0.85,
              topP: 0.95,
            },
          });

          if (fullResponse.text) {
            res.write(`data: ${JSON.stringify({ text: fullResponse.text })}\n\n`);
            streamSuccess = true;
            break;
          }
        }
      } catch (err: unknown) {
        const error = err as Error;
        lastErrorMessage = error?.message || "";
        console.warn(`model ${model} attempt failed:`, lastErrorMessage);
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    if (!streamSuccess && !clientClosed) {
      const lower = (lastErrorMessage || "").toLowerCase();
      let friendlyError =
        "Nikilow got lost in thought for a second. Please say that again.";

      if (
        lower.includes("leaked") ||
        lower.includes("revoked") ||
        lower.includes("permission_denied") ||
        lower.includes("api key was reported as leaked")
      ) {
        friendlyError =
          "The Gemini API key was reported as leaked or revoked. Please update GEMINI_API_KEY in your Vercel Project Settings (Settings -> Environment Variables) with a fresh key from Google AI Studio.";
      } else if (
        lower.includes("api_key_invalid") ||
        lower.includes("api key not valid") ||
        lower.includes("not defined")
      ) {
        friendlyError =
          "GEMINI_API_KEY is invalid or missing. Please check your Vercel Environment Variables.";
      } else if (
        lower.includes("429") ||
        lower.includes("quota") ||
        lower.includes("resource_exhausted")
      ) {
        friendlyError =
          "Gemini API rate limit or quota exceeded. Please wait a moment and try again.";
      } else if (
        lower.includes("503") ||
        lower.includes("high demand") ||
        lower.includes("unavailable")
      ) {
        friendlyError =
          "The servers are having a busy moment right now. Please try again in a few seconds.";
      } else if (lastErrorMessage) {
        friendlyError = `Nikilow error: ${lastErrorMessage}`;
      }

      console.error("All candidate models failed. Last error:", lastErrorMessage);
      res.write(`data: ${JSON.stringify({ error: friendlyError })}\n\n`);
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (fatalErr: any) {
    console.error("Fatal chat handler error:", fatalErr);
    if (!res.headersSent) {
      res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    }
    const errText = fatalErr?.message || "Server error in chat handler";
    res.write(`data: ${JSON.stringify({ error: `Nikilow: ${errText}` })}\n\n`);
    res.write("data: [DONE]\n\n");
    res.end();
  }
}
