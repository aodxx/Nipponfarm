import { createApp, startStandaloneServer } from "./appServer.js";

const FIREBASE_RUNTIME_ENV = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
] as const;

export function hasFirebaseRuntimeConfig(env: NodeJS.ProcessEnv = process.env) {
  return FIREBASE_RUNTIME_ENV.every((name) => Boolean(env[name]?.trim()));
}

async function startServer() {
  if (hasFirebaseRuntimeConfig()) {
    await startStandaloneServer();
    return;
  }

  const http = await import("node:http");
  const app = await createApp();
  const port = Number(process.env.PORT || 3000);
  const server = http.createServer(app);

  server.listen(port, "0.0.0.0", () => {
    console.warn(
      `[Startup] Firebase runtime configuration is incomplete. HTTP app is running on port ${port}; daily cron and Live AI WebSocket are disabled until Firebase env is configured.`,
    );
  });
}

startServer().catch((error) => {
  console.error("CRITICAL: Server failed to start:", error);
  process.exitCode = 1;
});
