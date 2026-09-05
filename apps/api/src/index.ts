import { createApp } from "./app";
import { env } from "./config/env";

const app = createApp();

app.listen(env.PORT, env.HOST, () => {
  console.log(`🚀 CommitFlow API running at http://${env.HOST}:${env.PORT}`);
  console.log(`   Environment: ${env.NODE_ENV}`);
  console.log(`   Health check: http://${env.HOST}:${env.PORT}/health`);
});
