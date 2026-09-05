import { createApp } from "./app";

const PORT = Number(process.env.PORT ?? 4000);
const HOST = process.env.HOST ?? "0.0.0.0";

const app = createApp();

app.listen(PORT, HOST, () => {
  console.log(`🚀 CommitFlow API running at http://${HOST}:${PORT}`);
  console.log(`   Health check: http://${HOST}:${PORT}/health`);
});
