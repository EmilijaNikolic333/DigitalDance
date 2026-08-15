import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

interface SavedContextValue {
  isVideoSaved: (id: string, fallback: boolean) => boolean;
  isEventSaved: (id: string, fallback: boolean) => boolean;
  setVideoSaved: (id: string, saved: boolean) => void;
  setEventSaved: (id: string, saved: boolean) => void;
}

const SavedContext = createContext<SavedContextValue | null>(null);

/**
 * Tracks save toggles made during this session, app-wide - so every card showing a given
 * video/event (Feed, Events list, Saved/Reposted tabs, someone's profile...) reflects a toggle
 * made anywhere else immediately, without needing to navigate away and back.
 */
export function SavedProvider({ children }: { children: ReactNode }) {
  const [videoOverrides, setVideoOverrides] = useState<Map<string, boolean>>(new Map());
  const [eventOverrides, setEventOverrides] = useState<Map<string, boolean>>(new Map());

  const isVideoSaved = useCallback(
    (id: string, fallback: boolean) => videoOverrides.get(id) ?? fallback,
    [videoOverrides]
  );
  const isEventSaved = useCallback(
    (id: string, fallback: boolean) => eventOverrides.get(id) ?? fallback,
    [eventOverrides]
  );
  const setVideoSaved = useCallback((id: string, saved: boolean) => {
    setVideoOverrides((current) => new Map(current).set(id, saved));
  }, []);
  const setEventSaved = useCallback((id: string, saved: boolean) => {
    setEventOverrides((current) => new Map(current).set(id, saved));
  }, []);

  const value = useMemo(
    () => ({ isVideoSaved, isEventSaved, setVideoSaved, setEventSaved }),
    [isVideoSaved, isEventSaved, setVideoSaved, setEventSaved]
  );

  return <SavedContext.Provider value={value}>{children}</SavedContext.Provider>;
}

export function useSavedContext() {
  const ctx = useContext(SavedContext);
  if (!ctx) throw new Error("useSavedContext must be used within a SavedProvider");
  return ctx;
}
