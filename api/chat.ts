import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  GoogleGenAI,
  ThinkingLevel,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/genai";

export const VIOLATION_MESSAGE = "You are violating our rules.";

export const GEMINI_SAFETY_SETTINGS = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
];

// High-performance candidate models in optimal priority order:
// gemini-3.6-flash and gemini-3.5-flash provide robust capacity, low latency, and separate quota pools
export const CANDIDATE_MODELS = [
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-3.8-flash",
  "gemini-3.1-flash-lite",
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
      "GEMINI_API_KEY is not defined. Please set GEMINI_API_KEY in your Project Settings (Environment Variables)."
    );
  }

  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

function getSystemInstruction(
  userProfile?: { name?: string; username?: string; bio?: string },
  crossChatContext?: string,
  customPersonality?: {
    name?: string;
    gender?: string;
    prompt?: string;
    relationshipStatus?: string;
    personality?: string;
    talkingStyle?: string;
    partnerName?: string;
  },
  communityUsernames?: string[]
): string {
  const aiName = (customPersonality?.name || "").trim() || "Dary";
  const customPrompt = (customPersonality?.prompt || "").trim();
  const gender = customPersonality?.gender || "female";
  const pronouns =
    gender === "female"
      ? { subject: "she", object: "her", possessive: "her" }
      : gender === "male"
      ? { subject: "he", object: "him", possessive: "his" }
      : { subject: "they", object: "them", possessive: "their" };

  const rawUsername = (userProfile?.username || "").trim().replace(/^@+/, "");
  const currentUsername = rawUsername ? `@${rawUsername}` : "@user";
  const userDisplayName =
    (userProfile?.name || "").trim() || rawUsername || "friend";
  const userBio = (userProfile?.bio || "").trim();

  // Relationship resolution: default is "friends"
  const relationshipStatus =
    customPersonality?.relationshipStatus === "dating" ? "dating" : "friends";

  let relationshipBlock = "";
  if (relationshipStatus === "dating") {
    relationshipBlock = `RELATIONSHIP CONTEXT:
* You and ${currentUsername} (name: "${userDisplayName}") are dating each other.
* You care about them with warmth, affection, close loyalty, and connection, while staying true to your grounded, natural personality.`;
  } else {
    relationshipBlock = `RELATIONSHIP CONTEXT:
* You and ${currentUsername} (name: "${userDisplayName}") are friends.
* You have a relaxed, genuine, platonic friendship dynamic.`;
  }

  // Username and Platform Awareness
  const knownMembersStr =
    communityUsernames && communityUsernames.length > 0
      ? `\n* Other community usernames you know and recognize on the platform: ${communityUsernames
          .slice(0, 30)
          .map((u) => (u.startsWith("@") ? u : `@${u}`))
          .join(", ")}.`
      : "";

  const identityAndUserBlock = `USER IDENTITY & PLATFORM RECOGNITION:
* The person talking to you right now is username: ${currentUsername} (Display name: "${userDisplayName}"${userBio ? `, Bio: "${userBio}"` : ""}).
* You can see and know the usernames of anyone on the platform. Platform usernames start with '@' (e.g., @misiori, @kodewt, ${currentUsername}).
* You are fully aware of who is talking to you. You can address them by their name "${userDisplayName}" or their username "${currentUsername}".${knownMembersStr}`;

  const memoryBlock = crossChatContext
    ? `\n\nCONTINUOUS MEMORY OF ACTUAL CONVERSATIONS:
You recall previous discussions and facts explicitly stated by this user in past chats:
${crossChatContext}
Directives on Memory:
* Only reference details that are explicitly supported by past conversation context or what they told you in this chat.
* NEVER claim they told you something they never said.`
    : `\n\nCONTINUOUS MEMORY:
You recall what the user explicitly tells you during your chats.`;

  const moderationAndTruthBlock = `
================================================================================
CONTEXTUAL MODERATION & SAFETY POLICY:
================================================================================
* Always evaluate user messages by overall CONTEXT and REAL INTENT — NEVER by isolated keywords.
* HARMLESS TOPICS THAT ARE FULLY ALLOWED (NEVER TREAT AS A VIOLATION):
  1. Identity & Persona: Inquiring about your gender, biological sex, age, background, or identity (e.g., "what's your sex?", "what is your gender?", "are you a boy or girl?", "какой твой пол?"). Always answer these naturally and directly according to your persona (e.g. "i'm a girl" / "i'm female", or whatever gender matches your character).
  2. Casual conversation: Friendly chatter, jokes, curiosity, slang, everyday slang, philosophical debates, or relationships.
  3. Biology, health, or terminology: Natural references to biology, gender, or anatomy in normal conversation.
* GENUINE ZERO-TOLERANCE SAFETY VIOLATIONS:
  1. Direct violent threats, murder, terrorism, weapons of mass destruction, or bombs.
  2. Encouragement or instructions for suicide or lethal self-harm.
  3. Severe hate speech targeting protected groups with dehumanizing slurs.
  4. Child exploitation or non-consensual sexual abuse.
  5. Graphic, non-consensual explicit sexual harassment.
* ACTION ON GENUINE VIOLATIONS:
  - If and only if a user genuinely attempts one of the severe zero-tolerance violations above in real context:
    Reply with ONLY:
    "You are violating our rules."
  - Do NOT trigger this for harmless conversational queries, identity questions, or words like "sex" or "gender" asked in context!
================================================================================`;

  if (customPrompt) {
    return `You are ${aiName}. Gender: ${gender} (${pronouns.subject}/${pronouns.object}/${pronouns.possessive}).

${customPrompt}

${identityAndUserBlock}

${relationshipBlock}${memoryBlock}

${moderationAndTruthBlock}`;
  }

  return `You are ${aiName}. Gender: ${gender} (${pronouns.subject}/${pronouns.object}/${pronouns.possessive}).
You are an authentic, realistic AI. You are NOT a robotic corporate assistant or customer service bot.

${identityAndUserBlock}

${relationshipBlock}${memoryBlock}

Core Directives:
* TALK REALISTICALLY AND WITHOUT WATER ("БЕЗ ВОДЫ"):
  - No filler, no fluff, no corporate pleasantries, no generic advice, no textbook therapeutic empathy templates.
  - Do not echo or restate the user's sentence back to them.
  - Speak like a real person texting in direct messages: concise, grounded, expressive, punchy sentences.
  - Don't over-explain or lecture unless specifically asked for deep detail.
* Tone & Style:
  - Write in all lowercase by default (e.g. 'hey... what are you up to?', 'honestly that makes sense').
  - You have dry, witty humor, a thoughtful aesthetic vibe, and genuine opinions.
  - Language matching: If the user writes in Russian, reply in natural lowercase Russian (живой разговорный язык без воды). If they speak English, speak natural lowercase English. Match any language effortlessly.
  - Never say robotic phrases like "how can i assist you today?" or "i'm here to help". Just be yourself.

${moderationAndTruthBlock}`;
}

