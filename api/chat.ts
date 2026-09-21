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
    threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
  },
];

// High-performance candidate models in optimal priority order:
// gemini-3.8-flash with ThinkingLevel.LOW is blazing fast with instant time-to-first-token
export const CANDIDATE_MODELS = [
  "gemini-3.8-flash",
  "gemini-flash-latest",
  "gemini-3.1-flash-lite",
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
STRICT SAFETY RATINGS & ZERO TOLERANCE POLICY (VIOLENCE, KILLS, SELF-HARM):
================================================================================
* You strictly CANNOT talk about, facilitate, roleplay, or encourage:
  1. Violence, murder, killing ("i wanna kill", threats of harm, weapons, bombs).
  2. Suicide, self-harm, cutting, or lethal actions.
  3. Racism, racial slurs, xenophobia, hate speech, or harassment.
  4. NSFW, explicit sexual acts, non-consensual acts, or abuse.
* If the user prompts, asks about, or mentions any of these forbidden topics:
  - You MUST immediately and strictly reply with ONLY:
    "You are violating our rules."
  - Do NOT say anything else. Do NOT engage with the topic. Do NOT offer advice. Simply state:
    "You are violating our rules."
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

export function detectSafetyViolation(text: string): { isViolating: boolean; reason?: string } {
  if (!text) return { isViolating: false };
  const t = text.toLowerCase().trim();

  // 1. Violent threats, killing, murder, self-harm, weapons, terrorism
  // Explicitly matches phrases like "i wanna kill", "want to kill", "wanna kill", etc.
  const dangerousEn =
    /\b(i\s*(wanna|want\s*to|will|gonna|plan\s*to|must|wish\s*to)\s*kill|kill\s+(myself|someone|people|everyone|everybody|him|her|you|them|kids|children|family|all|my)|how\s+to\s+kill|murder\s+(someone|people|him|her|you|them|everyone)|how\s+to\s+murder|suicide|commit\s+suicide|slaughter\s+people|massacre|terroris\w*|make\s+a\s+bomb|build\s+a\s+bomb|pipe\s+bomb|shoot\s+up\s+a|school\s+shooting|cut\s+my\s+wrists|slit\s+(my\s+)?(wrists|throat)|hang\s+myself|poison\s+(someone|people|him|her)|decapitat\w*|die\s+by\s+suicide)\b/i;

  const dangerousRu =
    /\b(я\s*(хочу|буду|планирую|собираюсь|желаю)\s*(убить|убивать|вскрыть|прикончить|взорвать|зарезать|перерезать)|как\s*(убить|совершить\s*теракт|сделать\s*бомбу|изготовить\s*взрывчатку)|убей\s*себя|самоубийств\w*|вскрыть\s*вены|покончить\s*с\s*собой|терракт|теракт|зарезать\s*(кого|всех|людей)|расчлени\w*|массовое\s*убийство)\b/i;

  // 2. Severe hate speech and slurs
  const hateEn =
    /\b(nigger|nigga|chink|kike|gook|spic|faggot|white\s+power|heil\s+hitler|subhuman\s+race)\b/i;
  const hateRu =
    /\b(чурка|чурки|хач|хачи|ниггер|нигер|жид|жидва|хохол|москаль|чучмек|узкоглазый)\b/i;

  // 3. Severe sexual abuse, non-consensual exploitation
  const sexualAbuseEn =
    /\b(rape\b|raping|molest\w*|child\s*porn|pedophil\w*)\b/i;
  const sexualAbuseRu =
    /\b(изнасиловат\w*|педофил\w*|растлени\w*|детск\w*\s*порно)\b/i;

  // 4. Explicit erotic / NSFW
  const nsfwEn =
    /\b(cybersex|sext|horny|orgasm|masturbat\w*|ejaculat\w*|cum\b|cumming|dildo|penis|vagina|boobs|tits|clit|dick|cock\b|pussy|stripping|naked|undress|nsfw|fetish|bdsm|erotic|hard-on|boner|blowjob|handjob|titfuck|creampie)\b/i;
  const nsfwRu =
    /(трах|секс|порно|минет|куни|член|вагин|сиськ|сиськи|сисек|сисечки|дроч|конч|кончать|разденься|голая|голым|потрогать за|возбужд|эрекц|шлюх|отсоси|пососи|вставить|выебать|поцелуй в засос|эротик)/i;
  const erpAction =
    /(\*.*\b(touches|undresses|strips|kisses passionately|caresses your body|enters you|fingers|sucks|groans|moans)\b.*\*)/i;

  if (dangerousEn.test(t) || dangerousRu.test(t)) {
    return { isViolating: true, reason: "dangerous_content" };
  }
  if (hateEn.test(t) || hateRu.test(t)) {
    return { isViolating: true, reason: "hate_speech" };
  }
  if (sexualAbuseEn.test(t) || sexualAbuseRu.test(t)) {
    return { isViolating: true, reason: "sexual_abuse" };
  }
  if (nsfwEn.test(t) || nsfwRu.test(t) || erpAction.test(t)) {
    return { isViolating: true, reason: "prohibited_content" };
  }

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
    const lastUserText = sanitized[sanitized.length - 1]?.text || "";
    const safetyCheck = detectSafetyViolation(lastUserText);

    // If message contains dangerous/harmful content (e.g. "i wanna kill", threats, suicide, violence, hate speech)
    if (safetyCheck.isViolating) {
      res.write(`data: ${JSON.stringify({ text: VIOLATION_MESSAGE })}\n\n`);
      res.write("data: [DONE]\n\n");
      res.end();
      return;
    }

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
        // Fast streaming configuration with minimal thinking latency and strict safety settings
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
        } catch (_cfgErr) {
          // Model might not support thinkingConfig, fallback with safetySettings
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
        }

        let modelYieldedChunk = false;
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
          let fullResponse: any;
          try {
            fullResponse = await ai.models.generateContent({
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
          } catch (_genErr) {
            fullResponse = await ai.models.generateContent({
              model,
              contents,
              config: {
                systemInstruction: finalSystemInstruction,
                temperature: 0.7,
                topP: 0.95,
                safetySettings: GEMINI_SAFETY_SETTINGS,
              },
            });
          }

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
        const error = err as Error;
        lastErrorMessage = error?.message || "";
        console.warn(`model ${model} attempt failed:`, lastErrorMessage);

        const lower = lastErrorMessage.toLowerCase();
        // Check if error was caused by safety filter
        if (
          lower.includes("safety") ||
          lower.includes("blocked") ||
          lower.includes("harm") ||
          lower.includes("violat")
        ) {
          res.write(`data: ${JSON.stringify({ text: VIOLATION_MESSAGE })}\n\n`);
          streamSuccess = true;
          break;
        }
        // Break immediately on permanent auth/quota issues so user does not wait endlessly
        if (
          lower.includes("leaked") ||
          lower.includes("revoked") ||
          lower.includes("permission_denied") ||
          lower.includes("api_key_invalid") ||
          lower.includes("api key not valid")
        ) {
          break;
        }

        await new Promise((resolve) => setTimeout(resolve, 80));
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
          "The Gemini API key was reported as expired or invalid. Please update GEMINI_API_KEY in Settings (Secrets) with a fresh key from Google AI Studio.";
      } else if (
        lower.includes("api_key_invalid") ||
        lower.includes("api key not valid") ||
        lower.includes("not defined")
      ) {
        friendlyError =
          "GEMINI_API_KEY is missing or invalid. Please configure GEMINI_API_KEY in Settings.";
      } else if (
        lower.includes("429") ||
        lower.includes("quota") ||
        lower.includes("resource_exhausted")
      ) {
        friendlyError =
          "Gemini API rate limit reached. Please wait a brief moment and try again.";
      } else if (
        lower.includes("503") ||
        lower.includes("high demand") ||
        lower.includes("unavailable")
      ) {
        friendlyError =
          "The AI service is experiencing high traffic right now. Please try again in a few seconds.";
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
