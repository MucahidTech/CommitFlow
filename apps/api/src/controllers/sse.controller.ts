import { randomUUID } from "node:crypto";
import type { Request, Response } from "express";
import { SseService, type SseEvent } from "../services/sse/sse.service";

/**
 * SSE Controller.
 * Handles SSE connection setup and event streaming.
 */
export class SseController {
  private readonly sseService: SseService;

  constructor() {
    this.sseService = SseService.getInstance();
  }

  /**
   * Open an SSE connection for a specific execution stream.
   */
  openStream(req: Request, res: Response): void {
    const rawStreamId = req.params.streamId;
    const streamId = typeof rawStreamId === "string" ? rawStreamId : randomUUID();

    // Set SSE headers
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });

    // Send initial connection event
    this.sseService.send(res, {
      type: "connected",
      streamId,
      timestamp: new Date().toISOString(),
    });

    // Register client
    this.sseService.addClient(streamId, res);

    // Send heartbeat every 15s to keep connection alive
    const heartbeat = setInterval(() => {
      this.sseService.send(res, {
        type: "heartbeat",
        timestamp: new Date().toISOString(),
      });
    }, 15000);

    // Clean up on close
    res.on("close", () => {
      clearInterval(heartbeat);
      this.sseService.removeClient(streamId, res);
    });
  }

  /**
   * Broadcast an event to all clients in a stream.
   */
  broadcast(streamId: string, event: SseEvent): void {
    this.sseService.broadcast(streamId, event);
  }

  /**
   * Close all connections for a stream.
   */
  closeStream(streamId: string): void {
    this.sseService.closeStream(streamId);
  }
}
