import type { Response } from "express";

/** A single SSE event message */
export interface SseEvent {
  type: string;
  [key: string]: unknown;
}

/**
 * Server-Sent Events service.
 * Manages connected clients and broadcasts events to them.
 */
export class SseService {
  private static instance: SseService;
  private readonly clients = new Map<string, Set<Response>>();

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private constructor() {}

  /**
   * Get singleton instance.
   */
  public static getInstance(): SseService {
    if (!SseService.instance) {
      SseService.instance = new SseService();
    }
    return SseService.instance;
  }

  /**
   * Add a client connection to a specific stream.
   */
  addClient(streamId: string, res: Response): void {
    if (!this.clients.has(streamId)) {
      this.clients.set(streamId, new Set());
    }

    const streamClients = this.clients.get(streamId);
    streamClients?.add(res);

    // Remove client when connection closes
    res.on("close", () => {
      this.removeClient(streamId, res);
    });
  }

  /**
   * Remove a client from a stream.
   */
  removeClient(streamId: string, res: Response): void {
    const streamClients = this.clients.get(streamId);
    if (streamClients) {
      streamClients.delete(res);
      if (streamClients.size === 0) {
        this.clients.delete(streamId);
      }
    }
  }

  /**
   * Send an event to a specific client.
   */
  send(res: Response, event: SseEvent): void {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  }

  /**
   * Broadcast an event to all clients in a stream.
   */
  broadcast(streamId: string, event: SseEvent): void {
    const streamClients = this.clients.get(streamId);
    if (!streamClients) {
      return;
    }

    for (const client of streamClients) {
      this.send(client, event);
    }
  }

  /**
   * Close all connections in a stream.
   */
  closeStream(streamId: string): void {
    const streamClients = this.clients.get(streamId);
    if (!streamClients) {
      return;
    }

    for (const client of streamClients) {
      client.end();
    }

    this.clients.delete(streamId);
  }

  /**
   * Get number of connected clients in a stream.
   */
  getClientCount(streamId: string): number {
    return this.clients.get(streamId)?.size ?? 0;
  }
}
