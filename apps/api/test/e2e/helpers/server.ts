/**
 * Test helper: start the API server on a random port for E2E tests.
 */

import type { Server } from "node:http";
import { createApp } from "../../../src/app";

export interface TestServer {
  url: string;
  port: number;
  close: () => Promise<void>;
}

/**
 * Start the API server on a random available port.
 * Returns a handle with URL and graceful close function.
 */
export async function startTestServer(): Promise<TestServer> {
  const app = createApp();

  return new Promise((resolve, reject) => {
    const server: Server = app.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("Failed to determine server port"));
        return;
      }

      const port = address.port;
      const url = `http://127.0.0.1:${port}`;

      resolve({
        url,
        port,
        close: () =>
          new Promise<void>((res) => {
            server.close(() => res());
          }),
      });
    });

    server.on("error", reject);
  });
}
