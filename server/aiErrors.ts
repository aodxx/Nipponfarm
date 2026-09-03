import type { Response } from "express";

export type AiErrorCode =
  | "AI_NOT_CONFIGURED"
  | "AI_PROVIDER_UNSUPPORTED"
  | "AI_INVALID_KEY"
  | "AI_QUOTA_EXCEEDED"
  | "AI_PROVIDER_UNAVAILABLE"
  | "AI_INVALID_RESPONSE"
  | "AI_PROVIDER_ERROR";

type AiErrorResult = {
  status: number;
  code: AiErrorCode;
  message: string;
};

const SAFE_MESSAGES: Record<AiErrorCode, string> = {
  AI_NOT_CONFIGURED: "ระบบ AI ยังไม่ได้ตั้งค่า API key กรุณาติดต่อผู้ดูแลระบบ",
  AI_PROVIDER_UNSUPPORTED: "ระบบ AI ตั้งค่า provider ไม่ถูกต้อง กรุณาติดต่อผู้ดูแลระบบ",
  AI_INVALID_KEY: "ระบบ AI ตั้งค่า API key ไม่ถูกต้อง กรุณาติดต่อผู้ดูแลระบบ",
  AI_QUOTA_EXCEEDED: "ระบบ AI หมดโควต้าชั่วคราว กรุณาลองใหม่ภายหลัง",
  AI_PROVIDER_UNAVAILABLE: "ระบบ AI ไม่พร้อมให้บริการชั่วคราว กรุณาลองใหม่อีกครั้ง",
  AI_INVALID_RESPONSE: "ระบบ AI ตอบข้อมูลไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง",
  AI_PROVIDER_ERROR: "ระบบ AI วิเคราะห์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง",
};

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function classifyAiError(error: unknown): AiErrorResult {
  const text = errorText(error).toLowerCase();

  if (text.includes("api key missing") || text.includes("not configured") || text.includes("ai_not_configured")) {
    return { status: 503, code: "AI_NOT_CONFIGURED", message: SAFE_MESSAGES.AI_NOT_CONFIGURED };
  }
  if (text.includes("unsupported ai_provider") || text.includes("unsupported provider") || text.includes("ai_provider_unsupported")) {
    return { status: 503, code: "AI_PROVIDER_UNSUPPORTED", message: SAFE_MESSAGES.AI_PROVIDER_UNSUPPORTED };
  }
  if (text.includes("api_key_invalid") || text.includes("api key invalid") || text.includes("invalid api key") || text.includes("permission denied")) {
    return { status: 502, code: "AI_INVALID_KEY", message: SAFE_MESSAGES.AI_INVALID_KEY };
  }
  if (text.includes("429") || text.includes("resource_exhausted") || text.includes("quota") || text.includes("depleted")) {
    return { status: 429, code: "AI_QUOTA_EXCEEDED", message: SAFE_MESSAGES.AI_QUOTA_EXCEEDED };
  }
  if (text.includes("503") || text.includes("unavailable") || text.includes("deadline") || text.includes("timeout")) {
    return { status: 503, code: "AI_PROVIDER_UNAVAILABLE", message: SAFE_MESSAGES.AI_PROVIDER_UNAVAILABLE };
  }
  if (text.includes("json parse") || text.includes("invalid response") || text.includes("empty response")) {
    return { status: 502, code: "AI_INVALID_RESPONSE", message: SAFE_MESSAGES.AI_INVALID_RESPONSE };
  }
  return { status: 502, code: "AI_PROVIDER_ERROR", message: SAFE_MESSAGES.AI_PROVIDER_ERROR };
}

function safeLogText(error: unknown): string {
  return errorText(error)
    .replace(/bearer\s+[\w.-]+/gi, "Bearer [redacted]")
    .replace(/(api[-_ ]?key|token|secret|password)\s*[:=]\s*[^\s,;]+/gi, "$1=[redacted]")
    .slice(0, 500);
}

export function sendAiError(res: Response, error: unknown): void {
  const result = classifyAiError(error);
  console.error(`[AI] ${result.code}: ${safeLogText(error)}`);
  res.status(result.status).json({ code: result.code, error: result.message });
}
