import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Avatar } from "@/components/avatar";
import { MyApplicationCard } from "@/components/my-application-card";
import { ProfileEventCard } from "@/components/profile-event-card";
import { ProfileVideoCard } from "@/components/profile-video-card";
import type { Event, Profile, Video } from "@/lib/database.types";
import { getMyApplications, type MyApplication } from "@/services/applications";
import { signOut } from "@/services/auth";
import { getOwnEvents } from "@/services/events";
import { getOwnProfile } from "@/services/profiles";
import { getOwnVideos } from "@/services/videos";

const VISIBLE_ITEMS_LIMIT = 3;

const EXPERIENCE_LABEL: Record<string, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  professional: "Professional",
};

export default function ProfileScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [applications, setApplications] = useState<MyApplication[]>([]);
  const [loading, setLoading] = useState(true);

  // Reload every time the tab regains focus, so edits/new videos/events show up immediately.
  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      Promise.all([getOwnProfile(), getOwnVideos(), getOwnEvents(), getMyApplications(VISIBLE_ITEMS_LIMIT)]).then(
        ([profileData, videosData, eventsData, applicationsData]) => {
          if (isActive) {
            setProfile(profileData);
            setVideos(videosData);
            setEvents(eventsData);
            setApplications(applicationsData);
            setLoading(false);
          }
        }
      );
      return () => {
        isActive = false;
      };
    }, [])
  );

  if (loading) {
    return (
      <LinearGradient colors={["#F8ECFF", "#D294FB"]} style={styles.background}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#093A7D" />
        </View>
      </LinearGradient>
    );
  }

  const isDancer = profile?.is_dancer ?? false;
  const isOrganizer = profile?.is_organizer ?? false;

  const organizerFields = (
    <>
      {profile?.organization_name ? <InfoBlock label="Organization" value={profile.organization_name} /> : null}
      {profile?.website ? <InfoBlock label="Website" value={profile.website} /> : null}
      {profile?.about ? <InfoBlock label="About" value={profile.about} /> : null}
    </>
  );

  const dancerFields = (
    <>
      {profile?.dance_styles && profile.dance_styles.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Dance styles</Text>
          <View style={styles.chipRow}>
            {profile.dance_styles.map((style) => (
              <View key={style} style={styles.chip}>
                <Text style={styles.chipText}>{style}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
      {profile?.experience_level ? (
        <InfoBlock label="Experience" value={EXPERIENCE_LABEL[profile.experience_level]} />
      ) : null}
      {profile?.availability ? <InfoBlock label="Availability" value={profile.availability} /> : null}
    </>
  );

  return (
    <LinearGradient colors={["#F8ECFF", "#D294FB"]} style={styles.background}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <LinearGradient colors={["#093A7D", "#C06BE4"]} style={styles.avatarRing}>
            <View style={styles.avatarGap}>
              <Avatar url={profile?.avatar_url} size={100} />
            </View>
          </LinearGradient>

          <View style={styles.headerButtons}>
            <Image source={require("@/assets/images/icon.png")} style={styles.logoSmall} contentFit="contain" />

            <Pressable style={styles.editButtonSmall} onPress={() => router.push("/(tabs)/profile/edit")}>
              <Text style={styles.editButtonSmallText}>Edit profile</Text>
            </Pressable>

            <Pressable style={styles.logoutButtonSmall} onPress={() => signOut()}>
              <Text style={styles.logoutSmallText}>Log out</Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.name}>{profile?.full_name || "Add your name"}</Text>

        {isDancer && profile?.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}

        {profile?.city ? (
          <View style={styles.row}>
            <Ionicons name="location-outline" size={14} color="#C06BE4" />
            <Text style={styles.rowText}>{profile.city}</Text>
          </View>
        ) : null}

        {isOrganizer && isDancer ? (
          <View style={styles.dualRoleRow}>
            <View style={styles.roleColumn}>{organizerFields}</View>
            <View style={styles.roleColumn}>{dancerFields}</View>
          </View>
        ) : (
          <>
            {isOrganizer && organizerFields}
            {isDancer && dancerFields}
          </>
        )}

        {isOrganizer && (
          <>
            <Pressable
              style={styles.addVideoButton}
              onPress={() => router.push("/(tabs)/profile/new-event")}
            >
              <Ionicons name="add-circle" size={26} color="#093A7D" />
              <Text style={styles.addVideoText}>Add new event</Text>
            </Pressable>
            <Text style={styles.addVideoSubtitle}>Post auditions and events to find your next dancers!</Text>

            {events.length > 0 ? (
              <View style={styles.videosHeadingRow}>
                <Text style={styles.videosHeading}>Your events</Text>
                {events.length > VISIBLE_ITEMS_LIMIT ? (
                  <Pressable onPress={() => router.push("/(tabs)/profile/all-events")}>
                    <Text style={styles.viewAllText}>View all events</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            {events.slice(0, VISIBLE_ITEMS_LIMIT).map((event) => (
              <ProfileEventCard
                key={event.id}
                event={event}
                onEditPress={() => router.push(`/(tabs)/profile/edit-event?id=${event.id}`)}
                onApplicationsPress={() => router.push(`/(tabs)/profile/event-applications?id=${event.id}`)}
              />
            ))}
          </>
        )}

        {isDancer && (
          <>
            <Pressable
              style={styles.addVideoButton}
              onPress={() => router.push("/(tabs)/profile/new-video")}
            >
              <Ionicons name="add-circle" size={26} color="#093A7D" />
              <Text style={styles.addVideoText}>Add new video</Text>
            </Pressable>
            <Text style={styles.addVideoSubtitle}>Post your dance videos and connect with dancers worldwide!</Text>

            {videos.length > 0 ? (
              <View style={styles.videosHeadingRow}>
                <Text style={styles.videosHeading}>Your videos</Text>
                {videos.length > VISIBLE_ITEMS_LIMIT ? (
                  <Pressable onPress={() => router.push("/(tabs)/profile/all-videos")}>
                    <Text style={styles.viewAllText}>View all videos</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            {videos.slice(0, VISIBLE_ITEMS_LIMIT).map((video) => (
              <ProfileVideoCard
                key={video.id}
                video={video}
                onPress={() => router.push(`/(tabs)/profile/watch?url=${encodeURIComponent(video.video_url)}`)}
                onEditPress={() => router.push(`/(tabs)/profile/edit-video?id=${video.id}`)}
              />
            ))}

            {applications.length > 0 ? (
              <View style={styles.videosHeadingRow}>
                <Text style={styles.videosHeading}>Your applications</Text>
                {applications.length >= VISIBLE_ITEMS_LIMIT ? (
                  <Pressable onPress={() => router.push("/(tabs)/profile/all-applications")}>
                    <Text style={styles.viewAllText}>View all applications</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            {applications.map((application) => (
              <MyApplicationCard
                key={application.id}
                application={application}
                onViewDetails={() =>
                  router.push({ pathname: "/event/[id]", params: { id: application.event_id } })
                }
              />
            ))}
          </>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <Text style={styles.sectionValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  container: { flexGrow: 1, alignItems: "center", padding: 24, paddingTop: 40, paddingBottom: 40 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
    width: "100%",
  },
  avatarRing: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignItems: "center",
    justifyContent: "center",
    padding: 3,
  },
  avatarGap: {
    width: 106,
    height: 106,
    borderRadius: 53,
    backgroundColor: "#F8ECFF",
    alignItems: "center",
    justifyContent: "center",
  },
  headerButtons: {
    width: 130,
    alignItems: "center",
    gap: 10,
  },
  logoSmall: { width: "100%", height: 60 },
  editButtonSmall: {
    backgroundColor: "#fff",
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  editButtonSmallText: { color: "#093A7D", fontWeight: "700", fontSize: 11, textAlign: "center" },
  logoutButtonSmall: {
    backgroundColor: "#093A7D",
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 14,
  },
  logoutSmallText: { color: "#fff", fontWeight: "700", fontSize: 11, textAlign: "center" },
  name: { fontSize: 22, fontWeight: "800", color: "#093A7D", marginTop: 16 },
  bio: { fontSize: 14, color: "#093A7D", textAlign: "center", marginTop: 6, paddingHorizontal: 16 },
  row: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  rowText: { fontSize: 13, color: "#C06BE4", fontWeight: "600" },
  dualRoleRow: { flexDirection: "row", width: "100%", marginTop: 20, gap: 12 },
  roleColumn: { flex: 1, alignItems: "center" },
  section: { width: "100%", marginTop: 20, alignItems: "center" },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#C06BE4",
    textTransform: "uppercase",
    marginBottom: 6,
    textAlign: "center",
  },
  videosHeadingRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 24,
  },
  videosHeading: { fontSize: 16, fontWeight: "800", color: "#093A7D" },
  viewAllText: { fontSize: 12, color: "#C06BE4", fontWeight: "700" },
  sectionValue: { fontSize: 15, color: "#093A7D", lineHeight: 21, textAlign: "center" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" },
  chip: {
    backgroundColor: "#fff",
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
  },
  chipText: { color: "#093A7D", fontSize: 13, fontWeight: "600" },
  addVideoButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 28,
    alignSelf: "center",
  },
  addVideoText: { color: "#093A7D", fontWeight: "700", fontSize: 18 },
  addVideoSubtitle: { fontSize: 12, color: "#9B7FC7", marginTop: 4, alignSelf: "center", textAlign: "center" },
});
