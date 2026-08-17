import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/contexts/theme-context";
import type { Palette } from "@/lib/theme";

export interface ActionSheetItem {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  destructive?: boolean;
  onPress: () => void;
}

interface ActionSheetProps {
  visible: boolean;
  onClose: () => void;
  items: ActionSheetItem[];
}

/** A generic bottom sheet of tappable actions - e.g. the "..." menu on a profile. */
export function ActionSheet({ visible, onClose, items }: ActionSheetProps) {
  const insets = useSafeAreaInsets();
  const { palette } = useTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}>
          <View style={styles.handle} />

          {items.map((item) => (
            <Pressable
              key={item.key}
              style={styles.row}
              onPress={() => {
                onClose();
                item.onPress();
              }}
            >
              <Ionicons name={item.icon} size={20} color={item.destructive ? "#D0342C" : palette.text} />
              <Text style={[styles.label, item.destructive && styles.labelDestructive]}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </Modal>
  );
}

function createStyles(p: Palette) {
  return StyleSheet.create({
    overlay: { flex: 1, backgroundColor: "rgba(9, 58, 125, 0.4)", justifyContent: "flex-end" },
    sheet: {
      backgroundColor: p.gradient[0],
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingTop: 10,
      paddingHorizontal: 20,
    },
    handle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: "rgba(192, 107, 228, 0.4)",
      alignSelf: "center",
      marginBottom: 10,
    },
    row: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 14 },
    label: { fontSize: 15, fontWeight: "600", color: p.text },
    labelDestructive: { color: "#D0342C" },
  });
}
