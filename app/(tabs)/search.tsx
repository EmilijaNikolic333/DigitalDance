import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { Avatar } from "@/components/avatar";
import { search, type SearchResults } from "@/services/search";

function formatEventDate(iso: string) {
  const date = new Date(iso);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function SearchScreen() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!trimmed) {
      setResults(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(() => {
      search(trimmed).then(({ data, error: searchError }) => {
        setResults(data);
        setError(searchError ?? null);
        setLoading(false);
      });
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const hasResults = !!results && (results.dancers.length > 0 || results.organizers.length > 0 || results.events.length > 0);

  return (
    <LinearGradient colors={["#F8ECFF", "#D294FB"]} style={styles.background}>
      <View style={styles.header}>
        <Text style={styles.title}>Search</Text>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#9B7FC7" />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search dancers, organizers, auditions..."
            placeholderTextColor="#9B7FC7"
            autoCapitalize="none"
            returnKeyType="search"
          />
          {query.length > 0 ? (
            <Pressable onPress={() => setQuery("")} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color="#9B7FC7" />
            </Pressable>
          ) : null}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {loading ? (
          <ActivityIndicator size="large" color="#093A7D" style={{ marginTop: 40 }} />
        ) : error ? (
          <Text style={styles.emptyText}>Couldn&apos;t search. Check your connection.</Text>
        ) : !query.trim() ? (
          <Text style={styles.emptyText}>Search for dancers, organizers, or auditions by name or description.</Text>
        ) : !hasResults ? (
          <Text style={styles.emptyText}>No results for &quot;{query.trim()}&quot;.</Text>
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

const styles = StyleSheet.create({
  background: { flex: 1 },
  header: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 16, gap: 12 },
  title: { fontSize: 24, fontWeight: "700", color: "#093A7D" },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: "#093A7D" },
  container: { paddingHorizontal: 20, paddingBottom: 40 },
  emptyText: { fontSize: 14, color: "#093A7D", textAlign: "center", marginTop: 40, paddingHorizontal: 16 },
  section: { marginBottom: 20 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#C06BE4",
    textTransform: "uppercase",
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  personRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 10,
    marginBottom: 8,
  },
  personInfo: { flex: 1, gap: 2 },
  personName: { fontSize: 14, fontWeight: "700", color: "#093A7D" },
  personSubtext: { fontSize: 12, color: "#9B7FC7" },
  eventRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 10,
    marginBottom: 8,
  },
  eventCover: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#C06BE4",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  eventCoverImage: { width: "100%", height: "100%" },
});
