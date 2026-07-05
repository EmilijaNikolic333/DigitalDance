import { Stack } from "expo-router";

export default function ProfileStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="edit" options={{ presentation: "modal" }} />
      <Stack.Screen name="new-video" options={{ presentation: "modal" }} />
      <Stack.Screen name="edit-video" options={{ presentation: "modal" }} />
      <Stack.Screen name="all-videos" options={{ presentation: "modal" }} />
      <Stack.Screen name="new-event" options={{ presentation: "modal" }} />
      <Stack.Screen name="edit-event" options={{ presentation: "modal" }} />
      <Stack.Screen name="event-applications" options={{ presentation: "modal" }} />
      <Stack.Screen name="all-events" options={{ presentation: "modal" }} />
      <Stack.Screen name="watch" options={{ presentation: "fullScreenModal" }} />
    </Stack>
  );
}
