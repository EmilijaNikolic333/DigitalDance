import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Avatar } from "@/components/avatar";
import { FollowBadge } from "@/components/follow-badge";
import { FollowListSheet } from "@/components/follow-list-sheet";
import type { Profile } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";
import { getFollowCounts, isFollowing as fetchIsFollowing, toggleFollow } from "@/services/follows";
import { getProfileById } from "@/services/profiles";

const EXPERIENCE_LABEL: Record<string, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  professional: "Professional",
};

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);

  useEffect(() => {
    Promise.all([getProfileById(id), supabase.auth.getUser(), fetchIsFollowing(id), getFollowCounts(id)]).then(
      ([profileResult, { data: userData }, followingResult, counts]) => {
        // Someone else's avatar can point at your own id (e.g. your own video in the public
        // feed, or your own event's organizer row). dismissTo closes any modals stacked in
        // between (event, this screen) so you land cleanly on the real "my profile" tab
        // instead of leaving them stacked underneath.
        if (userData.user?.id === id) {
          router.dismissTo("/(tabs)/profile");
          return;
        }

        setProfile(profileResult.data);
        setLoadError(profileResult.error ?? null);
        setFollowing(followingResult);
        setFollowerCount(counts.followers);
        setFollowingCount(counts.following);
        setLoading(false);
      }
    );
  }, [id]);

  const handleToggleFollow = async () => {
    const nextFollowing = !following;
    setFollowLoading(true);
    setFollowing(nextFollowing);
    setFollowerCount((count) => count + (nextFollowing ? 1 : -1));

    const { following: confirmedFollowing, error } = await toggleFollow(id);
    setFollowLoading(false);

    if (error) {
      setFollowing(!nextFollowing);
      setFollowerCount((count) => count + (nextFollowing ? -1 : 1));
      return;
    }
    setFollowing(confirmedFollowing);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#093A7D" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.centered}>
        <Text style={styles.notFoundText}>{loadError ? "Couldn't load this profile." : "User not found."}</Text>
        <Pressable onPress={() => router.back()} style={styles.closeButtonInline}>
          <Text style={styles.closeButtonInlineText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const isDancer = profile.is_dancer;
  const isOrganizer = profile.is_organizer;

  return (
    <LinearGradient colors={["#F8ECFF", "#D294FB"]} style={styles.background}>
      <ScrollView contentContainerStyle={styles.container}>
        <Pressable onPress={() => router.back()} style={styles.closeButton} hitSlop={12}>
          <Ionicons name="close" size={26} color="#093A7D" />
        </Pressable>

        <View style={styles.avatarWrap}>
          <LinearGradient colors={["#093A7D", "#C06BE4"]} style={styles.avatarRing}>
            <View style={styles.avatarGap}>
              <Avatar url={profile.avatar_url} size={100} />
            </View>
          </LinearGradient>

          {!following ? <FollowBadge onPress={handleToggleFollow} size={28} /> : null}
        </View>

        <Text style={styles.name}>{profile.full_name || "Unnamed user"}</Text>

        {isDancer && profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}

        {profile.city ? (
          <View style={styles.row}>
            <Ionicons name="location-outline" size={14} color="#C06BE4" />
            <Text style={styles.rowText}>{profile.city}</Text>
          </View>
        ) : null}

        <View style={styles.followStatsRow}>
          <Pressable style={styles.followStat} onPress={() => setShowFollowers(true)}>
            <Text style={styles.followStatCount}>{followerCount}</Text>
            <Text style={styles.followStatLabel}>Followers</Text>
          </Pressable>
          <Pressable style={styles.followStat} onPress={() => setShowFollowing(true)}>
            <Text style={styles.followStatCount}>{followingCount}</Text>
            <Text style={styles.followStatLabel}>Following</Text>
          </Pressable>
        </View>

        <View style={styles.actionsRow}>
          <Pressable
            style={[styles.followButton, following && styles.followButtonActive]}
            onPress={handleToggleFollow}
            disabled={followLoading}
          >
            <Text style={[styles.followButtonText, following && styles.followButtonTextActive]}>
              {following ? "Following" : "Follow"}
            </Text>
          </Pressable>

          <Pressable
            style={styles.messageButton}
            onPress={() => router.push({ pathname: "/chat/[id]", params: { id: profile.id } })}
          >
            <Ionicons name="chatbubble-ellipses" size={18} color="#fff" />
            <Text style={styles.messageButtonText}>Message</Text>
          </Pressable>
        </View>

        <View style={styles.sectionDivider} />

        {isOrganizer ? (
          <>
            {profile.organization_name ? <InfoBlock label="Organization" value={profile.organization_name} /> : null}
            {profile.website ? <InfoBlock label="Website" value={profile.website} /> : null}
            {profile.about ? <InfoBlock label="About" value={profile.about} /> : null}
          </>
        ) : null}

        {isDancer ? (
          <>
            {profile.dance_styles && profile.dance_styles.length > 0 ? (
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
            {profile.experience_level ? (
              <InfoBlock label="Experience" value={EXPERIENCE_LABEL[profile.experience_level]} />
            ) : null}
            {profile.availability ? <InfoBlock label="Availability" value={profile.availability} /> : null}
          </>
        ) : null}
      </ScrollView>

      <FollowListSheet userId={id} mode="followers" visible={showFollowers} onClose={() => setShowFollowers(false)} />
      <FollowListSheet userId={id} mode="following" visible={showFollowing} onClose={() => setShowFollowing(false)} />
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
  centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F8ECFF" },
  notFoundText: { fontSize: 15, color: "#093A7D" },
  closeButtonInline: { marginTop: 16 },
  closeButtonInlineText: { color: "#C06BE4", fontWeight: "700", fontSize: 14 },
  container: { flexGrow: 1, alignItems: "center", padding: 24, paddingTop: 60, paddingBottom: 40 },
  closeButton: { position: "absolute", top: 16, left: 16, zIndex: 1 },
  avatarWrap: { width: 112, height: 112 },
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
  name: { fontSize: 22, fontWeight: "700", color: "#093A7D", marginTop: 16 },
  bio: { fontSize: 14, color: "#093A7D", textAlign: "center", marginTop: 6, paddingHorizontal: 16 },
  row: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  rowText: { fontSize: 13, color: "#C06BE4", fontWeight: "700" },
  followStatsRow: { flexDirection: "row", gap: 28, marginTop: 16 },
  followStat: { alignItems: "center" },
  followStatCount: { fontSize: 16, fontWeight: "700", color: "#093A7D" },
  followStatLabel: { fontSize: 11, color: "#9B7FC7", fontWeight: "700", marginTop: 1 },
  actionsRow: { flexDirection: "row", gap: 10, marginTop: 20 },
  followButton: {
    backgroundColor: "#C06BE4",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
  },
  followButtonActive: {
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#C06BE4",
  },
  followButtonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  followButtonTextActive: { color: "#C06BE4" },
  messageButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#093A7D",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
  },
  messageButtonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  sectionDivider: {
    width: "100%",
    height: 2,
    borderRadius: 1,
    backgroundColor: "rgba(192, 107, 228, 0.4)",
    marginTop: 32,
  },
  section: { width: "100%", marginTop: 20, alignItems: "center" },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#C06BE4",
    textTransform: "uppercase",
    marginBottom: 6,
    textAlign: "center",
  },
  sectionValue: { fontSize: 15, color: "#093A7D", lineHeight: 21, textAlign: "center" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" },
  chip: {
    backgroundColor: "#fff",
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
  },
  chipText: { color: "#093A7D", fontSize: 13, fontWeight: "700" },
});
