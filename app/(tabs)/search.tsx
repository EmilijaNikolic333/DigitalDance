import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { Avatar } from "@/components/avatar";
import { useTheme } from "@/contexts/theme-context";
import type { ExperienceLevel } from "@/lib/database.types";
import { DANCE_STYLES, EXPERIENCE_LEVELS } from "@/lib/profile-options";
import { addSearchHistoryEntry, clearSearchHistory, getSearchHistory } from "@/lib/search-history";
import type { Palette } from "@/lib/theme";
import { search, type SearchFilters, type SearchResults } from "@/services/search";

function formatEventDate(iso: string) {
  const date = new Date(iso);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function SearchScreen() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [focused, setFocused] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [danceStyle, setDanceStyle] = useState<string | null>(null);
  const [city, setCity] = useState("");
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { palette } = useTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);

  const activeFilterCount = [danceStyle, city.trim() || null, experienceLevel].filter(Boolean).length;

  const clearFilters = () => {
    setDanceStyle(null);
    setCity("");
    setExperienceLevel(null);
  };

  useEffect(() => {
    getSearchHistory().then(setHistory);
  }, []);

  const saveToHistory = (value: string) => {
    addSearchHistoryEntry(value).then(setHistory);
  };

  const handleSelectHistory = (value: string) => {
    setQuery(value);
    saveToHistory(value);
  };

  const handleClearHistory = () => {
    clearSearchHistory().then(() => setHistory([]));
  };

  useEffect(() => {
    const trimmed = query.trim();
    const trimmedCity = city.trim();
    const filters: SearchFilters = { danceStyle, city: trimmedCity || null, experienceLevel };
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!trimmed && !trimmedCity && !danceStyle && !experienceLevel) {
      setResults(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(() => {
      search(trimmed, filters).then(({ data, error: searchError }) => {
        setResults(data);
        setError(searchError ?? null);
        setLoading(false);
      });
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, danceStyle, city, experienceLevel]);

  const hasResults = !!results && (results.dancers.length > 0 || results.organizers.length > 0 || results.events.length > 0);
  const hasActiveSearch = !!query.trim() || activeFilterCount > 0;

  return (
    <LinearGradient colors={palette.gradient} style={styles.background}>
      <View style={styles.header}>
        <Text style={styles.title}>Search</Text>
        <View style={styles.searchRow}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color={palette.textMuted} />
            <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onSubmitEditing={() => saveToHistory(query)}
              placeholder="Search dancers, organizers, auditions..."
              placeholderTextColor={palette.textMuted}
              autoCapitalize="none"
              returnKeyType="search"
            />
            {query.length > 0 ? (
              <Pressable onPress={() => setQuery("")} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={palette.textMuted} />
              </Pressable>
            ) : null}
          </View>
          <Pressable
            style={[styles.filterToggle, activeFilterCount > 0 && styles.filterToggleActive]}
            onPress={() => setShowFilters((prev) => !prev)}
            hitSlop={8}
          >
            <Ionicons name="options-outline" size={20} color={activeFilterCount > 0 ? "#fff" : palette.text} />
            {activeFilterCount > 0 ? (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>

        {showFilters ? (
          <View style={styles.filtersPanel}>
            <Text style={styles.filterLabel}>Dance style</Text>
            <View style={styles.chipRow}>
              {DANCE_STYLES.map((style) => (
                <Pressable
                  key={style}
                  style={[styles.chip, danceStyle === style && styles.chipActive]}
                  onPress={() => setDanceStyle((prev) => (prev === style ? null : style))}
                >
                  <Text style={[styles.chipText, danceStyle === style && styles.chipTextActive]}>{style}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.filterLabel}>Experience level</Text>
            <View style={styles.chipRow}>
              {EXPERIENCE_LEVELS.map((level) => (
                <Pressable
                  key={level.value}
                  style={[styles.chip, experienceLevel === level.value && styles.chipActive]}
                  onPress={() => setExperienceLevel((prev) => (prev === level.value ? null : level.value))}
                >
                  <Text style={[styles.chipText, experienceLevel === level.value && styles.chipTextActive]}>
                    {level.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.filterLabel}>Location</Text>
            <TextInput
              style={styles.cityInput}
              value={city}
              onChangeText={setCity}
              placeholder="City"
              placeholderTextColor={palette.textMuted}
              autoCapitalize="words"
            />

            {activeFilterCount > 0 ? (
              <Pressable onPress={clearFilters} hitSlop={8} style={styles.clearFiltersButton}>
                <Text style={styles.clearHistoryText}>Clear filters</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>

      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {loading ? (
          <ActivityIndicator size="large" color={palette.text} style={{ marginTop: 40 }} />
        ) : error ? (
          <Text style={styles.emptyText}>Couldn&apos;t search. Check your connection.</Text>
        ) : !hasActiveSearch ? (
          focused && history.length > 0 ? (
            <View style={styles.section}>
              <View style={styles.historyHeader}>
                <Text style={styles.sectionLabel}>Recent searches</Text>
                <Pressable onPress={handleClearHistory} hitSlop={8}>
                  <Text style={styles.clearHistoryText}>Clear</Text>
                </Pressable>
              </View>
              {history.map((entry) => (
                <Pressable key={entry} style={styles.historyRow} onPress={() => handleSelectHistory(entry)}>
                  <Ionicons name="time-outline" size={16} color={palette.textMuted} />
                  <Text style={styles.historyText} numberOfLines={1}>
                    {entry}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyText}>Search for dancers, organizers, or auditions by name or description.</Text>
          )
        ) : !hasResults ? (
          <Text style={styles.emptyText}>
            {query.trim() ? `No results for "${query.trim()}".` : "No results for the selected filters."}
          </Text>
        ) : (
          <>
            {results!.dancers.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Dancers</Text>
                {results!.dancers.map((dancer) => (
                  <Pressable
                    key={dancer.id}
                    style={styles.personRow}
                    onPress={() => router.push({ pathname: "/user/[id]", params: { id: dancer.id } })}
                  >
                    <Avatar url={dancer.avatar_url} size={44} />
                    <View style={styles.personInfo}>
                      <Text style={styles.personName} numberOfLines={1}>
                        {dancer.full_name || "Unnamed dancer"}
                      </Text>
                      <Text style={styles.personSubtext} numberOfLines={1}>
                        {[dancer.city, dancer.dance_styles?.[0]].filter(Boolean).join(" · ") || "Dancer"}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {results!.organizers.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Organizers</Text>
                {results!.organizers.map((organizer) => (
                  <Pressable
                    key={organizer.id}
                    style={styles.personRow}
                    onPress={() => router.push({ pathname: "/user/[id]", params: { id: organizer.id } })}
                  >
                    <Avatar url={organizer.avatar_url} size={44} />
                    <View style={styles.personInfo}>
                      <Text style={styles.personName} numberOfLines={1}>
                        {organizer.organization_name || organizer.full_name || "Unnamed organizer"}
                      </Text>
                      <Text style={styles.personSubtext} numberOfLines={1}>
                        {organizer.city || "Organizer"}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {results!.events.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Auditions & events</Text>
                {results!.events.map((event) => (
                  <Pressable
                    key={event.id}
                    style={styles.eventRow}
                    onPress={() => router.push({ pathname: "/event/[id]", params: { id: event.id } })}
                  >
                    <View style={styles.eventCover}>
                      {event.cover_image_url ? (
                        <Image source={{ uri: event.cover_image_url }} style={styles.eventCoverImage} contentFit="cover" />
                      ) : (
                        <Ionicons name="calendar" size={20} color="#fff" />
                      )}
                    </View>
                    <View style={styles.personInfo}>
                      <Text style={styles.personName} numberOfLines={1}>
                        {event.title}
                      </Text>
                      <Text style={styles.personSubtext} numberOfLines={1}>
                        {formatEventDate(event.event_date)}
                        {event.city ? ` · ${event.city}` : ""}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

function createStyles(p: Palette) {
  return StyleSheet.create({
    background: { flex: 1 },
    header: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 16, gap: 12 },
    title: { fontSize: 24, fontWeight: "700", color: p.text },
    searchRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    searchBar: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: p.card,
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    searchInput: { flex: 1, fontSize: 14, color: p.text },
    filterToggle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: p.card,
      alignItems: "center",
      justifyContent: "center",
    },
    filterToggleActive: { backgroundColor: p.accent },
    filterBadge: {
      position: "absolute",
      top: -4,
      right: -4,
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: p.buttonBg,
      alignItems: "center",
      justifyContent: "center",
    },
    filterBadgeText: { fontSize: 10, fontWeight: "700", color: p.buttonText },
    filtersPanel: {
      marginTop: 12,
      backgroundColor: p.card,
      borderRadius: 16,
      padding: 14,
      gap: 8,
    },
    filterLabel: { fontSize: 12, fontWeight: "700", color: p.text, marginTop: 4 },
    chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 14,
      backgroundColor: p.gradient[0],
    },
    chipActive: { backgroundColor: p.accent },
    chipText: { fontSize: 12, fontWeight: "600", color: p.text, textTransform: "capitalize" },
    chipTextActive: { color: "#fff" },
    cityInput: {
      backgroundColor: p.gradient[0],
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 14,
      color: p.text,
    },
    clearFiltersButton: { alignSelf: "flex-start", marginTop: 4 },
    container: { paddingHorizontal: 20, paddingBottom: 40 },
    emptyText: { fontSize: 14, color: p.text, textAlign: "center", marginTop: 40, paddingHorizontal: 16 },
    section: { marginBottom: 20 },
    sectionLabel: {
      fontSize: 12,
      fontWeight: "700",
      color: p.accent,
      textTransform: "uppercase",
      marginBottom: 8,
      letterSpacing: 0.5,
    },
    historyHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    clearHistoryText: { fontSize: 12, fontWeight: "700", color: p.accent },
    historyRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingVertical: 10,
    },
    historyText: { fontSize: 14, color: p.text, flex: 1 },
    personRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: p.card,
      borderRadius: 16,
      padding: 10,
      marginBottom: 8,
    },
    personInfo: { flex: 1, gap: 2 },
    personName: { fontSize: 14, fontWeight: "700", color: p.text },
    personSubtext: { fontSize: 12, color: p.textMuted },
    eventRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: p.card,
      borderRadius: 16,
      padding: 10,
      marginBottom: 8,
    },
    eventCover: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: p.accent,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    eventCoverImage: { width: "100%", height: "100%" },
  });
}
