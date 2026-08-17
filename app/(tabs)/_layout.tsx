import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Tabs } from "expo-router";

import { useTheme } from "@/contexts/theme-context";

export default function TabLayout() {
  const { darkMode, palette } = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: palette.accent,
        tabBarInactiveTintColor: palette.text,
        tabBarStyle: darkMode ? { backgroundColor: palette.card, borderTopColor: palette.gradient[0] } : undefined,
        headerShown: false,
      }}
    >
      {/* SPOTLIGHT */}
      <Tabs.Screen
        name="index"
        options={{
          title: "Spotlight",
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <Image
              source={
                focused
                  ? require("@/assets/images/homePurple.png")
                  : darkMode
                    ? require("@/assets/images/homeLight.png")
                    : require("@/assets/images/homeBlue.png")
              }
              style={{ width: 24, height: 24 }}
              contentFit="contain"
            />
          ),
        }}
      />

      {/*  EVENTS */}
      <Tabs.Screen
        name="events"
        options={{
          title: "Events",
          tabBarIcon: ({ color }) => (
            <Ionicons name="calendar" size={24} color={color} />
          ),
        }}
      />

      {/*  SEARCH */}
      <Tabs.Screen
        name="search"
        options={{
          title: "Search",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "search" : "search-outline"} size={24} color={color} />
          ),
        }}
      />

      {/*  INBOX */}
      <Tabs.Screen
        name="inbox"
        options={{
          title: "Inbox",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "chatbubbles" : "chatbubbles-outline"} size={24} color={color} />
          ),
        }}
      />

      {/*  PROFILE */}
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "person-circle" : "person-circle-outline"} size={26} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