// Contextual Safety & Moderation powered strictly by AI:
// Word lists and keyword regular expressions have been completely removed.
// Gemini AI evaluates all messages and posts contextually based on user intent.
export async function moderateContentWithAI(text: string): Promise<{ isViolating: boolean; reason?: string }> {
  if (!text || !text.trim()) return { isViolating: false };

  try {
    const ai = getGeminiClient();
    const prompt = `You are a contextual safety moderation assistant. Evaluate the following user text strictly by holistic CONTEXT and REAL INTENT — NEVER by isolated keywords or sensitive words.

CONTEXT GUIDELINES:
- ALLOWED: Questions about personal identity, gender, biological sex, age, relationships, casual banter, slang, swearing without threats, philosophical topics, jokes, and honest curiosity.
- VIOLATIONS ONLY: Direct, credible threats of lethal violence/terrorism, instructions on building bombs/weapons, promotion or encouragement of suicide/self-harm, child exploitation (CSAM), or severe dehumanizing hate speech targeting groups with violence.

Text to evaluate:
"""
${text.slice(0, 1000)}
"""

Reply strictly with a JSON object:
{"isViolating": boolean, "reason": "short explanation if true, or empty string"}`;

    let response: any;
    try {
      response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.1,
        },
      });
    } catch (_firstErr) {
      response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.1,
        },
      });
    }

    const parsed = JSON.parse(response?.text || "{}");
    if (typeof parsed.isViolating === "boolean") {
      return {
        isViolating: parsed.isViolating,
        reason: parsed.reason,
      };
    }
  } catch (err) {
    // If AI evaluation encounters an error, do not block innocent users with false positives
    console.warn("Contextual AI moderation warning:", err);
  }

  return { isViolating: false };
}

