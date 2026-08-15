import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

interface RepostContextValue {
  isVideoReposted: (id: string, fallback: boolean) => boolean;
  isEventReposted: (id: string, fallback: boolean) => boolean;
  setVideoReposted: (id: string, reposted: boolean) => void;
  setEventReposted: (id: string, reposted: boolean) => void;
}

const RepostContext = createContext<RepostContextValue | null>(null);

/**
 * Tracks repost toggles made during this session, app-wide - so every card showing a given
 * video/event (Feed, Events list, Saved/Reposted tabs, someone's profile...) reflects a toggle
 * made anywhere else immediately, without needing to navigate away and back.
 */
export function RepostProvider({ children }: { children: ReactNode }) {
  const [videoOverrides, setVideoOverrides] = useState<Map<string, boolean>>(new Map());
  const [eventOverrides, setEventOverrides] = useState<Map<string, boolean>>(new Map());

  const isVideoReposted = useCallback(
    (id: string, fallback: boolean) => videoOverrides.get(id) ?? fallback,
    [videoOverrides]
  );
  const isEventReposted = useCallback(
    (id: string, fallback: boolean) => eventOverrides.get(id) ?? fallback,
    [eventOverrides]
  );
  const setVideoReposted = useCallback((id: string, reposted: boolean) => {
    setVideoOverrides((current) => new Map(current).set(id, reposted));
  }, []);
  const setEventReposted = useCallback((id: string, reposted: boolean) => {
    setEventOverrides((current) => new Map(current).set(id, reposted));
  }, []);

  const value = useMemo(
    () => ({ isVideoReposted, isEventReposted, setVideoReposted, setEventReposted }),
    [isVideoReposted, isEventReposted, setVideoReposted, setEventReposted]
  );

  return <RepostContext.Provider value={value}>{children}</RepostContext.Provider>;
}

export function useRepostContext() {
  const ctx = useContext(RepostContext);
  if (!ctx) throw new Error("useRepostContext must be used within a RepostProvider");
  return ctx;
}
