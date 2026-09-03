import { startStandaloneServer } from "./server";

startStandaloneServer().catch((error) => {
  console.error("CRITICAL: Server failed to start:", error);
  process.exitCode = 1;
});
