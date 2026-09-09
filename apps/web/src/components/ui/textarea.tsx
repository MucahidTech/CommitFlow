import { useId, type TextareaHTMLAttributes } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({ label, error, className = "", id, ...props }: TextareaProps) {
  const generatedId = useId();
  const textareaId = id || generatedId;

  return (
    <div className="flex flex-col gap-1 flex-1 min-h-0">
      {label && (
        <label htmlFor={textareaId} className="text-xs font-medium text-text-muted">
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        className={`
          w-full flex-1 bg-surface border border-border rounded-lg p-2.5 text-text
          placeholder:text-text-muted focus:outline-none focus:ring-1
          focus:ring-primary font-mono text-xs resize-none disabled:opacity-50
          disabled:cursor-not-allowed ${error ? "border-red-500" : ""} ${className}
        `}
        {...props}
      />
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}
