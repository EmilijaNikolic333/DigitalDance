import { router } from "expo-router";

/**
 * Navigates to a user's profile from a likes/comments sheet, on top of whatever's currently
 * showing. If `userId` is the profile already being viewed, resets it to its default state
 * (top, default tab) via `replace` instead of stacking a duplicate screen on top. If `userId`
 * is you, `/user/[id]` itself already redirects to your own Profile tab.
 */
export function goToUserProfile(userId: string, viewingProfileId?: string) {
  if (userId === viewingProfileId) {
    router.replace({ pathname: "/user/[id]", params: { id: userId } });
    return;
  }
  router.push({ pathname: "/user/[id]", params: { id: userId } });
}
