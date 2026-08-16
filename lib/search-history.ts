import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "search_history";
const MAX_ENTRIES = 10;

/** Recent search queries, most recent first. */
export async function getSearchHistory(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch (err) {
    console.error("getSearchHistory failed:", err);
    return [];
  }
}

/** Adds a query to the front of the history (de-duplicated, capped), and returns the updated list. */
export async function addSearchHistoryEntry(query: string): Promise<string[]> {
  const trimmed = query.trim();
  if (!trimmed) return getSearchHistory();

  try {
    const current = await getSearchHistory();
    const deduped = current.filter((entry) => entry.toLowerCase() !== trimmed.toLowerCase());
    const updated = [trimmed, ...deduped].slice(0, MAX_ENTRIES);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error("addSearchHistoryEntry failed:", err);
    return getSearchHistory();
  }
}

export async function clearSearchHistory(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error("clearSearchHistory failed:", err);
  }
}
