import { router } from "expo-router";

/**
 * Navigates to a user's profile from a likes/comments sheet, on top of whatever's currently
 * showing. If `userId` is the profile already being viewed, resets it to its default state
 * (top, default tab) via `replace` instead of stacking a duplicate screen on top. If `userId`
 * is you, goes straight to your own Profile tab - pushing another /user/[id] on top of an
 * existing one and relying on its self-redirect leaves the old profile visible underneath
 * until you back out of it, so we skip that screen entirely here.
 */
export function goToUserProfile(userId: string, currentUserId: string | null, viewingProfileId?: string) {
  if (userId === currentUserId) {
    try {
      router.dismissAll();
    } catch (err) {
      console.error("goToUserProfile dismissAll failed:", err);
    }
    router.navigate("/(tabs)/profile");
    return;
  }
  if (userId === viewingProfileId) {
    router.replace({ pathname: "/user/[id]", params: { id: userId } });
    return;
  }
  router.push({ pathname: "/user/[id]", params: { id: userId } });
}
