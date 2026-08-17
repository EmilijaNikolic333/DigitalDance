import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ActionSheet } from "@/components/action-sheet";
import { Avatar } from "@/components/avatar";
import { FollowListSheet } from "@/components/follow-list-sheet";
import { MyApplicationCard } from "@/components/my-application-card";
import { ProfileEventCard } from "@/components/profile-event-card";
import { ProfileVideoCard } from "@/components/profile-video-card";
import { useRepostContext } from "@/contexts/repost-context";
import { useSavedContext } from "@/contexts/saved-context";
import { useTheme } from "@/contexts/theme-context";
import type { Profile } from "@/lib/database.types";
import { getPalette, type Palette } from "@/lib/theme";
import { supabase } from "@/lib/supabase";
import { getMyApplications, getMyAppliedEventIds, type MyApplication } from "@/services/applications";
import { signOut } from "@/services/auth";
import { getOwnEvents, type OwnEvent } from "@/services/events";
import { getFollowCounts } from "@/services/follows";
import { getOwnProfile } from "@/services/profiles";
import { getUnreadNotificationsCount } from "@/services/notifications";
import { getRepostedEvents, type RepostedEventItem } from "@/services/reposted-events";
import { getRepostedVideos, type RepostedVideoItem } from "@/services/reposted-videos";
import { getSavedEvents, type SavedEventItem } from "@/services/saved-events";
import { getSavedVideos, type SavedVideoItem } from "@/services/saved-videos";
import { getOwnVideos, type OwnVideo } from "@/services/videos";

const VISIBLE_ITEMS_LIMIT = 3;

const EXPERIENCE_LABEL: Record<string, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  professional: "Professional",
};

type ProfileTab = "videos" | "events" | "applications" | "saved" | "reposted";

