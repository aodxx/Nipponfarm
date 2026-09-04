import type { IncomingMessage, ServerResponse } from "node:http";
import { getAiReadiness } from "../server/aiProvider.js";

export default function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== "GET") {
    res.statusCode = 405;
    res.setHeader("Allow", "GET");
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ status: "error", error: "Method not allowed" }));
    return;
  }

  const readiness = getAiReadiness();
  const provider = (process.env.AI_PROVIDER || "gemini").toLowerCase();

  res.statusCode = 200;
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify({
    status: "ok",
    aiProvider: provider,
    aiReady: readiness.ready,
    aiStatus: readiness.ready ? "ready" : readiness.code,
  }));
}
