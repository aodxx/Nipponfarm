import "dotenv/config";
import { GoogleGenAI } from "@google/genai";

export type AiProviderName = "gemini";
export type AiReadinessCode = "AI_NOT_CONFIGURED" | "AI_PROVIDER_UNSUPPORTED";

export type AiReadiness = {
  ready: boolean;
  code?: AiReadinessCode;
};

export function getAiProviderName(): AiProviderName {
  const provider = (process.env.AI_PROVIDER || "gemini").toLowerCase();
  if (provider !== "gemini") {
    throw new Error(`Unsupported AI_PROVIDER: ${provider}`);
  }
  return provider;
}

export function getAiReadiness(): AiReadiness {
  try {
    getAiProviderName();
  } catch {
    return { ready: false, code: "AI_PROVIDER_UNSUPPORTED" };
  }

  return process.env.GEMINI_API_KEY || process.env.CENTRAL_GEMINI_API_KEY
    ? { ready: true }
    : { ready: false, code: "AI_NOT_CONFIGURED" };
}

export function isAiConfigured(): boolean {
  return getAiReadiness().ready;
}

export function createAiClient(): GoogleGenAI {
  getAiProviderName();
  const apiKey = process.env.GEMINI_API_KEY || process.env.CENTRAL_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: { headers: { "User-Agent": "nipponfarm-server" } },
  });
}

export const aiModels = {
  vision: process.env.AI_VISION_MODEL || "gemini-2.5-flash",
  text: process.env.AI_TEXT_MODEL || "gemini-2.5-flash",
  speech: process.env.AI_TTS_MODEL || "gemini-3.1-flash-tts-preview",
};
