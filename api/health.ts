import type { IncomingMessage, ServerResponse } from "node:http";

export default function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== "GET") {
    res.statusCode = 405;
    res.setHeader("Allow", "GET");
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ status: "error", error: "Method not allowed" }));
    return;
  }

  const provider = (process.env.AI_PROVIDER || "gemini").toLowerCase();
  const aiReady = Boolean(
    process.env.GEMINI_API_KEY || process.env.CENTRAL_GEMINI_API_KEY,
  );

  res.statusCode = 200;
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify({ status: "ok", aiProvider: provider, aiReady }));
}
