"use client";

import { useEffect, useRef, useState } from "react";
import type { OpenRouterModel } from "@commitflow/shared";

const OTHER_VALUE = "__other__";

interface ModelSelectorProps {
  models: OpenRouterModel[];
  selectedModel: string | null;
  isLoading: boolean;
  error: string | null;
  onSelect: (modelId: string | null) => void;
  onRefresh: () => void;
  disabled?: boolean;
}

/**
 * Dropdown for selecting an OpenRouter model.
 * Supports custom/paid model IDs via the "Other" option.
 */
export function ModelSelector({
  models,
  selectedModel,
  isLoading,
  error,
  onSelect,
  onRefresh,
  disabled = false,
}: ModelSelectorProps) {
  const [isOtherMode, setIsOtherMode] = useState(false);
  const [customInput, setCustomInput] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Detect if selected model is custom (not in the free models list)
  useEffect(() => {
    if (selectedModel) {
      const isKnownModel = models.some((m) => m.id === selectedModel);
      if (!isKnownModel && models.length > 0 && !isLoading) {
        setIsOtherMode(true);
        setCustomInput(selectedModel);
      }
    }
  }, [selectedModel, models, isLoading]);

  // Close custom input on outside click if empty
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        if (isOtherMode && !customInput.trim() && !selectedModel) {
          setIsOtherMode(false);
        }
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOtherMode, customInput, selectedModel]);

  const handleChange = (value: string) => {
    if (value === OTHER_VALUE) {
      setIsOtherMode(true);
      setCustomInput(
        selectedModel && !models.some((m) => m.id === selectedModel) ? selectedModel : "",
      );
      return;
    }
    setIsOtherMode(false);
    setCustomInput("");
    onSelect(value || null);
  };

  const handleCustomConfirm = () => {
    const trimmed = customInput.trim();
    if (!trimmed) return;
    onSelect(trimmed);
  };

  const handleCustomCancel = () => {
    setIsOtherMode(false);
    setCustomInput("");
    if (selectedModel && !models.some((m) => m.id === selectedModel)) {
      onSelect(null);
    }
  };

  const currentValue = isOtherMode ? OTHER_VALUE : (selectedModel ?? "");

  return (
    <div className="flex items-center gap-1.5" ref={dropdownRef}>
      <span className="text-[11px] text-text-muted uppercase tracking-wider">Reviewer Model</span>

      {isOtherMode ? (
        <div className="flex items-center gap-1">
          <input
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCustomConfirm();
              if (e.key === "Escape") handleCustomCancel();
            }}
            placeholder="e.g. anthropic/claude-3.5-sonnet or openai/gpt-4o"
            className="w-56 bg-surface border border-border rounded px-2 py-0.5 text-[11px] text-text font-mono placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary"
            autoFocus
            disabled={disabled}
          />
          <button
            type="button"
            onClick={handleCustomConfirm}
            disabled={disabled || !customInput.trim()}
            title="Confirm custom/paid model"
            className="px-1.5 py-0.5 bg-primary text-white rounded text-[11px] hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ✓
          </button>
          <button
            type="button"
            onClick={handleCustomCancel}
            title="Cancel"
            className="px-1.5 py-0.5 bg-border text-text rounded text-[11px] hover:bg-slate-700 transition-colors"
          >
            ✕
          </button>
        </div>
      ) : (
        <select
          value={currentValue}
          onChange={(e) => handleChange(e.target.value)}
          disabled={disabled || isLoading}
          className="bg-surface border border-border rounded px-2 py-0.5 text-[11px] text-text focus:outline-none focus:ring-1 focus:ring-primary max-w-48 truncate cursor-pointer disabled:opacity-50"
        >
          <option value="">-- Use default (env) --</option>
          {models.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name} ({Math.round(model.contextLength / 1000)}K)
            </option>
          ))}
          <option value={OTHER_VALUE}>Other (Custom/Paid)…</option>
        </select>
      )}

      <button
        type="button"
        onClick={onRefresh}
        disabled={disabled || isLoading}
        title="Refresh free models list"
        className="px-1.5 py-0.5 bg-border text-text rounded text-[11px] hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? "..." : "⟳"}
      </button>

      {error && (
        <span className="text-[10px] text-rose-400 ml-1" title={error}>
          ⚠
        </span>
      )}
    </div>
  );
}
