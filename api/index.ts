import { createApp } from "../server";

const app = await createApp({ serveFrontend: false });

export default app;
