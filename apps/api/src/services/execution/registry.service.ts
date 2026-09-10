/**
 * Registry for tracking active execution sessions.
 * Provides cooperative cancellation between pause endpoint
 * and orchestrator loops.
 */
export class ExecutionRegistry {
  private static instance: ExecutionRegistry;
  private readonly controllers = new Map<string, AbortController>();

  private constructor() {
    // Private constructor to enforce Singleton pattern
  }

  static getInstance(): ExecutionRegistry {
    if (!ExecutionRegistry.instance) {
      ExecutionRegistry.instance = new ExecutionRegistry();
    }
    return ExecutionRegistry.instance;
  }

  /**
   * Register a new execution session.
   * Returns the AbortController for the session.
   */
  register(sessionId: string): AbortController {
    const controller = new AbortController();
    this.controllers.set(sessionId, controller);
    return controller;
  }

  /**
   * Unregister a session (called on completion or failure).
   */
  unregister(sessionId: string): void {
    this.controllers.delete(sessionId);
  }

  /**
   * Abort a running session.
   * Returns true if the session was active and aborted.
   */
  abort(sessionId: string): boolean {
    const controller = this.controllers.get(sessionId);
    if (!controller) {
      return false;
    }
    controller.abort();
    return true;
  }

  /**
   * Check if a session is registered.
   */
  has(sessionId: string): boolean {
    return this.controllers.has(sessionId);
  }

  /**
   * Get the number of active sessions.
   */
  size(): number {
    return this.controllers.size;
  }

  /**
   * Clear all sessions. Intended for unit tests.
   */
  resetForTesting(): void {
    this.controllers.clear();
  }
}
