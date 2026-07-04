import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Tabs } from "expo-router";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#C06BE4",
        tabBarInactiveTintColor: "#093A7D",
        headerShown: true,
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
              source={focused ? require("@/assets/images/homePurple.png") : require("@/assets/images/homeBlue.png")}
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
