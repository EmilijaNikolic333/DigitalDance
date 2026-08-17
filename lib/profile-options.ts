import type { ExperienceLevel } from "@/lib/database.types";

export const DANCE_STYLES = ["hip hop", "contemporary", "ballet", "breakdance", "jazz", "latin", "heels"];

export const EXPERIENCE_LEVELS: { value: ExperienceLevel; label: string }[] = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "professional", label: "Professional" },
];
