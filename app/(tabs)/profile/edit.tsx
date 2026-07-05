import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { Avatar } from "@/components/avatar";
import type { ExperienceLevel } from "@/lib/database.types";
import { changePassword } from "@/services/auth";
import { getOwnProfile, updateOwnProfile, uploadAvatar } from "@/services/profiles";

const NAME_MAX = 50;
const TEXT_MAX = 150;

const DANCE_STYLES = ["hip hop", "contemporary", "ballet", "breakdance", "jazz", "latin"];
const EXPERIENCE_LEVELS: { value: ExperienceLevel; label: string }[] = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "professional", label: "Professional" },
];

export default function EditProfileScreen() {
  const [userId, setUserId] = useState<string | null>(null);
  const [isDancer, setIsDancer] = useState(false);
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [localImageUri, setLocalImageUri] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [city, setCity] = useState("");

  // dancer fields
  const [bio, setBio] = useState("");
  const [danceStyles, setDanceStyles] = useState<string[]>([]);
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel | null>(null);
  const [availability, setAvailability] = useState("");

  // organizer fields
  const [about, setAbout] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [website, setWebsite] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    getOwnProfile().then((profile) => {
      if (profile) {
        setUserId(profile.id);
        setIsDancer(profile.is_dancer);
        setIsOrganizer(profile.is_organizer);
        setAvatarUrl(profile.avatar_url);
        setName(profile.full_name ?? "");
        setCity(profile.city ?? "");
        setBio(profile.bio ?? "");
        setDanceStyles(profile.dance_styles ?? []);
        setExperienceLevel(profile.experience_level);
        setAvailability(profile.availability ?? "");
        setAbout(profile.about ?? "");
        setOrganizationName(profile.organization_name ?? "");
        setWebsite(profile.website ?? "");
      }
      setLoading(false);
    });
  }, []);

  const toggleDanceStyle = (style: string) => {
    setDanceStyles((current) =>
      current.includes(style) ? current.filter((s) => s !== style) : [...current, style]
    );
  };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError("Allow photo library access to change your picture.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      setLocalImageUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    setError(null);

    if (!name.trim()) {
      setError("Name can't be empty.");
      return;
    }
    if (!isDancer && !isOrganizer) {
      setError("Choose at least one: dancer or organizer.");
      return;
    }

    setSaving(true);

    let newAvatarUrl = avatarUrl;
    if (localImageUri && userId) {
      const { publicUrl, error: uploadError } = await uploadAvatar(userId, localImageUri);
      if (uploadError) {
        setSaving(false);
        setError(`Couldn't upload picture: ${uploadError.message}`);
        return;
      }
      newAvatarUrl = publicUrl ?? newAvatarUrl;
    }

    const { error: updateError } = await updateOwnProfile({
      full_name: name.trim(),
      city: city.trim(),
      is_dancer: isDancer,
      is_organizer: isOrganizer,
      ...(newAvatarUrl ? { avatar_url: newAvatarUrl } : {}),
      ...(isDancer
        ? {
            bio: bio.trim(),
            dance_styles: danceStyles,
            experience_level: experienceLevel,
            availability: availability.trim(),
          }
        : {}),
      ...(isOrganizer
        ? {
            about: about.trim(),
            organization_name: organizationName.trim(),
            website: website.trim(),
          }
        : {}),
    });

    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    router.back();
  };

  const handleChangePassword = async () => {
    setPasswordError(null);

    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords don't match.");
      return;
    }

    setPasswordSaving(true);
    const { error: passwordUpdateError } = await changePassword(newPassword);
    setPasswordSaving(false);

    if (passwordUpdateError) {
      setPasswordError(passwordUpdateError.message);
      return;
    }

    setShowPasswordModal(false);
    setNewPassword("");
    setConfirmPassword("");
    Alert.alert("Password changed", "Your password has been updated successfully.");
  };

  if (loading) {
    return (
      <LinearGradient colors={["#F8ECFF", "#D294FB"]} style={styles.background}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#093A7D" />
        </View>
      </LinearGradient>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <LinearGradient colors={["#F8ECFF", "#D294FB"]} style={styles.background}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => router.back()} style={styles.closeButton} hitSlop={12}>
            <Ionicons name="close" size={26} color="#093A7D" />
          </Pressable>

          <Text style={styles.label}>Profile picture</Text>
          <Pressable style={styles.avatarWrapper} onPress={pickImage}>
            <Avatar url={localImageUri ?? avatarUrl} size={110} />
            <View style={styles.avatarEditBadge}>
              <Ionicons name="add" size={18} color="#fff" />
            </View>
          </Pressable>

          <Field label="Name" value={name} onChangeText={(t) => setName(t.slice(0, NAME_MAX))} max={NAME_MAX} />
          <Field label="City" value={city} onChangeText={setCity} placeholder="e.g. Belgrade" />

          <Text style={styles.label}>I am a...</Text>
          <View style={styles.roleRow}>
            <Pressable style={styles.roleOption} onPress={() => setIsDancer((v) => !v)}>
              <Ionicons name={isDancer ? "checkbox" : "square-outline"} size={20} color="#093A7D" />
              <Text style={styles.roleOptionText}>Dancer</Text>
            </Pressable>
            <Pressable style={styles.roleOption} onPress={() => setIsOrganizer((v) => !v)}>
              <Ionicons name={isOrganizer ? "checkbox" : "square-outline"} size={20} color="#093A7D" />
              <Text style={styles.roleOptionText}>Organizer</Text>
            </Pressable>
          </View>

          {isDancer ? (
            <>
              <Field
                label="Bio"
                value={bio}
                onChangeText={(t) => setBio(t.slice(0, TEXT_MAX))}
                max={TEXT_MAX}
                multiline
                placeholder="Tell others about yourself"
              />

              <Text style={styles.label}>Dance styles</Text>
              <View style={styles.chipRow}>
                {DANCE_STYLES.map((style) => (
                  <Pressable
                    key={style}
                    style={[styles.chip, danceStyles.includes(style) && styles.chipSelected]}
                    onPress={() => toggleDanceStyle(style)}
                  >
                    <Text style={[styles.chipText, danceStyles.includes(style) && styles.chipTextSelected]}>
                      {style}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.label}>Experience level</Text>
              <View style={styles.chipRow}>
                {EXPERIENCE_LEVELS.map((level) => (
                  <Pressable
                    key={level.value}
                    style={[styles.chip, experienceLevel === level.value && styles.chipSelected]}
                    onPress={() => setExperienceLevel(level.value)}
                  >
                    <Text style={[styles.chipText, experienceLevel === level.value && styles.chipTextSelected]}>
                      {level.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Field
                label="Availability"
                value={availability}
                onChangeText={setAvailability}
                placeholder="e.g. Available weekends"
              />
            </>
          ) : null}

          {isOrganizer ? (
            <>
              <Field
                label="About"
                value={about}
                onChangeText={(t) => setAbout(t.slice(0, TEXT_MAX))}
                max={TEXT_MAX}
                multiline
                placeholder="Tell dancers about your organization"
              />
              <Field label="Organization name" value={organizationName} onChangeText={setOrganizationName} />
              <Field
                label="Website"
                value={website}
                onChangeText={setWebsite}
                placeholder="https://..."
                keyboardType="url"
              />
            </>
          ) : null}

          <Pressable style={styles.passwordCard} onPress={() => setShowPasswordModal(true)}>
            <Ionicons name="lock-closed-outline" size={18} color="#093A7D" />
            <Text style={styles.passwordCardText}>Change password</Text>
            <Ionicons name="chevron-forward" size={18} color="#9B7FC7" />
          </Pressable>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable style={styles.saveButton} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Save changes</Text>}
          </Pressable>
        </ScrollView>
      </LinearGradient>

      <Modal
        visible={showPasswordModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Pressable onPress={() => setShowPasswordModal(false)} style={styles.modalCloseButton} hitSlop={12}>
              <Ionicons name="close" size={22} color="#093A7D" />
            </Pressable>

            <Text style={styles.modalTitle}>Change password</Text>
            <Text style={styles.modalSubtitle}>Enter a new password for your account.</Text>

            <TextInput
              style={styles.modalInput}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="New password"
              placeholderTextColor="#9AA5B8"
              secureTextEntry
            />
            <TextInput
              style={styles.modalInput}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm new password"
              placeholderTextColor="#9AA5B8"
              secureTextEntry
            />

            {passwordError ? <Text style={styles.error}>{passwordError}</Text> : null}

            <Pressable style={styles.saveButton} onPress={handleChangePassword} disabled={passwordSaving}>
              {passwordSaving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Save password</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  max?: number;
  multiline?: boolean;
  placeholder?: string;
  keyboardType?: "default" | "url";
}

function Field({ label, value, onChangeText, max, multiline, placeholder, keyboardType }: FieldProps) {
  return (
    <View style={styles.fieldWrapper}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.inputMultiline]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9AA5B8"
        multiline={multiline}
        keyboardType={keyboardType}
        autoCapitalize={keyboardType === "url" ? "none" : "sentences"}
      />
      {max ? (
        <Text style={styles.counter}>
          {value.length}/{max}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  background: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  scrollContent: { flexGrow: 1, alignItems: "center", padding: 28, paddingTop: 60, paddingBottom: 60 },
  closeButton: { position: "absolute", top: 16, right: 16 },
  label: { fontSize: 14, fontWeight: "700", color: "#093A7D", alignSelf: "flex-start", marginBottom: 8 },
  avatarWrapper: { position: "relative", marginBottom: 8 },
  avatarEditBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#093A7D",
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  fieldWrapper: { width: "100%", marginTop: 16 },
  roleRow: { flexDirection: "row", gap: 20, marginBottom: 4 },
  roleOption: { flexDirection: "row", alignItems: "center", gap: 8 },
  roleOptionText: { color: "#093A7D", fontSize: 14, fontWeight: "600" },
  input: {
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 12,
    fontSize: 15,
    color: "#093A7D",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  inputMultiline: { minHeight: 80, textAlignVertical: "top" },
  counter: { alignSelf: "flex-end", fontSize: 11, color: "#9B7FC7", marginTop: 4 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, width: "100%", marginTop: 16 },
  chip: {
    backgroundColor: "#fff",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 18,
  },
  chipSelected: { backgroundColor: "#093A7D" },
  chipText: { color: "#093A7D", fontSize: 13, fontWeight: "600" },
  chipTextSelected: { color: "#fff" },
  error: { color: "#D0342C", fontSize: 13, marginTop: 16, textAlign: "center" },
  saveButton: {
    marginTop: 28,
    backgroundColor: "#093A7D",
    paddingVertical: 15,
    paddingHorizontal: 48,
    borderRadius: 28,
    alignItems: "center",
  },
  saveButtonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  passwordCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginTop: 24,
  },
  passwordCardText: { flex: 1, color: "#093A7D", fontSize: 14, fontWeight: "600" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(9, 58, 125, 0.4)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
  },
  modalCloseButton: { position: "absolute", top: 14, left: 14, zIndex: 1 },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#093A7D", textAlign: "center", marginBottom: 6 },
  modalSubtitle: { fontSize: 12, color: "#9B7FC7", textAlign: "center", marginBottom: 16 },
  modalInput: {
    width: "100%",
    backgroundColor: "#F8ECFF",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: "#093A7D",
    marginBottom: 12,
  },
});
