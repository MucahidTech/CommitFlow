import { useId, type TextareaHTMLAttributes } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({ label, error, className = "", id, ...props }: TextareaProps) {
  const generatedId = useId();
  const textareaId = id || generatedId;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={textareaId} className="text-sm font-medium text-text-muted">
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        className={`
          bg-surface border border-border rounded-lg px-3 py-2 text-text
          placeholder:text-text-muted focus:outline-none focus:ring-2
          focus:ring-primary min-h-32 font-mono text-sm disabled:opacity-50
          disabled:cursor-not-allowed ${error ? "border-red-500" : ""} ${className}
        `}
        {...props}
      />
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}