export default function ProfileScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [activeTab, setActiveTab] = useState<ProfileTab | null>(null);
  const [videos, setVideos] = useState<OwnVideo[]>([]);
  const [events, setEvents] = useState<OwnEvent[]>([]);
  const [applications, setApplications] = useState<MyApplication[]>([]);
  const [savedVideos, setSavedVideos] = useState<SavedVideoItem[]>([]);
  const [savedEvents, setSavedEvents] = useState<SavedEventItem[]>([]);
  const [savedSubTab, setSavedSubTab] = useState<"videos" | "events">("videos");
  const [repostedVideos, setRepostedVideos] = useState<RepostedVideoItem[]>([]);
  const [repostedEvents, setRepostedEvents] = useState<RepostedEventItem[]>([]);
  const [repostedSubTab, setRepostedSubTab] = useState<"videos" | "events">("videos");
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [videosError, setVideosError] = useState<string | null>(null);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [applicationsError, setApplicationsError] = useState<string | null>(null);
  const [savedVideosError, setSavedVideosError] = useState<string | null>(null);
  const [savedEventsError, setSavedEventsError] = useState<string | null>(null);
  const [repostedVideosError, setRepostedVideosError] = useState<string | null>(null);
  const [repostedEventsError, setRepostedEventsError] = useState<string | null>(null);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [appliedEventIds, setAppliedEventIds] = useState<Set<string>>(new Set());
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const previousRoleRef = useRef<string | null>(null);
  const hasLoadedRef = useRef(false);
  const { isVideoReposted, isEventReposted } = useRepostContext();
  const { isVideoSaved, isEventSaved } = useSavedContext();
  const { darkMode, toggleDarkMode, palette } = useTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);

  const load = useCallback(() => {
    if (!hasLoadedRef.current) setLoading(true);
    supabase.auth.getSession().then(({ data: { session } }) => {
      const userId = session?.user?.id;

      Promise.all([
        getOwnProfile(),
        getOwnVideos(),
        getOwnEvents(),
        getMyApplications(VISIBLE_ITEMS_LIMIT + 1),
        userId ? getFollowCounts(userId) : Promise.resolve({ followers: 0, following: 0 }),
        getMyAppliedEventIds(),
        getSavedVideos(),
        getSavedEvents(),
        getRepostedVideos(),
        getRepostedEvents(),
        getUnreadNotificationsCount(),
      ]).then(
        ([
          profileResult,
          videosResult,
          eventsResult,
          applicationsResult,
          followCounts,
          appliedIds,
          savedVideosResult,
          savedEventsResult,
          repostedVideosResult,
          repostedEventsResult,
          unreadCount,
        ]) => {
          setProfile(profileResult.data);
          setProfileError(profileResult.error ?? null);
          setVideos(videosResult.data);
          setVideosError(videosResult.error ?? null);
          setEvents(eventsResult.data);
          setEventsError(eventsResult.error ?? null);
          setApplications(applicationsResult.data);
          setApplicationsError(applicationsResult.error ?? null);
          setAppliedEventIds(appliedIds);
          setSavedVideos(savedVideosResult.data);
          setSavedVideosError(savedVideosResult.error ?? null);
          setSavedEvents(savedEventsResult.data);
          setSavedEventsError(savedEventsResult.error ?? null);
          setRepostedVideos(repostedVideosResult.data);
          setRepostedVideosError(repostedVideosResult.error ?? null);
          setRepostedEvents(repostedEventsResult.data);
          setRepostedEventsError(repostedEventsResult.error ?? null);
          setUnreadNotifications(unreadCount);
          setFollowerCount(followCounts.followers);
          setFollowingCount(followCounts.following);
          // Keep the user's chosen tab across a plain background refocus reload, but jump back
          // to the role default whenever the roles themselves changed (e.g. they just checked
          // "Dancer" on Edit Profile, on top of already being an organizer) - dancer always
          // wins the default regardless of which tab happened to be selected before.
          const roleSignature = `${profileResult.data?.is_dancer}-${profileResult.data?.is_organizer}`;
          const roleChanged = previousRoleRef.current !== null && previousRoleRef.current !== roleSignature;
          previousRoleRef.current = roleSignature;

          setActiveTab((current) => {
            const validTabs: ProfileTab[] = [
              ...(profileResult.data?.is_dancer ? (["videos", "applications"] as const) : []),
              ...(profileResult.data?.is_organizer ? (["events"] as const) : []),
              "saved",
              "reposted",
            ];
            if (!roleChanged && current && validTabs.includes(current)) return current;
            return profileResult.data?.is_dancer ? "videos" : "events";
          });
          setLoading(false);
          hasLoadedRef.current = true;
        }
      );
    });
  }, []);

  // Reload every time the tab regains focus, so edits/new videos/events show up immediately.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading) {
    return (
      <LinearGradient colors={palette.gradient} style={styles.background}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={palette.text} />
        </View>
      </LinearGradient>
    );
  }

  if (profileError && !profile) {
    return (
      <LinearGradient colors={palette.gradient} style={styles.background}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>Couldn&apos;t load your profile. Check your connection.</Text>
          <Pressable style={styles.retryButton} onPress={load}>
            <Text style={styles.retryButtonText}>Try again</Text>
          </Pressable>
        </View>
      </LinearGradient>
    );
  }

  const isDancer = profile?.is_dancer ?? false;
  const isOrganizer = profile?.is_organizer ?? false;

  // Filtered through the repost/saved contexts so toggling anywhere (this screen's other
  // tabs, Feed, Events...) removes an item from view immediately, without a fresh fetch.
  const visibleRepostedVideos = repostedVideos.filter((v) => isVideoReposted(v.id, true));
  const visibleRepostedEvents = repostedEvents.filter((e) => isEventReposted(e.id, true));
  const visibleSavedVideos = savedVideos.filter((v) => isVideoSaved(v.id, true));
  const visibleSavedEvents = savedEvents.filter((e) => isEventSaved(e.id, true));

  const bioMissing = isDancer && !profile?.bio;
  const aboutMissing = isOrganizer && !profile?.about;
  // When someone is both a dancer and an organizer and neither description is filled in,
  // show the "go add one" prompt once above both columns instead of once per column.
  const showSharedBioPrompt = bioMissing && aboutMissing;

  const bioPrompt = (
    <Pressable onPress={() => router.push("/(tabs)/profile/edit")}>
      <Text style={styles.aboutPlaceholder}>Go edit your profile to add bio</Text>
    </Pressable>
  );

  const organizerFields = (
    <>
      {profile?.organization_name ? (
        <InfoBlock label="Organization" value={profile.organization_name} dark={darkMode} />
      ) : null}
      {profile?.about ? (
        <InfoBlock label="About" value={profile.about} dark={darkMode} />
      ) : aboutMissing && !showSharedBioPrompt ? (
        bioPrompt
      ) : null}
      {profile?.website ? <InfoBlock label="Website" value={profile.website} dark={darkMode} /> : null}
    </>
  );

  const profileTabs: { key: ProfileTab; label: string }[] = [
    ...(isDancer ? [{ key: "videos" as const, label: "VIDEOS" }] : []),
    ...(isOrganizer ? [{ key: "events" as const, label: "EVENTS" }] : []),
    ...(isDancer ? [{ key: "applications" as const, label: "APPLICATIONS" }] : []),
    { key: "saved" as const, label: "SAVED" },
    { key: "reposted" as const, label: "REPOSTED" },
  ];

  const dancerFields = (
    <>
      {profile?.bio ? (
        <InfoBlock label="Bio" value={profile.bio} dark={darkMode} />
      ) : bioMissing && !showSharedBioPrompt ? (
        bioPrompt
      ) : null}
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
        <InfoBlock label="Experience" value={EXPERIENCE_LABEL[profile.experience_level]} dark={darkMode} />
      ) : null}
      {profile?.availability ? <InfoBlock label="Availability" value={profile.availability} dark={darkMode} /> : null}
    </>
  );

  return (
    <LinearGradient colors={palette.gradient} style={styles.background}>
      <ScrollView contentContainerStyle={styles.container}>
        {profileError && profile ? (
          <Text style={styles.inlineError}>Couldn&apos;t refresh your profile. Check your connection.</Text>
        ) : null}

        <Pressable style={styles.optionsButton} onPress={() => setShowOptions(true)} hitSlop={12}>
          <Ionicons name="ellipsis-horizontal" size={22} color={palette.text} />
        </Pressable>

        <Pressable
          style={styles.notificationsButton}
          onPress={() => router.push("/(tabs)/profile/notifications")}
          hitSlop={12}
        >
          <Ionicons name="notifications-outline" size={24} color={palette.text} />
          {unreadNotifications > 0 ? <View style={styles.notificationsBadge} /> : null}
        </Pressable>

        <View style={styles.headerRow}>
          <LinearGradient colors={[palette.text, palette.accent]} style={styles.avatarRing}>
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

        {profile?.city ? (
          <View style={styles.row}>
            <Ionicons name="location-outline" size={14} color={palette.accent} />
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

        <View style={styles.sectionDivider} />

        {isOrganizer && isDancer ? (
          <>
            {showSharedBioPrompt ? bioPrompt : null}
            <View style={styles.dualRoleRow}>
              <View style={styles.roleColumn}>{organizerFields}</View>
              <View style={styles.roleColumn}>{dancerFields}</View>
            </View>
          </>
        ) : (
          <>
            {isOrganizer && organizerFields}
            {isDancer && dancerFields}
          </>
        )}

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

            {activeTab === "events" && isOrganizer ? (
              <View style={styles.tabContent}>
                <Pressable
                  style={styles.addVideoButton}
                  onPress={() => router.push("/(tabs)/profile/new-event")}
                >
                  <Ionicons name="add-circle" size={26} color={palette.text} />
                  <Text style={styles.addVideoText}>Add new event</Text>
                </Pressable>
                <Text style={styles.addVideoSubtitle}>Post auditions and events to find your next dancers!</Text>

                {eventsError ? <Text style={styles.inlineError}>Couldn&apos;t load your events.</Text> : null}

                {!eventsError && events.length === 0 ? (
                  <Text style={styles.emptyTabText}>You haven&apos;t posted any events yet.</Text>
                ) : null}

                {events.length > VISIBLE_ITEMS_LIMIT ? (
                  <Pressable style={styles.viewAllRow} onPress={() => router.push("/(tabs)/profile/all-events")}>
                    <Text style={styles.viewAllText}>View all events</Text>
                  </Pressable>
                ) : null}

                {events.slice(0, VISIBLE_ITEMS_LIMIT).map((event) => (
                  <ProfileEventCard
                    key={event.id}
                    event={event}
                    onEditPress={() => router.push(`/(tabs)/profile/edit-event?id=${event.id}`)}
                    onApplicationsPress={() => router.push(`/(tabs)/profile/event-applications?id=${event.id}`)}
                    isApplied={appliedEventIds.has(event.id)}
                  />
                ))}
              </View>
            ) : null}

            {activeTab === "videos" && isDancer ? (
              <View style={styles.tabContent}>
                <Pressable
                  style={styles.addVideoButton}
                  onPress={() => router.push("/(tabs)/profile/new-video")}
                >
                  <Ionicons name="add-circle" size={26} color={palette.text} />
                  <Text style={styles.addVideoText}>Add new video</Text>
                </Pressable>
                <Text style={styles.addVideoSubtitle}>Post your dance videos and connect with dancers worldwide!</Text>

                {videosError ? <Text style={styles.inlineError}>Couldn&apos;t load your videos.</Text> : null}

                {!videosError && videos.length === 0 ? (
                  <Text style={styles.emptyTabText}>You haven&apos;t posted any videos yet.</Text>
                ) : null}

                {videos.length > VISIBLE_ITEMS_LIMIT ? (
                  <Pressable style={styles.viewAllRow} onPress={() => router.push("/(tabs)/profile/all-videos")}>
                    <Text style={styles.viewAllText}>View all videos</Text>
                  </Pressable>
                ) : null}

                {videos.slice(0, VISIBLE_ITEMS_LIMIT).map((video) => (
                  <ProfileVideoCard
                    key={video.id}
                    video={video}
                    onPress={() => router.push(`/(tabs)/profile/watch?url=${encodeURIComponent(video.video_url)}&videoId=${video.id}`)}
                    onEditPress={() => router.push(`/(tabs)/profile/edit-video?id=${video.id}`)}
                  />
                ))}
              </View>
            ) : null}

            {activeTab === "applications" && isDancer ? (
              <View style={styles.tabContent}>
                {applicationsError ? <Text style={styles.inlineError}>Couldn&apos;t load your applications.</Text> : null}

                {!applicationsError && applications.length === 0 ? (
                  <Text style={styles.emptyTabText}>You haven&apos;t applied to any events yet.</Text>
                ) : null}

                {applications.length > VISIBLE_ITEMS_LIMIT ? (
                  <Pressable
                    style={styles.viewAllRow}
                    onPress={() => router.push("/(tabs)/profile/all-applications")}
                  >
                    <Text style={styles.viewAllText}>View all applications</Text>
                  </Pressable>
                ) : null}

                {applications.slice(0, VISIBLE_ITEMS_LIMIT).map((application) => (
                  <MyApplicationCard
                    key={application.id}
                    application={application}
                    onViewDetails={() =>
                      router.push({ pathname: "/event/[id]", params: { id: application.event_id } })
                    }
                  />
                ))}
              </View>
            ) : null}

            {activeTab === "saved" ? (
              <View style={styles.tabContent}>
                <View style={styles.subTagRow}>
                  <Pressable
                    style={[styles.subTag, savedSubTab === "videos" && styles.subTagSelected]}
                    onPress={() => setSavedSubTab("videos")}
                  >
                    <Text style={[styles.subTagText, savedSubTab === "videos" && styles.subTagTextSelected]}>
                      Videos
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[styles.subTag, savedSubTab === "events" && styles.subTagSelected]}
                    onPress={() => setSavedSubTab("events")}
                  >
                    <Text style={[styles.subTagText, savedSubTab === "events" && styles.subTagTextSelected]}>
                      Events
                    </Text>
                  </Pressable>
                </View>

                {savedSubTab === "videos" ? (
                  <>
                    {savedVideosError ? (
                      <Text style={styles.inlineError}>Couldn&apos;t load your saved videos.</Text>
                    ) : null}

                    {!savedVideosError && visibleSavedVideos.length === 0 ? (
                      <Text style={styles.emptyTabText}>You haven&apos;t saved any videos yet.</Text>
                    ) : null}

                    {visibleSavedVideos.length > VISIBLE_ITEMS_LIMIT ? (
                      <Pressable style={styles.viewAllRow} onPress={() => router.push("/(tabs)/profile/all-saved")}>
                        <Text style={styles.viewAllText}>View all saved videos</Text>
                      </Pressable>
                    ) : null}

                    {visibleSavedVideos.slice(0, VISIBLE_ITEMS_LIMIT).map((video) => (
                      <ProfileVideoCard
                        key={video.id}
                        video={video}
                        onPress={() =>
                          router.push(`/(tabs)/profile/watch?url=${encodeURIComponent(video.video_url)}&videoId=${video.id}`)
                        }
                        authorName={video.author?.full_name ?? undefined}
                        authorId={video.author?.id}
                        authorAvatar={video.author?.avatar_url}
                        showSaveButton
                        showRepostButton
                      />
                    ))}
                  </>
                ) : (
                  <>
                    {savedEventsError ? (
                      <Text style={styles.inlineError}>Couldn&apos;t load your saved events.</Text>
                    ) : null}

                    {!savedEventsError && visibleSavedEvents.length === 0 ? (
                      <Text style={styles.emptyTabText}>You haven&apos;t saved any events yet.</Text>
                    ) : null}

                    {visibleSavedEvents.length > VISIBLE_ITEMS_LIMIT ? (
                      <Pressable
                        style={styles.viewAllRow}
                        onPress={() => router.push("/(tabs)/profile/all-saved-events")}
                      >
                        <Text style={styles.viewAllText}>View all saved events</Text>
                      </Pressable>
                    ) : null}

                    {visibleSavedEvents.slice(0, VISIBLE_ITEMS_LIMIT).map((event) => (
                      <ProfileEventCard
                        key={event.id}
                        event={event}
                        onPress={() => router.push({ pathname: "/event/[id]", params: { id: event.id } })}
                        isApplied={appliedEventIds.has(event.id)}
                        showSaveButton
                        isSaved
                        showRepostButton
                        isReposted={event.isReposted}
                      />
                    ))}
                  </>
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
                  <>
                    {repostedVideosError ? (
                      <Text style={styles.inlineError}>Couldn&apos;t load your reposted videos.</Text>
                    ) : null}

                    {!repostedVideosError && visibleRepostedVideos.length === 0 ? (
                      <Text style={styles.emptyTabText}>You haven&apos;t reposted any videos yet.</Text>
                    ) : null}

                    {visibleRepostedVideos.length > VISIBLE_ITEMS_LIMIT ? (
                      <Pressable
                        style={styles.viewAllRow}
                        onPress={() => router.push("/(tabs)/profile/all-reposted")}
                      >
                        <Text style={styles.viewAllText}>View all reposted videos</Text>
                      </Pressable>
                    ) : null}

                    {visibleRepostedVideos.slice(0, VISIBLE_ITEMS_LIMIT).map((video) => (
                      <ProfileVideoCard
                        key={video.id}
                        video={video}
                        onPress={() =>
                          router.push(`/(tabs)/profile/watch?url=${encodeURIComponent(video.video_url)}&videoId=${video.id}`)
                        }
                        authorName={video.author?.full_name ?? undefined}
                        authorId={video.author?.id}
                        authorAvatar={video.author?.avatar_url}
                        showSaveButton
                        showRepostButton
                      />
                    ))}
                  </>
                ) : (
                  <>
                    {repostedEventsError ? (
                      <Text style={styles.inlineError}>Couldn&apos;t load your reposted events.</Text>
                    ) : null}

                    {!repostedEventsError && visibleRepostedEvents.length === 0 ? (
                      <Text style={styles.emptyTabText}>You haven&apos;t reposted any events yet.</Text>
                    ) : null}

                    {visibleRepostedEvents.length > VISIBLE_ITEMS_LIMIT ? (
                      <Pressable
                        style={styles.viewAllRow}
                        onPress={() => router.push("/(tabs)/profile/all-reposted-events")}
                      >
                        <Text style={styles.viewAllText}>View all reposted events</Text>
                      </Pressable>
                    ) : null}

                    {visibleRepostedEvents.slice(0, VISIBLE_ITEMS_LIMIT).map((event) => (
                      <ProfileEventCard
                        key={event.id}
                        event={event}
                        onPress={() => router.push({ pathname: "/event/[id]", params: { id: event.id } })}
                        isApplied={appliedEventIds.has(event.id)}
                        showSaveButton
                        isSaved={event.isSaved}
                        showRepostButton
                        isReposted
                      />
                    ))}
                  </>
                )}
              </View>
            ) : null}
          </>
        ) : null}
      </ScrollView>

      {profile ? (
        <>
          <FollowListSheet
            userId={profile.id}
            mode="followers"
            visible={showFollowers}
            onClose={() => setShowFollowers(false)}
          />
          <FollowListSheet
            userId={profile.id}
            mode="following"
            visible={showFollowing}
            onClose={() => setShowFollowing(false)}
          />
        </>
      ) : null}

      <ActionSheet
        visible={showOptions}
        onClose={() => setShowOptions(false)}
        items={[
          {
            key: "dark-mode",
            label: darkMode ? "Light mode" : "Dark mode",
            icon: darkMode ? "sunny-outline" : "moon-outline",
            onPress: toggleDarkMode,
          },
          {
            key: "blocked",
            label: "Blocked users",
            icon: "ban-outline",
            onPress: () => router.push("/(tabs)/profile/blocked-users"),
          },
          ...(profile?.role === "admin"
            ? [
                {
                  key: "reports",
                  label: "Reported content",
                  icon: "flag-outline" as const,
                  onPress: () => router.push("/(tabs)/profile/reports"),
                },
              ]
            : []),
        ]}
      />
    </LinearGradient>
  );
}

