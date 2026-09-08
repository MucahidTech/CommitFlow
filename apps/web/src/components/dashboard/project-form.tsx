"use client";

import { useState } from "react";
import { z } from "zod";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

const projectContextSchema = z.object({
  projectPath: z.string().min(1, "Project path is required"),
  projectName: z.string().min(1, "Project name is required"),
  safeMode: z.boolean(),
});

export type ProjectFormData = z.infer<typeof projectContextSchema>;

interface ProjectFormProps {
  onSubmit: (data: ProjectFormData) => void;
}

export function ProjectForm({ onSubmit }: ProjectFormProps) {
  const [projectPath, setProjectPath] = useState("");
  const [projectName, setProjectName] = useState("");
  const [safeMode, setSafeMode] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const result = projectContextSchema.safeParse({
      projectPath,
      projectName,
      safeMode,
    });

    if (!result.success) {
      const formattedErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        if (issue.path[0]) {
          formattedErrors[issue.path[0].toString()] = issue.message;
        }
      });
      setErrors(formattedErrors);
      return;
    }

    setErrors({});
    onSubmit(result.data);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        label="Project Path"
        placeholder="/absolute/path/to/project"
        value={projectPath}
        onChange={(e) => setProjectPath(e.target.value)}
        error={errors.projectPath}
      />
      <Input
        label="Project Name"
        placeholder="my-project"
        value={projectName}
        onChange={(e) => setProjectName(e.target.value)}
        error={errors.projectName}
      />
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={safeMode}
          onChange={(e) => setSafeMode(e.target.checked)}
          className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
        />
        <span className="text-sm text-text-muted">Safe Mode (preview only, no commits)</span>
      </label>
      <Button type="submit" variant="primary">
        Set Project
      </Button>
    </form>
  );
}
