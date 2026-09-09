"use client";

import { useState } from "react";
import { z } from "zod";
import { Textarea } from "../ui/textarea";

const commitPlanSchema = z.string().min(10, "Commit plan must be at least 10 characters");

interface CommitPlanFormProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function CommitPlanForm({ value, onChange, disabled }: CommitPlanFormProps) {
  const [error, setError] = useState<string | undefined>();

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    onChange(val);

    const result = commitPlanSchema.safeParse(val);
    if (!result.success && val.length > 0) {
      setError(result.error.issues[0]?.message);
    } else {
      setError(undefined);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-surface border border-border rounded-lg p-3">
      <Textarea
        label="Commit Plan Input"
        placeholder={
          "001 - feat(shared): scaffold shared package\n002 - feat(shared): define zod schemas\n003 - chore: configure eslint"
        }
        value={value}
        onChange={handleChange}
        error={error}
        disabled={disabled}
      />
    </div>
  );
}
