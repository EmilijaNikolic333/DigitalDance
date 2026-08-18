import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/** Asks for OS notification permission if not already granted. */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === "android") {
    // Android 8+ ignores per-notification sound outside of this channel setting.
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.HIGH,
      sound: "default",
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  if (existingStatus === "granted") return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

/** Shows a device notification immediately - not a real push, but works while the app is running. */
export async function showLocalNotification(title: string, body: string, data?: Record<string, unknown>) {
  await Notifications.scheduleNotificationAsync({
    content: { title, body, data, sound: true },
    trigger: null,
  });
}
