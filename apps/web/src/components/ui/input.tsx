import { useId, type InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className = "", id, ...props }: InputProps) {
  const generatedId = useId();
  const inputId = id || generatedId;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-text-muted">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`
          bg-surface border border-border rounded-lg px-3 py-2 text-text
          placeholder:text-text-muted focus:outline-none focus:ring-2
          focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed
          ${error ? "border-red-500" : ""} ${className}
        `}
        {...props}
      />
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}