function InfoBlock({ label, value, dark }: { label: string; value: string; dark: boolean }) {
  const p = getPalette(dark);
  return (
    <View style={infoBlockStyles.section}>
      <Text style={[infoBlockStyles.sectionLabel, { color: p.accent }]}>{label}</Text>
      <Text style={[infoBlockStyles.sectionValue, { color: p.text }]}>{value}</Text>
    </View>
  );
}

const infoBlockStyles = StyleSheet.create({
  section: { width: "100%", marginTop: 20, alignItems: "center" },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 6,
    textAlign: "center",
  },
  sectionValue: { fontSize: 15, lineHeight: 21, textAlign: "center" },
});

function createStyles(p: Palette) {
  return StyleSheet.create({
    background: { flex: 1 },
    centered: { flex: 1, justifyContent: "center", alignItems: "center" },
    container: { flexGrow: 1, alignItems: "center", padding: 24, paddingTop: 70, paddingBottom: 40 },
    optionsButton: {
      position: "absolute",
      top: 44,
      left: 16,
      zIndex: 1,
      backgroundColor: p.card,
      borderRadius: 20,
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    notificationsButton: {
      position: "absolute",
      top: 44,
      right: 16,
      zIndex: 1,
      backgroundColor: p.card,
      borderRadius: 20,
      padding: 8,
    },
    notificationsBadge: {
      position: "absolute",
      top: 6,
      right: 6,
      width: 9,
      height: 9,
      borderRadius: 5,
      backgroundColor: p.accent,
      borderWidth: 1.5,
      borderColor: p.card,
    },
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
      backgroundColor: p.card,
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
      backgroundColor: p.card,
      paddingVertical: 6,
      paddingHorizontal: 16,
      borderRadius: 14,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 2,
    },
    editButtonSmallText: { color: p.text, fontWeight: "700", fontSize: 11, textAlign: "center" },
    logoutButtonSmall: {
      backgroundColor: p.buttonBg,
      paddingVertical: 6,
      paddingHorizontal: 16,
      borderRadius: 14,
    },
    logoutSmallText: { color: p.buttonText, fontWeight: "700", fontSize: 11, textAlign: "center" },
    name: { fontSize: 22, fontWeight: "700", color: p.text, marginTop: 16 },
    aboutPlaceholder: {
      fontSize: 13,
      color: p.accent,
      fontWeight: "700",
      textAlign: "center",
      marginTop: 14,
      paddingHorizontal: 16,
    },
    row: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
    rowText: { fontSize: 13, color: p.accent, fontWeight: "700" },
    followStatsRow: { flexDirection: "row", gap: 28, marginTop: 16 },
    followStat: { alignItems: "center" },
    followStatCount: { fontSize: 16, fontWeight: "700", color: p.text },
    followStatLabel: { fontSize: 11, color: p.textMuted, fontWeight: "700", marginTop: 1 },
    dualRoleRow: { flexDirection: "row", width: "100%", marginTop: 20, gap: 12 },
    roleColumn: { flex: 1, alignItems: "center" },
    section: { width: "100%", marginTop: 20, alignItems: "center" },
    sectionLabel: {
      fontSize: 12,
      fontWeight: "700",
      color: p.accent,
      textTransform: "uppercase",
      marginBottom: 6,
      textAlign: "center",
    },
    tagRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "center",
      gap: 10,
      marginTop: 24,
      width: "100%",
    },
    tag: {
      backgroundColor: p.card,
      paddingVertical: 8,
      paddingHorizontal: 18,
      borderRadius: 18,
    },
    tagSelected: { backgroundColor: p.selectedBg },
    tagText: { fontSize: 12, fontWeight: "700", color: p.text, letterSpacing: 0.5 },
    tagTextSelected: { color: p.selectedText },
    subTagRow: { flexDirection: "row", gap: 8, marginTop: 14, marginBottom: 4 },
    subTag: {
      borderWidth: 1.5,
      borderColor: p.accent,
      paddingVertical: 5,
      paddingHorizontal: 14,
      borderRadius: 14,
    },
    subTagSelected: { backgroundColor: p.accent },
    subTagText: { fontSize: 11, fontWeight: "700", color: p.accent },
    subTagTextSelected: { color: "#fff" },
    tabContent: { width: "100%", alignItems: "center" },
    emptyTabText: { fontSize: 13, color: p.accent, fontWeight: "700", textAlign: "center", marginTop: 20 },
    viewAllRow: { width: "100%", alignItems: "flex-end", marginTop: 16 },
    viewAllText: { fontSize: 12, color: p.accent, fontWeight: "700" },
    sectionValue: { fontSize: 15, color: p.text, lineHeight: 21, textAlign: "center" },
    chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" },
    chip: {
      backgroundColor: p.card,
      paddingVertical: 6,
      paddingHorizontal: 14,
      borderRadius: 16,
    },
    chipText: { color: p.text, fontSize: 13, fontWeight: "700" },
    addVideoButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      marginTop: 28,
      alignSelf: "center",
    },
    addVideoText: { color: p.text, fontWeight: "700", fontSize: 18 },
    addVideoSubtitle: { fontSize: 12, color: p.textMuted, marginTop: 4, alignSelf: "center", textAlign: "center" },
    sectionDivider: {
      width: "100%",
      height: 2,
      borderRadius: 1,
      backgroundColor: "rgba(192, 107, 228, 0.4)",
      marginTop: 32,
    },
    errorText: { fontSize: 14, color: p.text, textAlign: "center", paddingHorizontal: 24 },
    retryButton: {
      marginTop: 16,
      backgroundColor: p.buttonBg,
      paddingVertical: 10,
      paddingHorizontal: 24,
      borderRadius: 20,
    },
    retryButtonText: { color: p.buttonText, fontWeight: "700", fontSize: 14 },
    inlineError: { fontSize: 12, color: "#D0342C", marginTop: 10, textAlign: "center" },
  });
}
