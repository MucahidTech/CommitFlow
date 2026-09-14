"use client";

import { useState } from "react";
import type { AiProvider, ProviderConfig } from "@commitflow/shared";
import {
  PROVIDER_BASE_URLS,
  PROVIDER_DEFAULT_MODELS,
  PROVIDER_KEY_HELP,
  PROVIDER_LABELS,
} from "@/types/providers";

interface ProviderConfigModalProps {
  isOpen: boolean;
  generator: ProviderConfig;
  reviewer: ProviderConfig;
  onSave: (generator: ProviderConfig, reviewer: ProviderConfig) => void;
  onClose: () => void;
}

const PROVIDERS: AiProvider[] = ["deepseek", "openrouter", "groq"];

/**
 * Modal for configuring AI providers (generator + reviewer).
 * Stores config in localStorage via useProviders.
 */
export function ProviderConfigModal({
  isOpen,
  generator,
  reviewer,
  onSave,
  onClose,
}: ProviderConfigModalProps) {
  // Local form state — committed only on Save
  const [localGenerator, setLocalGenerator] = useState<ProviderConfig>(generator);
  const [localReviewer, setLocalReviewer] = useState<ProviderConfig>(reviewer);
  const [sameAsGenerator, setSameAsGenerator] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    const finalReviewer = sameAsGenerator ? { ...localGenerator } : localReviewer;
    onSave(localGenerator, finalReviewer);
    onClose();
  };

  const handleClear = () => {
    setLocalGenerator({ provider: "deepseek" });
    setLocalReviewer({ provider: "groq" });
    setSameAsGenerator(false);
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-border rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="text-sm font-semibold text-text">AI Provider Configuration</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-text-muted hover:text-text text-lg leading-none"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          <p className="text-xs text-text-muted">
            API keys are stored in your browser only and sent per-request. They are never persisted
            on the server.
          </p>

          <ProviderEditor
            title="Generator (Code)"
            config={localGenerator}
            onChange={setLocalGenerator}
            showAdvanced={showAdvanced}
            onToggleAdvanced={() => setShowAdvanced((v) => !v)}
          />

          <div className="border-t border-border pt-4">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={sameAsGenerator}
                onChange={(e) => setSameAsGenerator(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-border text-primary"
              />
              <span className="text-xs text-text">Use the same provider for code review</span>
            </label>
          </div>

          {!sameAsGenerator && (
            <ProviderEditor
              title="Reviewer (Review)"
              config={localReviewer}
              onChange={setLocalReviewer}
              showAdvanced={showAdvanced}
              onToggleAdvanced={() => setShowAdvanced((v) => !v)}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border p-4">
          <button
            type="button"
            onClick={handleClear}
            className="text-xs text-text-muted hover:text-text underline"
          >
            Reset to defaults
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs rounded border border-border text-text hover:bg-border transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-3 py-1.5 text-xs rounded bg-primary text-white hover:bg-primary-hover transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ProviderEditorProps {
  title: string;
  config: ProviderConfig;
  onChange: (config: ProviderConfig) => void;
  showAdvanced: boolean;
  onToggleAdvanced: () => void;
}

function ProviderEditor({
  title,
  config,
  onChange,
  showAdvanced,
  onToggleAdvanced,
}: ProviderEditorProps) {
  const handleProviderChange = (provider: AiProvider) => {
    // When provider changes, keep apiKey but clear baseUrl/model overrides
    onChange({ provider, apiKey: config.apiKey });
  };

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-text uppercase tracking-wider">{title}</h3>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-text-muted block mb-1">Provider</label>
          <select
            value={config.provider}
            onChange={(e) => handleProviderChange(e.target.value as AiProvider)}
            className="w-full bg-background border border-border rounded px-2 py-1.5 text-xs text-text"
          >
            {PROVIDERS.map((p) => (
              <option key={p} value={p}>
                {PROVIDER_LABELS[p]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-text-muted block mb-1">API Key</label>
          <input
            type="password"
            value={config.apiKey ?? ""}
            onChange={(e) => onChange({ ...config, apiKey: e.target.value || undefined })}
            placeholder="Enter your API key"
            className="w-full bg-background border border-border rounded px-2 py-1.5 text-xs text-text font-mono"
          />
        </div>
      </div>

      <div className="text-[10px] text-text-muted italic">{PROVIDER_KEY_HELP[config.provider]}</div>

      <button
        type="button"
        onClick={onToggleAdvanced}
        className="text-[11px] text-text-muted hover:text-text underline"
      >
        {showAdvanced ? "Hide" : "Show"} advanced options
      </button>

      {showAdvanced && (
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/50">
          <div>
            <label className="text-xs text-text-muted block mb-1">
              Base URL (default: {PROVIDER_BASE_URLS[config.provider]})
            </label>
            <input
              type="text"
              value={config.baseUrl ?? ""}
              onChange={(e) => onChange({ ...config, baseUrl: e.target.value || undefined })}
              placeholder={PROVIDER_BASE_URLS[config.provider]}
              className="w-full bg-background border border-border rounded px-2 py-1.5 text-xs text-text font-mono"
            />
          </div>

          <div>
            <label className="text-xs text-text-muted block mb-1">
              Model (default: {PROVIDER_DEFAULT_MODELS[config.provider]})
            </label>
            <input
              type="text"
              value={config.model ?? ""}
              onChange={(e) => onChange({ ...config, model: e.target.value || undefined })}
              placeholder={PROVIDER_DEFAULT_MODELS[config.provider]}
              className="w-full bg-background border border-border rounded px-2 py-1.5 text-xs text-text font-mono"
            />
          </div>
        </div>
      )}
    </div>
  );
}
