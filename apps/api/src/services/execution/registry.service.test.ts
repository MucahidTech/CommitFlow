import { describe, it, expect, beforeEach } from "vitest";
import { ExecutionRegistry } from "./registry.service";

describe("ExecutionRegistry", () => {
  let registry: ExecutionRegistry;

  beforeEach(() => {
    registry = ExecutionRegistry.getInstance();
    registry.resetForTesting();
  });

  describe("getInstance", () => {
    it("returns the same instance on multiple calls", () => {
      const instance1 = ExecutionRegistry.getInstance();
      const instance2 = ExecutionRegistry.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe("register", () => {
    it("registers a new session and returns an AbortController", () => {
      const controller = registry.register("test-session-1");
      expect(controller).toBeInstanceOf(AbortController);
      expect(controller.signal.aborted).toBe(false);
      expect(registry.has("test-session-1")).toBe(true);
    });

    it("replaces an existing session with a new controller", () => {
      const first = registry.register("test-session-2");
      const second = registry.register("test-session-2");

      expect(first).not.toBe(second);
      expect(registry.has("test-session-2")).toBe(true);
    });
  });

  describe("unregister", () => {
    it("removes a registered session", () => {
      registry.register("test-session-3");
      expect(registry.has("test-session-3")).toBe(true);

      registry.unregister("test-session-3");
      expect(registry.has("test-session-3")).toBe(false);
    });

    it("does not throw when unregistering non-existent session", () => {
      expect(() => registry.unregister("non-existent")).not.toThrow();
    });
  });

  describe("abort", () => {
    it("aborts a registered session", () => {
      const controller = registry.register("test-session-4");
      const result = registry.abort("test-session-4");

      expect(result).toBe(true);
      expect(controller.signal.aborted).toBe(true);
    });

    it("returns false when aborting non-existent session", () => {
      const result = registry.abort("non-existent");
      expect(result).toBe(false);
    });

    it("does not affect other sessions when aborting one", () => {
      const controllerA = registry.register("test-session-5a");
      const controllerB = registry.register("test-session-5b");

      registry.abort("test-session-5a");

      expect(controllerA.signal.aborted).toBe(true);
      expect(controllerB.signal.aborted).toBe(false);
    });
  });

  describe("has", () => {
    it("returns true for registered session", () => {
      registry.register("test-session-6");
      expect(registry.has("test-session-6")).toBe(true);
    });

    it("returns false for non-registered session", () => {
      expect(registry.has("never-registered")).toBe(false);
    });
  });

  describe("size", () => {
    it("returns the number of registered sessions", () => {
      expect(registry.size()).toBe(0);

      registry.register("test-session-7a");
      registry.register("test-session-7b");
      expect(registry.size()).toBe(2);

      registry.unregister("test-session-7a");
      expect(registry.size()).toBe(1);
    });
  });
});
