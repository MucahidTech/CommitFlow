import { describe, it, expect } from "vitest";
import { openRouterModelSchema, modelsListResponseSchema } from "./openrouter-model";

describe("openRouterModelSchema", () => {
  const validModel = {
    id: "cohere/north-mini-code:free",
    name: "Cohere: North Mini Code",
    description: "A free code model",
    contextLength: 128000,
    isFree: true,
    inputModalities: ["text"],
    outputModalities: ["text"],
    supportedParameters: ["tools", "temperature"],
  };

  it("validates a correctly shaped model object", () => {
    const result = openRouterModelSchema.safeParse(validModel);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe("cohere/north-mini-code:free");
      expect(result.data.isFree).toBe(true);
    }
  });

  it("allows extra unknown fields without failing validation", () => {
    const modelWithExtraFields = {
      ...validModel,
      unknownNewApiField: "some value",
      pricingInfo: { internal: 123 },
    };

    const result = openRouterModelSchema.safeParse(modelWithExtraFields);
    expect(result.success).toBe(true);
  });

  it("fails validation if required fields are missing", () => {
    const invalidModel = {
      name: "Missing ID Model",
      contextLength: 8000,
      isFree: true,
    };

    const result = openRouterModelSchema.safeParse(invalidModel);
    expect(result.success).toBe(false);
  });

  it("validates modelsListResponseSchema structure", () => {
    const response = {
      success: true,
      models: [validModel],
      fetchedAt: new Date().toISOString(),
    };

    const result = modelsListResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
  });
});