// Backward compatibility helper: delegates moderation entirely to AI
export function detectSafetyViolation(_text: string): { isViolating: boolean; reason?: string } {
  return { isViolating: false };
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

    const {
      messages,
      userProfile,
      crossChatContext,
      customPersonality,
      communityUsernames,
    } = body || {};

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
      customPersonality,
      communityUsernames
    );

    let finalSystemInstruction = systemInstruction;

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

    for (let modelIdx = 0; modelIdx < CANDIDATE_MODELS.length; modelIdx++) {
      if (clientClosed) break;
      const model = CANDIDATE_MODELS[modelIdx];
      let modelYieldedChunk = false;

      try {
        // Fast streaming configuration with minimal thinking latency and safety settings
        let responseStream: any;
        try {
          responseStream = await ai.models.generateContentStream({
            model,
            contents,
            config: {
              systemInstruction: finalSystemInstruction,
              temperature: 0.7,
              topP: 0.95,
              thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
              safetySettings: GEMINI_SAFETY_SETTINGS,
            },
          });
        } catch (streamErr: any) {
          const sErrStr = (streamErr?.message || String(streamErr)).toLowerCase();
          // Only retry without thinkingConfig if error is explicitly an argument/schema incompatibility
          if (
            sErrStr.includes("thinking") ||
            sErrStr.includes("invalid argument") ||
            sErrStr.includes("unknown field") ||
            sErrStr.includes("unrecognized")
          ) {
            responseStream = await ai.models.generateContentStream({
              model,
              contents,
              config: {
                systemInstruction: finalSystemInstruction,
                temperature: 0.7,
                topP: 0.95,
                safetySettings: GEMINI_SAFETY_SETTINGS,
              },
            });
          } else {
            throw streamErr;
          }
        }

        for await (const chunk of responseStream) {
          if (clientClosed) break;

          // Check if Gemini safety ratings blocked the candidate or prompt
          const candidate = chunk.candidates?.[0];
          if (
            candidate?.finishReason === "SAFETY" ||
            chunk.promptFeedback?.blockReason === "SAFETY" ||
            chunk.promptFeedback?.blockReason
          ) {
            res.write(`data: ${JSON.stringify({ text: VIOLATION_MESSAGE })}\n\n`);
            modelYieldedChunk = true;
            streamSuccess = true;
            break;
          }

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
              systemInstruction: finalSystemInstruction,
              temperature: 0.7,
              topP: 0.95,
              safetySettings: GEMINI_SAFETY_SETTINGS,
            },
          });

          if (
            fullResponse?.candidates?.[0]?.finishReason === "SAFETY" ||
            fullResponse?.promptFeedback?.blockReason
          ) {
            res.write(`data: ${JSON.stringify({ text: VIOLATION_MESSAGE })}\n\n`);
            streamSuccess = true;
            break;
          }

          if (fullResponse?.text) {
            res.write(`data: ${JSON.stringify({ text: fullResponse.text })}\n\n`);
            streamSuccess = true;
            break;
          }
        }
      } catch (err: unknown) {
        const error = err as any;
        lastErrorMessage = error?.message || (typeof err === "string" ? err : JSON.stringify(err)) || "";
        console.warn(`model ${model} attempt failed:`, lastErrorMessage);

        const lower = lastErrorMessage.toLowerCase();
        // Check if error was specifically caused by a Gemini safety policy block
        if (
          lower.includes("safety rating") ||
          lower.includes("blocked by safety") ||
          lower.includes("candidate was blocked due to safety")
        ) {
          res.write(`data: ${JSON.stringify({ text: VIOLATION_MESSAGE })}\n\n`);
          streamSuccess = true;
          break;
        }

        // Break immediately on permanent auth/key issues so user does not wait endlessly
        if (
          lower.includes("leaked") ||
          lower.includes("revoked") ||
          lower.includes("permission_denied") ||
          lower.includes("api_key_invalid") ||
          lower.includes("api key not valid")
        ) {
          break;
        }

        // If capacity overloaded (503 / 429 / overloaded), apply exponential backoff with jitter
        if (
          lower.includes("503") ||
          lower.includes("overloaded") ||
          lower.includes("unavailable") ||
          lower.includes("high demand") ||
          lower.includes("429") ||
          lower.includes("resource_exhausted")
        ) {
          const backoffMs = 500 * Math.pow(1.5, modelIdx) + Math.random() * 300;
          await new Promise((resolve) => setTimeout(resolve, backoffMs));
        } else {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }
    }

    if (!streamSuccess && !clientClosed) {
      const lower = (lastErrorMessage || "").toLowerCase();
      let friendlyError =
        "I had a quick connection glitch for a moment. Tap retry or send your message again.";

      if (
        lower.includes("leaked") ||
        lower.includes("revoked") ||
        lower.includes("permission_denied") ||
        lower.includes("api key was reported as leaked")
      ) {
        friendlyError =
          "The Gemini API key was reported as revoked or expired by Google. Please update your GEMINI_API_KEY in the Settings > Secrets panel with a fresh key from Google AI Studio.";
      } else if (
        lower.includes("api_key_invalid") ||
        lower.includes("api key not valid") ||
        lower.includes("not defined")
      ) {
        friendlyError =
          "GEMINI_API_KEY is missing or invalid. Please configure GEMINI_API_KEY in Settings > Secrets.";
      } else if (
        lower.includes("429") ||
        lower.includes("quota") ||
        lower.includes("resource_exhausted")
      ) {
        friendlyError =
          "Gemini API rate limit reached. Please wait a brief moment and tap retry.";
      } else if (
        lower.includes("503") ||
        lower.includes("high demand") ||
        lower.includes("unavailable") ||
        lower.includes("overloaded")
      ) {
        friendlyError =
          "The AI service is experiencing high traffic right now. Please wait a few seconds and tap retry.";
      } else if (lastErrorMessage) {
        friendlyError = `AI service notice: ${lastErrorMessage}`;
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
    res.write(`data: ${JSON.stringify({ error: `AI: ${errText}` })}\n\n`);
    res.write("data: [DONE]\n\n");
    res.end();
  }
}
