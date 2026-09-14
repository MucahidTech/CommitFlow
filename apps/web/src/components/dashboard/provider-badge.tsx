"use client";

import { PROVIDER_LABELS } from "@/types/providers";
import type { AiProvider } from "@commitflow/shared";

interface ProviderBadgeProps {
  generator: AiProvider;
  reviewer: AiProvider;
  isConfigured: boolean;
  onClick: () => void;
  disabled?: boolean;
}

/**
 * Compact badge in the header showing AI provider status.
 * Click opens the provider configuration modal.
 */
export function ProviderBadge({
  generator,
  reviewer,
  isConfigured,
  onClick,
  disabled = false,
}: ProviderBadgeProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`
        flex items-center gap-1.5 px-2 py-0.5 rounded border text-[11px] font-mono
        transition-colors cursor-pointer
        ${
          isConfigured
            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
            : "border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
        }
        disabled:opacity-50 disabled:cursor-not-allowed
      `}
      title={isConfigured ? "Providers configured — click to edit" : "Click to configure providers"}
    >
      <span className="text-[10px]">{isConfigured ? "✓" : "!"}</span>
      <span>
        {PROVIDER_LABELS[generator]} → {PROVIDER_LABELS[reviewer]}
      </span>
    </button>
  );
}
