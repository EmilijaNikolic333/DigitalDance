import { Stack } from "expo-router";

export default function UserStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="[id]" options={{ presentation: "modal" }} />
    </Stack>
  );
}
