// This file can be used for common type definitions across the application.

export interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
  external?: boolean;
  label?: string;
  description?: string;
}

// Example usage for AI flow outputs if needed for more complex state management
// import type { GenerateExamBlueprintOutput } from "@/ai/flows/generate-exam-blueprint";
// export type ExamBlueprint = GenerateExamBlueprintOutput;
