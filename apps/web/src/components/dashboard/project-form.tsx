"use client";

import { useRef, useState } from "react";
import { z } from "zod";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";

const projectContextSchema = z.object({
  projectPath: z.string().min(1, "Project path is required"),
  projectName: z.string().min(1, "Project name is required"),
  description: z.string().max(2000).optional(),
  userContext: z.string().max(10000).optional(),
  safeMode: z.boolean(),
});

export type ProjectFormData = z.infer<typeof projectContextSchema>;

interface ProjectFormProps {
  values: ProjectFormData;
  onChange: (data: ProjectFormData) => void;
  disabled?: boolean;
}

export function ProjectForm({ values, onChange, disabled }: ProjectFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (
    field: keyof ProjectFormData,
    value: ProjectFormData[keyof ProjectFormData],
  ) => {
    const updated = { ...values, [field]: value };
    onChange(updated);

    const result = projectContextSchema.safeParse(updated);
    if (!result.success) {
      const formattedErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        if (issue.path[0]) {
          formattedErrors[issue.path[0].toString()] = issue.message;
        }
      });
      setErrors(formattedErrors);
    } else {
      setErrors({});
    }
  };

  const handleFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const firstFile = files[0];
      if (!firstFile) return;

      const relativePath = firstFile.webkitRelativePath;
      const folderName = relativePath.split("/")[0] || "";

      const fileWithPath = firstFile as File & { path?: string };
      const inferredPath = fileWithPath.path
        ? fileWithPath.path.replace(/[\/\\][^\/\\]+$/, "")
        : folderName;

      const updated = {
        ...values,
        projectPath: inferredPath,
        projectName: values.projectName || folderName,
      };

      onChange(updated);
    }
  };

  return (
    <div className="bg-surface border border-border rounded-lg p-3 text-xs space-y-2.5">
      <div className="flex items-center justify-between border-b border-border pb-1.5">
        <h2 className="font-semibold text-text uppercase tracking-wider text-[11px]">
          Project Setup
        </h2>
        <label className="flex items-center gap-1.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={values.safeMode}
            onChange={(e) => handleChange("safeMode", e.target.checked)}
            disabled={disabled}
            className="w-3.5 h-3.5 rounded border-border text-primary focus:ring-primary cursor-pointer"
          />
          <span className="text-text-muted text-xs">Safe Mode</span>
        </label>
      </div>

      <div className="grid grid-cols-1 gap-2">
        <Input
          label="Project Name"
          placeholder="my-project"
          value={values.projectName}
          onChange={(e) => handleChange("projectName", e.target.value)}
          error={errors.projectName}
          disabled={disabled}
        />

        <div>
          <label className="text-xs font-medium text-text-muted block mb-1">Target Directory</label>
          <div className="flex gap-1.5">
            <input
              type="text"
              placeholder="/absolute/path/to/project"
              value={values.projectPath}
              onChange={(e) => handleChange("projectPath", e.target.value)}
              disabled={disabled}
              className={`
                flex-1 bg-surface border border-border rounded px-2.5 py-1 text-xs text-text font-mono
                placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary
                disabled:opacity-50 disabled:cursor-not-allowed ${errors.projectPath ? "border-red-500" : ""}
              `}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              className="px-2.5 py-1 bg-border hover:bg-slate-700 text-text rounded text-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              Browse
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFolderSelect}
              {...({
                webkitdirectory: "",
                directory: "",
              } as React.InputHTMLAttributes<HTMLInputElement>)}
              className="hidden"
            />
          </div>
          {errors.projectPath && (
            <span className="text-xs text-red-400 mt-1 block">{errors.projectPath}</span>
          )}
        </div>

        <Textarea
          label="Project Vision & Context"
          placeholder="Describe the project's goal, vision, architecture conventions, or specific rules for AI agents..."
          value={values.userContext || ""}
          onChange={(e) => handleChange("userContext", e.target.value)}
          error={errors.userContext}
          disabled={disabled}
          rows={3}
        />
      </div>
    </div>
  );
}
