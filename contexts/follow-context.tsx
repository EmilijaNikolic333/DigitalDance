import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

interface FollowContextValue {
  isFollowingUser: (userId: string, fallback: boolean) => boolean;
  setFollowingUser: (userId: string, following: boolean) => void;
}

const FollowContext = createContext<FollowContextValue | null>(null);

/**
 * Tracks follow toggles made during this session, app-wide - so every card showing a given
 * author (Feed, someone's profile, event organizer...) reflects a follow/unfollow made anywhere
 * else immediately, including on cards for that author that load later (e.g. scrolling the feed).
 */
export function FollowProvider({ children }: { children: ReactNode }) {
  const [overrides, setOverrides] = useState<Map<string, boolean>>(new Map());

  const isFollowingUser = useCallback((userId: string, fallback: boolean) => overrides.get(userId) ?? fallback, [
    overrides,
  ]);
  const setFollowingUser = useCallback((userId: string, following: boolean) => {
    setOverrides((current) => new Map(current).set(userId, following));
  }, []);

  const value = useMemo(() => ({ isFollowingUser, setFollowingUser }), [isFollowingUser, setFollowingUser]);

  return <FollowContext.Provider value={value}>{children}</FollowContext.Provider>;
}

export function useFollowContext() {
  const ctx = useContext(FollowContext);
  if (!ctx) throw new Error("useFollowContext must be used within a FollowProvider");
  return ctx;
}
