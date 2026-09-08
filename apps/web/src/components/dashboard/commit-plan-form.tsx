"use client";

import { useState } from "react";
import { z } from "zod";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";

const commitPlanSchema = z.string().min(10, "Commit plan must be at least 10 characters");

interface CommitPlanFormProps {
  onSubmit: (planText: string) => void;
}

export function CommitPlanForm({ onSubmit }: CommitPlanFormProps) {
  const [planText, setPlanText] = useState("");
  const [error, setError] = useState<string | undefined>();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const result = commitPlanSchema.safeParse(planText);

    if (!result.success) {
      setError(result.error.issues[0]?.message);
      return;
    }

    setError(undefined);
    onSubmit(planText);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Textarea
        label="Commit Plan"
        placeholder={
          "Paste your commit plan here...\n\nExample:\n001 - feat: add something\n002 - fix: resolve issue"
        }
        value={planText}
        onChange={(e) => setPlanText(e.target.value)}
        error={error}
        rows={10}
      />
      <Button type="submit" variant="primary">
        Parse Plan
      </Button>
    </form>
  );
}
