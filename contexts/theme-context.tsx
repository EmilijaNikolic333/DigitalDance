import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { getPalette, type Palette } from "@/lib/theme";

const DARK_MODE_STORAGE_KEY = "profile_dark_mode_preview";

interface ThemeContextValue {
  darkMode: boolean;
  toggleDarkMode: () => void;
  palette: Palette;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/** App-wide dark mode toggle - the Feed tab intentionally ignores this and always renders light. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(DARK_MODE_STORAGE_KEY).then((value) => {
      if (value === "true") setDarkMode(true);
    });
  }, []);

  const toggleDarkMode = () => {
    setDarkMode((current) => {
      const next = !current;
      AsyncStorage.setItem(DARK_MODE_STORAGE_KEY, String(next));
      return next;
    });
  };

  const palette = useMemo(() => getPalette(darkMode), [darkMode]);
  const value = useMemo(() => ({ darkMode, toggleDarkMode, palette }), [darkMode, palette]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
