import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ActionSheet } from "@/components/action-sheet";
import { Avatar } from "@/components/avatar";
import { FollowBadge } from "@/components/follow-badge";
import { FollowListSheet } from "@/components/follow-list-sheet";
import { ProfileEventCard } from "@/components/profile-event-card";
import { ProfileVideoCard } from "@/components/profile-video-card";
import { ReportContentSheet } from "@/components/report-content-sheet";
import { useFollowContext } from "@/contexts/follow-context";
import type { Profile } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";
import { getMyAppliedEventIds } from "@/services/applications";
import { amIBlocking, blockUser, isBlockedEitherWay, unblockUser } from "@/services/blocks";
import { getEventsByOrganizer, type OwnEvent } from "@/services/events";
import { getFollowCounts, isFollowing as fetchIsFollowing, toggleFollow } from "@/services/follows";
import { getProfileById } from "@/services/profiles";
import { getRepostedEventsByUser, type RepostedEventItem } from "@/services/reposted-events";
import { getRepostedVideosByUser, type RepostedVideoItem } from "@/services/reposted-videos";
import { getVideosByUser, type OwnVideo } from "@/services/videos";

const EXPERIENCE_LABEL: Record<string, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  professional: "Professional",
};

type ProfileTab = "videos" | "events" | "reposted";

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [activeTab, setActiveTab] = useState<ProfileTab | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [serverFollowing, setServerFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [videos, setVideos] = useState<OwnVideo[]>([]);
  const [events, setEvents] = useState<OwnEvent[]>([]);
  const [repostedVideos, setRepostedVideos] = useState<RepostedVideoItem[]>([]);
  const [repostedEvents, setRepostedEvents] = useState<RepostedEventItem[]>([]);
  const [repostedSubTab, setRepostedSubTab] = useState<"videos" | "events">("videos");
  const [appliedEventIds, setAppliedEventIds] = useState<Set<string>>(new Set());
  const { isFollowingUser, setFollowingUser } = useFollowContext();
  const following = isFollowingUser(id, serverFollowing);
  const [blockedByMe, setBlockedByMe] = useState(false);
  const [blockedEitherWay, setBlockedEitherWay] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [showReport, setShowReport] = useState(false);

  useFocusEffect(
    useCallback(() => {
      Promise.all([
        getProfileById(id),
        supabase.auth.getUser(),
        fetchIsFollowing(id),
        getFollowCounts(id),
        getVideosByUser(id),
        getEventsByOrganizer(id),
        getMyAppliedEventIds(),
        getRepostedVideosByUser(id),
        getRepostedEventsByUser(id),
        amIBlocking(id),
        isBlockedEitherWay(id),
      ]).then(
        ([
          profileResult,
          { data: userData },
          followingResult,
          counts,
          videosResult,
          eventsResult,
          appliedIds,
          repostedVideosResult,
          repostedEventsResult,
          blockedByMeResult,
          blockedEitherWayResult,
        ]) => {
          // Someone else's avatar can point at your own id (e.g. your own video in the public
          // feed, or your own event's organizer row). Clear away any modals stacked in between
          // (event, this screen) first, then switch to the real "my profile" tab, so nothing is
          // left behind underneath it. dismissAll throws if there's nothing to dismiss.
          if (userData.user?.id === id) {
            if (router.canDismiss()) {
              try {
                router.dismissAll();
              } catch (dismissErr) {
                console.error("user/[id] self-redirect dismissAll failed:", dismissErr);
              }
            }
            router.navigate("/(tabs)/profile");
            return;
          }

          setProfile(profileResult.data);
          setLoadError(profileResult.error ?? null);
          setServerFollowing(followingResult);
          setFollowerCount(counts.followers);
          setFollowingCount(counts.following);
          setVideos(videosResult.data);
          setEvents(eventsResult.data);
          setRepostedVideos(repostedVideosResult.data);
          setRepostedEvents(repostedEventsResult.data);
          setBlockedByMe(blockedByMeResult);
          setBlockedEitherWay(blockedEitherWayResult);
          // Applying/cancelling on the event detail screen and coming back here should
          // refresh which event cards are highlighted - re-fetched on every focus, not just once.
          setAppliedEventIds(appliedIds);
          setActiveTab((current) => current ?? (profileResult.data?.is_dancer ? "videos" : "events"));
          setLoading(false);
        }
      );
    }, [id])
  );

  const handleToggleFollow = async () => {
    const nextFollowing = !following;
    setFollowLoading(true);
    setFollowingUser(id, nextFollowing);
    setFollowerCount((count) => count + (nextFollowing ? 1 : -1));

    const { following: confirmedFollowing, error } = await toggleFollow(id);
    setFollowLoading(false);

    if (error) {
      setFollowingUser(id, !nextFollowing);
      setFollowerCount((count) => count + (nextFollowing ? -1 : 1));
      return;
    }
    setFollowingUser(id, confirmedFollowing);
  };

  const handleToggleBlock = async () => {
    if (blockedByMe) {
      setBlockedByMe(false);
      setBlockedEitherWay(false);
      const { error } = await unblockUser(id);
      if (error) {
        setBlockedByMe(true);
        setBlockedEitherWay(true);
      }
      return;
    }

    setBlockedByMe(true);
    setBlockedEitherWay(true);
    const { error } = await blockUser(id);
    if (error) {
      setBlockedByMe(false);
      setBlockedEitherWay(false);
      return;
    }
    // Blocking unfollows both directions server-side - reflect that immediately everywhere.
    setFollowingUser(id, false);
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

  if (blockedEitherWay) {
    return (
      <LinearGradient colors={["#F8ECFF", "#D294FB"]} style={styles.background}>
        <Pressable onPress={() => router.back()} style={styles.closeButton} hitSlop={12}>
          <Ionicons name="close" size={26} color="#093A7D" />
        </Pressable>
        <View style={styles.centered}>
          <Ionicons name="ban-outline" size={40} color="#093A7D" />
          <Text style={styles.notFoundText}>
            {blockedByMe ? "You blocked this account." : "This profile isn't available."}
          </Text>
          {blockedByMe ? (
            <Pressable onPress={handleToggleBlock} style={styles.closeButtonInline}>
              <Text style={styles.closeButtonInlineText}>Unblock</Text>
            </Pressable>
          ) : null}
        </View>
      </LinearGradient>
    );
  }

  const isDancer = profile.is_dancer;
  const isOrganizer = profile.is_organizer;

  const organizerFields = (
    <>
      {profile.organization_name ? <InfoBlock label="Organization" value={profile.organization_name} /> : null}
      {profile.website ? <InfoBlock label="Website" value={profile.website} /> : null}
      {profile.about ? <InfoBlock label="About" value={profile.about} /> : null}
    </>
  );

  const dancerFields = (
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
  );

  const hasInfoContent =
    (isOrganizer && !!(profile.organization_name || profile.website || profile.about)) ||
    (isDancer && !!(profile.dance_styles?.length || profile.experience_level || profile.availability));

  const profileTabs: { key: ProfileTab; label: string }[] = [
    ...(isDancer ? [{ key: "videos" as const, label: "VIDEOS" }] : []),
    ...(isOrganizer ? [{ key: "events" as const, label: "EVENTS" }] : []),
    { key: "reposted" as const, label: "REPOSTED" },
  ];

  return (
    <LinearGradient colors={["#F8ECFF", "#D294FB"]} style={styles.background}>
      <ScrollView contentContainerStyle={styles.container}>
        <Pressable onPress={() => router.back()} style={styles.closeButton} hitSlop={12}>
          <Ionicons name="close" size={26} color="#093A7D" />
        </Pressable>

        <Pressable onPress={() => setShowOptions(true)} style={styles.optionsButton} hitSlop={12}>
          <Ionicons name="ellipsis-horizontal" size={22} color="#093A7D" />
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

        {hasInfoContent ? (
          <>
            <View style={styles.sectionDivider} />

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
          </>
        ) : null}

        {profileTabs.length > 0 ? (
          <>
            <View style={styles.sectionDivider} />

            <View style={styles.tagRow}>
              {profileTabs.map((tab) => (
                <Pressable
                  key={tab.key}
                  style={[styles.tag, activeTab === tab.key && styles.tagSelected]}
                  onPress={() => setActiveTab(tab.key)}
                >
                  <Text style={[styles.tagText, activeTab === tab.key && styles.tagTextSelected]}>
                    {tab.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {activeTab === "videos" && isDancer ? (
              <View style={styles.tabContent}>
                {videos.length === 0 ? (
                  <Text style={styles.emptyTabText}>No videos yet.</Text>
                ) : (
                  videos.map((video) => (
                    <ProfileVideoCard
                      key={video.id}
                      video={video}
                      onPress={() => router.push({ pathname: "/watch", params: { url: video.video_url, videoId: video.id } })}
                      showSaveButton
                      showRepostButton
                    />
                  ))
                )}
              </View>
            ) : null}

            {activeTab === "events" && isOrganizer ? (
              <View style={styles.tabContent}>
                {events.length === 0 ? (
                  <Text style={styles.emptyTabText}>No events yet.</Text>
                ) : (
                  events.map((event) => (
                    <ProfileEventCard
                      key={event.id}
                      event={event}
                      onPress={() => router.push({ pathname: "/event/[id]", params: { id: event.id } })}
                      isApplied={appliedEventIds.has(event.id)}
                      showSaveButton
                      isSaved={event.isSaved}
                      showRepostButton
                      isReposted={event.isReposted}
                    />
                  ))
                )}
              </View>
            ) : null}

            {activeTab === "reposted" ? (
              <View style={styles.tabContent}>
                <View style={styles.subTagRow}>
                  <Pressable
                    style={[styles.subTag, repostedSubTab === "videos" && styles.subTagSelected]}
                    onPress={() => setRepostedSubTab("videos")}
                  >
                    <Text style={[styles.subTagText, repostedSubTab === "videos" && styles.subTagTextSelected]}>
                      Videos
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[styles.subTag, repostedSubTab === "events" && styles.subTagSelected]}
                    onPress={() => setRepostedSubTab("events")}
                  >
                    <Text style={[styles.subTagText, repostedSubTab === "events" && styles.subTagTextSelected]}>
                      Events
                    </Text>
                  </Pressable>
                </View>

                {repostedSubTab === "videos" ? (
                  repostedVideos.length === 0 ? (
                    <Text style={styles.emptyTabText}>Hasn&apos;t reposted any videos yet.</Text>
                  ) : (
                    repostedVideos.map((video) => (
                      <ProfileVideoCard
                        key={video.id}
                        video={video}
                        onPress={() => router.push({ pathname: "/watch", params: { url: video.video_url, videoId: video.id } })}
                        authorName={video.author?.full_name ?? undefined}
                        authorId={video.author?.id}
                        authorAvatar={video.author?.avatar_url}
                        showSaveButton
                        showRepostButton
                      />
                    ))
                  )
                ) : repostedEvents.length === 0 ? (
                  <Text style={styles.emptyTabText}>Hasn&apos;t reposted any events yet.</Text>
                ) : (
                  repostedEvents.map((event) => (
                    <ProfileEventCard
                      key={event.id}
                      event={event}
                      onPress={() => router.push({ pathname: "/event/[id]", params: { id: event.id } })}
                      isApplied={appliedEventIds.has(event.id)}
                      showSaveButton
                      isSaved={event.isSaved}
                      showRepostButton
                      isReposted={event.isReposted}
                    />
                  ))
                )}
              </View>
            ) : null}
          </>
        ) : null}
      </ScrollView>

      <FollowListSheet userId={id} mode="followers" visible={showFollowers} onClose={() => setShowFollowers(false)} />
      <FollowListSheet userId={id} mode="following" visible={showFollowing} onClose={() => setShowFollowing(false)} />

      <ActionSheet
        visible={showOptions}
        onClose={() => setShowOptions(false)}
        items={[
          {
            key: "block",
            label: "Block user",
            icon: "ban-outline",
            destructive: true,
            onPress: handleToggleBlock,
          },
          {
            key: "report",
            label: "Report content",
            icon: "flag-outline",
            onPress: () => setShowReport(true),
          },
        ]}
      />

      <ReportContentSheet
        visible={showReport}
        onClose={() => setShowReport(false)}
        videos={videos.map((v) => ({ type: "video" as const, id: v.id, title: v.title, thumbnail: v.thumbnail_url }))}
        events={events.map((e) => ({ type: "event" as const, id: e.id, title: e.title, thumbnail: e.cover_image_url }))}
      />
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
  optionsButton: { position: "absolute", top: 16, right: 16, zIndex: 1 },
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
  dualRoleRow: { flexDirection: "row", width: "100%", gap: 12 },
  roleColumn: { flex: 1, alignItems: "center" },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10,
    marginTop: 24,
    width: "100%",
  },
  tag: {
    backgroundColor: "#fff",
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 18,
  },
  tagSelected: { backgroundColor: "#093A7D" },
  tagText: { fontSize: 12, fontWeight: "700", color: "#093A7D", letterSpacing: 0.5 },
  tagTextSelected: { color: "#fff" },
  subTagRow: { flexDirection: "row", gap: 8, marginTop: 14, marginBottom: 4 },
  subTag: {
    borderWidth: 1.5,
    borderColor: "#C06BE4",
    paddingVertical: 5,
    paddingHorizontal: 14,
    borderRadius: 14,
  },
  subTagSelected: { backgroundColor: "#C06BE4" },
  subTagText: { fontSize: 11, fontWeight: "700", color: "#C06BE4" },
  subTagTextSelected: { color: "#fff" },
  tabContent: { width: "100%", alignItems: "center" },
  emptyTabText: { fontSize: 13, color: "#C06BE4", fontWeight: "700", textAlign: "center", marginTop: 20 },
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
