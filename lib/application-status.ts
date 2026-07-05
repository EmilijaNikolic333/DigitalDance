import type { Ionicons } from "@expo/vector-icons";

import type { ApplicantStatus } from "@/lib/database.types";

export const APPLICATION_STATUS_LABEL: Record<ApplicantStatus, string> = {
  pending: "Application pending",
  accepted: "Application accepted",
  rejected: "Application rejected",
};

export const APPLICATION_STATUS_STYLE: Record<ApplicantStatus, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  pending: { icon: "time-outline", color: "#093A7D" },
  accepted: { icon: "checkmark-circle", color: "#2E9E5B" },
  rejected: { icon: "close-circle", color: "#D0342C" },
};
