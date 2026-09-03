import { createApp } from "../server";

let appPromise: ReturnType<typeof createApp> | undefined;

function getApp() {
  appPromise ??= createApp({ serveFrontend: false });
  return appPromise;
}

export default async function handler(req: Parameters<Awaited<ReturnType<typeof createApp>>>[0], res: Parameters<Awaited<ReturnType<typeof createApp>>>[1]) {
  const app = await getApp();
  return app(req, res);
}
