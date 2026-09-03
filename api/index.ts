import type { Request, Response } from "express";

type ExpressApp = (req: Request, res: Response) => void;

let appPromise: Promise<ExpressApp> | undefined;

function getApp() {
  appPromise ??= import("../server").then(({ createApp }) =>
    createApp({ serveFrontend: false }) as Promise<ExpressApp>,
  );
  return appPromise;
}

export default async function handler(req: Request, res: Response) {
  try {
    const app = await getApp();
    return app(req, res);
  } catch (error) {
    console.error("[Serverless Init Error]", error);
    appPromise = undefined;

    const diagnostic = error instanceof Error
      ? `${error.name}: ${error.message}`
          .replaceAll(process.cwd(), "<app>")
          .slice(0, 240)
      : "Unknown initialization error";

    if (!res.headersSent) {
      return res.status(500).json({
        error: "SERVER_INIT_FAILED",
        message: "เซิร์ฟเวอร์เริ่มทำงานไม่สำเร็จ กรุณาลองใหม่อีกครั้ง",
        diagnostic,
      });
    }

    res.end();
  }
}
