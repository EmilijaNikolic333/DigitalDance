import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import MapView, { Marker, type Region } from "react-native-maps";

import { supabase } from "@/lib/supabase";
import type { EventType } from "@/lib/database.types";
import { createEvent, type GeocodedPlace, reverseGeocode, searchPlace, uploadEventCover } from "@/services/events";

const EVENT_TYPES: { value: EventType; label: string }[] = [
  { value: "audition", label: "Audition" },
  { value: "festival", label: "Festival" },
  { value: "workshop", label: "Workshop" },
  { value: "concert", label: "Concert" },
  { value: "music_video", label: "Music video" },
  { value: "promotion", label: "Promotion" },
  { value: "celebration", label: "Celebration" },
  { value: "corporate_event", label: "Corporate event" },
  { value: "other", label: "Other" },
];

const DEFAULT_REGION: Region = {
  latitude: 44.7866,
  longitude: 20.4489,
  latitudeDelta: 0.1,
  longitudeDelta: 0.1,
};

type Step = "form" | "location" | "date" | "time";

function formatDate(date: Date) {
  return date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}

function formatTime(date: Date) {
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export default function NewEventScreen() {
  const [step, setStep] = useState<Step>("form");

  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventType, setEventType] = useState<EventType | null>(null);
  const [requirements, setRequirements] = useState("");
  const [price, setPrice] = useState("");
  const [dateTime, setDateTime] = useState<Date | null>(null);
  const [place, setPlace] = useState<GeocodedPlace | null>(null);

  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // location step local state
  const [locationQuery, setLocationQuery] = useState("");
  const [searchingLocation, setSearchingLocation] = useState(false);
  const [region, setRegion] = useState<Region>(DEFAULT_REGION);
  const [marker, setMarker] = useState<{ latitude: number; longitude: number } | null>(null);

  // date/time step local drafts
  const [dateDraft, setDateDraft] = useState(dateTime ?? new Date());
  const [timeDraft, setTimeDraft] = useState(dateTime ?? new Date());

  const pickCover = async () => {
    setError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError("Photo library access is needed to choose a cover. Please allow it in your device settings.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setCoverUri(result.assets[0].uri);
    }
  };

  const handleSearchLocation = async () => {
    setSearchingLocation(true);
    const result = await searchPlace(locationQuery);
    setSearchingLocation(false);
    if (result) {
      setMarker({ latitude: result.latitude, longitude: result.longitude });
      setRegion({ latitude: result.latitude, longitude: result.longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 });
      setLocationQuery(result.address);
    }
  };

  const handleMapPress = async (coordinate: { latitude: number; longitude: number }) => {
    setMarker(coordinate);
    const resolved = await reverseGeocode(coordinate.latitude, coordinate.longitude, locationQuery || "Selected location");
    setLocationQuery(resolved.address);
  };

  const [locatingMe, setLocatingMe] = useState(false);

  const useCurrentLocation = async () => {
    setError(null);
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) {
      if (permission.canAskAgain) {
        setError("Location access is needed to use your current location.");
      } else {
        // The OS won't show the permission dialog again once denied - offer a
        // one-tap way to fix it in Settings instead of just telling the user to go there.
        Alert.alert(
          "Location access needed",
          "Allow location access in Settings to use your current location.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open Settings", onPress: () => Linking.openSettings() },
          ]
        );
      }
      return;
    }

    setLocatingMe(true);
    const position = await Location.getCurrentPositionAsync({});
    const coordinate = { latitude: position.coords.latitude, longitude: position.coords.longitude };
    const resolved = await reverseGeocode(coordinate.latitude, coordinate.longitude, "Current location");
    setLocatingMe(false);

    setMarker(coordinate);
    setRegion({ ...coordinate, latitudeDelta: 0.05, longitudeDelta: 0.05 });
    setLocationQuery(resolved.address);
  };

  const confirmLocation = () => {
    if (!marker) return;
    const address = locationQuery || "Selected location";
    setPlace({ address, city: address, latitude: marker.latitude, longitude: marker.longitude });
    setStep("form");
  };

  const confirmDate = () => {
    setDateTime((current) => {
      const merged = current ? new Date(current) : new Date();
      merged.setFullYear(dateDraft.getFullYear(), dateDraft.getMonth(), dateDraft.getDate());
      return merged;
    });
    setStep("form");
  };

  const confirmTime = () => {
    setDateTime((current) => {
      const merged = current ? new Date(current) : new Date();
      merged.setHours(timeDraft.getHours(), timeDraft.getMinutes(), 0, 0);
      return merged;
    });
    setStep("form");
  };

  const handleCreate = async () => {
    setError(null);

    if (!title.trim()) {
      setError("Give your event a title.");
      return;
    }
    if (!description.trim()) {
      setError("Write a description.");
      return;
    }
    if (!eventType) {
      setError("Pick an event type.");
      return;
    }
    if (!place) {
      setError("Set a location.");
      return;
    }
    if (!dateTime) {
      setError("Set a date and time.");
      return;
    }

    setPosting(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setPosting(false);
      setError("Not authenticated.");
      return;
    }

    let coverUrl: string | null = null;
    if (coverUri) {
      const { publicUrl, error: uploadError } = await uploadEventCover(user.id, coverUri);
      if (uploadError) {
        setPosting(false);
        setError(`Couldn't upload cover: ${uploadError.message}`);
        return;
      }
      coverUrl = publicUrl ?? null;
    }

    const { error: createError } = await createEvent({
      title: title.trim(),
      description: description.trim(),
      event_type: eventType,
      city: place.city,
      location_lat: place.latitude,
      location_lng: place.longitude,
      event_date: dateTime.toISOString(),
      requirements: requirements.trim(),
      cover_image_url: coverUrl,
      price: price.trim() ? Number(price) : null,
    });

    setPosting(false);

    if (createError) {
      setError(createError.message);
      return;
    }

    router.back();
  };

  if (step === "location") {
    return (
      <View style={styles.flex}>
        <View style={styles.stepHeader}>
          <Pressable onPress={() => setStep("form")} hitSlop={12}>
            <Ionicons name="chevron-back" size={24} color="#093A7D" />
          </Pressable>
          <Text style={styles.stepTitle}>Set location</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.searchRow}>
          <Ionicons name="search" size={18} color="#9B7FC7" />
          <TextInput
            style={styles.searchInput}
            value={locationQuery}
            onChangeText={setLocationQuery}
            placeholder="Search location..."
            placeholderTextColor="#9AA5B8"
            onSubmitEditing={handleSearchLocation}
            returnKeyType="search"
          />
          {searchingLocation ? <ActivityIndicator color="#093A7D" /> : null}
        </View>

        {error ? <Text style={styles.locationError}>{error}</Text> : null}

        <View style={styles.mapWrapper}>
          <MapView
            style={styles.map}
            region={region}
            onPress={(e) => handleMapPress(e.nativeEvent.coordinate)}
          >
            {marker ? (
              <Marker coordinate={marker} anchor={{ x: 0.5, y: 1 }}>
                <View style={styles.markerWrapper}>
                  <View style={styles.markerLabel}>
                    <Text style={styles.markerLabelText} numberOfLines={1}>
                      {locationQuery || "Selected location"}
                    </Text>
                  </View>
                  <Ionicons name="location" size={34} color="#C06BE4" />
                </View>
              </Marker>
            ) : null}
          </MapView>

          <Pressable style={styles.locateButton} onPress={useCurrentLocation} disabled={locatingMe}>
            {locatingMe ? (
              <ActivityIndicator size="small" color="#093A7D" />
            ) : (
              <Ionicons name="locate" size={20} color="#093A7D" />
            )}
          </Pressable>
        </View>

        <Pressable style={styles.confirmButton} onPress={confirmLocation} disabled={!marker}>
          <Text style={styles.confirmButtonText}>Set location</Text>
        </Pressable>
      </View>
    );
  }

  if (step === "date") {
    return (
      <LinearGradient colors={["#F8ECFF", "#D294FB"]} style={styles.flex}>
        <View style={styles.stepHeader}>
          <Pressable onPress={() => setStep("form")} hitSlop={12}>
            <Ionicons name="chevron-back" size={24} color="#093A7D" />
          </Pressable>
          <Text style={styles.stepTitle}>Set date</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.pickerContainer}>
          <View style={styles.calendarCard}>
            <DateTimePicker
              value={dateDraft}
              mode="date"
              display={Platform.OS === "ios" ? "inline" : "default"}
              themeVariant="light"
              accentColor="#C06BE4"
              minimumDate={new Date()}
              onChange={(_, selected) => selected && setDateDraft(selected)}
            />
          </View>
        </View>

        <Pressable style={styles.confirmButton} onPress={confirmDate}>
          <Text style={styles.confirmButtonText}>Set date</Text>
        </Pressable>
      </LinearGradient>
    );
  }

  if (step === "time") {
    return (
      <LinearGradient colors={["#F8ECFF", "#D294FB"]} style={styles.flex}>
        <View style={styles.stepHeader}>
          <Pressable onPress={() => setStep("form")} hitSlop={12}>
            <Ionicons name="chevron-back" size={24} color="#093A7D" />
          </Pressable>
          <Text style={styles.stepTitle}>Set time</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.pickerContainer}>
          <View style={styles.calendarCard}>
            <DateTimePicker
              value={timeDraft}
              mode="time"
              display="spinner"
              themeVariant="light"
              textColor="#093A7D"
              onChange={(_, selected) => selected && setTimeDraft(selected)}
            />
          </View>
        </View>

        <Pressable style={styles.confirmButton} onPress={confirmTime}>
          <Text style={styles.confirmButtonText}>Set time</Text>
        </Pressable>
      </LinearGradient>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <LinearGradient colors={["#F8ECFF", "#D294FB"]} style={styles.background}>
        <ScrollView contentContainerStyle={styles.formContainer} keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => router.back()} style={styles.closeButton} hitSlop={12}>
            <Ionicons name="close" size={26} color="#093A7D" />
          </Pressable>

          <Text style={styles.title}>Add new event</Text>

          <Pressable style={styles.coverBox} onPress={pickCover}>
            {coverUri ? (
              <Image source={{ uri: coverUri }} style={styles.coverImage} contentFit="cover" />
            ) : (
              <>
                <Ionicons name="image-outline" size={28} color="#093A7D" />
                <Text style={styles.coverText}>Upload cover photo</Text>
              </>
            )}
          </Pressable>

          <Text style={styles.label}>Event title</Text>
          <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Event title" placeholderTextColor="#9AA5B8" />

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            value={description}
            onChangeText={setDescription}
            placeholder="What's this event about?"
            placeholderTextColor="#9AA5B8"
            multiline
          />

          <Text style={styles.label}>Event type</Text>
          <View style={styles.chipRow}>
            {EVENT_TYPES.map((t) => (
              <Pressable
                key={t.value}
                style={[styles.chip, eventType === t.value && styles.chipSelected]}
                onPress={() => setEventType(t.value)}
              >
                <Text style={[styles.chipText, eventType === t.value && styles.chipTextSelected]}>{t.label}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Date</Text>
          <Pressable style={styles.fieldButton} onPress={() => setStep("date")}>
            <Ionicons name="calendar-outline" size={18} color="#093A7D" />
            <Text style={styles.fieldButtonText}>{dateTime ? formatDate(dateTime) : "Select date"}</Text>
          </Pressable>

          <Text style={styles.label}>Time</Text>
          <Pressable style={styles.fieldButton} onPress={() => setStep("time")}>
            <Ionicons name="time-outline" size={18} color="#093A7D" />
            <Text style={styles.fieldButtonText}>{dateTime ? formatTime(dateTime) : "Select time"}</Text>
          </Pressable>

          <Text style={styles.label}>Location</Text>
          <Pressable style={styles.fieldButton} onPress={() => setStep("location")}>
            <Ionicons name="location-outline" size={18} color="#093A7D" />
            <Text style={styles.fieldButtonText}>{place ? place.city : "Select location"}</Text>
          </Pressable>

          <Text style={styles.label}>Requirements</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            value={requirements}
            onChangeText={setRequirements}
            placeholder="What are you looking for?"
            placeholderTextColor="#9AA5B8"
            multiline
          />

          <Text style={styles.label}>Price in din (optional)</Text>
          <TextInput
            style={styles.input}
            value={price}
            onChangeText={setPrice}
            placeholder="0 din"
            placeholderTextColor="#9AA5B8"
            keyboardType="numeric"
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable style={styles.postButton} onPress={handleCreate} disabled={posting}>
            {posting ? <ActivityIndicator color="#fff" /> : <Text style={styles.postButtonText}>Create Event</Text>}
          </Pressable>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  background: { flex: 1 },
  formContainer: { flexGrow: 1, alignItems: "center", padding: 24, paddingTop: 60, paddingBottom: 60 },
  closeButton: { position: "absolute", top: 16, left: 16 },
  title: { fontSize: 22, fontWeight: "800", color: "#093A7D", marginBottom: 20 },
  error: { color: "#D0342C", fontSize: 13, marginBottom: 12, textAlign: "center" },
  coverBox: {
    width: "100%",
    height: 140,
    backgroundColor: "#fff",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginBottom: 20,
    overflow: "hidden",
  },
  coverImage: { width: "100%", height: "100%" },
  coverText: { color: "#093A7D", fontSize: 13, fontWeight: "600" },
  label: { fontSize: 14, fontWeight: "700", color: "#093A7D", alignSelf: "flex-start", marginBottom: 6 },
  input: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 12,
    fontSize: 15,
    color: "#093A7D",
    marginBottom: 16,
  },
  inputMultiline: { minHeight: 70, textAlignVertical: "top" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, width: "100%", marginBottom: 16 },
  chip: { backgroundColor: "#fff", paddingVertical: 8, paddingHorizontal: 16, borderRadius: 18 },
  chipSelected: { backgroundColor: "#093A7D" },
  chipText: { color: "#093A7D", fontSize: 13, fontWeight: "600" },
  chipTextSelected: { color: "#fff" },
  fieldButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginBottom: 16,
  },
  fieldButtonText: { color: "#093A7D", fontSize: 15, fontWeight: "600" },
  postButton: {
    marginTop: 10,
    backgroundColor: "#093A7D",
    paddingVertical: 15,
    paddingHorizontal: 48,
    borderRadius: 28,
    alignItems: "center",
    width: "100%",
  },
  postButtonText: { color: "#fff", fontWeight: "700", fontSize: 16 },

  // Step screens (location / date / time)
  stepHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  stepTitle: { fontSize: 18, fontWeight: "800", color: "#093A7D" },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
    marginHorizontal: 20,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 15, color: "#093A7D" },
  locationError: { color: "#D0342C", fontSize: 12, marginHorizontal: 20, marginBottom: 8, textAlign: "center" },
  mapWrapper: { flex: 1 },
  map: { flex: 1 },
  locateButton: {
    position: "absolute",
    bottom: 16,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  markerWrapper: { alignItems: "center" },
  markerLabel: {
    backgroundColor: "#C06BE4",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 12,
    maxWidth: 180,
    marginBottom: 4,
  },
  markerLabelText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  pickerContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  calendarCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 12,
    marginHorizontal: 20,
  },
  confirmButton: {
    backgroundColor: "#093A7D",
    paddingVertical: 15,
    alignItems: "center",
    margin: 20,
    borderRadius: 28,
  },
  confirmButtonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
