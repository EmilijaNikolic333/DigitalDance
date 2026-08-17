export interface Palette {
  /** Gradient background colors, light theme first. */
  gradient: [string, string];
  card: string;
  text: string;
  textMuted: string;
  accent: string;
  selectedBg: string;
  selectedText: string;
  buttonBg: string;
  buttonText: string;
}

export const LIGHT_PALETTE: Palette = {
  gradient: ["#F8ECFF", "#D294FB"],
  card: "#fff",
  text: "#093A7D",
  textMuted: "#9B7FC7",
  accent: "#C06BE4",
  selectedBg: "#093A7D",
  selectedText: "#fff",
  buttonBg: "#093A7D",
  buttonText: "#fff",
};

export const DARK_PALETTE: Palette = {
  gradient: ["#1C1235", "#3A2359"],
  card: "#2E2150",
  text: "#7EB6FF",
  textMuted: "#B9A3DE",
  accent: "#C06BE4",
  selectedBg: "#C06BE4",
  selectedText: "#170F2B",
  buttonBg: "#C06BE4",
  buttonText: "#170F2B",
};

export function getPalette(darkMode: boolean): Palette {
  return darkMode ? DARK_PALETTE : LIGHT_PALETTE;
}
